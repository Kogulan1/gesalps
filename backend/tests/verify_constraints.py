
import sys
import os
import pandas as pd
import numpy as np
import logging

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from libs.constraints import ConstraintValidator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verifier-constraints")

def test_constraints():
    logger.info("--- Testing Clinical Constraint Validator ---")
    
    # Dataset:
    # 1. 5-year-old Married Male (Violates Marriage check)
    # 2. 30-year-old Single Male with 'Pregnancy complications' (Violates Gender check)
    # 3. 40-year-old Married Female (Valid)
    # 4. 200-year-old (Violates Age check)
    
    df = pd.DataFrame({
        'age': [5, 30, 40, 200],
        'gender': ['Male', 'Male', 'Female', 'Female'],
        'marital_status': ['Married', 'Single', 'Married', 'Widowed'],
        'diagnosis': ['Flu', 'Pregnancy complications', 'Flu', 'Old age']
    })
    
    # 1. Generate default rules
    rules = ConstraintValidator.get_default_clinical_rules(df.columns.tolist())
    logger.info(f"Generated Rules: {[r['name'] for r in rules]}")
    
    # 2. Add a custom rule
    # IF Diagnosis = Flu THEN Age < 100 (Arbitrary check)
    rules.append({
        'name': 'Flu_Age_Check',
        'check': 'diagnosis == "Flu"',
        'constraint': 'age < 100'
    })
    
    validator = ConstraintValidator(rules)
    results = validator.validate(df)
    
    logger.info(f"Validation Results: {results}")
    
    # Verify Child Marriage Check
    # Row 0 (Age 5, Married) should fail
    # Row 2 (Age 40, Married) should pass
    # Violation count for Child_Marriage_Check should be 1
    assert results['violations_by_rule']['Child_Marriage_Check'] == 1
    
    # Verify Male Pregnancy Check
    # Row 1 (Male, Pregnancy) should fail
    assert results['violations_by_rule']['Male_Pregnancy_Check'] == 1
    
    # Verify Age Validity
    # Row 4 (200) should fail
    assert results['violations_by_rule']['Age_Validity_Check'] == 1
    
    # Verify Overall
    # 3 rows failed at least one rule (0, 1, 3). Only row 2 (index 2) is clean.
    # Failed records = 3
    assert results['failed_records'] == 3
    assert results['overall_validity_rate'] == 0.25
    
    # Test Missing Column Resilience
    # Rule referencing 'salary' (doesn't exist)
    logger.info("--- Testing Missing Column resilience ---")
    bad_rule = [{'name': 'Bad_Col', 'check': 'salary > 0', 'constraint': 'age > 0'}]
    v_bad = ConstraintValidator(bad_rule)
    res_bad = v_bad.validate(df)
    # Should not crash, violation should be -1 or 0 (depending on query behavior)
    # pandas query usually throws error if col missing. Our code catches it and returns -1.
    assert res_bad['violations_by_rule']['Bad_Col'] == -1
    
    logger.info("✅ All Constraint Tests Passed")

if __name__ == "__main__":
    try:
        test_constraints()
    except Exception as e:
        print(f"\n❌ TESTS FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
