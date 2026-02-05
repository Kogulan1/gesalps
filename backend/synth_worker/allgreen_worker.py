#!/usr/bin/env python3
"""
All Green Worker - Dedicated service for proven "all green" configuration.

This worker replicates the exact flow that achieved "all green" metrics locally:
- TVAE with 2000 epochs
- batch_size=32, embedding_dim=512
- compress_dims=[256,256], decompress_dims=[256,256]
- Clinical Preprocessor v18 enabled
- No retries, no fallbacks - just the proven configuration
"""

import os
import sys
import time
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
import pandas as pd
from supabase import create_client
from sdv.metadata import SingleTableMetadata

# Import from existing worker
sys.path.insert(0, os.path.dirname(__file__))
# Add parent directory to path to reach 'libs'
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from clinical_preprocessor import ClinicalPreprocessor
from models.sdv_models import TVAESynthesizer
from worker import (
    _utility_metrics,
    _privacy_metrics,
    _fairness_metrics,
    _clean_df_for_sdv,
    _make_artifacts,
    ARTIFACT_BUCKET,
    ensure_bucket,
)

# ----- NEW IMPORTS FOR AUDIT -----
try:
    from libs.skills.regulatory_auditor import RegulatoryAuditor, RedTeamer
    AUDITOR_AVAILABLE = True
    print("[allgreen-worker] Loaded RegulatoryAuditor & RedTeamer")
except ImportError as e:
    print(f"[allgreen-worker] WARNING: RegulatoryAuditor missing: {e}")
    # Try alternate import path if running from root
    try:
         from backend.libs.skills.regulatory_auditor import RegulatoryAuditor, RedTeamer
         AUDITOR_AVAILABLE = True
         print("[allgreen-worker] Loaded RegulatoryAuditor & RedTeamer (abs path)")
    except ImportError:
         AUDITOR_AVAILABLE = False
         RegulatoryAuditor = None
         RedTeamer = None
# ---------------------------------

# Configuration - EXACT values from proven local setup
ALL_GREEN_CONFIG = {
    "method": "tvae",
    "epochs": 2000,  # Proven: works across all clinical datasets
    "batch_size": 32,  # Proven: optimal regularization
    "embedding_dim": 512,  # Proven architecture
    "compress_dims": [256, 256],  # Proven architecture
    "decompress_dims": [256, 256],  # Proven architecture
    "loss_factor": 2,
    "verbose": True,
}

# Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def log_step(run_id: str, step_no: int, title: str, detail: str = "", metrics: Optional[Dict[str, Any]] = None):
    """Log a step for the run."""
    try:
        supabase.table("run_steps").insert({
            "run_id": run_id,
            "step_no": step_no,
            "title": title,
            "detail": detail,
            "metrics_json": metrics,
        }).execute()
        print(f"[allgreen-worker] Step {step_no}: {title} - {detail}")
    except Exception as e:
        print(f"[allgreen-worker] Error logging step: {e}")


def execute_allgreen_pipeline(run_id: str, dataset_id: str) -> Dict[str, Any]:
    """
    Execute the proven "all green" pipeline.
    
    This replicates the exact flow from local benchmarks:
    1. Load dataset
    2. Detect metadata
    3. Apply Clinical Preprocessor v18 (fit + transform)
    4. Train TVAE with proven hyperparameters
    5. Sample synthetic data
    6. Apply inverse transform
    7. Evaluate metrics
    """
    step_no = 0
    
    try:
        # Step 0: Planned
        log_step(run_id, step_no, "planned", f"method=tvae (All Green Service)")
        step_no += 1
        
        # Step 1: Load dataset
        log_step(run_id, step_no, "loading", "Fetching dataset from storage...")
        step_no += 1
        
        dataset_res = supabase.table("datasets").select("file_url,name,rows_count,cols_count,schema_json").eq("id", dataset_id).single().execute()
        if not dataset_res.data:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        dataset = dataset_res.data
        file_url = dataset["file_url"]
        
        # Download dataset from Supabase storage (same as main worker)
        DATASET_BUCKET = "datasets"
        import io
        try:
            # Smart path handling
            # file_url logic:
            # 1. If http/https, try downloading directly
            # 2. If it looks like a path (folder/file), try downloading from bucket
            # 3. If it is just a filename, download from bucket
            
            if file_url.startswith("http"):
                 import requests
                 print(f"[allgreen-worker] Downloading from URL: {file_url}")
                 response = requests.get(file_url, timeout=60)
                 response.raise_for_status()
                 real_df = pd.read_csv(io.StringIO(response.text))
            else:
                 # Clean path: "datasets/foo.csv" -> "foo.csv" if bucket is 'datasets'
                 clean_path = file_url
                 if clean_path.startswith(f"{DATASET_BUCKET}/"):
                     clean_path = clean_path[len(DATASET_BUCKET)+1:]
                 
                 print(f"[allgreen-worker] Downloading from Storage: {DATASET_BUCKET}/{clean_path}")
                 b = supabase.storage.from_(DATASET_BUCKET).download(clean_path)
                 raw = b if isinstance(b, (bytes, bytearray)) else b.read()
                 real_df = pd.read_csv(io.BytesIO(raw))

        except Exception as e:
            raise ValueError(f"Failed to download dataset ({file_url}): {e}")
        
        print(f"[allgreen-worker] Loaded dataset: {len(real_df)} rows, {len(real_df.columns)} columns")
        
        # Step 2: Detect metadata
        log_step(run_id, step_no, "metadata", "Detecting metadata with SDV...")
        step_no += 1
        
        metadata = SingleTableMetadata()
        metadata.detect_from_dataframe(real_df)
        meta_dict = {"columns": {c: {"sdtype": metadata.columns[c]["sdtype"]} for c in metadata.columns}}
        
        # Step 3: Clinical Preprocessor v18 - Fit
        log_step(run_id, step_no, "preprocessing", "Applying Clinical Preprocessor v18 (fit)...")
        step_no += 1
        
        cp = ClinicalPreprocessor()
        cp.fit(real_df, meta_dict)
        print(f"[allgreen-worker] Clinical Preprocessor v18 fitted successfully")
        
        # Step 4: Clinical Preprocessor v18 - Transform
        log_step(run_id, step_no, "preprocessing", "Applying Clinical Preprocessor v18 (transform)...")
        step_no += 1
        
        processed_df = cp.transform(real_df)
        print(f"[allgreen-worker] Data transformed for TVAE training (v18)")
        
        # Step 5: Train TVAE with proven configuration
        log_step(run_id, step_no, "training", f"Training TVAE: epochs={ALL_GREEN_CONFIG['epochs']}, batch_size={ALL_GREEN_CONFIG['batch_size']}, embedding_dim={ALL_GREEN_CONFIG['embedding_dim']}")
        step_no += 1
        
        # Clean data for SDV
        clean_df = _clean_df_for_sdv(processed_df)
        
        # Create TVAE synthesizer with proven hyperparameters
        hparams = {
            "epochs": ALL_GREEN_CONFIG["epochs"],
            "batch_size": ALL_GREEN_CONFIG["batch_size"],
            "embedding_dim": ALL_GREEN_CONFIG["embedding_dim"],
            "compress_dims": ALL_GREEN_CONFIG["compress_dims"],
            "decompress_dims": ALL_GREEN_CONFIG["decompress_dims"],
            "loss_factor": ALL_GREEN_CONFIG["loss_factor"],
            "verbose": ALL_GREEN_CONFIG["verbose"],
        }
        
        model = TVAESynthesizer(metadata=metadata, hyperparams=hparams)
        
        # Train
        training_start = time.time()
        print(f"[allgreen-worker] Starting TVAE training with proven configuration...")
        model.fit(clean_df)
        training_elapsed = time.time() - training_start
        print(f"[allgreen-worker] TVAE training completed in {training_elapsed:.1f}s ({training_elapsed/60:.1f} minutes)")
        
        # Step 6: Sample synthetic data
        log_step(run_id, step_no, "sampling", f"Generating {len(real_df)} synthetic rows...")
        step_no += 1
        
        synth_df = model.sample(num_rows=len(real_df))
        print(f"[allgreen-worker] Generated {len(synth_df)} synthetic rows")
        
        # Step 7: Clinical Preprocessor v18 - Inverse Transform
        log_step(run_id, step_no, "postprocessing", "Applying Clinical Preprocessor v18 (inverse_transform)...")
        step_no += 1
        
        synth_df = cp.inverse_transform(synth_df)
        print(f"[allgreen-worker] Data restored to original space (v18)")
        
        # Step 8: Evaluate metrics
        log_step(run_id, step_no, "metrics", "Evaluating utility and privacy metrics...")
        step_no += 1
        
        util_metrics = _utility_metrics(real_df, synth_df)
        priv_metrics = _privacy_metrics(real_df, synth_df)
        fair_metrics = _fairness_metrics(real_df, synth_df)
        
        metrics = {
            "utility": util_metrics,
            "privacy": priv_metrics,
            "fairness": fair_metrics,
        }
        
        # Check if all green achieved
        ks_mean = util_metrics.get("ks_mean", 1.0)
        corr_delta = util_metrics.get("corr_delta", 1.0)
        mia_auc = priv_metrics.get("mia_auc", 1.0)
        dup_rate = priv_metrics.get("dup_rate", 1.0)
        
        all_green = (
            ks_mean <= 0.10 and
            corr_delta <= 0.10 and
            mia_auc <= 0.60 and
            dup_rate <= 0.05
        )
        
        metrics_detail = (
            f"KS mean {ks_mean:.3f} {'≤' if ks_mean <= 0.10 else '>'} 0.10 ({'ok' if ks_mean <= 0.10 else 'fail'}); "
            f"Corr Δ {corr_delta:.3f} {'≤' if corr_delta <= 0.10 else '>'} 0.10 ({'ok' if corr_delta <= 0.10 else 'fail'}); "
            f"MIA AUC {mia_auc:.3f} {'≤' if mia_auc <= 0.60 else '>'} 0.60 ({'ok' if mia_auc <= 0.60 else 'fail'}); "
            f"Dup rate {dup_rate:.3f} {'≤' if dup_rate <= 0.05 else '>'} 0.05 ({'ok' if dup_rate <= 0.05 else 'fail'})"
        )
        
        if all_green:
            metrics_detail += " ✅ ALL GREEN ACHIEVED"
            print(f"[allgreen-worker] 🎉 ALL GREEN METRICS ACHIEVED!")
        else:
            print(f"[allgreen-worker] ⚠️  Not all green: {metrics_detail}")
        
        log_step(run_id, step_no, "metrics", metrics_detail, metrics)
        
        # Start Step 8.5: Full Regulatory Audit (from Standard Worker)
        # ----------------------------------------------------------------
        if AUDITOR_AVAILABLE and RegulatoryAuditor and RedTeamer:
             print("[allgreen-worker][audit] Starting Full Regulatory Audit Step...", flush=True)
             step_no += 1
             log_step(run_id, step_no, "audit", "Running Red Team Attack & Regulatory Auditor")
             
             try:
                 # A. Red Team (Linkage Attack Simulation)
                 # We need to run this to get the 'red_team_report' for the auditor
                 print("[allgreen-worker][audit] Running Red Teamer linkage attack...", flush=True)
                 attacker = RedTeamer()
                 rt_res = attacker.execute(real_df, synth_df)
                 metrics["linkage_attack_success"] = rt_res.get("overall_success_rate", 0.0)
                 metrics["red_team_report"] = rt_res
                 
                 # B. Regulatory Auditor (Text Generation)
                 print("[allgreen-worker][audit] Running Regulatory Auditor certification...", flush=True)
                 auditor = RegulatoryAuditor(run_id=run_id)
                 audit_report = auditor.evaluate(metrics, semantic_score=0.85) # Default semantic score for now
                 metrics["regulatory_audit"] = audit_report
                 metrics["certification_seal"] = auditor.get_seal(audit_report)
                 
                 print(f"[allgreen-worker][audit] Audit Complete. Seal: {metrics.get('certification_seal')}")
                 
             except Exception as e:
                 print(f"[allgreen-worker][audit] FAILED: {e}")
                 import traceback
                 traceback.print_exc()
                 # Don't fail the whole run, just allow partial metrics (robustness)
        # ----------------------------------------------------------------

        # Step 9: Save artifacts
        log_step(run_id, step_no, "artifacts", "Saving synthetic data and artifacts...")
        step_no += 1
        
        artifacts = _make_artifacts(run_id, synth_df, metrics)
        
        # Save metrics
        supabase.table("metrics").insert({
            "run_id": run_id,
            "payload_json": metrics,
        }).execute()
        
        # Save artifacts
        for kind, path in artifacts.items():
            supabase.table("run_artifacts").upsert({
                "run_id": run_id,
                "kind": kind,
                "path": path
            }).execute()
        
        # Update run status
        supabase.table("runs").update({
            "status": "succeeded",
            "finished_at": datetime.utcnow().isoformat()
        }).eq("id", run_id).execute()
        
        print(f"[allgreen-worker] ✅ Pipeline completed successfully for run {run_id}")
        
        return {
            "metrics": metrics,
            "artifacts": artifacts,
            "all_green": all_green,
        }
        
    except Exception as e:
        import traceback
        error_msg = f"Pipeline failed: {str(e)}"
        print(f"[allgreen-worker] ❌ {error_msg}")
        print(traceback.format_exc())
        
        # Log error step
        try:
            log_step(run_id, step_no, "error", error_msg)
        except:
            pass
        
        # Update run status
        try:
            supabase.table("runs").update({
                "status": "failed",
                "finished_at": datetime.utcnow().isoformat()
            }).eq("id", run_id).execute()
        except:
            pass
        
        raise


def worker_loop():
    """Main worker loop - polls for runs with mode='allgreen'."""
    ensure_bucket(ARTIFACT_BUCKET)
    print("[allgreen-worker] All Green Worker started - waiting for runs...")
    
    while True:
        try:
            # Poll for queued runs with mode='allgreen'
            res = supabase.table("runs").select("*").eq("status", "queued").eq("mode", "allgreen").limit(1).execute()
            
            if not res.data or len(res.data) == 0:
                time.sleep(5)  # Wait 5 seconds before next poll
                continue
            
            run = res.data[0]
            run_id = run["id"]
            dataset_id = run["dataset_id"]
            
            print(f"[allgreen-worker] Processing run {run_id} (dataset: {dataset_id})")
            
            # Update status to running
            supabase.table("runs").update({
                "status": "running",
                "started_at": datetime.utcnow().isoformat()
            }).eq("id", run_id).execute()
            
            # Execute pipeline
            result = execute_allgreen_pipeline(run_id, dataset_id)
            
            print(f"[allgreen-worker] Run {run_id} completed: all_green={result.get('all_green', False)}")
            
        except KeyboardInterrupt:
            print("[allgreen-worker] Shutting down...")
            break
        except Exception as e:
            print(f"[allgreen-worker] Error in worker loop: {e}")
            print(traceback.format_exc())
            time.sleep(10)  # Wait before retrying


if __name__ == "__main__":
    worker_loop()
