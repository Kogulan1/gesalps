
import sys
import os
import pandas as pd
import numpy as np
import logging

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from libs.metrics import ClinicalMetrics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verifier")

def test_k_anonymity():
    logger.info("--- Testing k-anonymity ---")
    
    # Case 1: Perfect 2-anonymity
    df = pd.DataFrame({
        'age': [30, 30, 40, 40],
        'zip': ['123', '123', '456', '456'],
        'disease': ['A', 'B', 'A', 'B']
    })
    res = ClinicalMetrics.calculate_k_anonymity(df, ['age', 'zip'])
    logger.info(f"Case 1 (Perfect 2-anon): {res}")
    assert res['k_min'] == 2
    assert res['violator_prob'] == 1.0 # default safe_k=5, so 2 is a violator
    
    # Case 2: Singleton (k=1)
    df2 = pd.DataFrame({
        'age': [30, 31, 40, 40],
        'zip': ['123', '123', '456', '456']
    })
    res2 = ClinicalMetrics.calculate_k_anonymity(df2, ['age', 'zip'])
    logger.info(f"Case 2 (Singleton): {res2}")
    assert res2['k_min'] == 1

    # Case 3: NaNs
    df3 = pd.DataFrame({
        'age': [30, 30, np.nan, np.nan],
        'zip': ['123', '123', '456', '456']
    })
    res3 = ClinicalMetrics.calculate_k_anonymity(df3, ['age', 'zip'])
    logger.info(f"Case 3 (NaNs): {res3}")
    assert res3['k_min'] == 2 # NaNs should group together if dropna=False

def test_l_diversity():
    logger.info("\n--- Testing l-diversity ---")
    
    # Case 1: Homogeneous group (l=1)
    # Group (30, 123) has only 'Flu'
    df = pd.DataFrame({
        'age': [30, 30],
        'zip': ['123', '123'],
        'disease': ['Flu', 'Flu']
    })
    res = ClinicalMetrics.calculate_l_diversity(df, ['age', 'zip'], 'disease')
    logger.info(f"Case 1 (Homogeneous): {res}")
    assert res['l_min'] == 1
    
    # Case 2: Diverse group (l=2)
    df2 = pd.DataFrame({
        'age': [30, 30, 40, 40],
        'zip': ['123', '123', '456', '456'],
        'disease': ['Flu', 'Cold', 'Flu', 'Flu']
    })
    res2 = ClinicalMetrics.calculate_l_diversity(df2, ['age', 'zip'], 'disease')
    logger.info(f"Case 2 (Mixed): {res2}")
    # Group 30 has Flu, Cold (l=2)
    # Group 40 has Flu, Flu (l=1)
    # So min l-diversity = 1
    assert res2['l_min'] == 1

def test_t_closeness():
    logger.info("\n--- Testing t-closeness (Numeric & Categorical) ---")
    
    # Case 1: Numeric (Exact match = 0 distance)
    df = pd.DataFrame({
        'age': [30, 30, 40, 40], # Groups
        'income': [50000, 100000, 50000, 100000] # Global dist: {50k:0.5, 100k:0.5}
    })
    
    # Both groups hav exact same dist as global
    res = ClinicalMetrics.calculate_t_closeness(df, ['age'], 'income')
    logger.info(f"Case 1 (Numeric Perfect Match): {res}")
    assert res['t_max'] < 0.0001
    
    # Case 2: Categorical deviation
    # Global: A(2/4), B(2/4) -> 50/50
    # Group 30: A, A -> 100% A
    # TVD = 0.5 * (|1-0.5| + |0-0.5|) = 0.5 * (0.5 + 0.5) = 0.5
    df2 = pd.DataFrame({
        'age': [30, 30, 40, 40],
        'disease': ['A', 'A', 'B', 'B']
    })
    res2 = ClinicalMetrics.calculate_t_closeness(df2, ['age'], 'disease')
    logger.info(f"Case 2 (Categorical Deviation): {res2}")
    assert abs(res2['t_max'] - 0.5) < 0.001

if __name__ == "__main__":
    try:
        test_k_anonymity()
        test_l_diversity()
        test_t_closeness()
        print("\n✅ ALL TESTS PASSED")
    except Exception as e:
        print(f"\n❌ TESTS FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
