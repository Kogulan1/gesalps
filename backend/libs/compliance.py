"""
Clinical-Grade Compliance Module for Gesalp AI
Implements HIPAA-like privacy thresholds, DP proofs, and regulatory compliance checks.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


class ComplianceLevel(Enum):
    """Compliance levels for different regulatory frameworks."""
    HIPAA_LIKE = "hipaa_like"
    GDPR_LIKE = "gdpr_like"
    CLINICAL_STRICT = "clinical_strict"
    RESEARCH = "research"


@dataclass
class PrivacyThresholds:
    """Privacy metric thresholds for compliance."""
    mia_auc_max: float = 0.60  # Membership Inference Attack AUC (lower is better)
    dup_rate_max: float = 0.05  # Duplicate rate (5% max)
    k_anonymization_min: Optional[int] = 5  # k-anonymity (minimum k)
    identifiability_max: Optional[float] = 0.10  # Identifiability score (lower is better)
    dp_epsilon_max: Optional[float] = 1.0  # Differential Privacy epsilon (lower is better)
    dp_delta_max: Optional[float] = 1e-5  # Differential Privacy delta


@dataclass
class UtilityThresholds:
    """Utility metric thresholds for compliance."""
    ks_mean_max: float = 0.10  # Kolmogorov-Smirnov mean (lower is better)
    corr_delta_max: float = 0.10  # Correlation delta (lower is better)
    jensenshannon_max: Optional[float] = 0.15  # Jensen-Shannon divergence
    auroc_min: Optional[float] = 0.80  # AUROC for downstream tasks (higher is better)
    c_index_min: Optional[float] = 0.70  # C-index for survival analysis


@dataclass
class FairnessThresholds:
    """Fairness metric thresholds for compliance."""
    rare_coverage_min: Optional[float] = 0.70  # Rare category coverage
    freq_skew_max: Optional[float] = 0.30  # Frequency skew


@dataclass
class ComplianceConfig:
    """Complete compliance configuration."""
    level: ComplianceLevel
    privacy: PrivacyThresholds
    utility: UtilityThresholds
    fairness: FairnessThresholds
    require_dp_proof: bool = False
    require_audit_log: bool = True
    min_sample_size: int = 100  # Minimum rows for valid synthesis


# Predefined compliance configurations
COMPLIANCE_CONFIGS = {
    ComplianceLevel.HIPAA_LIKE: ComplianceConfig(
        level=ComplianceLevel.HIPAA_LIKE,
        privacy=PrivacyThresholds(
            mia_auc_max=0.60,
            dup_rate_max=0.05,
            k_anonymization_min=5,
            identifiability_max=0.10,
            dp_epsilon_max=1.0,
            dp_delta_max=1e-5,
        ),
        utility=UtilityThresholds(
            ks_mean_max=0.10,
            corr_delta_max=0.10,
            jensenshannon_max=0.15,
            auroc_min=0.80,
            c_index_min=0.70,
        ),
        fairness=FairnessThresholds(
            rare_coverage_min=0.70,
            freq_skew_max=0.30,
        ),
        require_dp_proof=False,  # HIPAA doesn't mandate DP, but we recommend it
        require_audit_log=True,
        min_sample_size=100,
    ),
    ComplianceLevel.CLINICAL_STRICT: ComplianceConfig(
        level=ComplianceLevel.CLINICAL_STRICT,
        privacy=PrivacyThresholds(
            mia_auc_max=0.50,  # Stricter than HIPAA
            dup_rate_max=0.03,  # 3% max duplicates
            k_anonymization_min=10,  # Higher k-anonymity
            identifiability_max=0.05,
            dp_epsilon_max=0.5,  # Stricter DP
            dp_delta_max=1e-6,
        ),
        utility=UtilityThresholds(
            ks_mean_max=0.08,  # Stricter utility requirements
            corr_delta_max=0.08,
            jensenshannon_max=0.12,
            auroc_min=0.85,
            c_index_min=0.75,
        ),
        fairness=FairnessThresholds(
            rare_coverage_min=0.75,
            freq_skew_max=0.25,
        ),
        require_dp_proof=True,  # Clinical strict requires DP
        require_audit_log=True,
        min_sample_size=200,
    ),
    ComplianceLevel.RESEARCH: ComplianceConfig(
        level=ComplianceLevel.RESEARCH,
        privacy=PrivacyThresholds(
            mia_auc_max=0.65,  # More lenient for research
            dup_rate_max=0.10,
            k_anonymization_min=3,
            identifiability_max=0.15,
            dp_epsilon_max=2.0,
            dp_delta_max=1e-4,
        ),
        utility=UtilityThresholds(
            ks_mean_max=0.12,
            corr_delta_max=0.12,
            jensenshannon_max=0.20,
            auroc_min=0.75,
            c_index_min=0.65,
        ),
        fairness=FairnessThresholds(
            rare_coverage_min=0.60,
            freq_skew_max=0.40,
        ),
        require_dp_proof=False,
        require_audit_log=True,
        min_sample_size=50,
    ),
}


class ComplianceEvaluator:
    """Evaluates synthetic data against compliance thresholds."""
    
    def __init__(self, config: Optional[ComplianceConfig] = None):
        """Initialize with compliance configuration.
        
        Args:
            config: ComplianceConfig instance. If None, uses HIPAA_LIKE by default.
        """
        if config is None:
            level_str = os.getenv("COMPLIANCE_LEVEL", "hipaa_like").lower()
            level = ComplianceLevel[level_str.upper()] if level_str.upper() in [e.name for e in ComplianceLevel] else ComplianceLevel.HIPAA_LIKE
            config = COMPLIANCE_CONFIGS.get(level, COMPLIANCE_CONFIGS[ComplianceLevel.HIPAA_LIKE])
        self.config = config
    
    def evaluate(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate metrics against compliance thresholds.
        
        Args:
            metrics: Dictionary with 'privacy', 'utility', 'fairness' keys.
            
        Returns:
            Dictionary with:
            - passed: bool (all thresholds passed)
            - privacy_passed: bool
            - utility_passed: bool
            - fairness_passed: bool
            - violations: List of violation descriptions
            - score: float (0.0-1.0, higher is better)
        """
        privacy_metrics = metrics.get("privacy", {})
        utility_metrics = metrics.get("utility", {})
        fairness_metrics = metrics.get("fairness", {})
        meta = metrics.get("meta", {})
        
        violations = []
        privacy_passed = True
        utility_passed = True
        fairness_passed = True
        
        # Privacy checks
        mia_auc = privacy_metrics.get("mia_auc")
        if mia_auc is not None and mia_auc > self.config.privacy.mia_auc_max:
            violations.append(f"MIA AUC {mia_auc:.3f} exceeds threshold {self.config.privacy.mia_auc_max}")
            privacy_passed = False
        
        dup_rate = privacy_metrics.get("dup_rate")
        if dup_rate is not None and dup_rate > self.config.privacy.dup_rate_max:
            violations.append(f"Duplicate rate {dup_rate:.1%} exceeds threshold {self.config.privacy.dup_rate_max:.1%}")
            privacy_passed = False
        
        k_anon = privacy_metrics.get("k_anonymization")
        if k_anon is not None and self.config.privacy.k_anonymization_min is not None:
            if k_anon < self.config.privacy.k_anonymization_min:
                violations.append(f"k-anonymity {k_anon} below minimum {self.config.privacy.k_anonymization_min}")
                privacy_passed = False
        
        identifiability = privacy_metrics.get("identifiability_score")
        if identifiability is not None and self.config.privacy.identifiability_max is not None:
            if identifiability > self.config.privacy.identifiability_max:
                violations.append(f"Identifiability score {identifiability:.3f} exceeds threshold {self.config.privacy.identifiability_max}")
                privacy_passed = False
        
        # DP proof checks
        if self.config.require_dp_proof:
            dp_effective = privacy_metrics.get("dp_effective", False)
            if not dp_effective:
                violations.append("Differential Privacy proof required but not applied")
                privacy_passed = False
            else:
                dp_epsilon = privacy_metrics.get("dp_epsilon")
                if dp_epsilon is not None and self.config.privacy.dp_epsilon_max is not None:
                    if dp_epsilon > self.config.privacy.dp_epsilon_max:
                        violations.append(f"DP epsilon {dp_epsilon:.3f} exceeds threshold {self.config.privacy.dp_epsilon_max}")
                        privacy_passed = False
        
        # Utility checks
        ks_mean = utility_metrics.get("ks_mean")
        if ks_mean is not None and ks_mean > self.config.utility.ks_mean_max:
            violations.append(f"KS mean {ks_mean:.3f} exceeds threshold {self.config.utility.ks_mean_max}")
            utility_passed = False
        
        corr_delta = utility_metrics.get("corr_delta")
        if corr_delta is not None and corr_delta > self.config.utility.corr_delta_max:
            violations.append(f"Correlation delta {corr_delta:.3f} exceeds threshold {self.config.utility.corr_delta_max}")
            utility_passed = False
        
        jensenshannon = utility_metrics.get("jensenshannon_dist")
        if jensenshannon is not None and self.config.utility.jensenshannon_max is not None:
            if jensenshannon > self.config.utility.jensenshannon_max:
                violations.append(f"Jensen-Shannon divergence {jensenshannon:.3f} exceeds threshold {self.config.utility.jensenshannon_max}")
                utility_passed = False
        
        auroc = utility_metrics.get("auroc")
        if auroc is not None and self.config.utility.auroc_min is not None:
            if auroc < self.config.utility.auroc_min:
                violations.append(f"AUROC {auroc:.3f} below minimum {self.config.utility.auroc_min}")
                utility_passed = False
        
        c_index = utility_metrics.get("c_index")
        if c_index is not None and self.config.utility.c_index_min is not None:
            if c_index < self.config.utility.c_index_min:
                violations.append(f"C-index {c_index:.3f} below minimum {self.config.utility.c_index_min}")
                utility_passed = False
        
        # Fairness checks (optional)
        rare_coverage = fairness_metrics.get("rare_coverage")
        if rare_coverage is not None and self.config.fairness.rare_coverage_min is not None:
            if rare_coverage < self.config.fairness.rare_coverage_min:
                violations.append(f"Rare coverage {rare_coverage:.3f} below minimum {self.config.fairness.rare_coverage_min}")
                fairness_passed = False
        
        freq_skew = fairness_metrics.get("freq_skew")
        if freq_skew is not None and self.config.fairness.freq_skew_max is not None:
            if freq_skew > self.config.fairness.freq_skew_max:
                violations.append(f"Frequency skew {freq_skew:.3f} exceeds threshold {self.config.fairness.freq_skew_max}")
                fairness_passed = False
        
        # Sample size check
        n_real = meta.get("n_real", 0)
        if n_real < self.config.min_sample_size:
            violations.append(f"Sample size {n_real} below minimum {self.config.min_sample_size}")
            privacy_passed = False
            utility_passed = False
        
        # Overall pass
        all_passed = privacy_passed and utility_passed and fairness_passed
        
        # Calculate compliance score (0.0-1.0)
        score = self._calculate_score(metrics)
        
        return {
            "passed": all_passed,
            "privacy_passed": privacy_passed,
            "utility_passed": utility_passed,
            "fairness_passed": fairness_passed,
            "violations": violations,
            "score": score,
            "level": self.config.level.value,
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    def _calculate_score(self, metrics: Dict[str, Any]) -> float:
        """Calculate compliance score (0.0-1.0, higher is better)."""
        privacy_metrics = metrics.get("privacy", {})
        utility_metrics = metrics.get("utility", {})
        fairness_metrics = metrics.get("fairness", {})
        
        score = 1.0
        
        # Privacy component (40% weight)
        privacy_score = 1.0
        mia_auc = privacy_metrics.get("mia_auc")
        if mia_auc is not None:
            privacy_score *= min(1.0, self.config.privacy.mia_auc_max / max(mia_auc, 0.01))
        
        dup_rate = privacy_metrics.get("dup_rate")
        if dup_rate is not None:
            privacy_score *= min(1.0, self.config.privacy.dup_rate_max / max(dup_rate, 0.001))
        
        # Utility component (40% weight)
        utility_score = 1.0
        ks_mean = utility_metrics.get("ks_mean")
        if ks_mean is not None:
            utility_score *= min(1.0, self.config.utility.ks_mean_max / max(ks_mean, 0.01))
        
        corr_delta = utility_metrics.get("corr_delta")
        if corr_delta is not None:
            utility_score *= min(1.0, self.config.utility.corr_delta_max / max(corr_delta, 0.01))
        
        # Fairness component (20% weight)
        fairness_score = 1.0
        rare_coverage = fairness_metrics.get("rare_coverage")
        if rare_coverage is not None and self.config.fairness.rare_coverage_min is not None:
            fairness_score *= min(1.0, rare_coverage / max(self.config.fairness.rare_coverage_min, 0.01))
        
        # Weighted average
        score = 0.4 * privacy_score + 0.4 * utility_score + 0.2 * fairness_score
        
        return max(0.0, min(1.0, score))
    
    def get_thresholds(self) -> Dict[str, Any]:
        """Get current threshold configuration."""
        return {
            "level": self.config.level.value,
            "privacy": asdict(self.config.privacy),
            "utility": asdict(self.config.utility),
            "fairness": asdict(self.config.fairness),
            "require_dp_proof": self.config.require_dp_proof,
            "min_sample_size": self.config.min_sample_size,
        }


def get_compliance_evaluator(level: Optional[str] = None) -> ComplianceEvaluator:
    """Factory function to get compliance evaluator.
    
    Args:
        level: Compliance level string (e.g., "hipaa_like", "clinical_strict").
               If None, uses environment variable or defaults to HIPAA_LIKE.
    
    Returns:
        ComplianceEvaluator instance.
    """
    if level is None:
        level = os.getenv("COMPLIANCE_LEVEL", "hipaa_like").lower()
    
    try:
        compliance_level = ComplianceLevel[level.upper()]
        config = COMPLIANCE_CONFIGS.get(compliance_level, COMPLIANCE_CONFIGS[ComplianceLevel.HIPAA_LIKE])
    except (KeyError, AttributeError):
        logger.warning(f"Unknown compliance level '{level}', defaulting to HIPAA_LIKE")
        config = COMPLIANCE_CONFIGS[ComplianceLevel.HIPAA_LIKE]
    
    return ComplianceEvaluator(config)

