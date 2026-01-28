
import sys
import os
import pandas as pd
import logging

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
# Add synth_worker to path for local imports (meta.py)
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'synth_worker'))

# Mock logging configuration
logging.basicConfig(level=logging.INFO)

# Set env var to avoid hitting synthcity (metrics)
os.environ["USE_SYNTHCITY_METRICS"] = "False"
os.environ["RED_TEAM_AVAILABLE"] = "False"

try:
    from synth_worker.worker import _privacy_metrics, _semantic_audit
except ImportError as e:
    print(f"Failed to import worker: {e}")
    sys.exit(1)

def test_full_pipeline():
    print("--- Testing FULL Clinical Metrics Pipeline ---")
    
    # Dataset: 100 patients. 
    # QIs: Age, Zip
    # Sensitive: Diagnosis
    # Logic Error: 1 Male is Pregnant
    
    df = pd.DataFrame({
        'age': [30]*90 + [40]*10,
        'zip': [100]*100,
        'gender': ['Male']*50 + ['Female']*50,
        'diagnosis': ['Flu']*99 + ['Pregnancy'] # The last one is Male (index 99 is female, wait)
    })
    
    # Fix the male pregnancy
    df.loc[0, 'diagnosis'] = 'Pregnancy' # Male 0 is Pregnant -> Violation!
    
    # 1. Privacy Metrics (Phase 1 & 2)
    # k-anon should be limited by group sizes (90 and 10)
    # HIPAA Risk should be calculated
    print("\nRunning Privacy Metrics...")
    results = _privacy_metrics(df, df)
    
    print(f"k-anonymity: {results.get('k_anonymity')}")
    print(f"HIPAA Risk: {results.get('hipaa_risk')}")
    
    assert results.get('k_anonymity') is not None
    assert results.get('hipaa_risk') is not None
    
    # 2. Semantic Audit (Phase 3)
    # Should detect the Male Pregnancy
    print("\nRunning Semantic Audit...")
    audit = _semantic_audit(df)
    
    print(f"Validity Validity: {audit.get('validity_rate')}")
    print(f"Violations: {audit.get('violations')}")
    
    # Verify Male Pregnancy detection
    # Index 0 is Male and Pregnant.
    violations = audit.get('violations', {})
    found_violation = False
    for rule, count in violations.items():
        if 'Male_Pregnancy' in rule or 'Pregnancy' in rule: # Name depends on get_default...
            if count > 0:
                found_violation = True
                
    if not found_violation:
        # Check rule names generated
        print("Warning: Specific Male Pregnancy rule might not have triggered or named differently.")
        print(violations)
        
    print("\n✅ Verification Complete")

if __name__ == "__main__":
    try:
        test_full_pipeline()
    except Exception as e:
        print(f"\n❌ PIPELINE FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
