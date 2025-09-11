from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd


def extract_features(df: pd.DataFrame) -> Dict[str, float]:
    """Compute simple meta-features for a tabular dataset.

    Features:
      - n_rows, n_cols
      - num_cols, cat_cols
      - pct_num, pct_cat
      - num_mean_skew (mean absolute skewness over numeric cols)
      - num_std_skew (std of absolute skewness)
    """
    try:
        n_rows = int(df.shape[0])
        n_cols = int(df.shape[1]) or 1
        num_cols = int(len(df.select_dtypes(include=[np.number]).columns))
        # Treat non-numeric, non-datetime as categorical
        dt_cols = int(len(df.select_dtypes(include=["datetime64[ns]", "datetime64[ns, tz]"]).columns))
        cat_cols = max(0, n_cols - num_cols - dt_cols)
        pct_num = float(num_cols) / n_cols
        pct_cat = float(cat_cols) / n_cols

        # Skewness over numeric columns
        num_df = df.select_dtypes(include=[np.number])
        if num_df.shape[1] > 0:
            try:
                skew_vals = num_df.apply(lambda s: float(pd.Series(s).skew(skipna=True)))
                abs_skew = skew_vals.abs().replace([np.inf, -np.inf], np.nan).dropna()
                num_mean_skew = float(abs_skew.mean()) if len(abs_skew) else 0.0
                num_std_skew = float(abs_skew.std()) if len(abs_skew) else 0.0
            except Exception:
                num_mean_skew = 0.0
                num_std_skew = 0.0
        else:
            num_mean_skew = 0.0
            num_std_skew = 0.0

        return {
            "n_rows": float(n_rows),
            "n_cols": float(n_cols),
            "num_cols": float(num_cols),
            "cat_cols": float(cat_cols),
            "pct_num": float(pct_num),
            "pct_cat": float(pct_cat),
            "num_mean_skew": float(num_mean_skew),
            "num_std_skew": float(num_std_skew),
        }
    except Exception:
        # Best-effort minimal features
        return {
            "n_rows": float(df.shape[0] if hasattr(df, "shape") else 0),
            "n_cols": float(df.shape[1] if hasattr(df, "shape") else 0),
            "pct_num": 0.0,
            "pct_cat": 0.0,
            "num_mean_skew": 0.0,
            "num_std_skew": 0.0,
        }


def composite_score(metrics: Dict[str, Any]) -> float:
    """Compute a composite score aligned with quick benchmark scoring.

    Lower is better: ks_mean + corr_delta + 0.5*mia_auc
    """
    try:
        u = (metrics or {}).get("utility", {})
        p = (metrics or {}).get("privacy", {})
        ks = float(u.get("ks_mean") or 0.0)
        cd = float(u.get("corr_delta") or 0.0)
        mia = float(p.get("mia_auc") or 0.0)
        return ks + cd + 0.5 * mia
    except Exception:
        return float("inf")


def save_meta_run(
    supabase,
    run: Dict[str, Any],
    df: pd.DataFrame,
    method: str,
    metrics: Dict[str, Any],
    hparams: Optional[Dict[str, Any]] = None,
) -> None:
    """Persist a meta record for this run into the 'meta_runs' table, best-effort."""
    try:
        feats = extract_features(df)
        payload = {
            "run_id": run.get("id"),
            "dataset_id": run.get("dataset_id"),
            "project_id": run.get("project_id"),
            "method": method,
            "features_json": feats,
            "scores_json": metrics,
            "hparams_json": hparams or {},
            "composite": composite_score(metrics),
        }
        supabase.table("meta_runs").insert(payload).execute()
    except Exception:
        # table may not exist or permissions could block insert; ignore
        pass


def _to_frame(rows: Any, feat_keys: Optional[list] = None):
    import pandas as pd  # local
    X_list = []
    y_list = []
    feat_keys = feat_keys or [
        "n_rows",
        "n_cols",
        "num_cols",
        "cat_cols",
        "pct_num",
        "pct_cat",
        "num_mean_skew",
        "num_std_skew",
    ]
    for r in rows or []:
        fj = r.get("features_json") or {}
        X_list.append([float(fj.get(k, 0.0)) for k in feat_keys])
        y_list.append(str(r.get("method") or "gc"))
    X = pd.DataFrame(X_list, columns=feat_keys)
    y = pd.Series(y_list)
    return X, y, feat_keys


def suggest_model(supabase, df: pd.DataFrame) -> Tuple[Optional[str], Dict[str, float]]:
    """Train a lightweight classifier on past meta runs and predict a model for the given df.

    Returns (model, proba_map). If insufficient data, returns (None, {}).
    """
    try:
        rows = supabase.table("meta_runs").select("method,features_json").limit(500).execute().data
    except Exception:
        rows = []
    if not rows or len(rows) < 10:
        return None, {}

    try:
        from sklearn.ensemble import RandomForestClassifier
    except Exception:
        return None, {}

    X, y, keys = _to_frame(rows)
    if X.shape[0] < 10:
        return None, {}
    try:
        clf = RandomForestClassifier(n_estimators=120, random_state=42)
        clf.fit(X, y)
    except Exception:
        return None, {}

    feats = extract_features(df)
    x = pd.DataFrame([[feats.get(k, 0.0) for k in keys]], columns=keys)
    try:
        proba = clf.predict_proba(x)[0]
        classes = list(map(str, clf.classes_))
        proba_map = {classes[i]: float(proba[i]) for i in range(len(classes))}
        best = classes[int(np.argmax(proba))]
        return best, proba_map
    except Exception:
        try:
            pred = str(clf.predict(x)[0])
            return pred, {}
        except Exception:
            return None, {}


def _aggregate_hparams(rows: Any, method: str) -> Dict[str, Any]:
    """Return median/most-common hyperparameters for the given method from past runs."""
    try:
        import statistics
    except Exception:
        statistics = None  # type: ignore
    vals = {"epochs": [], "batch_size": [], "embedding_dim": [], "pac": []}
    for r in rows or []:
        if str(r.get("method") or "").lower() != method:
            continue
        hp = r.get("hparams_json") or {}
        for k in list(vals.keys()):
            v = hp.get(k)
            if isinstance(v, (int, float)):
                vals[k].append(float(v))
    out: Dict[str, Any] = {}
    for k, arr in vals.items():
        if arr:
            try:
                out[k] = int(statistics.median(arr)) if statistics else int(sum(arr) / len(arr))
            except Exception:
                out[k] = int(arr[0])
    return out


def suggest_method_and_hparams(supabase, df: pd.DataFrame) -> Tuple[Optional[str], Dict[str, float], Dict[str, Any]]:
    """Suggest a method and aggregate hyperparameters based on meta_runs."""
    try:
        rows = supabase.table("meta_runs").select("method,features_json,hparams_json").limit(500).execute().data
    except Exception:
        rows = []
    method, proba = suggest_model(supabase, df)
    if not method:
        return None, {}, {}
    hp = _aggregate_hparams(rows, method)
    return method, proba, hp
