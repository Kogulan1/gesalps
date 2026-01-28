
import os
import sys
import pandas as pd
import json
import time
from dotenv import load_dotenv

# 1. Environment & Path Setup
# Load OpenRouter keys from backend/.env
load_dotenv("backend/.env")

# Ensure skills path is included
sys.path.append(os.path.abspath('backend/synth_worker'))
sys.path.append(os.path.abspath('.antigravity/skills/semantic-validator'))

# Import the REAL validator
try:
    from semantic_check import SemanticValidator
    from worker import _semantic_audit
except ImportError as e:
    print(f"❌ Initialization Error: {e}")
    sys.exit(1)

def run_industry_semantic_audit():
    print("🚀 Starting Industry-Level Semantic 'Triple Crown' Audit")
    print(f"🤖 LLM Backend: {'OpenRouter (Gemini)' if os.getenv('OPENROUTER_API_KEY') else 'Local Ollama'}")
    
    datasets = {
        "Kidney": "local_benchmarks/data/kidney_disease.csv",
        "Hepatitis": "local_benchmarks/data/hepatitis.csv",
        "Diabetes": "local_benchmarks/data/diabetes.csv",
        "HCV / HepC": "local_benchmarks/data/hcv_data.csv",
        "Breast Cancer": "local_benchmarks/data/breast_cancer.csv"
    }
    
    audit_results = []
    
    for name, path in datasets.items():
        print(f"\n--- [AUDIT] {name} Dataset ---")
        if not os.path.exists(path):
            print(f"⚠️ Dataset {path} not found. Skipping.")
            continue
            
        real_df = pd.read_csv(path)
        # We test on REAL data first to establish a "Truth Baseline"
        print("🔍 Auditing Ground Truth (Real Data Consistency)...")
        real_audit = _semantic_audit(real_df, samples=1)
        
        # Establish 15s gap to avoid rate limits
        time.sleep(15)
        
        # Now simulate a synthetic set with a known corruption
        # We take 1 record and corrupt it to ensure it's audited
        synth_df = real_df.sample(1).copy()
        
        # Inject an medical logical error
        if name == "Kidney":
            # CKD Stage 5 but with perfect labs
            synth_df.iloc[0, synth_df.columns.get_loc('sg')] = 1.025
            synth_df.iloc[0, synth_df.columns.get_loc('al')] = 0
            synth_df.iloc[0, synth_df.columns.get_loc('classification')] = 'ckd'
        elif name == "Hepatitis":
            # Patient with 'Live Firm' and 'Spleen Palpable' but labeled as 'Healthy/Class 2'
            synth_df.iloc[0, synth_df.columns.get_loc('liver_firm')] = 1
            synth_df.iloc[0, synth_df.columns.get_loc('spleen_palpable')] = 1
            synth_df.iloc[0, synth_df.columns.get_loc('class')] = 2 
        elif name == "Breast Cancer":
            # Physically impossible radius vs area (Radius=100, Area=10)
            synth_df.iloc[0, synth_df.columns.get_loc('mean radius')] = 100.0
            synth_df.iloc[0, synth_df.columns.get_loc('mean area')] = 10.0
            
        print("🤖 Auditing Synthetic Candidates (SOTA Mode)...")
        # Audit exactly the 1 corrupted row
        synth_audit = _semantic_audit(synth_df, samples=1)
        
        row_report = {
            "Domain": name,
            "Ground Truth Score": real_audit.get("semantic_score") if real_audit else "Error",
            "Synthetic Score": synth_audit.get("semantic_score") if synth_audit else "Error",
            "LLM Verdict": "PASSED" if synth_audit and synth_audit.get("passed") else "LOGIC FAILED",
            "Critical Failure Detected": "; ".join(synth_audit.get("failures", [])) if synth_audit and not synth_audit.get("passed") else "None"
        }
        audit_results.append(row_report)
        print(f"✅ Audit Complete for {name}. Verdict: {row_report['LLM Verdict']}")
        
        # Rate limit protection for free-tier OpenRouter
        time.sleep(10)

    # Output Final Technical Summary
    print("\n" + "="*80)
    print("🏆 INDUSTRY-GRADE SEMANTIC COMPLIANCE SUMMARY")
    print("="*80)
    report_df = pd.DataFrame(audit_results)
    print(report_df.to_string(index=False))
    
    # Save for Artifact Integration
    with open("industry_semantic_results.json", "w") as f:
        json.dump(audit_results, f, indent=4)

if __name__ == "__main__":
    run_industry_semantic_audit()
