
import sys
import os
import pandas as pd
import numpy as np
import logging

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from libs.metrics import ClinicalMetrics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verifier-risk")

def test_population_risk():
    logger.info("--- Testing HIPAA Population Risk Model ---")
    
    # Dataset: 10 people.
    # 2 are unique (Age 30, Zip 100; Age 40, Zip 200)
    # 8 are duplicates (Age 50, Zip 300)
    df = pd.DataFrame({
        'age': [30, 40] + [50]*8,
        'zip': [100, 200] + [300]*8
    })
    
    # 1. Standard US Population (330M)
    res_us = ClinicalMetrics.estimate_population_risk(df, ['age', 'zip'], population_size=330_000_000)
    logger.info(f"US Population (330M): {res_us}")
    
    assert res_us['sample_uniques'] == 2
    assert res_us['internal_uniqueness'] == 0.2 # 2/10
    # Risk should be 2 / 330M (very small)
    assert abs(res_us['estimated_proc_risk'] - (2/330000000)) < 1e-9
    
    # 2. Small Town Population (1000)
    res_town = ClinicalMetrics.estimate_population_risk(df, ['age', 'zip'], population_size=1000)
    logger.info(f"Town Population (1000): {res_town}")
    
    assert res_town['estimated_proc_risk'] == 2/1000 # 0.002
    
    # 3. No Uniques (k=2 everywhere)
    df_safe = pd.DataFrame({
        'age': [30, 30, 50, 50],
        'zip': [100, 100, 200, 200]
    })
    res_safe = ClinicalMetrics.estimate_population_risk(df_safe, ['age', 'zip'])
    logger.info(f"Safe Dataset (No Uniques): {res_safe}")
    assert res_safe['sample_uniques'] == 0
    assert res_safe['estimated_proc_risk'] == 0.0

if __name__ == "__main__":
    try:
        test_population_risk()
        print("\n✅ STATISTICAL RISK TESTS PASSED")
    except Exception as e:
        print(f"\n❌ TESTS FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
