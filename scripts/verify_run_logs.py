#!/usr/bin/env python3
"""
Verify Run Logs - Check what method and preprocessor was used
"""
import sys
import os
import json
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

try:
    from dotenv import load_dotenv
    load_dotenv()
    from supabase import create_client
    
    SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set")
        sys.exit(1)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    def verify_run(run_id: str):
        """Verify a run's method, preprocessor, and metrics"""
        print(f"\n{'='*80}")
        print(f"VERIFYING RUN: {run_id}")
        print(f"{'='*80}\n")
        
        # Get run details
        try:
            run_res = supabase.table("runs").select("*").eq("id", run_id).execute()
            if not run_res.data:
                print(f"ERROR: Run {run_id} not found")
                return
            
            run = run_res.data[0]
            print(f"Run Name: {run.get('name', 'N/A')}")
            print(f"Status: {run.get('status', 'N/A')}")
            print(f"Method: {run.get('method', 'N/A')}")
            print(f"Mode: {run.get('mode', 'N/A')}")
            print(f"Started: {run.get('started_at', 'N/A')}")
            print(f"Finished: {run.get('finished_at', 'N/A')}")
            
            # Check config_json for plan and preprocessor info
            config = run.get('config_json') or {}
            plan = config.get('plan') or {}
            
            print(f"\n--- Agent Plan ---")
            if plan:
                choice = plan.get('choice') or {}
                if isinstance(choice, dict):
                    method = choice.get('method', 'N/A')
                    rationale = choice.get('rationale', 'N/A')
                    print(f"  Method: {method}")
                    print(f"  Rationale: {rationale}")
                else:
                    print(f"  Plan Choice: {choice}")
                
                backups = plan.get('backup') or []
                if backups:
                    print(f"  Backup Methods: {[b.get('method') if isinstance(b, dict) else str(b) for b in backups]}")
            else:
                print("  No agent plan found")
            
            # Check for clinical preprocessor usage
            print(f"\n--- Clinical Preprocessor v18 ---")
            clinical_preprocessing = config.get('clinical_preprocessing', False)
            print(f"  Config Flag: {clinical_preprocessing}")
            
            # Get run steps to check for preprocessor logs
            steps_res = supabase.table("run_steps").select("*").eq("run_id", run_id).order("step_no").execute()
            steps = steps_res.data or []
            
            print(f"\n--- Execution Steps ({len(steps)} total) ---")
            clinical_preprocessor_used = False
            method_used = None
            
            for step in steps[:20]:  # Show first 20 steps
                step_no = step.get('step_no', 'N/A')
                title = step.get('title', 'N/A')
                detail = step.get('detail', '')
                
                # Check for clinical preprocessor logs
                if 'clinical-preprocessor' in detail.lower() or 'clinicalpreprocessor' in detail.lower():
                    clinical_preprocessor_used = True
                    print(f"  Step {step_no}: {title}")
                    print(f"    → {detail}")
                
                # Check for method used
                if 'method=' in detail.lower():
                    method_used = detail.split('method=')[-1].split()[0].strip()
                    print(f"  Step {step_no}: {title}")
                    print(f"    → Method: {method_used}")
            
            print(f"\n--- Summary ---")
            print(f"  Method Used: {method_used or run.get('method', 'N/A')}")
            print(f"  Clinical Preprocessor v18 Used: {'YES' if clinical_preprocessor_used else 'NO'}")
            
            if run.get('method') == 'ddpm' and not clinical_preprocessor_used:
                print(f"\n  ⚠️  WARNING: TabDDPM was used but Clinical Preprocessor v18 was NOT detected!")
                print(f"     Expected: TabDDPM should use Clinical Preprocessor v18 for best results")
            
            # Get metrics
            metrics_res = supabase.table("metrics").select("*").eq("run_id", run_id).execute()
            if metrics_res.data:
                metrics = metrics_res.data[0].get('payload_json') or {}
                print(f"\n--- Metrics ---")
                
                utility = metrics.get('utility', {})
                privacy = metrics.get('privacy', {})
                
                ks_mean = utility.get('ks_mean', 'N/A')
                corr_delta = utility.get('corr_delta', 'N/A')
                mia_auc = privacy.get('mia_auc', 'N/A')
                
                print(f"  KS Mean: {ks_mean} (target: ≤0.10)")
                print(f"  Corr Δ: {corr_delta} (target: ≤0.10)")
                print(f"  MIA AUC: {mia_auc} (target: ≤0.60)")
                
                # Check if all green
                all_green = True
                if isinstance(ks_mean, (int, float)) and ks_mean > 0.10:
                    all_green = False
                    print(f"    ❌ KS Mean exceeds threshold")
                if isinstance(corr_delta, (int, float)) and corr_delta > 0.10:
                    all_green = False
                    print(f"    ❌ Corr Δ exceeds threshold")
                if isinstance(mia_auc, (int, float)) and mia_auc > 0.60:
                    all_green = False
                    print(f"    ❌ MIA AUC exceeds threshold")
                
                if all_green and isinstance(ks_mean, (int, float)):
                    print(f"\n  ✅ ALL GREEN METRICS ACHIEVED!")
                else:
                    print(f"\n  ⚠️  Not all green metrics achieved")
            else:
                print(f"\n  No metrics found")
            
        except Exception as e:
            print(f"ERROR: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
    
    if __name__ == "__main__":
        if len(sys.argv) < 2:
            print("Usage: python verify_run_logs.py <run_id>")
            print("\nExample:")
            print("  python verify_run_logs.py abc123-def456-ghi789")
            sys.exit(1)
        
        run_id = sys.argv[1]
        verify_run(run_id)

except ImportError as e:
    print(f"ERROR: Missing dependencies: {e}")
    print("Please install: pip install python-dotenv supabase")
    sys.exit(1)
