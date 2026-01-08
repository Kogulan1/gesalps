"""
Experiment Framework for Compliance Validation and Simulations
Enables systematic testing of synthetic data generation with compliance checks.
"""

import os
import json
import logging
import pandas as pd
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from pathlib import Path

try:
    from libs.compliance import ComplianceEvaluator, get_compliance_evaluator
    COMPLIANCE_AVAILABLE = True
except ImportError:
    COMPLIANCE_AVAILABLE = False

try:
    from libs.model_selector import ClinicalModelSelector, select_model_for_dataset
    MODEL_SELECTOR_AVAILABLE = True
except ImportError:
    MODEL_SELECTOR_AVAILABLE = False

logger = logging.getLogger(__name__)


class ExperimentRunner:
    """Framework for running compliance validation experiments."""
    
    def __init__(
        self,
        compliance_level: Optional[str] = None,
        output_dir: Optional[str] = None,
    ):
        """Initialize experiment runner.
        
        Args:
            compliance_level: Compliance level (hipaa_like, clinical_strict, research).
            output_dir: Directory for experiment results.
        """
        self.compliance_evaluator = None
        if COMPLIANCE_AVAILABLE:
            try:
                self.compliance_evaluator = get_compliance_evaluator(compliance_level)
            except Exception as e:
                logger.warning(f"Compliance evaluator not available: {e}")
        
        self.output_dir = Path(output_dir) if output_dir else Path("experiments")
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def run_single_experiment(
        self,
        real_data: pd.DataFrame,
        synthetic_data: pd.DataFrame,
        metrics: Dict[str, Any],
        experiment_name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Run a single compliance validation experiment.
        
        Args:
            real_data: Real dataset DataFrame.
            synthetic_data: Synthetic dataset DataFrame.
            metrics: Computed metrics dictionary.
            experiment_name: Name for this experiment.
            metadata: Optional experiment metadata.
            
        Returns:
            Experiment results with compliance evaluation.
        """
        results = {
            "experiment_name": experiment_name,
            "timestamp": datetime.utcnow().isoformat(),
            "dataset_info": {
                "n_real_rows": len(real_data),
                "n_synth_rows": len(synthetic_data),
                "n_columns": len(real_data.columns),
            },
            "metrics": metrics,
            "compliance": None,
            "metadata": metadata or {},
        }
        
        # Run compliance evaluation
        if self.compliance_evaluator:
            try:
                compliance_result = self.compliance_evaluator.evaluate(metrics)
                results["compliance"] = compliance_result
            except Exception as e:
                logger.error(f"Compliance evaluation failed: {e}")
                results["compliance"] = {"error": str(e)}
        else:
            results["compliance"] = {"error": "Compliance evaluator not available"}
        
        # Save results
        self._save_experiment_results(results, experiment_name)
        
        return results
    
    def run_model_comparison(
        self,
        real_data: pd.DataFrame,
        model_configs: List[Dict[str, Any]],
        synthesizer_fn: Callable,
        experiment_name: str = "model_comparison",
    ) -> Dict[str, Any]:
        """Compare multiple models on the same dataset.
        
        Args:
            real_data: Real dataset.
            model_configs: List of model configurations to test.
            synthesizer_fn: Function that takes (real_data, config) and returns (synthetic_data, metrics).
            experiment_name: Name for this experiment.
            
        Returns:
            Comparison results with best model recommendation.
        """
        results = {
            "experiment_name": experiment_name,
            "timestamp": datetime.utcnow().isoformat(),
            "dataset_info": {
                "n_rows": len(real_data),
                "n_columns": len(real_data.columns),
            },
            "models": [],
            "best_model": None,
        }
        
        best_score = float('inf')
        best_model_idx = None
        
        for idx, config in enumerate(model_configs):
            model_name = config.get("method", f"model_{idx}")
            logger.info(f"Testing model {idx+1}/{len(model_configs)}: {model_name}")
            
            try:
                synthetic_data, metrics = synthesizer_fn(real_data, config)
                
                # Evaluate compliance
                compliance_result = None
                if self.compliance_evaluator:
                    try:
                        compliance_result = self.compliance_evaluator.evaluate(metrics)
                    except Exception as e:
                        logger.warning(f"Compliance evaluation failed for {model_name}: {e}")
                
                model_result = {
                    "model_name": model_name,
                    "config": config,
                    "metrics": metrics,
                    "compliance": compliance_result,
                    "synthetic_data_shape": synthetic_data.shape if synthetic_data is not None else None,
                }
                
                results["models"].append(model_result)
                
                # Track best model (lowest score = best)
                if compliance_result:
                    score = compliance_result.get("score", float('inf'))
                    if score < best_score:
                        best_score = score
                        best_model_idx = idx
                
            except Exception as e:
                logger.error(f"Model {model_name} failed: {e}")
                results["models"].append({
                    "model_name": model_name,
                    "config": config,
                    "error": str(e),
                })
        
        if best_model_idx is not None:
            results["best_model"] = results["models"][best_model_idx]
        
        # Save results
        self._save_experiment_results(results, experiment_name)
        
        return results
    
    def run_threshold_sensitivity(
        self,
        real_data: pd.DataFrame,
        synthetic_data: pd.DataFrame,
        metrics: Dict[str, Any],
        threshold_variations: List[Dict[str, Any]],
        experiment_name: str = "threshold_sensitivity",
    ) -> Dict[str, Any]:
        """Test sensitivity to threshold variations.
        
        Args:
            real_data: Real dataset.
            synthetic_data: Synthetic dataset.
            metrics: Computed metrics.
            threshold_variations: List of threshold configurations to test.
            experiment_name: Name for this experiment.
            
        Returns:
            Sensitivity analysis results.
        """
        results = {
            "experiment_name": experiment_name,
            "timestamp": datetime.utcnow().isoformat(),
            "base_metrics": metrics,
            "threshold_tests": [],
        }
        
        for idx, thresholds in enumerate(threshold_variations):
            # Create temporary compliance evaluator with custom thresholds
            if COMPLIANCE_AVAILABLE:
                try:
                    from libs.compliance import ComplianceConfig, PrivacyThresholds, UtilityThresholds, FairnessThresholds, ComplianceLevel
                    
                    # Build custom config
                    custom_config = ComplianceConfig(
                        level=ComplianceLevel.HIPAA_LIKE,  # Base level
                        privacy=PrivacyThresholds(**thresholds.get("privacy", {})),
                        utility=UtilityThresholds(**thresholds.get("utility", {})),
                        fairness=FairnessThresholds(**thresholds.get("fairness", {})),
                    )
                    
                    from libs.compliance import ComplianceEvaluator
                    temp_evaluator = ComplianceEvaluator(custom_config)
                    compliance_result = temp_evaluator.evaluate(metrics)
                    
                    results["threshold_tests"].append({
                        "threshold_config": thresholds,
                        "compliance_result": compliance_result,
                    })
                except Exception as e:
                    logger.error(f"Threshold test {idx} failed: {e}")
                    results["threshold_tests"].append({
                        "threshold_config": thresholds,
                        "error": str(e),
                    })
        
        # Save results
        self._save_experiment_results(results, experiment_name)
        
        return results
    
    def _save_experiment_results(self, results: Dict[str, Any], experiment_name: str):
        """Save experiment results to file."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{experiment_name}_{timestamp}.json"
        filepath = self.output_dir / filename
        
        try:
            with open(filepath, "w") as f:
                json.dump(results, f, indent=2, default=str)
            logger.info(f"Experiment results saved to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save experiment results: {e}")
    
    def generate_report(self, experiment_name: str) -> Optional[str]:
        """Generate markdown report from experiment results.
        
        Args:
            experiment_name: Name of the experiment.
            
        Returns:
            Markdown report string or None if experiment not found.
        """
        # Find latest experiment file
        pattern = f"{experiment_name}_*.json"
        experiment_files = list(self.output_dir.glob(pattern))
        
        if not experiment_files:
            logger.warning(f"No experiment files found for {experiment_name}")
            return None
        
        # Use most recent file
        latest_file = max(experiment_files, key=lambda p: p.stat().st_mtime)
        
        try:
            with open(latest_file, "r") as f:
                results = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load experiment results: {e}")
            return None
        
        # Generate markdown report
        report_lines = [
            f"# Experiment Report: {experiment_name}",
            f"",
            f"**Timestamp:** {results.get('timestamp', 'N/A')}",
            f"",
        ]
        
        if "dataset_info" in results:
            info = results["dataset_info"]
            report_lines.extend([
                "## Dataset Information",
                f"- Real rows: {info.get('n_real_rows', 'N/A')}",
                f"- Synthetic rows: {info.get('n_synth_rows', 'N/A')}",
                f"- Columns: {info.get('n_columns', 'N/A')}",
                "",
            ])
        
        if "compliance" in results and results["compliance"]:
            comp = results["compliance"]
            report_lines.extend([
                "## Compliance Evaluation",
                f"- **Status:** {'✅ PASSED' if comp.get('passed', False) else '❌ FAILED'}",
                f"- **Score:** {comp.get('score', 0.0):.2%}",
                f"- **Level:** {comp.get('level', 'N/A')}",
                "",
            ])
            
            if comp.get("violations"):
                report_lines.extend([
                    "### Violations",
                    "",
                ])
                for violation in comp["violations"]:
                    report_lines.append(f"- ❌ {violation}")
                report_lines.append("")
        
        if "models" in results:
            report_lines.extend([
                "## Model Comparison",
                "",
            ])
            for model in results["models"]:
                report_lines.append(f"### {model.get('model_name', 'Unknown')}")
                if "error" in model:
                    report_lines.append(f"- ❌ Error: {model['error']}")
                else:
                    comp = model.get("compliance", {})
                    status = "✅ PASSED" if comp.get("passed", False) else "❌ FAILED"
                    report_lines.append(f"- Compliance: {status} (Score: {comp.get('score', 0.0):.2%})")
                report_lines.append("")
        
        return "\n".join(report_lines)


def run_compliance_simulation(
    real_data: pd.DataFrame,
    synthesizer_fn: Callable,
    n_iterations: int = 10,
    compliance_level: str = "hipaa_like",
) -> Dict[str, Any]:
    """Run Monte Carlo simulation for compliance validation.
    
    Args:
        real_data: Real dataset.
        synthesizer_fn: Function that takes real_data and returns (synthetic_data, metrics).
        n_iterations: Number of simulation iterations.
        compliance_level: Compliance level.
        
    Returns:
        Simulation results with pass rate and statistics.
    """
    runner = ExperimentRunner(compliance_level=compliance_level)
    
    results = {
        "n_iterations": n_iterations,
        "compliance_level": compliance_level,
        "iterations": [],
        "summary": {},
    }
    
    pass_count = 0
    scores = []
    
    for i in range(n_iterations):
        logger.info(f"Simulation iteration {i+1}/{n_iterations}")
        
        try:
            synthetic_data, metrics = synthesizer_fn(real_data)
            
            # Evaluate compliance
            compliance_result = None
            if runner.compliance_evaluator:
                compliance_result = runner.compliance_evaluator.evaluate(metrics)
                if compliance_result.get("passed", False):
                    pass_count += 1
                score = compliance_result.get("score", 0.0)
                scores.append(score)
            
            results["iterations"].append({
                "iteration": i + 1,
                "metrics": metrics,
                "compliance": compliance_result,
            })
        except Exception as e:
            logger.error(f"Iteration {i+1} failed: {e}")
            results["iterations"].append({
                "iteration": i + 1,
                "error": str(e),
            })
    
    # Calculate summary statistics
    results["summary"] = {
        "pass_rate": pass_count / n_iterations if n_iterations > 0 else 0.0,
        "mean_score": sum(scores) / len(scores) if scores else 0.0,
        "min_score": min(scores) if scores else 0.0,
        "max_score": max(scores) if scores else 0.0,
    }
    
    return results

