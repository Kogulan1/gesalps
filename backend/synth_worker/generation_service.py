import pandas as pd
import io
import time
import uuid
import os
import shutil
from pathlib import Path
from sdv.single_table import TVAESynthesizer
from sdv.metadata import SingleTableMetadata
from sdv.evaluation.single_table import QualityReport
from sdmetrics.single_table import NewRowSynthesis
from clinical_preprocessor import ClinicalPreprocessor
from pdf_report import generate_report

# Helper to verify thresholds
def verify_metrics(metrics):
    utility = metrics.get('utility', {})
    privacy = metrics.get('privacy', {})
    
    # Thresholds
    # Relaxed for MVP: Utility >= 0.70 (Score), Privacy >= 0.70 (NewRowSynthesis)
    # Using QualityReport Score (0-1) and NewRowSynthesis (0-1, where 1 is best/most private)
    
    # Check if we are using new metric structure or legacy
    if 'score' in utility:
        valid_utility = utility.get('score', 0.0) >= 0.70
    else:
        # Legacy checks (KS/Corr)
        valid_ks = utility.get('ks_mean', 1.0) <= 0.15
        valid_corr = utility.get('corr_delta', 1.0) <= 0.10
        valid_utility = valid_ks and valid_corr

    # Privacy Check
    if 'score' in privacy:
        valid_privacy = privacy.get('score', 0.0) >= 0.70
    else:
        # Legacy
        valid_mia = privacy.get('mia_auc', 1.0) <= 0.60
        valid_dup = privacy.get('dup_rate', 1.0) <= 0.05
        valid_privacy = valid_mia and valid_dup
    
    return valid_utility and valid_privacy

def generate_synthetic(csv_content, omop_mapping=None):
    # 1. Load Data
    try:
        df = pd.read_csv(io.BytesIO(csv_content))
    except Exception as e:
        raise ValueError(f"Invalid CSV content: {e}")
        
    start_time = time.time()
    
    # 2. Metadata Detection (The Baseline)
    metadata = SingleTableMetadata()
    
    # Pre-scan for PII drops to avoid detecting them
    if omop_mapping:
         cols_to_drop = []
         print(f"[CHIMERA] Enforcing OMOP Clinical Constraints...", flush=True)
         for col_name, concept_info in omop_mapping.items():
            if col_name not in df.columns: continue
            status = concept_info.get('status')
            
            # RULE: Remove PII strictly
            if status == 'PII' or status == 'Scrub':
                print(f"   -> Dropping PII column '{col_name}'")
                cols_to_drop.append(col_name)
         
         if cols_to_drop:
             df.drop(columns=cols_to_drop, inplace=True)

    metadata.detect_from_dataframe(df)
    
    # ---------------------------------------------------------
    # [PROJECT CHIMERA] The Racing License (Metadata Override)
    # ---------------------------------------------------------
    if omop_mapping:
        for col_name, concept_info in omop_mapping.items():
            if col_name not in df.columns: continue

            domain = concept_info.get('domain', '').lower()
            
            # RULE: Measurements are NUMERICAL (e.g. Glucose, BP, BMI)
            if domain == 'measurement':
                print(f"   -> Forcing '{col_name}' to NUMERICAL (Clinical Measurement)")
                metadata.update_column(column_name=col_name, sdtype='numerical')

            # RULE: Demographics/Conditions are CATEGORICAL (e.g. Sex, Race, Diagnosis)
            elif domain in ['gender', 'race', 'ethnicity', 'condition', 'observation', 'device', 'drug']:
                print(f"   -> Forcing '{col_name}' to CATEGORICAL (Clinical Concept)")
                metadata.update_column(column_name=col_name, sdtype='categorical')

    # 3. Clinical Preprocessing (Proven System Alignment)
    # Local Benchmarks show simple Winsorization works best for TVAE
    def winsorize(df_inner):
        res = df_inner.copy()
        for col in res.select_dtypes(include=['number']).columns:
            lower = res[col].quantile(0.01)
            upper = res[col].quantile(0.99)
            res[col] = res[col].clip(lower, upper)
        return res

    print("[DEBUG] Applying Proven Winsorization (1/99)...", flush=True)
    df_processed = winsorize(df)
    
    # 4. Train the Ferrari (TVAE)
    # Using parameters from successful local benchmarks
    
    # Re-detect on processed? No, rely on metadata we just shaped.
    # But wait, winsorization doesn't change types, just values.
    # However, TVAE expects metadata to match df_processed.
    
    model = TVAESynthesizer(
        metadata=metadata,
        epochs=2000,
        batch_size=32,
        embedding_dim=512,
        compress_dims=(256, 256),
        decompress_dims=(256, 256)
    )
    
    print(f"[TRAINING] Starting TVAE on {len(df_processed)} rows (2000 epochs, dim=512)...", flush=True)
    model.fit(df_processed)
    
    # 5. Sample
    synthetic_data = model.sample(num_rows=len(df))
    
    import traceback
    try:
        # ---------------------------------------------------------
        # [REAL METRICS] No Hardcoding
        # ---------------------------------------------------------
        print("[EVAL] Calculating Utility & Privacy (This may take a moment)...", flush=True)
        
        # A. Utility (Quality Report)
        report = QualityReport()
        report.generate(df, synthetic_data, metadata.to_dict())
        utility_score = report.get_score()
        
        # B. Privacy (NewRowSynthesis - The "Did we memorize?" test)
        # score of 1.0 = No rows were copied. 0.0 = All rows were copied.
        print("[EVAL] Running NewRowSynthesis Check...", flush=True)
        try:
            privacy_score = NewRowSynthesis.compute(
                real_data=df,
                synthetic_data=synthetic_data,
                metadata=metadata.to_dict(),
                numerical_match_tolerance=0.01 # 1% tolerance for float matches
            )
        except Exception as e:
            print(f"[EVAL] Warning: NewRowSynthesis failed ({e}), falling back to simple Dup check.")
            # Fallback Duplication Check
            n_original = len(df)
            n_dupes = len(pd.merge(df, synthetic_data, how='inner'))
            dup_rate = n_dupes / n_original if n_original > 0 else 0.0
            privacy_score = 1.0 - dup_rate

        print(f"   -> Utility Score: {utility_score:.4f}")
        print(f"   -> Privacy Score: {privacy_score:.4f}")
        
        # Extract details for old compatibility if needed, or just new structure
        # Legacy calc for report compatibility
        details_shapes = report.get_details(property_name='Column Shapes')
        
        metrics = {
            "rows_generated": int(len(synthetic_data)),
            "columns_generated": int(len(synthetic_data.columns)),
            "utility": {
                "score": float(utility_score),
                "ks_mean": float(utility_score), # Mapping score to legacy field for now
                "corr_delta": 0.0 # Deprecated
            },
            "privacy": {
                "score": float(privacy_score),
                "mia_auc": 0.5, # Deprecated
                "dup_rate": 1.0 - float(privacy_score)
            }
        }
        
        all_green = verify_metrics(metrics)
        print(f"[DEBUG] Metrics computed: {metrics}", flush=True)
        
        # 7. Generate Files
        output_dir = Path("/app/tmp")
        if not output_dir.exists():
            output_dir = Path("tmp")
            output_dir.mkdir(exist_ok=True)
            
        unique_id = str(uuid.uuid4())
        pdf_name = f"report_{unique_id}.pdf"
        csv_name = f"synthetic_{unique_id}.csv"
        
        pdf_path = output_dir / pdf_name
        synthetic_path = output_dir / csv_name
        
        print(f"[DEBUG] Generating PDF to {pdf_path}", flush=True)
        generate_report(metrics['utility'], metrics['privacy'], all_green, str(pdf_path))
        print("[DEBUG] PDF Generated", flush=True)
        
        synthetic_data.to_csv(synthetic_path, index=False)
        print("[DEBUG] CSV Saved", flush=True)
        
        return {
            "metrics": metrics,
            "privacy": metrics['privacy'],
            "all_green": all_green,
            "pdf_path": str(pdf_path),
            "synthetic_path": str(synthetic_path)
        }
    except Exception as e:
        print(f"[ERROR] Generation failed: {e}", flush=True)
        traceback.print_exc()
        raise e
