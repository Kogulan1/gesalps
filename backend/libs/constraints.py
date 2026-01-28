
import pandas as pd
import numpy as np
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class ConstraintValidator:
    """
    Validates synthetic data against clinical/semantic constraints ("7 Cs" - Correctness).
    Prevents "hallucinations" like Male+Pregnant or Age<10+Married.
    """
    
    def __init__(self, rules: Optional[List[Dict[str, str]]] = None):
        """
        Args:
            rules: List of dicts, e.g. [{'check': 'gender == "Male"', 'constraint': 'pregnant == "False"', 'name': 'Male_Pregnancy_Check'}]
        """
        self.rules = rules or []

    def validate(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Runs all configured rules against the dataframe.
        
        Returns:
            Dict containing:
            - overall_validity_rate: % of records passing ALL rules.
            - violations_by_rule: Dict of {rule_name: violation_count}.
            - failed_records: Total count of records failing at least one rule.
        """
        if df.empty:
            return {"overall_validity_rate": 1.0, "violations_by_rule": {}, "failed_records": 0}

        total_records = len(df)
        violations_mask = pd.Series([False] * total_records, index=df.index)
        violations_by_rule = {}

        for i, rule in enumerate(self.rules):
            rule_name = rule.get('name', f'rule_{i}')
            check_query = rule.get('check')
            constraint_query = rule.get('constraint')

            if not check_query or not constraint_query:
                continue

            try:
                # 1. Select applicable rows (The "IF" part)
                # We handle column existence check gracefully
                # If columns used in query don't exist, we likely skip the rule or warn
                # Robust approach: query() throws error if col missing. We catch it.
                
                # However, we need to know WHICH rows to check.
                # query() returns a dataframe. limiting to index is better.
                
                applicable_indices = df.query(check_query).index
                
                if len(applicable_indices) == 0:
                    violations_by_rule[rule_name] = 0
                    continue

                # 2. Check constraint on those rows (The "THEN" part)
                # We want to find where constraint is FALSE
                # Equivalent to: query(not (constraint))
                
                # Careful with "not" logic in string queries. 
                # Easier: subset = df.loc[applicable_indices]
                # valid = subset.query(constraint_query)
                # violations = len(subset) - len(valid)
                
                subset = df.loc[applicable_indices]
                valid_subset = subset.query(constraint_query)
                violation_count = len(subset) - len(valid_subset)
                
                violations_by_rule[rule_name] = violation_count
                
                # Update global mask
                # Failed indices are those in subset but NOT in valid_subset
                failed_indices = subset.index.difference(valid_subset.index)
                violations_mask.loc[failed_indices] = True
                
            except Exception as e:
                # Often happens if column missing. Log warning but don't crash pipeline.
                # logger.warning(f"Constraint rule '{rule_name}' failed to execute: {e}")
                violations_by_rule[rule_name] = -1 # Indicator of error
                pass

        failed_count = violations_mask.sum()
        validity_rate = 1.0 - (float(failed_count) / total_records)

        return {
            "overall_validity_rate": validity_rate,
            "violations_by_rule": violations_by_rule,
            "failed_records": int(failed_count),
            "total_records": total_records
        }

    @staticmethod
    def get_default_clinical_rules(columns: List[str]) -> List[Dict[str, str]]:
        """
        Generates default heuristic rules based on available columns.
        Auto-detection of common schema patterns.
        """
        rules = []
        cols_lower = {c.lower(): c for c in columns}
        
        # 1. Age vs Marriage
        # If age exists and is numeric
        if 'age' in cols_lower:
            age_col = cols_lower['age']
            # Find marital status
            marital_col = next((c for c in columns if 'marital' in c.lower()), None)
            
            if marital_col:
                # Rule: Child cannot be married
                rules.append({
                    'name': 'Child_Marriage_Check',
                    'check': f'`{age_col}` < 12', # using backticks for safety
                    'constraint': f'`{marital_col}` != "Married"' # Loose string matching
                })

        # 2. Gender vs Pregnancy
        # Find gender
        sex_col = next((c for c in columns if c.lower() in ['sex', 'gender']), None)
        if sex_col:
            # Find pregnancy/female-only diagnosis
            # Checks if any column contains 'preg' or 'ovarian' or 'cervical' values? 
            # Or if column NAME implies it?
            
            # Simple check: If we have a 'diagnosis' column
            diag_col = next((c for c in columns if 'diag' in c.lower() or 'icd' in c.lower()), None)
            if diag_col:
                # Rule: Males cannot have pregnancy codes
                # This requires string operations in the query
                # "Series.str.contains" is supported in query via engine='python' usually, but safer to stick to simple comparisons if possible.
                # Or we use simple string inequality if values are standardized.
                # For safety, let's try a negative keyword check.
                
                rules.append({
                    'name': 'Male_Pregnancy_Check',
                    'check': f'`{sex_col}` == "Male" or `{sex_col}` == "M"',
                    'constraint': f'not `{diag_col}`.str.contains("Pregnan", case=False, na=False) and not `{diag_col}`.str.contains("Ovarian", case=False, na=False)'
                })

        # 3. Age Validity (0-120)
        if 'age' in cols_lower:
            age_col = cols_lower['age']
            rules.append({
                'name': 'Age_Validity_Check',
                'check': f'`{age_col}` > -100', # Select all (dummy true)
                'constraint': f'`{age_col}` >= 0 and `{age_col}` <= 120'
            })
            
        return rules
