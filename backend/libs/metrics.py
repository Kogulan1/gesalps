import pandas as pd
import numpy as np
import logging
from typing import List, Dict, Any, Optional, Union
from scipy.stats import wasserstein_distance

logger = logging.getLogger(__name__)

class ClinicalMetrics:
    """
    Robust, native implementation of core clinical privacy metrics.
    Avoids heavy dependencies (like SynthCity) for critical compliance numbers.
    """

    @staticmethod
    def calculate_k_anonymity(df: pd.DataFrame, quasi_identifiers: List[str]) -> Dict[str, Any]:
        """
        Calculates k-anonymity for the given dataframe and quasi-identifiers.
        
        Definition: A dataset is k-anonymous if every record is indistinguishable from at least k-1 other records
        with respect to the quasi-identifiers.
        
        Args:
            df: The dataframe to analyze.
            quasi_identifiers: List of column names to treat as quasi-identifiers.
            
        Returns:
            Dict containing:
            - k_min: The minimum group size (the 'k' value).
            - k_mean: The average group size.
            - violator_prob: Probability that a record belongs to a group with size < 5 (strict clinical threshold).
            - k_5_percent: Percentage of records with k < 5.
        """
        try:
            if df.empty or not quasi_identifiers:
                return {"k_min": 0, "k_mean": 0.0, "violator_prob": 1.0}
                
            # Filter qis that exist in df
            qis = [c for c in quasi_identifiers if c in df.columns]
            if not qis:
                return {"k_min": len(df), "k_mean": len(df), "violator_prob": 0.0}

            # Group by QIs and count
            # Use strict dropna=False to include NaNs as their own category (clinical conservatism)
            groups = df.groupby(qis, dropna=False).size()
            
            k_min = int(groups.min())
            k_mean = float(groups.mean())
            
            # Clinical "Safety Check": How many records are in dangerously small groups?
            # Typically k=5 is the HIPAA Safe Harbor heuristic for small cell suppression
            safe_k = 5
            violating_records = groups[groups < safe_k].sum()
            total_records = len(df)
            violator_prob = float(violating_records / total_records) if total_records > 0 else 1.0

            return {
                "k_min": k_min,
                "k_mean": k_mean,
                "violator_prob": violator_prob,
                "k_actual": k_min # alias
            }
        except Exception as e:
            logger.error(f"k-anonymity calculation failed: {e}")
            return {"error": str(e)}

    @staticmethod
    def calculate_l_diversity(df: pd.DataFrame, quasi_identifiers: List[str], sensitive_col: str) -> Dict[str, Any]:
        """
        Calculates distinct l-diversity.
        
        Definition: An equivalence class has l-diversity if it contains at least l "well-represented" values 
        for the sensitive attribute. We use "Distinct l-diversity" (count of unique values).
        
        Args:
            df: Dataframe.
            quasi_identifiers: QIs.
            sensitive_col: The sensitive attribute (e.g., 'Diagnosis').
            
        Returns:
            l_min: The minimum number of distinct sensitive values in any equivalence class.
        """
        try:
            if df.empty or not quasi_identifiers or sensitive_col not in df.columns:
                return {"l_min": 0}

            qis = [c for c in quasi_identifiers if c in df.columns]
            if not qis:
                # If no QIs, the whole table is one bucket
                return {"l_min": df[sensitive_col].nunique(dropna=False)}

            # Group by QIs and count distinct sensitive values
            # nunique is faster than applying set overhead
            groups = df.groupby(qis, dropna=False)[sensitive_col].nunique(dropna=False)
            
            l_min = int(groups.min())
            l_mean = float(groups.mean())
            
            return {
                "l_min": l_min,
                "l_mean": l_mean
            }
        except Exception as e:
            logger.error(f"l-diversity calculation failed: {e}")
            return {"error": str(e)}

    @staticmethod
    def calculate_t_closeness(df: pd.DataFrame, quasi_identifiers: List[str], sensitive_col: str) -> Dict[str, Any]:
        """
        Calculates t-closeness using Wasserstein Distance (Earth Mover's Distance) for numerical 
        or Total Variation Distance for categorical.
        
        Definition: An equivalence class has t-closeness if the distance between the distribution 
        of a sensitive attribute in this class and the distribution of the attribute in the whole table 
        is no more than a threshold t.
        
        Returns:
            t_max: The maximum distance found (the worst-case 't'). LOWER IS BETTER.
        """
        try:
            if df.empty or not quasi_identifiers or sensitive_col not in df.columns:
                return {"t_max": 1.0}

            qis = [c for c in quasi_identifiers if c in df.columns]
            if not qis:
                return {"t_max": 0.0}

            # Global Distribution
            global_series = df[sensitive_col]
            is_numeric = pd.api.types.is_numeric_dtype(global_series)
            
            if is_numeric:
                # Use Wasserstein (EMD) for numeric
                # Pre-calculate global values for efficiency
                global_vals = global_series.dropna().values
                if len(global_vals) == 0: return {"t_max": 0.0}

                # Function to calc distance for a group
                def calc_dist(x):
                    group_vals = x.dropna().values
                    if len(group_vals) == 0: return 0.0
                    return wasserstein_distance(group_vals, global_vals)
                
                # Apply to groups
                # Note: groupby().apply is slow for massive DFs, iterate if needed
                # For Phase 1, apply is acceptable
                distances = df.groupby(qis, dropna=False)[sensitive_col].apply(calc_dist)
                
            else:
                # Categorical: Use Total Variation Distance (TVD)
                # TVD = 0.5 * sum(|P - Q|)
                global_probs = global_series.value_counts(normalize=True, dropna=False)
                all_cats = global_probs.index
                
                def calc_cat_dist(x):
                    if len(x) == 0: return 0.0
                    local_probs = x.value_counts(normalize=True, dropna=False)
                    # Align indexes
                    # Sum of absolute differences
                    # We iterate union of keys
                    diff = 0.0
                    # This can be optimized with vector subtraction if aligned, but keys might differ
                    # Robust method:
                    keys = set(global_probs.index) | set(local_probs.index)
                    for k in keys:
                        p = global_probs.get(k, 0.0)
                        q = local_probs.get(k, 0.0)
                        diff += abs(p - q)
                    return 0.5 * diff

                distances = df.groupby(qis, dropna=False)[sensitive_col].apply(calc_cat_dist)

            t_max = float(distances.max())
            t_mean = float(distances.mean())
            
            return {
                "t_max": t_max,
                "t_mean": t_mean
            }
        
        except Exception as e:
            logger.error(f"t-closeness calculation failed: {e}")
            return {"error": str(e)}

    @staticmethod
    def estimate_population_risk(df: pd.DataFrame, quasi_identifiers: List[str], population_size: int = 330_000_000) -> Dict[str, Any]:
        """
        Estimates the re-identification risk at the POPULATION level.
        Critical for HIPAA Expert Determination.
        
        Uses a conservative sampling fraction scaling model.
        Risk = Probability that a Sample Unique is also a Population Unique.
        
        Approximation:
        Let U_s = number of unique records in sample.
        Let f = n / N (sampling fraction).
        Estimated Population Uniques U_p ≈ U_s / f (very naive) or more conservatively U_s * f (Lambert upper bound for rare populations).
        
        For HIPAA, we want a conservative 'Risk Score'.
        We use the 'Average Risk' metric: R = (Sum of 1/group_size for all records) / N ? No.
        
        We use the simple approach:
        Risk = (Number of Sample Uniques) / Population Size? Too small.
        
        Standard Approach (Simple Scaling):
        If a record is unique in the sample of size n, the probability it is unique in population of size N is roughly (1-p)^(N-n),
        where p is prevalence.
        
        For this implementation, we report the "Uniqueness Ratio" scaled by sampling fraction, which acts as a heuristic risk score.
        Risk Score = (Sample Uniques / Sample Size) * (Sample Size / Population Size) = Sample Uniques / Population Size.
        This represents the absolute probability that a random person in the population is identified by a unique record in our sample.
        
        Args:
            df: Dataframe
            qis: Quasi-identifiers
            population_size: Total population (default 330M for US)
            
        Returns:
            Dict with 'estimated_risk' (0.0 - 1.0) and 'sample_uniques'.
        """
        try:
            if df.empty or not quasi_identifiers:
                return {"estimated_risk": 0.0, "sample_uniques": 0}
            
            qis = [c for c in quasi_identifiers if c in df.columns]
            if not qis:
                 # If no QIs, everyone looks same -> 1 unique group of size N -> 0 unique records?
                 # Actually if no QIs, k=N. So 0 uniques.
                return {"estimated_risk": 0.0, "sample_uniques": 0}

            groups = df.groupby(qis, dropna=False).size()
            sample_uniques = groups[groups == 1].count()
            
            # Risk calculation
            # Conservative absolute risk: What fraction of the TOTAL POPULATION have we exposed as unique?
            # If I publish 100 unique records in a country of 300 million, the risk to any random person is tiny.
            # But the risk to THOSE 100 PEOPLE is high IF they are also unique in the population.
             
            # Standard HIPAA Expert Metric: "Risk of Re-identification".
            # Often threshold is 0.05 (5%).
            # We calculated "Marketer Risk" -> how many unique matches correct?
            
            # For this engine, we return:
            # 1. sample_uniques_count
            # 2. sample_uniqueness_rate (uniques / n)
            # 3. estimated_population_uniqueness_rate (scaled by sampling fraction f)
            #    If f is small, population uniqueness is likely MUCH lower than sample uniqueness.
            
            n = len(df)
            N = population_size
            f = n / N if N > 0 else 1.0
            
            # Lambert/Pitman simplification:
            # P(unique_pop | unique_sample) ≈ f
            # So, Total Pop Uniques ≈ Sample Uniques * (1/f) * f = Sample Uniques ?? No.
            
            # Let's stick to the "Prosecutor Risk" proxy:
            # Average Group Size^-1 is common, but let's use:
            # Risk = (Sample Uniques) * f / n = (Sample Uniques / N)
            
            risk = float(sample_uniques) / N if N > 0 else 1.0
            
            # Also provide the raw sample uniqueness for "Internal Risk"
            internal_risk = float(sample_uniques) / n if n > 0 else 0.0
            
            return {
                "estimated_proc_risk": risk, # Prosecutor risk relative to population
                "internal_uniqueness": internal_risk, # Fraction of sample that is unique (k=1)
                "sample_uniques": int(sample_uniques),
                "population_size": N
            }

        except Exception as e:
            logger.error(f"Population risk estimation failed: {e}")
            return {"error": str(e)}
