import pandas as pd
import numpy as np
import json
import logging
import os
import httpx
import time
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# OpenRouter Config
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "mistralai/mistral-small-24b-instruct-2501")
USE_OPENROUTER = bool(OPENROUTER_API_KEY)

class ClinicalGuardian:
    """
    SOTA Medical Logic Enforcement logic.
    Inferece biological guardrails and enforces them on synthetic data.
    Now part of core backend libs.
    """

    def __init__(self, dataset_name: str = "Clinical Data"):
        self.dataset_name = dataset_name
        self.guardrails: Dict[str, Any] = {}

    def fetch_guardrails(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Ask the LLM to provide biological min/max and correlations."""
        if not USE_OPENROUTER:
            logger.warning("[ClinicalGuardian] OPENROUTER_API_KEY not found. Using empty guardrails.")
            return {}

        cols = df.columns.tolist()
        summary = df.describe().to_string()
        
        prompt = (
            f"Dataset Name: {self.dataset_name}\n"
            f"Columns: {cols}\n"
            f"Statistical Summary of REAL data:\n{summary}\n\n"
            "You are a Senior Pathologist. Identify the BIOLOGICAL LIMITS and CORRELATIONS for these columns. "
            "Return JSON only with keys:\n"
            "1. 'ranges': {col: [min, max]} for columns that must follow human biology.\n"
            "2. 'correlations': [{cols: [A, B], logic: 'A should be greater than B', type: 'HARD'}] if applicable.\n"
            "Example: radius must be > 0. Area must be > radius^2 * pi."
        )

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [{"role": "user", "content": prompt}]
        }

        try:
            with httpx.Client(timeout=60.0) as client:
                r = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
                r.raise_for_status()
                content = r.json()["choices"][0]["message"]["content"]
                
                import re
                json_match = re.search(r'(\{.*\})', content, re.DOTALL)
                if json_match:
                    self.guardrails = json.loads(json_match.group(1))
                    logger.info(f"[ClinicalGuardian] Guardrails established for {self.dataset_name}")
                    return self.guardrails
        except Exception as e:
            logger.error(f"[ClinicalGuardian] Failed to fetch Guardrails: {e}")
        
        return {}

    def enforce(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply mathematical and biological clipping to the synthetic data."""
        if not self.guardrails:
            return df

        df_guarded = df.copy()
        
        # 1. Enforce Ranges
        ranges = self.guardrails.get("ranges", {})
        for col, r in ranges.items():
            if col in df_guarded.columns:
                try:
                    min_val, max_val = r
                    df_guarded[col] = df_guarded[col].clip(lower=min_val, upper=max_val)
                except Exception:
                    pass
        
        # 2. Enforce Hard Logic (Cross-attribute) - SOTA Geometric
        if 'mean area' in df_guarded.columns and 'mean radius' in df_guarded.columns:
            # Area cannot be smaller than a circle of that radius
            min_area = (df_guarded['mean radius'] ** 2) * 3.14159 * 0.8 # 20% margin
            df_guarded['mean area'] = np.maximum(df_guarded['mean area'], min_area)

        return df_guarded
