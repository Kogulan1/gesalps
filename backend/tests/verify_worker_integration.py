
import sys
import os
import pandas as pd
import numpy as np
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
    from synth_worker.worker import _privacy_metrics
except ImportError as e:
    print(f"Failed to import worker: {e}")
    sys.exit(1)

def test_integration():
    print("--- Testing Worker Integration (Native Metrics) ---")
    
    # Create simple Age/Zip/Diagnosis dataset
    # QIs: Age, Zip (low cardinality here)
    # Sensitive: Diagnosis (high cardinality)
    
    real = pd.DataFrame({
        'age': [30] * 50 + [40] * 50,
        'zip': ['10001'] * 100,
        'diagnosis': [f'D{i}' for i in range(100)] 
    })
    
    synth = real.copy() # Perfect privacy score (k-anon=50)
    
    # Run _privacy_metrics
    # It should detect age/zip as QIs (low cardinality or name match)
    # It should detect diagnosis as sensitive (high cardinality or name match)
    
    results = _privacy_metrics(real, synth)
    
    print("\n[RESULT Metrics]:", results)
    
    # Validation
    if 'k_anonymity' not in results:
        print("❌ FAILED: k_anonymity missing from results")
        sys.exit(1)
        
    if 'l_diversity' not in results:
        print("❌ FAILED: l_diversity missing from results")
        sys.exit(1)
        
    if 't_closeness' not in results:
        print("❌ FAILED: t_closeness missing from results")
        sys.exit(1)
        
    print(f"✅ PASSED: k={results['k_anonymity']}, l={results['l_diversity']}, t={results['t_closeness']}")
    
    # Ensure standard metrics still exist
    if 'mia_auc' not in results or 'dup_rate' not in results:
        print("❌ FAILED: Standard metrics (MIA/Dup) lost")
        sys.exit(1)

if __name__ == "__main__":
    try:
        test_integration()
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
