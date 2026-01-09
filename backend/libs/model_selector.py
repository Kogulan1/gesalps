"""
Enhanced Auto-Model Selection Pipeline for Clinical Data
LLM-powered model selection with compliance awareness and clinical data optimization.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
import pandas as pd

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    from libs.compliance import ComplianceEvaluator, get_compliance_evaluator, ComplianceLevel
    COMPLIANCE_AVAILABLE = True
except ImportError:
    COMPLIANCE_AVAILABLE = False

logger = logging.getLogger(__name__)

# LLM Provider Configuration
# OpenRouter (preferred if key is available - better performance)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE = os.getenv("OPENROUTER_BASE", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL") or os.getenv("AGENT_MODEL") or "mistralai/mistral-small-24b-instruct:free"  # Free model - best for cost optimization

# Ollama (fallback if OpenRouter not available)
OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL") or os.getenv("AGENT_MODEL") or "llama3.1:8b"

# Determine which provider to use
USE_OPENROUTER = bool(OPENROUTER_API_KEY)
AGENT_PROVIDER = "openrouter" if USE_OPENROUTER else "ollama"
AGENT_MODEL = OPENROUTER_MODEL if USE_OPENROUTER else OLLAMA_MODEL


class ClinicalModelSelector:
    """Enhanced model selector with clinical data awareness and compliance checks."""
    
    def __init__(self, compliance_level: Optional[str] = None):
        """Initialize model selector.
        
        Args:
            compliance_level: Compliance level (hipaa_like, clinical_strict, research).
        """
        self.compliance_evaluator = None
        if COMPLIANCE_AVAILABLE:
            try:
                self.compliance_evaluator = get_compliance_evaluator(compliance_level)
            except Exception as e:
                logger.warning(f"Compliance evaluator not available: {e}")
    
    def analyze_dataset(self, df: pd.DataFrame, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Analyze dataset characteristics for model selection.
        
        Args:
            df: DataFrame to analyze.
            schema: Optional schema information.
            
        Returns:
            Dictionary with dataset characteristics.
        """
        analysis = {
            "n_rows": len(df),
            "n_cols": len(df.columns),
            "numeric_cols": [],
            "categorical_cols": [],
            "datetime_cols": [],
            "high_cardinality_cols": [],
            "missing_rates": {},
            "column_types": {},
            "is_clinical": False,
            "has_pii": False,
        }
        
        # Analyze columns
        for col in df.columns:
            col_data = df[col]
            dtype = str(col_data.dtype)
            
            # Type classification
            if pd.api.types.is_numeric_dtype(col_data):
                analysis["numeric_cols"].append(col)
                analysis["column_types"][col] = "numeric"
            elif pd.api.types.is_datetime64_any_dtype(col_data):
                analysis["datetime_cols"].append(col)
                analysis["column_types"][col] = "datetime"
            else:
                analysis["categorical_cols"].append(col)
                analysis["column_types"][col] = "categorical"
            
            # Cardinality check
            if col_data.dtype == "object" or pd.api.types.is_categorical_dtype(col_data):
                unique_count = col_data.nunique()
                if unique_count > 1000:
                    analysis["high_cardinality_cols"].append({
                        "column": col,
                        "unique_count": unique_count,
                    })
            
            # Missing data
            missing_rate = col_data.isna().mean()
            if missing_rate > 0:
                analysis["missing_rates"][col] = float(missing_rate)
        
        # Clinical data detection (heuristic)
        clinical_keywords = [
            "patient", "diagnosis", "icd", "cpt", "procedure", "medication",
            "lab", "vital", "bmi", "age", "gender", "race", "ethnicity",
            "admission", "discharge", "encounter", "visit", "hospital",
        ]
        col_names_lower = [c.lower() for c in df.columns]
        analysis["is_clinical"] = any(
            keyword in col_name
            for keyword in clinical_keywords
            for col_name in col_names_lower
        )
        
        # PII detection (heuristic)
        pii_keywords = [
            "ssn", "social_security", "email", "phone", "address",
            "name", "first_name", "last_name", "dob", "date_of_birth",
            "zip", "postal_code", "credit_card", "account_number",
        ]
        analysis["has_pii"] = any(
            keyword in col_name
            for keyword in pii_keywords
            for col_name in col_names_lower
        )
        
        return analysis
    
    def select_model_llm(
        self,
        dataset_analysis: Dict[str, Any],
        preference: Optional[Dict[str, Any]] = None,
        goal: Optional[str] = None,
        user_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Select model using LLM with clinical data awareness.
        
        Args:
            dataset_analysis: Dataset analysis from analyze_dataset().
            preference: User preferences (tradeoff, privacy_first, etc.).
            goal: User goal description.
            user_prompt: Additional user instructions.
            
        Returns:
            Model selection plan with method, hyperparameters, and rationale.
        """
        if not HTTPX_AVAILABLE:
            logger.warning("httpx not available, using fallback selection")
            return self._fallback_selection(dataset_analysis, preference)
        
        tradeoff = ((preference or {}).get("tradeoff") or "balanced").lower()
        
        # Build enhanced system prompt with compliance awareness
        system_prompt = self._build_system_prompt(dataset_analysis, tradeoff)
        
        # Build user prompt
        user_prompt_text = self._build_user_prompt(
            dataset_analysis, preference, goal, user_prompt
        )
        
        # Call LLM
        try:
            plan = self._call_llm(system_prompt, user_prompt_text)
            return plan
        except Exception as e:
            logger.error(f"LLM model selection failed: {e}")
            return self._fallback_selection(dataset_analysis, preference)
    
    def _build_system_prompt(self, analysis: Dict[str, Any], tradeoff: str) -> str:
        """Build system prompt for LLM."""
        compliance_note = ""
        if self.compliance_evaluator:
            level = self.compliance_evaluator.config.level.value
            compliance_note = f"\n- Compliance Level: {level.upper()}. Ensure selected model can meet compliance thresholds."
        
        clinical_note = ""
        if analysis.get("is_clinical"):
            clinical_note = "\n- CLINICAL DATA DETECTED: Prioritize TabDDPM (ddpm) for best privacy-utility tradeoff. Clinical data requires strict privacy guarantees."
        
        pii_note = ""
        if analysis.get("has_pii"):
            pii_note = "\n- PII DETECTED: Strongly recommend Differential Privacy (DP) enabled models. Consider dp-ctgan or ensure DP is enabled."
        
        high_card_note = ""
        if analysis.get("high_cardinality_cols"):
            high_card_note = f"\n- HIGH CARDINALITY COLUMNS DETECTED ({len(analysis['high_cardinality_cols'])}): Avoid CTGAN. Use GC, TVAE, or TabDDPM instead."
        
        return f"""You are a senior synthetic-data scientist specializing in healthcare/clinical tabular data.
Return ONLY valid JSON per schema:
{{
 "choice": {{"method": "ddpm|gc|ctgan|tvae"}},
 "hyperparams": {{
   "sample_multiplier": number,
   "max_synth_rows": number,
   "ctgan": {{"epochs": int, "batch_size": int, "embedding_dim": int}}?,
   "tvae": {{"epochs": int, "batch_size": int, "embedding_dim": int}}?,
   "ddpm": {{"n_iter": int}}?
 }},
 "dp": {{"enabled": bool, "epsilon": number|null, "delta": number|null}},
 "backup": [{{"method": "ddpm|gc|ctgan|tvae", "hyperparams": {{...}}}}...],
 "rationale": "short reason"
}}

Guidance:
- TabDDPM (ddpm) is RECOMMENDED for clinical datasets (2025 SOTA diffusion model):
  * Best for high-dimensional clinical data with mixed numeric/categorical columns
  * n_iter: 300-500 for fast test, 500-1000 for production quality
  * Highest fidelity for complex healthcare data
  * Excellent privacy guarantees (MIA AUC typically < 0.01)
{clinical_note}
{pii_note}
{high_card_note}
- GC for small/mixed data with many categoricals or high-cardinality columns (>1000 unique values).
- CTGAN for complex categorical/non-Gaussian data (AVOID if any column has >1000 unique values):
  * Small datasets (<1000 rows): epochs 300-400, batch 64-128, embedding_dim 128-256
  * Medium (1000-10000): epochs 400-500, batch 128-256, embedding_dim 256-512
  * Large (>10000): epochs 500-600, batch 256-512, embedding_dim 512
- TVAE for continuous-heavy data:
  * Small: epochs 250-350, batch 64-128, embedding_dim 64-128
  * Medium: epochs 350-450, batch 128-256, embedding_dim 128-256
  * Large: epochs 450-550, batch 256-512, embedding_dim 256
- Pick sample_multiplier in [1.0..3.0] based on rows_count; cap max_synth_rows ≤ 50000.
- Scale embedding_dim with number of columns: <10 cols use 64-128, 10-30 use 128-256, >30 use 256-512.
- Always include 2 backups with different methods/hparams.
{compliance_note}
No prose. JSON only."""
    
    def _build_user_prompt(
        self,
        analysis: Dict[str, Any],
        preference: Optional[Dict[str, Any]],
        goal: Optional[str],
        user_prompt: Optional[str],
    ) -> str:
        """Build user prompt for LLM."""
        tradeoff = ((preference or {}).get("tradeoff") or "balanced").lower()
        
        prompt_parts = [
            f"Dataset: {analysis.get('n_rows')} rows, {analysis.get('n_cols')} columns",
            f"Numeric columns: {len(analysis.get('numeric_cols', []))}",
            f"Categorical columns: {len(analysis.get('categorical_cols', []))}",
            f"High-cardinality columns: {len(analysis.get('high_cardinality_cols', []))}",
        ]
        
        if analysis.get("is_clinical"):
            prompt_parts.append("⚠️ CLINICAL DATA DETECTED")
        
        if analysis.get("has_pii"):
            prompt_parts.append("⚠️ PII DETECTED - DP recommended")
        
        if analysis.get("high_cardinality_cols"):
            cols = [c["column"] for c in analysis["high_cardinality_cols"][:3]]
            prompt_parts.append(f"High-cardinality columns: {', '.join(cols)}")
        
        prompt_parts.append(f"Tradeoff preference: {tradeoff}")
        
        if goal:
            prompt_parts.append(f"Goal: {goal}")
        
        if user_prompt:
            prompt_parts.append(f"User instructions: {user_prompt}")
        
        return "\n".join(prompt_parts)
    
    def _call_llm(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Call LLM for model selection using OpenRouter (preferred) or Ollama (fallback)."""
        if USE_OPENROUTER:
            return self._call_openrouter(system_prompt, user_prompt)
        else:
            return self._call_ollama(system_prompt, user_prompt)
    
    def _call_openrouter(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Call OpenRouter API for model selection (better performance, structured JSON)."""
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY not set")
        
        # OpenRouter uses OpenAI-compatible API format
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,  # Lower temperature for more consistent JSON
            "max_tokens": 2000,
            "response_format": {"type": "json_object"},  # Request JSON format
        }
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "https://gesalp.ai"),  # Optional: for analytics
            "X-Title": "Gesalp AI Synthetic Data Generator",  # Optional: for analytics
        }
        
        try:
            with httpx.Client(timeout=90) as client:  # Longer timeout for cloud API
                response = client.post(
                    f"{OPENROUTER_BASE}/chat/completions",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                output = response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenRouter API HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"OpenRouter API call failed: {e}")
            raise
        
        # Extract response from OpenRouter format
        try:
            text = output["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            logger.error(f"Unexpected OpenRouter response format: {output}")
            raise ValueError(f"Invalid OpenRouter response: {e}")
        
        # Parse JSON from response
        try:
            plan = json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON from text if not pure JSON
            import re
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if not match:
                logger.error(f"OpenRouter returned non-JSON response: {text[:200]}")
                raise ValueError("LLM returned non-JSON response")
            plan = json.loads(match.group(0))
        
        # Validate and normalize plan
        return self._normalize_plan(plan)
    
    def _call_ollama(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Call Ollama API for model selection (fallback)."""
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": f"System:\n{system_prompt}\n\nUser:\n{user_prompt}\n",
            "stream": False,
        }
        
        try:
            with httpx.Client(timeout=60) as client:
                response = client.post(f"{OLLAMA_BASE}/api/generate", json=payload)
                response.raise_for_status()
                output = response.json()
        except Exception as e:
            logger.error(f"Ollama API call failed: {e}")
            raise
        
        text = (output or {}).get("response") or "{}"
        
        # Parse JSON from response
        try:
            plan = json.loads(text)
        except json.JSONDecodeError:
            import re
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if not match:
                raise ValueError("LLM returned non-JSON response")
            plan = json.loads(match.group(0))
        
        # Validate and normalize plan
        return self._normalize_plan(plan)
    
    def _normalize_plan(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and validate model selection plan."""
        # Ensure required keys
        if "choice" not in plan:
            plan["choice"] = {}
        
        if not isinstance(plan["choice"], dict):
            plan["choice"] = {"method": str(plan["choice"])}
        
        method = str(plan["choice"].get("method", "ddpm")).lower()
        if method not in ["ddpm", "gc", "ctgan", "tvae", "pategan", "dpgan", "dp-ctgan"]:
            method = "ddpm"  # Default to TabDDPM for clinical data
        plan["choice"]["method"] = method
        
        # Normalize hyperparameters
        if "hyperparams" not in plan:
            plan["hyperparams"] = {}
        
        hp = plan["hyperparams"]
        hp["sample_multiplier"] = float(hp.get("sample_multiplier", 1.0))
        hp["max_synth_rows"] = int(hp.get("max_synth_rows", 5000))
        
        # Ensure backup methods
        if "backup" not in plan:
            plan["backup"] = []
        
        # Normalize DP settings
        if "dp" not in plan:
            plan["dp"] = {"enabled": False}
        
        if not isinstance(plan["dp"], dict):
            plan["dp"] = {"enabled": bool(plan["dp"])}
        
        # Add rationale if missing
        if "rationale" not in plan:
            plan["rationale"] = f"Selected {method.upper()} based on dataset characteristics"
        
        return plan
    
    def _fallback_selection(
        self,
        analysis: Dict[str, Any],
        preference: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Fallback model selection without LLM."""
        n_rows = analysis.get("n_rows", 0)
        n_cols = analysis.get("n_cols", 0)
        is_clinical = analysis.get("is_clinical", False)
        has_pii = analysis.get("has_pii", False)
        high_card_cols = analysis.get("high_cardinality_cols", [])
        
        # Clinical data or high-dimensional: use TabDDPM
        if is_clinical or n_cols > 20:
            method = "ddpm"
            n_iter = 500 if n_rows > 1000 else 300
        # High cardinality: avoid CTGAN
        elif high_card_cols:
            method = "gc"
            n_iter = None
        # Categorical-heavy: CTGAN
        elif len(analysis.get("categorical_cols", [])) > len(analysis.get("numeric_cols", [])):
            method = "ctgan"
            n_iter = None
        # Default: TabDDPM
        else:
            method = "ddpm"
            n_iter = 400
        
        # DP if PII detected
        dp_enabled = has_pii or (is_clinical and self.compliance_evaluator and self.compliance_evaluator.config.require_dp_proof)
        
        max_rows = min(50000, max(2000, n_rows))
        
        plan = {
            "choice": {"method": method},
            "hyperparams": {
                "sample_multiplier": 1.0,
                "max_synth_rows": max_rows,
            },
            "dp": {
                "enabled": dp_enabled,
                "epsilon": 1.0 if dp_enabled else None,
                "delta": 1e-5 if dp_enabled else None,
            },
            "backup": [
                {"method": "gc", "hyperparams": {"sample_multiplier": 1.0, "max_synth_rows": max_rows}},
                {"method": "tvae", "hyperparams": {"sample_multiplier": 1.0, "max_synth_rows": max_rows}},
            ],
            "rationale": f"Fallback selection: {method.upper()} for {'clinical' if is_clinical else 'general'} data",
        }
        
        if method == "ddpm" and n_iter:
            plan["hyperparams"]["ddpm"] = {"n_iter": n_iter}
        
        return plan


def select_model_for_dataset(
    df: pd.DataFrame,
    schema: Optional[Dict[str, Any]] = None,
    preference: Optional[Dict[str, Any]] = None,
    goal: Optional[str] = None,
    user_prompt: Optional[str] = None,
    compliance_level: Optional[str] = None,
) -> Dict[str, Any]:
    """Convenience function for model selection.
    
    Args:
        df: Dataset DataFrame.
        schema: Optional schema information.
        preference: User preferences.
        goal: User goal.
        user_prompt: Additional instructions.
        compliance_level: Compliance level.
        
    Returns:
        Model selection plan.
    """
    selector = ClinicalModelSelector(compliance_level=compliance_level)
    analysis = selector.analyze_dataset(df, schema)
    return selector.select_model_llm(analysis, preference, goal, user_prompt)

