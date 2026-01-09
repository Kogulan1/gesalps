"""
Compliance Threshold Validation Tests
Tests compliance evaluation, threshold violations, and compliance integration.
"""

import pytest
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from libs.compliance import (
        ComplianceEvaluator,
        get_compliance_evaluator,
        ComplianceLevel,
        COMPLIANCE_CONFIGS,
    )
    COMPLIANCE_AVAILABLE = True
except ImportError:
    COMPLIANCE_AVAILABLE = False
    pytestmark = pytest.mark.skip("Compliance module not available")


@pytest.fixture
def good_metrics():
    """Metrics that should pass HIPAA_LIKE compliance."""
    return {
        "privacy": {
            "mia_auc": 0.05,
            "dup_rate": 0.02,
            "k_anonymization": 7,
            "identifiability_score": 0.08,
            "dp_effective": True,
            "dp_epsilon": 0.8,
            "dp_delta": 1e-6,
        },
        "utility": {
            "ks_mean": 0.08,
            "corr_delta": 0.09,
            "jensenshannon_dist": 0.12,
            "auroc": 0.85,
            "c_index": 0.75,
        },
        "fairness": {
            "rare_coverage": 0.72,
            "freq_skew": 0.25,
        },
        "meta": {
            "n_real": 500,
            "n_synth": 500,
        },
    }


@pytest.fixture
def bad_metrics():
    """Metrics that should fail HIPAA_LIKE compliance."""
    return {
        "privacy": {
            "mia_auc": 0.75,  # Fails: > 0.60
            "dup_rate": 0.10,  # Fails: > 0.05
            "k_anonymization": 3,  # Fails: < 5
            "identifiability_score": 0.15,  # Fails: > 0.10
        },
        "utility": {
            "ks_mean": 0.15,  # Fails: > 0.10
            "corr_delta": 0.20,  # Fails: > 0.10
            "jensenshannon_dist": 0.25,  # Fails: > 0.15
            "auroc": 0.70,  # Fails: < 0.80
            "c_index": 0.60,  # Fails: < 0.70
        },
        "fairness": {
            "rare_coverage": 0.50,  # Fails: < 0.70
            "freq_skew": 0.50,  # Fails: > 0.30
        },
        "meta": {
            "n_real": 50,  # Fails: < 100 (min_sample_size)
            "n_synth": 50,
        },
    }


class TestComplianceThresholds:
    """Test compliance threshold validation."""
    
    def test_hipaa_like_good_metrics(self, good_metrics):
        """COMP-001: Good metrics should pass HIPAA_LIKE compliance."""
        evaluator = get_compliance_evaluator("hipaa_like")
        result = evaluator.evaluate(good_metrics)
        
        assert result["passed"] is True, f"Expected pass but got violations: {result.get('violations', [])}"
        assert result["privacy_passed"] is True
        assert result["utility_passed"] is True
        assert result["fairness_passed"] is True
        assert len(result["violations"]) == 0
        assert result["score"] > 0.8  # Good metrics should have high score
    
    def test_hipaa_like_bad_metrics(self, bad_metrics):
        """COMP-002: Bad metrics should fail HIPAA_LIKE compliance."""
        evaluator = get_compliance_evaluator("hipaa_like")
        result = evaluator.evaluate(bad_metrics)
        
        assert result["passed"] is False, "Expected failure but metrics passed"
        assert len(result["violations"]) > 0, "Expected violations but none found"
        assert result["score"] < 0.5  # Bad metrics should have low score
    
    def test_clinical_strict_thresholds(self, good_metrics):
        """COMP-003: Clinical strict has stricter thresholds."""
        evaluator = get_compliance_evaluator("clinical_strict")
        result = evaluator.evaluate(good_metrics)
        
        # Clinical strict may fail even good metrics due to stricter thresholds
        # Check that thresholds are actually stricter
        config = evaluator.config
        assert config.privacy.mia_auc_max == 0.50  # Stricter than HIPAA 0.60
        assert config.privacy.dup_rate_max == 0.03  # Stricter than HIPAA 0.05
        assert config.utility.ks_mean_max == 0.08  # Stricter than HIPAA 0.10
        assert config.require_dp_proof is True  # DP required for clinical strict
    
    def test_research_level_thresholds(self, good_metrics):
        """COMP-004: Research level has more lenient thresholds."""
        evaluator = get_compliance_evaluator("research")
        result = evaluator.evaluate(good_metrics)
        
        # Research should pass good metrics (more lenient)
        assert result["passed"] is True
        config = evaluator.config
        assert config.privacy.mia_auc_max == 0.65  # More lenient than HIPAA 0.60
        assert config.privacy.dup_rate_max == 0.10  # More lenient than HIPAA 0.05
        assert config.utility.ks_mean_max == 0.12  # More lenient than HIPAA 0.10
    
    def test_mia_auc_threshold(self):
        """COMP-005: MIA AUC threshold validation."""
        evaluator = get_compliance_evaluator("hipaa_like")
        
        # Test at threshold boundary
        metrics_at_threshold = {
            "privacy": {"mia_auc": 0.60},
            "utility": {},
            "meta": {"n_real": 200},
        }
        result = evaluator.evaluate(metrics_at_threshold)
        assert result["privacy_passed"] is True, "MIA AUC at threshold (0.60) should pass"
        
        # Test just above threshold
        metrics_above_threshold = {
            "privacy": {"mia_auc": 0.61},
            "utility": {},
            "meta": {"n_real": 200},
        }
        result = evaluator.evaluate(metrics_above_threshold)
        assert result["privacy_passed"] is False, "MIA AUC above threshold (0.61) should fail"
        assert any("MIA AUC" in v for v in result["violations"])
    
    def test_ks_mean_threshold(self):
        """COMP-006: KS Mean threshold validation."""
        evaluator = get_compliance_evaluator("hipaa_like")
        
        # Test at threshold boundary
        metrics_at_threshold = {
            "privacy": {},
            "utility": {"ks_mean": 0.10},
            "meta": {"n_real": 200},
        }
        result = evaluator.evaluate(metrics_at_threshold)
        assert result["utility_passed"] is True, "KS Mean at threshold (0.10) should pass"
        
        # Test just above threshold
        metrics_above_threshold = {
            "privacy": {},
            "utility": {"ks_mean": 0.11},
            "meta": {"n_real": 200},
        }
        result = evaluator.evaluate(metrics_above_threshold)
        assert result["utility_passed"] is False, "KS Mean above threshold (0.11) should fail"
        assert any("KS mean" in v for v in result["violations"])
    
    def test_dup_rate_threshold(self):
        """COMP-007: Duplicate rate threshold validation."""
        evaluator = get_compliance_evaluator("hipaa_like")
        
        # Test at threshold boundary
        metrics_at_threshold = {
            "privacy": {"dup_rate": 0.05},
            "utility": {},
            "meta": {"n_real": 200},
        }
        result = evaluator.evaluate(metrics_at_threshold)
        assert result["privacy_passed"] is True, "Dup rate at threshold (0.05) should pass"
        
        # Test just above threshold
        metrics_above_threshold = {
            "privacy": {"dup_rate": 0.06},
            "utility": {},
            "meta": {"n_real": 200},
        }
        result = evaluator.evaluate(metrics_above_threshold)
        assert result["privacy_passed"] is False, "Dup rate above threshold (0.06) should fail"
        assert any("Duplicate rate" in v for v in result["violations"])
    
    def test_dp_requirement_clinical_strict(self):
        """COMP-008: Clinical strict requires DP proof."""
        evaluator = get_compliance_evaluator("clinical_strict")
        
        # Metrics without DP
        metrics_no_dp = {
            "privacy": {
                "mia_auc": 0.05,
                "dup_rate": 0.02,
                "dp_effective": False,
            },
            "utility": {"ks_mean": 0.08, "corr_delta": 0.09},
            "meta": {"n_real": 200},
        }
        result = evaluator.evaluate(metrics_no_dp)
        assert result["privacy_passed"] is False, "Clinical strict should require DP"
        assert any("Differential Privacy proof required" in v for v in result["violations"])
        
        # Metrics with DP
        metrics_with_dp = {
            "privacy": {
                "mia_auc": 0.05,
                "dup_rate": 0.02,
                "dp_effective": True,
                "dp_epsilon": 0.4,
                "dp_delta": 1e-6,
            },
            "utility": {"ks_mean": 0.08, "corr_delta": 0.09},
            "meta": {"n_real": 200},
        }
        result = evaluator.evaluate(metrics_with_dp)
        assert result["privacy_passed"] is True, "Clinical strict should pass with DP"
    
    def test_min_sample_size(self):
        """COMP-009: Minimum sample size validation."""
        evaluator = get_compliance_evaluator("hipaa_like")
        
        # Below minimum
        metrics_small = {
            "privacy": {},
            "utility": {},
            "meta": {"n_real": 50},  # Below min_sample_size (100)
        }
        result = evaluator.evaluate(metrics_small)
        assert result["privacy_passed"] is False, "Sample size below minimum should fail"
        assert any("Sample size" in v for v in result["violations"])
        
        # At minimum
        metrics_min = {
            "privacy": {},
            "utility": {},
            "meta": {"n_real": 100},  # At min_sample_size
        }
        result = evaluator.evaluate(metrics_min)
        assert result["privacy_passed"] is True, "Sample size at minimum should pass"
    
    def test_compliance_score_calculation(self, good_metrics, bad_metrics):
        """COMP-010: Compliance score calculation."""
        evaluator = get_compliance_evaluator("hipaa_like")
        
        good_result = evaluator.evaluate(good_metrics)
        bad_result = evaluator.evaluate(bad_metrics)
        
        assert good_result["score"] > bad_result["score"], "Good metrics should have higher score"
        assert 0.0 <= good_result["score"] <= 1.0, "Score should be between 0 and 1"
        assert 0.0 <= bad_result["score"] <= 1.0, "Score should be between 0 and 1"
    
    def test_threshold_alignment_with_worker(self):
        """COMP-011: Verify thresholds align with worker.py thresholds."""
        evaluator = get_compliance_evaluator("hipaa_like")
        thresholds = evaluator.get_thresholds()
        
        # Check core thresholds match worker.py defaults
        assert thresholds["privacy"]["mia_auc_max"] == 0.60
        assert thresholds["utility"]["ks_mean_max"] == 0.10
        assert thresholds["utility"]["corr_delta_max"] == 0.10
        
        # Verify these match worker.py constants
        # (This test documents the alignment)
        assert thresholds["privacy"]["mia_auc_max"] == 0.60  # MIA_MAX in worker.py
        assert thresholds["utility"]["ks_mean_max"] == 0.10  # KS_MAX in worker.py
        assert thresholds["utility"]["corr_delta_max"] == 0.10  # CORR_MAX in worker.py
    
    def test_compliance_level_configurations(self):
        """COMP-012: Test all compliance level configurations."""
        for level in ComplianceLevel:
            evaluator = get_compliance_evaluator(level.value)
            config = evaluator.config
            
            # Verify configuration exists
            assert config is not None
            assert config.level == level
            assert config.privacy is not None
            assert config.utility is not None
            assert config.fairness is not None
            
            # Verify thresholds are reasonable
            assert 0 < config.privacy.mia_auc_max <= 1.0
            assert 0 < config.privacy.dup_rate_max <= 1.0
            assert 0 < config.utility.ks_mean_max <= 1.0
            assert 0 < config.utility.corr_delta_max <= 1.0


class TestComplianceIntegration:
    """Test compliance integration with worker pipeline."""
    
    def test_compliance_in_metrics_payload(self):
        """COMP-013: Compliance results should be in metrics payload format."""
        evaluator = get_compliance_evaluator("hipaa_like")
        metrics = {
            "privacy": {"mia_auc": 0.05, "dup_rate": 0.02},
            "utility": {"ks_mean": 0.08, "corr_delta": 0.09},
            "meta": {"n_real": 200},
        }
        
        result = evaluator.evaluate(metrics)
        
        # Verify result structure matches expected format
        assert "passed" in result
        assert "privacy_passed" in result
        assert "utility_passed" in result
        assert "fairness_passed" in result
        assert "violations" in result
        assert "score" in result
        assert "level" in result
        assert "timestamp" in result
        
        # Verify types
        assert isinstance(result["passed"], bool)
        assert isinstance(result["violations"], list)
        assert isinstance(result["score"], float)
        assert 0.0 <= result["score"] <= 1.0
    
    def test_compliance_with_missing_metrics(self):
        """COMP-014: Compliance evaluation should handle missing metrics gracefully."""
        evaluator = get_compliance_evaluator("hipaa_like")
        
        # Minimal metrics
        minimal_metrics = {
            "privacy": {},
            "utility": {},
            "meta": {"n_real": 200},
        }
        
        result = evaluator.evaluate(minimal_metrics)
        # Should not crash, should evaluate what's available
        assert "passed" in result
        assert "violations" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
