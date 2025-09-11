import os, io, json, time, warnings
import re
from datetime import datetime
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd
from pandas.api.types import (
    is_integer_dtype,
    is_float_dtype,
    is_bool_dtype,
    is_datetime64_any_dtype,
)
from scipy.stats import ks_2samp
from supabase import create_client, Client
import meta  # local meta-learner utilities
import httpx

# SDV (modern single-table synthesizers)
try:
    # Newer SDV may expose a unified Metadata; keep fallback for older versions.
    from sdv.metadata import Metadata as SDVMetadata  # type: ignore
except Exception:  # pragma: no cover
    SDVMetadata = None  # type: ignore
from sdv.metadata import SingleTableMetadata
from sdv.single_table import (
    GaussianCopulaSynthesizer,
    CTGANSynthesizer,
    TVAESynthesizer,
)

# Silence only the deprecation warning coming from old lite API paths (if any)
warnings.filterwarnings("ignore", category=FutureWarning, module="sdv.lite.single_table")

# -------------------- Env & Supabase --------------------

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SERVICE_ROLE:
    raise RuntimeError("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE)

OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://ollama:11434")
DP_BACKEND_DEFAULT = (os.getenv("DP_BACKEND", "none").strip().lower() or "none")  # none|custom|synthcity
DP_STRICT_DEFAULT = (os.getenv("DP_STRICT_DEFAULT", "false").strip().lower() in ("1","true","yes","on"))

# Tuning knobs
MAX_SYNTH_ROWS = int(os.getenv("MAX_SYNTH_ROWS", "5000"))
SAMPLE_MULTIPLIER = float(os.getenv("SAMPLE_MULTIPLIER", "1.0"))  # 1.0 => same size as source
SDV_METHOD = (os.getenv("SDV_METHOD", "") or "").strip().lower()  # "gc" | "ctgan" | "tvae"
ARTIFACT_BUCKET = "artifacts"
DATASET_BUCKET = "datasets"
POLL_SECONDS = float(os.getenv("POLL_SECONDS", "2.0"))
# Thresholds to consider an attempt acceptable (env-configurable)
KS_MAX = float(os.getenv("KS_MAX", "0.10"))
CORR_MAX = float(os.getenv("CORR_MAX", "0.10"))
MIA_MAX = float(os.getenv("MIA_MAX", "0.60"))
def _cfg_get(run: Dict[str, Any], key: str, default):
    cfg = run.get("config_json") or {}
    return cfg.get(key, default)


# -------------------- Storage helpers --------------------

def ensure_bucket(name: str) -> None:
    try:
        buckets = supabase.storage.list_buckets()  # type: ignore[attr-defined]
        if isinstance(buckets, list) and any(
            (b.get("id") == name or b.get("name") == name)
            for b in buckets
            if isinstance(b, dict)
        ):
            return
        try:
            supabase.storage.create_bucket(name, public=False)  # type: ignore[call-arg]
        except Exception:
            try:
                supabase.storage.create_bucket(name, {"public": False})  # type: ignore[call-arg]
            except Exception:
                pass
    except Exception:
        pass

def _download_csv_from_storage(path: str) -> pd.DataFrame:
    b = supabase.storage.from_(DATASET_BUCKET).download(path)
    raw = b if isinstance(b, (bytes, bytearray)) else b.read()
    return pd.read_csv(io.BytesIO(raw))

def _upload_bytes(path: str, content: bytes, mime: Optional[str] = None) -> None:
    file_opts = {"upsert": True}
    if mime:
        file_opts["contentType"] = mime
    try:
        supabase.storage.from_(ARTIFACT_BUCKET).upload(path=path, file=content, file_options=file_opts)
    except Exception:
        try:
            supabase.storage.from_(ARTIFACT_BUCKET).update(
                path=path,
                file=content,
                file_options={"contentType": mime} if mime else None,
            )
        except Exception:
            supabase.storage.from_(ARTIFACT_BUCKET).upload(path=path, file=content)

# -------------------- SDV helpers --------------------

def _clean_df_for_sdv(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize dtypes a bit so SDV doesn't choke on mixed object columns."""
    out = df.copy()
    # Convert non-numeric, non-datetime to strings; fill NA with token for categoricals
    for c in out.columns:
        if out[c].dtype.kind not in "biufcM":  # not numeric/datetime
            out[c] = out[c].astype(str)
    obj_cols = out.select_dtypes(exclude=[np.number, "datetime64[ns]"]).columns
    if len(obj_cols) > 0:
        out[obj_cols] = out[obj_cols].fillna("NA")
    return out

def _prepare_metadata_from_df(df: pd.DataFrame) -> SingleTableMetadata:
    md = SingleTableMetadata()
    try:
        md.detect_from_dataframe(df)
    except Exception:
        # best effort: coerce and try again
        md.detect_from_dataframe(_clean_df_for_sdv(df))
    return md

def _sample_count(real_len: int, hparams: Dict[str, Any]) -> int:
    try:
        sm = float(hparams.get("sample_multiplier", SAMPLE_MULTIPLIER) or SAMPLE_MULTIPLIER)
    except Exception:
        sm = SAMPLE_MULTIPLIER
    try:
        mr = int(hparams.get("max_synth_rows", MAX_SYNTH_ROWS) or MAX_SYNTH_ROWS)
    except Exception:
        mr = MAX_SYNTH_ROWS
    # enforce global cap 50k
    cap = 50000
    n = int(min(cap, mr, max(1, int(real_len * max(0.1, sm)))))
    return n

def _train_gc(run_id: str, real_df: pd.DataFrame, hparams: Dict[str, Any]) -> tuple[pd.DataFrame, Dict[str, Any], Dict[str, str]]:
    df = _clean_df_for_sdv(real_df)
    meta_tbl = _prepare_metadata_from_df(df)
    model = GaussianCopulaSynthesizer(meta_tbl)
    model.fit(df)
    n = _sample_count(len(df), hparams)
    synth = model.sample(num_rows=n)
    util = _utility_metrics(df, synth)
    priv = _privacy_metrics(df, synth)
    fair = _fairness_metrics(df, synth)
    metrics = {"utility": util, "privacy": priv, "fairness": fair}
    artifacts = _make_artifacts(run_id, synth, metrics)
    return synth, metrics, artifacts

def _train_ctgan(run_id: str, real_df: pd.DataFrame, hparams: Dict[str, Any]) -> tuple[pd.DataFrame, Dict[str, Any], Dict[str, str]]:
    df = _clean_df_for_sdv(real_df)
    meta_tbl = _prepare_metadata_from_df(df)
    hp = _sanitize_hparams("ctgan", hparams or {})
    model = CTGANSynthesizer(meta_tbl, **hp)
    model.fit(df)
    n = _sample_count(len(df), hparams)
    synth = model.sample(num_rows=n)
    util = _utility_metrics(df, synth)
    priv = _privacy_metrics(df, synth)
    fair = _fairness_metrics(df, synth)
    metrics = {"utility": util, "privacy": priv, "fairness": fair}
    artifacts = _make_artifacts(run_id, synth, metrics)
    return synth, metrics, artifacts

def _train_tvae(run_id: str, real_df: pd.DataFrame, hparams: Dict[str, Any]) -> tuple[pd.DataFrame, Dict[str, Any], Dict[str, str]]:
    df = _clean_df_for_sdv(real_df)
    meta_tbl = _prepare_metadata_from_df(df)
    hp = _sanitize_hparams("tvae", hparams or {})
    model = TVAESynthesizer(meta_tbl, **hp)
    model.fit(df)
    n = _sample_count(len(df), hparams)
    synth = model.sample(num_rows=n)
    util = _utility_metrics(df, synth)
    priv = _privacy_metrics(df, synth)
    fair = _fairness_metrics(df, synth)
    metrics = {"utility": util, "privacy": priv, "fairness": fair}
    artifacts = _make_artifacts(run_id, synth, metrics)
    return synth, metrics, artifacts

def resolve_dp_backend(config_dp: Optional[Dict[str, Any]] | bool | None) -> tuple[str, bool, Optional[float]]:
    """Resolve DP backend, strict flag, and epsilon from env + per-run config.

    Returns: (backend: 'none'|'custom'|'synthcity', strict: bool, epsilon: float|None)
    """
    backend = DP_BACKEND_DEFAULT
    strict = DP_STRICT_DEFAULT
    epsilon: Optional[float] = None

    if config_dp is True:
        # enable DP using env-selected backend
        pass
    elif isinstance(config_dp, dict):
        # explicit dp flag
        enabled = config_dp.get("enabled")
        dp_flag = config_dp.get("dp", enabled if enabled is not None else True)
        if dp_flag is False:
            return ("none", False, None)
        # allow overriding strict
        try:
            strict = bool(config_dp.get("strict", strict))
        except Exception:
            pass
        # epsilon optional
        try:
            if config_dp.get("epsilon") is not None:
                epsilon = float(config_dp.get("epsilon"))
        except Exception:
            epsilon = None
        # allow overriding backend if provided
        b = str(config_dp.get("backend") or "").strip().lower()
        if b in ("none","custom","synthcity"):
            backend = b
    else:
        # no DP requested
        return ("none", False, None)

    # sanity: if env backend invalid, fallback to none
    if backend not in ("none","custom","synthcity"):
        backend = "none"
    return (backend, strict, epsilon)

def _lazy_import_tabddpm():
    try:
        try:
            from tabddpm import TabDDPM  # type: ignore
            return TabDDPM
        except Exception:
            from tab_ddpm import TabDDPM  # type: ignore
            return TabDDPM
    except Exception as e:  # pragma: no cover
        raise ImportError(
            "TabDDPM not available. Install a TabDDPM implementation (e.g., 'pip install tab-ddpm' or via synthcity) to use method='diffusion'."
        ) from e


def _lazy_import_tabtransformer():
    try:
        # synthcity provides a TabTransformer model
        from synthcity.plugins.core.models.tabular_transformer import (  # type: ignore
            TabTransformer,
        )
        return TabTransformer
    except Exception as e:  # pragma: no cover
        raise ImportError(
            "TabTransformer not available. Install a compatible library (e.g., 'pip install synthcity') to use method='transformer'."
        ) from e


class _ModelAdapter:
    """Light wrapper to normalize fit/sample API for experimental models."""

    def __init__(self, model):
        self._model = model
        self._cols: list[str] = []

    def fit(self, df: pd.DataFrame):
        self._cols = list(df.columns)
        # Most libs accept DataFrame directly; fallback to values
        try:
            return self._model.fit(df)
        except Exception:
            return self._model.fit(df.values)

    def sample(self, num_rows: int) -> pd.DataFrame:
        # Try common generation entry points
        out = None
        for attr, args in (
            ("sample", (num_rows,)),
            ("generate", (num_rows,)),
            ("sample", tuple()),
            ("generate", tuple()),
        ):
            if hasattr(self._model, attr):
                try:
                    out = getattr(self._model, attr)(*args)
                    break
                except Exception:
                    continue
        if out is None:
            raise RuntimeError("Experimental model does not expose sample/generate API")
        if isinstance(out, pd.DataFrame):
            return out.head(num_rows).reset_index(drop=True)
        import numpy as np  # local import

        arr = np.asarray(out)
        if arr.ndim == 2 and arr.shape[1] == len(self._cols):
            return pd.DataFrame(arr[:num_rows], columns=self._cols)
        # Last resort: coerce to DataFrame with best-effort columns
        return pd.DataFrame(arr[:num_rows], columns=self._cols[: arr.shape[1]])


def _try_import_synthcity():
    try:
        from synthcity.plugins import Plugins  # type: ignore
        return Plugins
    except Exception:
        return None


class _SynthcityAdapter:
    """Adapter to expose .fit/.sample over synthcity plugins."""

    def __init__(self, plugin_obj):
        self._p = plugin_obj
        self._cols: list[str] = []

    def fit(self, df: pd.DataFrame):
        self._cols = list(df.columns)
        return self._p.fit(df)

    def sample(self, num_rows: int) -> pd.DataFrame:
        try:
            out = self._p.generate(num_rows)
        except Exception:
            out = self._p.sample(num_rows) if hasattr(self._p, "sample") else None
        if isinstance(out, pd.DataFrame):
            return out.head(num_rows).reset_index(drop=True)
        import numpy as np
        arr = np.asarray(out)
        if arr.ndim == 2 and self._cols and arr.shape[1] == len(self._cols):
            return pd.DataFrame(arr[:num_rows], columns=self._cols)
        return pd.DataFrame(arr[:num_rows])


def _build_synthcity_synthesizer(method: str, metadata: SingleTableMetadata, dp_opts: Optional[Dict[str, Any]], hparams: Optional[Dict[str, Any]]):
    Plugins = _try_import_synthcity()
    if not Plugins:
        raise NotImplementedError("synthcity not installed for DP mode")

    # Map requested → candidate plugin names
    candidates = []
    m = method.lower()
    if m in {"dp-ctgan"}:
        candidates = ["dpctgan", "ctgan_dp", "ctgan_privacy"]
    elif m in {"pategan"}:
        candidates = ["pategan"]
    elif m in {"dpgan"}:
        candidates = ["dpgan"]
    else:
        candidates = [m]

    available = set(Plugins().list())
    chosen = None
    for name in candidates:
        if name in available:
            chosen = name; break
    if not chosen:
        raise NotImplementedError(f"DP plugin for '{method}' not found in synthcity plugins: {sorted(list(available))[:20]}")

    try:
        plg = Plugins().get(chosen, **(hparams or {}))
    except Exception as e:
        raise RuntimeError(f"Failed to init synthcity plugin '{chosen}': {e}")
    return _SynthcityAdapter(plg)


def _dp_backend_available(method: str) -> bool:
    """Return whether a DP-capable backend is available for method.

    For now, SDV CTGAN/TVAE are not DP-enabled out of the box.
    This helper can be updated when a DP-capable implementation is wired in.
    """
    return False


def _build_synthesizer(
    metadata: SingleTableMetadata,
    requested: Optional[str],
    hparams: Optional[Dict[str, Any]] = None,
    dp_opts: Optional[Dict[str, Any]] = None,
) -> tuple[Any, bool]:
    """
    Choose synthesizer mapped from method string:
      - gc     -> GaussianCopulaSynthesizer (default)
      - ctgan  -> CTGANSynthesizer
      - tvae   -> TVAESynthesizer
    Fallback order: requested -> SDV_METHOD env -> GC
    """
    m = (requested or SDV_METHOD or "gc").lower()
    # Normalize dp aliases
    if m in ("dp-ctgan", "ctgan-dp"):
        m = "ctgan"; dp_opts = dp_opts or {"dp": True}
    if m in ("dp-tvae", "tvae-dp"):
        m = "tvae"; dp_opts = dp_opts or {"dp": True}

    # Normalize dp options
    dp_requested = False
    dp_strict = False
    if dp_opts is True:
        dp_requested = True
    elif isinstance(dp_opts, dict):
        dp_requested = bool(dp_opts.get("dp", True))
        dp_strict = bool(dp_opts.get("strict", False))

    # If explicit synthcity DP methods requested
    if m in ("dp-ctgan", "pategan", "dpgan"):
        try:
            adapter = _build_synthcity_synthesizer(m, metadata, dp_opts, hparams)
            try:
                print(f"[worker][dp] using synthcity plugin for method={m}")
            except Exception:
                pass
            return adapter, True
        except Exception as e:
            # Respect strict mode
            if dp_requested and dp_strict:
                raise
            try:
                print(f"[worker][dp] synthcity unavailable for {m}: {e}; falling back to SDV GC (non-DP).")
            except Exception:
                pass
            return GaussianCopulaSynthesizer(metadata), False

    # If DP backend requested as synthcity but method is a standard SDV name, try synthcity DP-CTGAN transparently
    if (dp_opts and isinstance(dp_opts, dict) and dp_opts.get("dp") and str(dp_opts.get("backend") or "").lower()=="synthcity") and m in ("ctgan","ct","ctgansynthesizer"):
        try:
            adapter = _build_synthcity_synthesizer("dp-ctgan", metadata, dp_opts, hparams)
            try:
                print("[worker][dp] using synthcity DP-CTGAN for ctgan request")
            except Exception:
                pass
            return adapter, True
        except Exception as e:
            if dp_requested and dp_strict:
                raise
            try:
                print(f"[worker][dp] synthcity unavailable for DP-CTGAN: {e}; falling back to SDV CTGAN (non-DP).")
            except Exception:
                pass
            return CTGANSynthesizer(metadata, **(hparams or {})), False

    if m in ("ctgan", "ct", "ctgansynthesizer"):
        if dp_requested and not _dp_backend_available("ctgan"):
            if dp_strict:
                raise NotImplementedError("DP requested for CTGAN but DP backend unavailable; set dp.strict=false to fallback.")
            try:
                print("[worker][dp] DP requested but unavailable for ctgan; falling back to non-DP.")
            except Exception:
                pass
            return CTGANSynthesizer(metadata, **(hparams or {})), False
        return CTGANSynthesizer(metadata, **(hparams or {})), bool(dp_requested)
    if m in ("tvae", "tv", "tvaesynthesizer"):
        if dp_requested and not _dp_backend_available("tvae"):
            if dp_strict:
                raise NotImplementedError("DP requested for TVAE but DP backend unavailable; set dp.strict=false to fallback.")
            try:
                print("[worker][dp] DP requested but unavailable for tvae; falling back to non-DP.")
            except Exception:
                pass
            return TVAESynthesizer(metadata, **(hparams or {})), False
        return TVAESynthesizer(metadata, **(hparams or {})), bool(dp_requested)
    if m in ("diffusion", "ddpm", "tabddpm"):
        TabDDPM = _lazy_import_tabddpm()
        return _ModelAdapter(TabDDPM(metadata=metadata)), False  # type: ignore[call-arg]
    if m in ("transformer", "tabtransformer"):
        TabTransformer = _lazy_import_tabtransformer()
        return _ModelAdapter(TabTransformer(metadata=metadata)), False  # type: ignore[call-arg]
    # default (fast & robust)
    return GaussianCopulaSynthesizer(metadata), False


def _filter_hparams(method: str, cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Whitelist known hyperparameters per synthesizer; ignore unknowns safely."""
    m = method.lower().strip()
    allowed: Dict[str, set[str]] = {
        "ctgan": {
            "epochs", "batch_size", "embedding_dim",
            "generator_lr", "discriminator_lr",
            "generator_decay", "discriminator_decay",
            "pac",
            "verbose",
        },
        "tvae": {
            "epochs", "batch_size", "embedding_dim",
            "compress_dims", "decompress_dims",
            "loss_factor", "verbose",
        },
        # GC doesn't typically take these; keep empty to avoid passing.
        "gc": set(),
    }
    keys = allowed.get(m, set())
    out: Dict[str, Any] = {}
    for k in keys:
        if k in cfg and cfg[k] is not None:
            out[k] = cfg[k]
    return out

def _sanitize_hparams(method: str, hp: Dict[str, Any]) -> Dict[str, Any]:
    """Cast common knobs to safe ints; drop invalid or non-positive values."""
    out: Dict[str, Any] = {}
    for k, v in (hp or {}).items():
        if k in {"epochs", "batch_size", "embedding_dim", "pac"}:
            try:
                iv = int(float(v))
                if iv > 0:
                    out[k] = iv
            except Exception:
                pass
        else:
            out[k] = v
    return out

# -------------------- Metrics --------------------

def _utility_metrics(real: pd.DataFrame, synth: pd.DataFrame) -> Dict[str, Any]:
    """Compute lightweight utility metrics.

    - ks_mean: mean Kolmogorov–Smirnov statistic across numeric cols (lower is better)
               Fallback for all-categorical tables: average total-variation distance
               between category distributions per column (scaled 0..1).
    - corr_delta: mean absolute delta across numeric correlation upper triangles.
                  Fallback: reuse categorical TV distance when numeric correlation is undefined.
    """

    # KS across numeric columns
    ks_vals: list[float] = []
    num_cols = real.select_dtypes(include=[np.number]).columns
    for col in num_cols:
        try:
            s1 = real[col].dropna().to_numpy()
            s2 = synth[col].dropna().to_numpy()
            if len(s1) > 0 and len(s2) > 0:
                ks = ks_2samp(s1, s2).statistic
                ks_vals.append(float(ks))
        except Exception:
            continue
    ks_mean = float(np.mean(ks_vals)) if ks_vals else None

    # Correlation Δ (L1 distance between upper triangles)
    def _corr_upper(df: pd.DataFrame):
        num = df.select_dtypes(include=[np.number])
        if num.shape[1] < 2:
            return None
        c = num.corr().to_numpy()
        iu = np.triu_indices_from(c, k=1)
        return c[iu]

    c_real = _corr_upper(real)
    c_synth = _corr_upper(synth)
    corr_delta = (
        float(np.mean(np.abs(c_real - c_synth)))
        if (c_real is not None and c_synth is not None and len(c_real) == len(c_synth))
        else None
    )

    # Fallback for categorical-only datasets to avoid placeholders
    if ks_mean is None or corr_delta is None:
        try:
            tv_vals: list[float] = []
            cat_cols = [c for c in real.columns if c not in num_cols]
            for c in cat_cols:
                rvc = real[c].astype(str).value_counts(normalize=True, dropna=False)
                svc = synth[c].astype(str).value_counts(normalize=True, dropna=False) if c in synth.columns else None
                if svc is None or rvc.empty:
                    continue
                # Align supports
                keys = sorted(set(rvc.index.tolist()) | set(svc.index.tolist()))
                r = np.array([float(rvc.get(k, 0.0)) for k in keys], dtype=float)
                s = np.array([float(svc.get(k, 0.0)) for k in keys], dtype=float)
                tv = 0.5 * float(np.abs(r - s).sum())  # total variation distance 0..1
                tv_vals.append(tv)
            tv_mean = float(np.mean(tv_vals)) if tv_vals else 0.0
            if ks_mean is None:
                ks_mean = tv_mean
            if corr_delta is None:
                corr_delta = tv_mean
        except Exception:
            # Worst-case sane defaults to avoid placeholders
            if ks_mean is None:
                ks_mean = 0.0
            if corr_delta is None:
                corr_delta = 0.0

    return {"ks_mean": float(ks_mean), "corr_delta": float(corr_delta), "auroc": None, "c_index": None}

def _analyze_schema(df: pd.DataFrame) -> Dict[str, Any]:
    """Lightweight schema summary to guide initial method choice."""
    num_cols = len(df.select_dtypes(include=[np.number]).columns)
    total = df.shape[1] or 1
    numeric_ratio = num_cols / total
    low_card_num = 0
    for c in df.select_dtypes(include=[np.number]).columns:
        try:
            if df[c].nunique(dropna=True) <= 10:
                low_card_num += 1
        except Exception:
            pass
    return {"numeric_ratio": numeric_ratio, "low_card_num": low_card_num, "total_cols": total}

def choose_model_by_schema(df: pd.DataFrame) -> str:
    """Heuristically select a model based on schema shape.

    - If dataset is small (< 2000 rows) → 'gc'
    - If >70% categorical → 'ctgan'
    - If >70% continuous numeric → 'tvae'
    - If balanced mix (numeric in [0.4, 0.6]) → 'auto' (benchmark later)
    - If datetime columns exist → log a warning
    """
    try:
        total_cols = max(1, int(df.shape[1]))
        num_cols = len(df.select_dtypes(include=[np.number]).columns)
        dt_cols = len(df.select_dtypes(include=["datetime64[ns]", "datetime64[ns, tz]"]).columns)
        cat_cols = max(0, total_cols - num_cols - dt_cols)
        n_rows = int(df.shape[0])
        num_ratio = num_cols / total_cols
        cat_ratio = cat_cols / total_cols

        if dt_cols > 0:
            try:
                print(f"[worker][schema] warning: detected {dt_cols} datetime column(s); time-series synthesis is not yet specialized.")
            except Exception:
                pass

        if n_rows < 2000:
            return "gc"
        if cat_ratio >= 0.70:
            return "ctgan"
        if num_ratio >= 0.70:
            return "tvae"
        if 0.40 <= num_ratio <= 0.60:
            return "auto"
        # default
        return "gc"
    except Exception:
        return "gc"

def _score_metrics(met: Dict[str, Any]) -> float:
    try:
        u = (met or {}).get("utility", {})
        p = (met or {}).get("privacy", {})
        ks = u.get("ks_mean"); cd = u.get("corr_delta"); mia = p.get("mia_auc"); dup = p.get("dup_rate")
        dup_pct = dup * 100.0 if isinstance(dup, (int, float)) else None
        def over(val, thr):
            if isinstance(val, (int, float)):
                return max(0.0, (val - thr) / thr)
            return 1.0
        return over(ks, 0.10) + over(cd, 0.10) + over(mia, 0.60) + over(dup_pct, 5.0)
    except Exception:
        return 10.0

def _quantile_match(real: pd.DataFrame, synth: pd.DataFrame) -> pd.DataFrame:
    out = synth.copy()
    real_num = real.select_dtypes(include=[np.number])
    for col in out.select_dtypes(include=[np.number]).columns:
        try:
            r = real_num[col].dropna().to_numpy()
            s = out[col].to_numpy()
            if len(r) < 10 or len(s) == 0:
                continue
            r_sorted = np.sort(r)
            ranks = np.argsort(np.argsort(s))
            p = (ranks + 0.5) / max(1, len(s))
            idx = np.clip((p * (len(r_sorted) - 1)).astype(int), 0, len(r_sorted) - 1)
            out[col] = r_sorted[idx]
        except Exception:
            pass
    return out

def _jitter_numeric(df: pd.DataFrame, sigma_factor: float = 0.01) -> pd.DataFrame:
    out = df.copy()
    # Only jitter float columns; keep integers stable to preserve ids/codes
    for col in out.columns:
        try:
            if not is_float_dtype(out[col]):
                continue
        except Exception:
            continue
        try:
            std = float(out[col].std()) if out[col].std() is not None else 0.0
            if std > 0:
                out[col] = out[col] + np.random.normal(0, sigma_factor * std, size=len(out))
        except Exception:
            pass
    return out

def _enforce_schema_dtypes(real: pd.DataFrame, synth: pd.DataFrame) -> pd.DataFrame:
    """Best-effort: coerce synthetic columns to match real schema dtypes.

    - Integer → round and cast to nullable Int64
    - Boolean → coerce numeric/strings to booleans (nullable)
    - Datetime → to_datetime (coerce)
    - Float → numeric float (coerce)
    - Other → leave as-is
    """
    out = synth.copy()
    try:
        commons = [c for c in real.columns if c in out.columns]
        for c in commons:
            try:
                rd = real[c]
                if is_integer_dtype(rd):
                    out[c] = pd.to_numeric(out.get(c), errors="coerce").round().astype("Int64")
                elif is_bool_dtype(rd):
                    s = out.get(c)
                    if s is None:
                        continue
                    if is_float_dtype(s) or is_integer_dtype(s):
                        s2 = pd.to_numeric(s, errors="coerce").round().clip(0, 1)
                    else:
                        # map common boolean-like strings
                        s_lower = s.astype(str).str.strip().str.lower()
                        true_set = {"true", "1", "yes", "y", "t"}
                        false_set = {"false", "0", "no", "n", "f"}
                        s2 = s.where(~s_lower.isin(true_set | false_set), s_lower.isin(true_set).astype("Int8"))
                        s2 = pd.to_numeric(s2, errors="coerce").clip(0, 1)
                    out[c] = s2.astype("Int8").astype("boolean")  # keep NA as <NA>
                elif is_datetime64_any_dtype(rd):
                    out[c] = pd.to_datetime(out.get(c), errors="coerce")
                elif is_float_dtype(rd):
                    out[c] = pd.to_numeric(out.get(c), errors="coerce").astype(float)
                else:
                    # leave object/text as-is; SDV already sanitized inputs to strings
                    pass
            except Exception:
                # column-level best effort; ignore
                pass
    except Exception:
        pass
    return out

def _match_categorical_marginals(real: pd.DataFrame, synth: pd.DataFrame) -> pd.DataFrame:
    out = synth.copy()
    cats = out.select_dtypes(exclude=[np.number, "datetime64[ns]"]).columns
    for c in cats:
        try:
            freq = real[c].astype(str).value_counts(normalize=True, dropna=False)
            if not freq.empty:
                out[c] = np.random.choice(freq.index.to_list(), p=freq.to_numpy(), size=len(out))
        except Exception:
            pass
    return out

def _postprocess(real: pd.DataFrame, synth: pd.DataFrame, mia: Optional[float]) -> (pd.DataFrame, Dict[str, Any]):
    steps: Dict[str, Any] = {}
    s = _quantile_match(real, synth); steps["quantile_match"] = True
    sigma = 0.015 if (isinstance(mia, (int, float)) and mia > 0.7) else 0.008
    s = _jitter_numeric(s, sigma); steps["jitter_sigma"] = sigma
    s = _match_categorical_marginals(real, s); steps["cat_marginals"] = True
    return s, steps

def _align_for_merge(real: pd.DataFrame, synth: pd.DataFrame, cols: list[str]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Best-effort dtype harmonization prior to equality-based merge.

    - If either side is numeric → cast both to float64 via to_numeric (coerce).
    - Else if either side is datetime → cast both via to_datetime (coerce).
    - Else → cast both to string to avoid object vs category mismatches.
    """
    r = real.copy()
    s = synth.copy()
    for c in cols:
        try:
            rdt = r[c].dtype
            sdt = s[c].dtype
            if np.issubdtype(rdt, np.number) or np.issubdtype(sdt, np.number):
                r[c] = pd.to_numeric(r[c], errors="coerce").astype(float)
                s[c] = pd.to_numeric(s[c], errors="coerce").astype(float)
            elif np.issubdtype(rdt, np.datetime64) or np.issubdtype(sdt, np.datetime64):
                r[c] = pd.to_datetime(r[c], errors="coerce")
                s[c] = pd.to_datetime(s[c], errors="coerce")
            else:
                r[c] = r[c].astype(str)
                s[c] = s[c].astype(str)
        except Exception:
            # Fallback to string on any casting error
            try:
                r[c] = r[c].astype(str)
                s[c] = s[c].astype(str)
            except Exception:
                pass
    return r, s


def _privacy_metrics(real: pd.DataFrame, synth: pd.DataFrame) -> Dict[str, Any]:
    # Very lightweight membership-inference proxy via classifier separability
    try:
        from sklearn.model_selection import train_test_split
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import roc_auc_score

        common = list(set(real.columns) & set(synth.columns))
        r = real[common].copy()
        s = synth[common].copy()

        # align dtypes loosely
        for col in common:
            if r[col].dtype != s[col].dtype:
                try:
                    s[col] = s[col].astype(r[col].dtype)
                except Exception:
                    pass

        # encode objects as categorical codes
        def _encode(df: pd.DataFrame) -> pd.DataFrame:
            out = {}
            for c in df.columns:
                if df[c].dtype.kind in "biufc":
                    out[c] = df[c]
                else:
                    out[c] = df[c].astype("category").cat.codes
            return pd.DataFrame(out)

        rX = _encode(r); sX = _encode(s)
        rX["y"] = 1; sX["y"] = 0
        X = pd.concat([rX, sX], axis=0).sample(frac=1.0, random_state=42)
        y = X.pop("y")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.33, random_state=42, stratify=y
        )
        clf = RandomForestClassifier(n_estimators=80, random_state=42, n_jobs=-1)
        clf.fit(X_train, y_train)
        proba = clf.predict_proba(X_test)[:, 1]
        mia_auc = float(roc_auc_score(y_test, proba))
    except Exception:
        mia_auc = None

    # Rough duplicate rate (exact full-row matches)
    try:
        common = list(set(real.columns) & set(synth.columns))
        # Align dtypes to avoid int/float merge warnings and ensure consistent equality
        real_aligned, synth_aligned = _align_for_merge(real[common], synth[common], common)
        dup = pd.merge(
            real_aligned.drop_duplicates(),
            synth_aligned.drop_duplicates(),
            how="inner",
            on=common,
        )
        dup_rate = float(len(dup)) / max(1, len(synth))
    except Exception:
        dup_rate = None

    return {"mia_auc": mia_auc, "dup_rate": dup_rate}

# -------------------- Artifacts --------------------

def _make_artifacts(run_id: str, synth_df: pd.DataFrame, metrics: Dict[str, Any]) -> Dict[str, str]:
    ensure_bucket(ARTIFACT_BUCKET)

    # synthetic CSV
    syn_path = f"{run_id}/synthetic.csv"
    _upload_bytes(syn_path, synth_df.to_csv(index=False).encode(), "text/csv")

    # metrics JSON (also used by report service)
    rep_path = f"{run_id}/report.json"
    _upload_bytes(rep_path, json.dumps(metrics, ensure_ascii=False).encode(), "application/json")

    return {"synthetic_csv": syn_path, "report_json": rep_path}


# -------------------- Agent helpers --------------------

def _schema_summary_from_json(schema_json: Dict[str, Any]) -> str:
    try:
        cols = (schema_json or {}).get("columns", [])[:50]
        return "\n".join(
            f"- {c.get('name')} ({c.get('type')})" for c in cols
        )
    except Exception:
        return ""

def _ollama_generate(
    prompt: str,
    model: str = "llama3.1:8b",
    temperature: float = 0.2,
    timeout: float = 30.0,
    retries: int = 3,
    backoff: float = 1.8,
) -> str:
    payload = {"model": model, "prompt": prompt, "stream": False, "options": {"temperature": temperature}}
    attempt = 0
    while attempt < max(1, retries):
        attempt += 1
        try:
            with httpx.Client(timeout=timeout) as cl:
                r = cl.post(f"{OLLAMA_BASE}/api/generate", json=payload)
                r.raise_for_status()
                data = r.json()
                return (data or {}).get("response") or ""
        except Exception as e:
            try:
                print(f"[worker][agent] ollama error: {e}")
            except Exception:
                pass
            if attempt >= retries:
                break
            # exponential backoff with cap
            sleep_s = min(10.0, (backoff ** (attempt - 1)))
            time.sleep(sleep_s)
    return ""

def _agent_plan_ollama(dataset_name: str, schema_json: Dict[str, Any], last_metrics: Dict[str, Any], user_prompt: Optional[str], provider: Optional[str], model: Optional[str]) -> Dict[str, Any]:
    # Respect provider hint; only proceed for Ollama
    if provider and str(provider).lower() not in {"ollama", "local-ollama"}:
        return {}
    system = (
        "You are a senior data scientist planning synthetic data generation. "
        "Given a dataset summary and previous run metrics, return STRICT JSON only with keys: "
        "method in ['gc','ctgan','tvae'], hparams (object with epochs,batch_size,embedding_dim optional), "
        "sample_multiplier (number 0.1..3.0), max_synth_rows (int 1..200000), notes (string)."
    )
    schema_text = _schema_summary_from_json(schema_json)
    met_text = json.dumps({
        "privacy": (last_metrics or {}).get("privacy"),
        "utility": (last_metrics or {}).get("utility"),
    }, ensure_ascii=False)
    up = (user_prompt or "").strip()
    user = f"""Dataset: {dataset_name}\nSchema:\n{schema_text}\n\nLast metrics (JSON):\n{met_text}\n\nGoal: {up or 'meet privacy and utility thresholds'}\nReturn JSON only."""
    prompt = f"System:\n{system}\n\nUser:\n{user}\n"
    text = _ollama_generate(prompt, model or "llama3.1:8b")
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return {}
        return {}

# -------------------- Pipeline --------------------

def execute_pipeline(run: Dict[str, Any]) -> Dict[str, Any]:
    # Load dataset
    ds = supabase.table("datasets").select("file_url,rows_count,name,schema_json").eq("id", run["dataset_id"]).single().execute()
    file_url = (ds.data or {}).get("file_url")
    if not file_url:
        raise RuntimeError("Dataset file not found")

    real = _download_csv_from_storage(file_url)
    real_clean = _clean_df_for_sdv(real)

    # Metadata (prefer new SDV Metadata if available; fallback to SingleTableMetadata)
    metadata: SingleTableMetadata
    if SDVMetadata is not None:
        try:
            md = SDVMetadata()  # type: ignore
            if hasattr(md, "detect_table_from_dataframe"):
                md.detect_table_from_dataframe("table", real_clean)  # type: ignore
            # Convert to SingleTableMetadata for synthesizers
            metadata = SingleTableMetadata()
            metadata.detect_from_dataframe(real_clean)
        except Exception:
            metadata = SingleTableMetadata()
            metadata.detect_from_dataframe(real_clean)
    else:
        metadata = SingleTableMetadata()
        metadata.detect_from_dataframe(real_clean)

    # Method can come from run.method, or agent plan in config_json.method, or env
    method = (run.get("method") or _cfg_get(run, "method", "")).lower()
    # If no explicit method, choose by schema heuristics
    if not method:
        picked = choose_model_by_schema(real_clean)
        method = picked
        try:
            print(f"[worker][schema] picked='{picked}' via schema heuristics")
        except Exception:
            pass

    # (meta suggestion moved below after current_hparams is initialized)

    # -------------------- Auto-benchmark (if method == "auto") --------------------
    def _auto_benchmark_select(real_df: pd.DataFrame, meta_schema: SingleTableMetadata) -> tuple[str, Dict[str, Any]]:
        try:
            n = int(max(50, min(500, max(1, int(len(real_df) * 0.10)))))
            bench_real = real_df.head(n).copy()
            results: Dict[str, Any] = {}

            # Build light configs for speed
            configs = {
                "gc": ({}, GaussianCopulaSynthesizer),
                "ctgan": ({"epochs": 50, "batch_size": 128, "embedding_dim": 64, "pac": 10}, CTGANSynthesizer),
                "tvae": ({"epochs": 120, "batch_size": 128, "embedding_dim": 64}, TVAESynthesizer),
            }

            for m, (hp, cls) in configs.items():
                try:
                    model = cls(meta_schema, **hp)  # type: ignore[misc]
                    model.fit(bench_real)
                    synth = model.sample(num_rows=n)
                    util = _utility_metrics(bench_real, synth)
                    priv = _privacy_metrics(bench_real, synth)
                    ks = util.get("ks_mean") or 0.0
                    cd = util.get("corr_delta") or 0.0
                    mia = (priv or {}).get("mia_auc") or 0.0
                    score = float(ks) + float(cd) + 0.5 * float(mia)
                    results[m] = {"utility": util, "privacy": priv, "score": score}
                except Exception as e:
                    try:
                        print(f"[worker][auto] {m} benchmark error: {type(e).__name__}: {e}")
                    except Exception:
                        pass
                    results[m] = {"utility": {"ks_mean": 1.0, "corr_delta": 1.0}, "privacy": {"mia_auc": 1.0}, "score": 9e9}

            # Choose best by minimal score
            best_method = min(results.items(), key=lambda kv: kv[1].get("score", 9e9))[0]
            # Log comparison
            try:
                def fmt(m):
                    r = results.get(m, {})
                    u = r.get("utility", {})
                    p = r.get("privacy", {})
                    return f"score={r.get('score'):.3f} ks={u.get('ks_mean')} cd={u.get('corr_delta')} mia={p.get('mia_auc')}"
                print(f"[worker][auto] GC:   {fmt('gc')}")
                print(f"[worker][auto] CTGAN:{fmt('ctgan')}")
                print(f"[worker][auto] TVAE: {fmt('tvae')}")
                print(f"[worker][auto] selected={best_method}")
            except Exception:
                pass
            return best_method, results
        except Exception as e:
            try:
                print(f"[worker][auto] benchmark failed, defaulting to GC: {type(e).__name__}: {e}")
            except Exception:
                pass
            return "gc", {}

    # Agent mode logging (non-blocking; default to GC unless method is set)
    mode = (run.get("mode") or _cfg_get(run, "mode", "")).lower()
    if mode == "agent":
        cfg = run.get("config_json") or {}
        agent = cfg.get("agent") if isinstance(cfg, dict) else None
        agent_provider = run.get("agent_provider") or (agent or {}).get("provider")
        agent_model = run.get("agent_model") or (agent or {}).get("model")
        agent_prompt = run.get("agent_prompt") or (cfg.get("prompt") if isinstance(cfg, dict) else None)
        try:
            print("[worker][agent] provider=", agent_provider, "model=", agent_model)
            if agent_prompt:
                print("[worker][agent] prompt=", str(agent_prompt)[:200])
        except Exception:
            pass

    # Hyperparameters from config_json (agent or manual overrides)
    cfg = run.get("config_json") or {}
    hparams = _filter_hparams(method or "gc", cfg if isinstance(cfg, dict) else {})
    hparams = _sanitize_hparams(method or "gc", hparams)

    # Build synthesizer with optional hyperparameters
    if (method or "gc") in ("ctgan", "ct"):
        synth_model = CTGANSynthesizer(metadata, **hparams)
    elif (method or "gc") == "tvae":
        synth_model = TVAESynthesizer(metadata, **hparams)
    else:
        synth_model = GaussianCopulaSynthesizer(metadata)

    # Per-run overrides from agent plan (with safe fallbacks)
    sample_multiplier = float(_cfg_get(run, "sample_multiplier", SAMPLE_MULTIPLIER))
    max_synth_rows   = int(_cfg_get(run, "max_synth_rows", MAX_SYNTH_ROWS))

    # Helper to log agent steps
    def _log_step(step_no: int, title: str, detail: str, met: Dict[str, Any]):
        try:
            supabase.table("run_steps").insert({
                "run_id": run["id"],
                "step_no": step_no,
                "title": title,
                "detail": detail,
                "metrics_json": met,
            }).execute()
        except Exception:
            pass

    def _thresholds_status(met: Dict[str, Any]) -> tuple[bool, list[str]]:
        """Return overall_ok and a list of human-readable reasons for failures/success."""
        try:
            u = met.get("utility", {})
            p = met.get("privacy", {})
            ks = u.get("ks_mean")
            cd = u.get("corr_delta")
            mia = p.get("mia_auc")
            dup = p.get("dup_rate")
            ok = True
            reasons: list[str] = []
            if ks is not None:
                if ks > KS_MAX:
                    ok = False; reasons.append(f"KS mean {ks:.3f} > {KS_MAX:.2f} (fail)")
                else:
                    reasons.append(f"KS mean {ks:.3f} ≤ {KS_MAX:.2f} (ok)")
            if cd is not None:
                if cd > CORR_MAX:
                    ok = False; reasons.append(f"Corr Δ {cd:.3f} > {CORR_MAX:.2f} (fail)")
                else:
                    reasons.append(f"Corr Δ {cd:.3f} ≤ {CORR_MAX:.2f} (ok)")
            if mia is not None:
                if mia > MIA_MAX:
                    ok = False; reasons.append(f"MIA AUC {mia:.3f} > {MIA_MAX:.2f} (fail)")
                else:
                    reasons.append(f"MIA AUC {mia:.3f} ≤ {MIA_MAX:.2f} (ok)")
            if dup is not None:
                dup_pct = dup * 100.0
                if dup_pct > 5.0:
                    ok = False; reasons.append(f"Dup rate {dup_pct:.1f}% > 5% (fail)")
                else:
                    reasons.append(f"Dup rate {dup_pct:.1f}% ≤ 5% (ok)")
            return ok, reasons
        except Exception:
            return False, ["Error evaluating thresholds"]

    # -------------------- Plan-driven execution (if plan present) --------------------
    try:
        cfg_for_plan = run.get("config_json") or {}
        plan = cfg_for_plan.get("plan") if isinstance(cfg_for_plan, dict) else None
    except Exception:
        plan = None
    if isinstance(plan, dict) and (plan.get("choice") or plan.get("method")):
        # Normalize attempts list
        first = plan.get("choice") or {"method": plan.get("method"), "hyperparams": plan.get("hyperparams", {})}
        backups = plan.get("backup") or []
        attempts_list: list[Dict[str, Any]] = []
        def _norm(x):
            if not isinstance(x, dict):
                return {"method": str(x)}
            if "choice" in x and isinstance(x["choice"], dict):
                m = x["choice"].get("method")
                return {"method": m, "hyperparams": x.get("hyperparams") or {}}
            return {"method": x.get("method"), "hyperparams": x.get("hyperparams") or {}}
        attempts_list.append(_norm(first))
        for b in backups:
            attempts_list.append(_norm(b))

        accepted: Optional[Dict[str, Any]] = None
        best: Optional[Dict[str, Any]] = None
        best_score = 1e9
        for i, item in enumerate(attempts_list, start=1):
            try:
                supabase.table("run_steps").insert({
                    "run_id": run["id"],
                    "step_no": i,
                    "title": "training",
                    "detail": f"attempt {i}: method={item.get('method')}",
                }).execute()
            except Exception:
                pass

            try:
                out = _attempt_train(item, real_clean, metadata)
                synth = _enforce_schema_dtypes(real_clean, out["synth"])  # align dtypes
                met = out["metrics"]
                # thresholds
                ok, reasons = _thresholds_status({**met, "privacy": met.get("privacy", {})})
                # score for fallback selection
                sc = _score_metrics(met)
                if sc < best_score:
                    best_score = sc
                    best = {"synth": synth, "metrics": met, "method": out.get("method"), "attempt": i, "n": out.get("n")}
                try:
                    supabase.table("run_steps").insert({
                        "run_id": run["id"],
                        "step_no": i,
                        "title": "metrics",
                        "detail": "; ".join(reasons)[:500],
                        "metrics_json": met,
                    }).execute()
                except Exception:
                    pass
                if ok:
                    accepted = {"synth": synth, "metrics": met, "method": out.get("method"), "attempt": i, "n": out.get("n")}
                    break
            except Exception as e:
                try:
                    supabase.table("run_steps").insert({
                        "run_id": run["id"],
                        "step_no": i,
                        "title": "error",
                        "detail": f"{type(e).__name__}: {e}",
                    }).execute()
                except Exception:
                    pass
                continue

        chosen = accepted or best
        if not chosen:
            raise RuntimeError("All plan attempts failed")

        # Compose final metrics + fairness + meta
        final_metrics = chosen["metrics"]
        # Ensure meta info
        try:
            fm = final_metrics.setdefault("meta", {})
            fm.update({
                "model": chosen.get("method"),
                "attempt": chosen.get("attempt"),
                "n_real": int(len(real_clean)),
                "n_synth": int(chosen.get("n") or 0),
                "dp_effective": False,
            })
        except Exception:
            pass

        artifacts = _make_artifacts(run["id"], chosen["synth"], final_metrics)
        return {"metrics": final_metrics, "artifacts": artifacts}

    # Agent retry loop (up to 3 attempts)
    attempts = 1
    max_attempts = 6
    final_metrics: Dict[str, Any] = {}
    final_synth: pd.DataFrame
    m0 = (method or "gc").lower()
    # Treat special token 'agent' as default GC seed; 'auto' is handled above via benchmark
    if m0 in ("agent",):
        m0 = "gc"
    current_method = m0
    current_hparams = dict(hparams)
    # Try meta-learner suggestion (best-effort) now that we have current_hparams
    try:
        suggested, proba, agg_hp = meta.suggest_method_and_hparams(supabase, real_clean)
        if suggested:
            explicit = (run.get("method") or "").strip().lower()
            if not explicit or explicit in {"gc", "auto"}:
                print(f"[worker][meta] suggested starting model='{suggested}' proba={proba}")
                method = suggested
                current_method = suggested
                if isinstance(agg_hp, dict) and agg_hp:
                    try:
                        print(f"[worker][meta] suggested hparams={agg_hp}")
                    except Exception:
                        pass
                    current_hparams = {**current_hparams, **agg_hp}
    except Exception:
        pass
    # If explicit auto mode requested or heuristics returned 'auto', run quick benchmark to pick the starting model
    if (method or "").lower() == "auto":
        best, bench = _auto_benchmark_select(real_clean, metadata)
        current_method = best or "gc"
        try:
            print(f"[worker] auto-benchmark chose {current_method.upper()} as starting model")
        except Exception:
            pass
    # Heuristic initial choice for agent mode when method is default gc
    if mode == "agent" and current_method in ("", "gc", None):
        summary = _analyze_schema(real_clean)
        if summary["numeric_ratio"] >= 0.6:
            current_method = "tvae"
        else:
            current_method = "ctgan"
        try:
            _log_step(0, "Heuristic init", f"numeric_ratio={summary['numeric_ratio']:.2f} → {current_method.upper()}", {})
        except Exception:
            pass

    prev_metrics: Optional[Dict[str, Any]] = None
    best_score = 1e9
    best_bundle: Dict[str, Any] = {}
    while True:
        # Build model according to current plan
        try:
            print(f"[worker] attempt={attempts} method={current_method} hparams={json.dumps(current_hparams)}")
        except Exception:
            pass
        try:
            # Differential privacy resolve (env + per-run)
            cfg = run.get("config_json") or {}
            dp_raw = (cfg or {}).get("dp")
            dp_backend, dp_strict, dp_epsilon = resolve_dp_backend(dp_raw if (dp_raw is True or isinstance(dp_raw, dict)) else None)
            dp_requested = dp_backend != "none"
            try:
                print(f"[worker][dp] backend={dp_backend} strict={dp_strict} epsilon={dp_epsilon} method={current_method}")
            except Exception:
                pass

            dp_effective_model = False
            n = int(min(max_synth_rows, max(1, int(len(real_clean) * sample_multiplier))))

            # Custom DP backend (stub)
            if dp_requested and dp_backend == "custom" and current_method in ("ctgan","ct"):
                try:
                    from . import dp_custom  # type: ignore
                except Exception:
                    import dp_custom  # type: ignore
                try:
                    synth = dp_custom.train_dp_ctgan_with_opacus(metadata, real_clean, _sanitize_hparams(current_method, current_hparams), dp_epsilon, 42)
                    if isinstance(synth, pd.DataFrame):
                        synth = synth.head(n).reset_index(drop=True)
                        dp_effective_model = True
                    else:
                        raise RuntimeError("dp_custom returned non-DataFrame")
                except NotImplementedError as e:
                    if dp_strict:
                        raise
                    try:
                        print(f"[worker][dp] custom backend not implemented: {e}; falling back to non-DP.")
                    except Exception:
                        pass
                    # Fall back to standard model below
                    synth_model, _dp_eff = _build_synthesizer(
                        metadata,
                        current_method,
                        _sanitize_hparams(current_method, current_hparams),
                        None,
                    )
                    synth_model.fit(real_clean)
                    synth = synth_model.sample(num_rows=n)
                except Exception as e:
                    if dp_strict:
                        raise
                    try:
                        print(f"[worker][dp] custom backend error: {type(e).__name__}: {e}; fallback non-DP")
                    except Exception:
                        pass
                    synth_model, _dp_eff = _build_synthesizer(
                        metadata,
                        current_method,
                        _sanitize_hparams(current_method, current_hparams),
                        None,
                    )
                    synth_model.fit(real_clean)
                    synth = synth_model.sample(num_rows=n)
            else:
                # Build synthesizer (supports experimental models + DP fallback via synthcity path or SDV fallback)
                dp_opts = None
                if dp_requested:
                    dp_opts = {"dp": True, "epsilon": dp_epsilon, "strict": dp_strict}
                synth_model, dp_effective_model = _build_synthesizer(
                    metadata,
                    current_method,
                    _sanitize_hparams(current_method, current_hparams),
                    dp_opts,
                )
                synth_model.fit(real_clean)
                synth = synth_model.sample(num_rows=n)

            # (generation handled above)
        except Exception as e:
            # Log the model error and try a fallback method if attempts remain
            try:
                _log_step(attempts, f"Error in {current_method.upper()}", f"{type(e).__name__}: {e}", {})
                print(f"[worker] error during {current_method} fit/sample: {type(e).__name__}: {e}")
            except Exception:
                pass
            # Always try a safe fallback instead of failing immediately;
            # GC is robust and should not throw in typical cases.
            # Choose a safe fallback model
            if current_method != "gc":
                current_method = "gc"
                current_hparams = {}
            else:
                current_method = "ctgan"
                current_hparams = {"epochs": 100, "batch_size": 128, "embedding_dim": 64}
            attempts += 1
            continue

        util = _utility_metrics(real_clean, synth)
        priv = _privacy_metrics(real_clean, synth)
        try:
            print(
                f"[worker][metrics] model={current_method} dp_backend={locals().get('dp_backend','none')} dp_effective={bool(locals().get('dp_effective_model', False))} "
                f"ks={util.get('ks_mean')} cd={util.get('corr_delta')} mia={priv.get('mia_auc')}"
            )
        except Exception:
            pass

        # Optional post-processing for agent mode (default on unless disabled)
        apply_pp = (mode == "agent") and (str(_cfg_get(run, "postprocess", "on")).lower() != "off")
        pp_info: Dict[str, Any] = {}
        if apply_pp:
            synth_pp, info = _postprocess(real_clean, synth, priv.get("mia_auc"))
            met_raw = {"utility": util, "privacy": priv}
            met_pp = {"utility": _utility_metrics(real_clean, synth_pp), "privacy": _privacy_metrics(real_clean, synth_pp)}
            if _score_metrics(met_pp) <= _score_metrics(met_raw):
                synth = synth_pp
                util = met_pp["utility"]; priv = met_pp["privacy"]; pp_info = info
        # Pass through declared dp_epsilon if requested (best-effort)
        # Annotate DP fields in privacy metrics
        if isinstance(priv, dict):
            try:
                cfg = run.get("config_json") or {}
                dp_raw = (cfg or {}).get("dp")
                dp_requested = (dp_raw is True) or (isinstance(dp_raw, dict) and dp_raw.get("dp", True))
                dp_epsilon = (dp_raw or {}).get("epsilon") if isinstance(dp_raw, dict) else None
                dp_delta = (dp_raw or {}).get("delta") if isinstance(dp_raw, dict) else None
                priv.update({
                    "dp_requested": bool(dp_requested),
                    "dp_effective": bool(locals().get('dp_effective_model', False) and dp_requested),
                    "dp_epsilon": dp_epsilon if dp_requested else None,
                    "dp_delta": dp_delta if dp_requested else None,
                })
            except Exception:
                pass
        dp_epsilon = None
        try:
            cfg = run.get("config_json") or {}
            if isinstance(cfg, dict) and (cfg.get("dp") is True or isinstance(cfg.get("dp"), dict)):
                d = cfg.get("dp") if isinstance(cfg.get("dp"), dict) else {}
                dp_epsilon = d.get("epsilon")
        except Exception:
            pass
        fairness = _fairness_metrics(real_clean, synth)
        if isinstance(priv, dict):
            priv["dp_epsilon"] = dp_epsilon
        if isinstance(util, dict) and isinstance(fairness, dict):
            util.update({"fairness": fairness})
        composite = {"x_mia": util.get("ks_mean"), "y_utility": util.get("corr_delta")}
        metrics_meta = {
            "model": current_method,
            "attempt": attempts,
            "dp_backend": locals().get('dp_backend','none'),
            "dp_effective": bool(locals().get('dp_effective_model', False)),
            "n_real": int(len(real_clean)),
            "n_synth": int(len(synth)) if isinstance(synth, pd.DataFrame) else None,
        }
        metrics = {"utility": util, "privacy": priv, "composite": composite, "meta": metrics_meta}

        # Log step (for agent visibility)
        overall_ok, reasons = _thresholds_status(metrics)
        if mode == "agent":
            _log_step(attempts, f"Attempt {attempts} using {current_method.upper()}", "; ".join(reasons), metrics)
        try:
            print(f"[worker] attempt={attempts} overall_ok={overall_ok} reasons={'; '.join(reasons)}")
        except Exception:
            pass

        # Track best
        score = _score_metrics(metrics)
        if score < best_score:
            best_score = score
            best_bundle = {
                "metrics": metrics,
                "synth": synth,
                "method": current_method,
                "hparams": dict(current_hparams),
                "sample_multiplier": sample_multiplier,
                "max_synth_rows": max_synth_rows,
                "attempt": attempts,
            }

        if mode != "agent" or overall_ok or attempts >= max_attempts:
            final_metrics = best_bundle.get("metrics", metrics)
            final_synth = best_bundle.get("synth", synth)
            if mode == "agent":
                status_msg = "Success: targets met" if overall_ok else "Stopped: best attempt selected"
                sel = f"best_attempt={best_bundle.get('attempt')} method={best_bundle.get('method')} score={best_score:.3f}"
                _log_step(attempts, status_msg, sel, final_metrics)
            break

        # Agent-led re-plan; fallback to simple heuristic on failure
        next_method = None
        next_hparams: Dict[str, Any] = {}
        # Simple reactive rule: switch model if KS worsens notably vs previous
        try:
            if prev_metrics is not None:
                prev_ks = prev_metrics.get("utility", {}).get("ks_mean")
                curr_ks = metrics.get("utility", {}).get("ks_mean")
                if isinstance(prev_ks, (int, float)) and isinstance(curr_ks, (int, float)) and curr_ks > prev_ks + 0.02:
                    if current_method == "tvae":
                        next_method = "ctgan"
                    elif current_method in ("ctgan", "ct"):
                        next_method = "tvae"
        except Exception:
            pass
        if mode == "agent":
            cfg = run.get("config_json") or {}
            agent = cfg.get("agent") if isinstance(cfg, dict) else {}
            agent_provider = run.get("agent_provider") or (agent or {}).get("provider")
            agent_model = run.get("agent_model") or (agent or {}).get("model") or "llama3.1:8b"
            agent_prompt = run.get("agent_prompt") or (cfg.get("prompt") if isinstance(cfg, dict) else None)
            plan = _agent_plan_ollama((ds.data or {}).get("name") or "dataset", (ds.data or {}).get("schema_json") or {}, metrics, agent_prompt, agent_provider, agent_model)
            if isinstance(plan, dict) and plan:
                try:
                    print(f"[worker][agent] plan={json.dumps(plan, ensure_ascii=False)}")
                except Exception:
                    pass
                nm = str(plan.get("method") or "").lower()
                if nm in {"gc","ctgan","tvae"}:
                    next_method = nm
                hp = plan.get("hparams") or {}
                if isinstance(hp, dict):
                    next_hparams = _filter_hparams(next_method or current_method, hp)
                # allow agent to tweak sample limits
                try:
                    sm = plan.get("sample_multiplier")
                    if isinstance(sm, (int,float)) and sm>0:
                        sample_multiplier = float(sm)
                except Exception:
                    pass
                try:
                    msr = plan.get("max_synth_rows")
                    if isinstance(msr, (int,float)) and msr>0:
                        max_synth_rows = int(msr)
                except Exception:
                    pass
                # log agent suggestion
                try:
                    notes = plan.get("notes") or ""
                    _log_step(attempts, "Agent suggestion", f"method={next_method or current_method}; hparams={json.dumps(next_hparams)}; {notes}", metrics)
                except Exception:
                    pass

        if not next_method:
            # Fallback heuristic switch
            if current_method == "gc":
                next_method = "ctgan"
                next_hparams = {**current_hparams}
                next_hparams.setdefault("epochs", 300)
                next_hparams.setdefault("batch_size", 128)
                next_hparams.setdefault("embedding_dim", 128)
            elif current_method == "ctgan":
                next_method = "tvae"
                next_hparams = {**current_hparams}
                next_hparams.setdefault("epochs", 300)
                next_hparams.setdefault("batch_size", 128)
                next_hparams.setdefault("embedding_dim", 128)
            else:
                next_method = "gc"
                next_hparams = {}

        # Provide default knobs for chosen model
        def _defaults(m: str) -> Dict[str, Any]:
            if m in ("ctgan", "ct"):
                return {"epochs": 300, "batch_size": 128, "embedding_dim": 128, "pac": 10}
            if m == "tvae":
                return {"epochs": 250, "batch_size": 128, "embedding_dim": 64}
            return {}
        current_method = next_method
        current_hparams = {**_defaults(next_method), **_sanitize_hparams(next_method, next_hparams)}
        prev_metrics = metrics
        attempts += 1

    print("[worker] metrics:", json.dumps(final_metrics, indent=2))
    # Save meta-run record (best-effort)
    try:
        meta.save_meta_run(
            supabase,
            run,
            real_clean,
            best_bundle.get("method", current_method),
            final_metrics,
            best_bundle.get("hparams", current_hparams),
        )
    except Exception:
        pass

    # Enforce schema types (e.g., keep integer columns as integers)
    try:
        final_synth = _enforce_schema_dtypes(real, final_synth)
    except Exception:
        pass

    # Artifacts
    artifacts = _make_artifacts(run["id"], final_synth, final_metrics)
    result = {"metrics": final_metrics, "artifacts": artifacts}

    # Persist final used config into runs.config_json (best-effort)
    final_cfg = dict(best_bundle.get("hparams", current_hparams))
    final_cfg.update({
        "method": best_bundle.get("method", current_method) or "gc",
        "sample_multiplier": best_bundle.get("sample_multiplier", sample_multiplier),
        "max_synth_rows": best_bundle.get("max_synth_rows", max_synth_rows),
        "postprocess": "on",
    })
    try:
        supabase.table("runs").update({
            "config_json": final_cfg,
            "method": final_cfg.get("method", current_method) or "gc",
        }).eq("id", run["id"]).execute()
    except Exception:
        # Column may not exist; ignore silently
        pass

    return result


def _fairness_metrics(real: pd.DataFrame, synth: pd.DataFrame) -> Dict[str, Any]:
    """
    Simple representation metrics:
      - rare_coverage: average fraction of rare categories (<=1% in real) that appear in synth
      - freq_skew: mean absolute diff across normalized category distributions (averaged across columns)
    """
    try:
        cols = []
        for c in real.columns:
            if real[c].dtype.kind not in "biufcM":  # treat as categorical/text
                cols.append(c)
            else:
                # also consider low-cardinality numeric as categorical
                try:
                    if real[c].nunique(dropna=True) <= 10:
                        cols.append(c)
                except Exception:
                    pass
        coverages = []
        skews = []
        for c in cols:
            rvc = real[c].astype(str).value_counts(dropna=False)
            svc = synth[c].astype(str).value_counts(dropna=False) if c in synth.columns else pd.Series(dtype=int)
            rdist = (rvc / max(1, len(real))).to_dict()
            sdist = (svc / max(1, len(synth))).to_dict()
            # rare categories in real (<=1%)
            rare = [k for k, v in rdist.items() if v <= 0.01]
            if rare:
                cov = sum(1 for k in rare if sdist.get(k, 0) > 0) / len(rare)
                coverages.append(float(cov))
            # distribution skew over common support
            keys = set(rdist.keys()) & set(sdist.keys())
            if keys:
                skew = sum(abs(rdist[k] - sdist[k]) for k in keys) / len(keys)
                skews.append(float(skew))
        return {
            "rare_coverage": float(sum(coverages) / len(coverages)) if coverages else None,
            "freq_skew": float(sum(skews) / len(skews)) if skews else None,
        }
    except Exception:
        return {"rare_coverage": None, "freq_skew": None}

# -------------------- Plan attempt helper --------------------
def _attempt_train(plan_item: Dict[str, Any], real_df: pd.DataFrame, metadata: SingleTableMetadata,
                   default_sample_multiplier: float = SAMPLE_MULTIPLIER,
                   default_max_rows: int = MAX_SYNTH_ROWS) -> Dict[str, Any]:
    """Train according to a plan item and return synth + metrics.

    plan_item: { "method": "gc|ctgan|tvae", "hyperparams": { sample_multiplier, max_synth_rows, ctgan?{}, tvae?{} } }
    Returns: { "synth": DataFrame, "metrics": {...}, "method": str }
    """
    method = str((plan_item or {}).get("method") or "gc").lower()
    hp_all = (plan_item or {}).get("hyperparams") or {}
    # rows control
    sample_multiplier = float(hp_all.get("sample_multiplier", default_sample_multiplier) or default_sample_multiplier)
    max_synth_rows = int(hp_all.get("max_synth_rows", default_max_rows) or default_max_rows)
    n = int(min(max_synth_rows, max(1, int(len(real_df) * sample_multiplier))))

    # model hparams
    base_hp = {}
    if method == "ctgan":
        base_hp = _sanitize_hparams(method, {**(hp_all.get("ctgan", {})), **{k: v for k, v in hp_all.items() if k in ("epochs","batch_size","embedding_dim","pac")}})
        model = CTGANSynthesizer(metadata, **base_hp)
    elif method == "tvae":
        base_hp = _sanitize_hparams(method, {**(hp_all.get("tvae", {})), **{k: v for k, v in hp_all.items() if k in ("epochs","batch_size","embedding_dim")}})
        model = TVAESynthesizer(metadata, **base_hp)
    else:
        method = "gc"
        model = GaussianCopulaSynthesizer(metadata)

    model.fit(real_df)
    synth = model.sample(num_rows=n)

    util = _utility_metrics(real_df, synth)
    priv = _privacy_metrics(real_df, synth)
    fair = _fairness_metrics(real_df, synth)
    metrics: Dict[str, Any] = {"utility": util, "privacy": priv, "fairness": fair}
    return {"synth": synth, "metrics": metrics, "method": method, "n": n}

# -------------------- Worker Loop --------------------

def worker_loop():
    ensure_bucket(ARTIFACT_BUCKET)
    tick = 0
    while True:
        run = None
        try:
            # Periodic visibility into queue depth to simplify ops
            tick += 1
            if tick % 15 == 0:
                try:
                    qc = supabase.table("runs").select("id", count="exact").eq("status", "queued").execute()
                    print(f"[worker] queue depth={qc.count or 0}")
                except Exception:
                    pass

            q = supabase.table("runs").select("*").eq("status", "queued").limit(1).execute()
            run = (q.data or [None])[0]
            if not run:
                time.sleep(POLL_SECONDS)
                continue

            supabase.table("runs").update({
                "status": "running",
                "started_at": datetime.utcnow().isoformat()
            }).eq("id", run["id"]).execute()

            result = execute_pipeline(run)

            # Save metrics + artifacts
            supabase.table("metrics").insert({
                "run_id": run["id"],
                "payload_json": result["metrics"]
            }).execute()

            for kind, path in result["artifacts"].items():
                supabase.table("run_artifacts").upsert({
                    "run_id": run["id"],
                    "kind": kind,
                    "path": path
                }).execute()

            supabase.table("runs").update({
                "status": "succeeded",
                "finished_at": datetime.utcnow().isoformat()
            }).eq("id", run["id"]).execute()

        except Exception as e:
            print(f"[worker] error: {type(e).__name__}: {e}")
            try:
                if run and run.get("id"):
                    supabase.table("runs").update({
                        "status": "failed",
                        "finished_at": datetime.utcnow().isoformat()
                    }).eq("id", run["id"]).execute()
            except Exception:
                pass
            time.sleep(1.0)

if __name__ == "__main__":
    worker_loop()
