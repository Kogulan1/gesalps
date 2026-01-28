import sys
import pandas as pd
import numpy as np

def clean_data(input_path):
    print(f"[Cleaner] Scrubbing {input_path}...")
    try:
        df = pd.read_csv(input_path)
    except Exception as e:
        print(f"[Cleaner] Failed to read CSV: {e}")
        return

    # 1. Standardize Nulls
    df.replace(['NA', 'null', '?', ''], np.nan, inplace=True)
    
    # 2. Case Normalization for Object Columns
    for col in df.select_dtypes(include=['object']).columns:
        if df[col].nunique() < 50: # Only for categorical-like columns
            df[col] = df[col].str.title()
            
    # 3. Simple PII Stripping (Heuristic)
    pii_keywords = ['name', 'ssn', 'phone', 'email', 'address']
    cols_to_drop = [c for c in df.columns if any(k in c.lower() for k in pii_keywords)]
    
    if cols_to_drop:
        print(f"[Cleaner] DROPPING PII Columns: {cols_to_drop}")
        df.drop(columns=cols_to_drop, inplace=True)
        
    output_path = "clean_input.csv"
    df.to_csv(output_path, index=False)
    print(f"[Cleaner] Done. Saved to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        clean_data(sys.argv[1])
    else:
        print("[Cleaner] Usage: clean.py <input.csv>")
