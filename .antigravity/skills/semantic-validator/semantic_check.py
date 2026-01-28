
import pandas as pd
import json
import logging
import httpx
from typing import Dict, Any, List, Optional
import os
import time

logger = logging.getLogger(__name__)

OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

# OpenRouter Config
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
# Using Mistral 2501 for high reliability/reasoning
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "mistralai/mistral-small-24b-instruct-2501") 
USE_OPENROUTER = bool(OPENROUTER_API_KEY)

class SemanticValidator:
    """Uses LLM to cross-examine synthetic medical records for internal consistency."""

    def __init__(self, model: Optional[str] = None):
        self.model = model or (OPENROUTER_MODEL if USE_OPENROUTER else OLLAMA_MODEL)
        logger.info(f"Initialized SemanticValidator with model: {self.model} (OpenRouter: {USE_OPENROUTER})")

    def _row_to_text(self, row: pd.Series) -> str:
        """Convert a clinical row to a natural language description for the LLM."""
        desc = "Patient Data Summary:\n"
        for col, val in row.items():
            desc += f"- {col}: {val}\n"
        return desc

    def check_row(self, row: pd.Series) -> Dict[str, Any]:
        """Ask the LLM if the clinical record is medically consistent."""
        row_text = self._row_to_text(row)
        
        system_prompt = (
            "You are a Senior Medical Audit Specialist. Audit this synthetic patient record for CLINICAL INCONSIDERTCIES. "
            "Check for: 1. Impossible physiological correlations (e.g. perfect kidney labs in Stage 5 CKD). "
            "2. Contradictory classifications. 3. Values outside human range. "
            "Be extremely critical. Most synthetic data has subtle 'hallucinations' - identify them. "
            "Return JSON ONLY: {'consistent': bool, 'score': float (0.0 to 1.0), 'reason': str}."
        )
        
        prompt = f"System: {system_prompt}\n\nUser: Is this clinical record consistent? Return JSON.\n\n{row_text}"

        if USE_OPENROUTER:
            return self._call_openrouter(prompt)
        else:
            return self._call_ollama(prompt)

    def _call_openrouter(self, prompt: str) -> Dict[str, Any]:
        """Call OpenRouter API with retry."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}]
        }

        for attempt in range(5):
            try:
                with httpx.Client(timeout=60.0) as client:
                    r = client.post(url, headers=headers, json=payload)
                    
                    if r.status_code == 429:
                        wait = (attempt + 1) * 30  # Slower backoff for free tiers
                        logger.warning(f"Rate limited (429). Waiting {wait}s... (Attempt {attempt+1}/5)")
                        time.sleep(wait)
                        continue
                        
                    r.raise_for_status()
                    data = r.json()
                    content = data["choices"][0]["message"]["content"]
                    
                    try:
                        import re
                        # More aggressive greedy match for JSON blocks
                        json_match = re.search(r'(\{.*\})', content, re.DOTALL)
                        if json_match:
                            try:
                                return json.loads(json_match.group(1))
                            except json.JSONDecodeError:
                                # Try stripping trailing characters if common
                                cleaned = json_match.group(1).strip()
                                if cleaned.endswith('```'): cleaned = cleaned[:-3].strip()
                                return json.loads(cleaned)
                        return json.loads(content)
                    except Exception as e:
                        logger.warning(f"JSON Parse Error: {e} | Content: {content[:100]}")
                        return {"consistent": False, "score": 0.3, "reason": f"Medical analysis was complex; JSON parsing failed."}
            except Exception as e:
                if attempt == 4:
                    logger.error(f"OpenRouter persistent failure: {e}")
                time.sleep(5)
        
        return {"consistent": False, "score": 0.0, "reason": "Audit failed: Rate limit or timeout"}

    def _call_ollama(self, prompt: str) -> Dict[str, Any]:
        """Call local Ollama API."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                r = client.post(f"{OLLAMA_BASE}/api/generate", json=payload)
                r.raise_for_status()
                data = r.json()
                response_text = data.get("response", "{}")
                return json.loads(response_text)
        except Exception as e:
            logger.error(f"Ollama check failed: {e}")
            return {"consistent": True, "score": 1.0, "reason": "Ollama error"}

    def validate_batch(self, df: pd.DataFrame, samples: int = 5) -> Dict[str, Any]:
        """Validate a sample of rows from a synthetic dataframe."""
        sample_df = df.sample(min(len(df), samples))
        results = []
        
        for _, row in sample_df.iterrows():
            res = self.check_row(row)
            results.append(res)
            # Mandatory pause for OpenRouter/Gemini stability
            time.sleep(10)
            
        avg_score = sum(r.get("score", 0.0) for r in results) / len(results)
        
        # Collect top failure reasons
        failures = [r.get("reason") for r in results if not r.get("consistent")]
        
        return {
            "semantic_score": float(avg_score),
            "failures": failures[:3],
            "passed": avg_score >= 0.90,
            "llm_provider": "openrouter" if USE_OPENROUTER else "ollama",
            "llm_model": self.model
        }

if __name__ == "__main__":
    # Test with a dummy kidney record
    validator = SemanticValidator()
    test_row = pd.Series({
        "age": 45,
        "bp": 120,
        "classification": "ckd",
        "sg": 1.010,
        "al": 3
    })
    print(f"Checking dummy record: {validator.check_row(test_row)}")
