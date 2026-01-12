import numpy as np
import pandas as pd
from sklearn.preprocessing import PowerTransformer, QuantileTransformer, MinMaxScaler

class ClinicalPreprocessor:
    """
    ClinicalPreprocessor: Adaptive Ensemble Pipeline for Clinical Data.
    Designed to Gaussianize distributions for TVAE latent space alignment.
    """
    
    def __init__(self):
        self.transformers = {}  # Per-column transformer (Power or Quantile)
        self.min_max_scalers = {}  # Per-column final layer scaler
        self.numerical_cols = []
        self.categorical_cols = []
        self.column_bounds = {}  # Store original min/max for inverse clipping
        self.original_dtypes = {} # Store original dtypes for integer rounding

    def fit(self, df: pd.DataFrame, metadata: dict):
        """
        Fit the adaptive ensemble based on distribution skewness.
        
        Logic:
        - $|Skew| > 1.0$: PowerTransformer (Yeo-Johnson)
        - $|Skew| <= 1.0$: QuantileTransformer (Normal)
        """
        self.numerical_cols = []
        self.categorical_cols = []
        
        # 1. Column Separation using metadata
        # Expecting metadata['columns'][col]['sdtype']
        cols_meta = metadata.get('columns', {})
        for col in df.columns:
            sdtype = cols_meta.get(col, {}).get('sdtype', 'numerical')
            if sdtype in ['numerical', 'integer', 'float']:
                self.numerical_cols.append(col)
            else:
                self.categorical_cols.append(col)
            # Track original dtypes for rounding in inverse_transform
            self.original_dtypes[col] = df[col].dtype

        # 2. Iterate through numerical columns
        for col in self.numerical_cols:
            # Handle missing values and non-numeric strings (e.g., '?')
            col_data = pd.to_numeric(df[col], errors='coerce')
            if col_data.isna().all():
                # Skip columns that can't be converted to numeric
                continue
            
            # Store original bounds for safety clipping (use numeric data)
            self.column_bounds[col] = (col_data.min(), col_data.max())
            
            # Calculate Skew on numeric data
            skew = col_data.skew()
            
            # Condition A: High Skew (> 1.0 or < -1.0)
            if abs(skew) > 1.0:
                # Assign PowerTransformer for extreme skew correction
                transformer = PowerTransformer(method='yeo-johnson', standardize=True)
            # Condition B: Complex/Multimodal (between -1.0 and 1.0)
            else:
                # Assign QuantileTransformer for high-fidelity mapping to Normal
                n_quantiles = max(100, min(len(df) // 10, 1000))
                transformer = QuantileTransformer(output_distribution='normal', n_quantiles=n_quantiles)
            
            # Fit transformer
            # NaN Safety: handle any NaNs before fitting
            data_col = df[[col]].fillna(df[col].mean())
            transformer.fit(data_col)
            self.transformers[col] = transformer
            
            # Final Layer Layer Scaling: MinMaxScaler to strictly bound to [0, 1]
            transformed_data = transformer.transform(data_col)
            mms = MinMaxScaler(feature_range=(0, 1))
            mms.fit(transformed_data)
            self.min_max_scalers[col] = mms

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform dataframe into Gaussianized [0, 1] space.
        """
        processed = df.copy()
        
        for col in self.numerical_cols:
            # Handle non-numeric values (e.g., '?' strings) - convert to numeric first
            col_data = pd.to_numeric(processed[col], errors='coerce')
            
            # NaN Safety: Check and fill missing values
            if col_data.isnull().any():
                missing_pct = col_data.isnull().mean()
                if missing_pct > 0.05:
                    import warnings
                    warnings.warn(f"Column '{col}' has {missing_pct:.2%} missing values.")
                col_data = col_data.fillna(col_data.mean())
            
            # Update processed dataframe with numeric data
            processed[col] = col_data
            
            # Step 1: Gaussianization (Reshape for sklearn: (N, 1))
            data_col = processed[[col]].values
            gaussianized = self.transformers[col].transform(data_col)
            
            # Step 2: Bound result to strictly [0, 1]
            final_scaled = self.min_max_scalers[col].transform(gaussianized)
            processed[col] = final_scaled.flatten()
            
        # Categorical/Binary/Pass-through columns remain untouched
        return processed

    def inverse_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Reconstruct original data scale with safety clipping and rounding.
        """
        reconstructed = df.copy()
        
        for col in self.numerical_cols:
            # Step 1: Unbound (Inverse MinMax)
            data_col = reconstructed[[col]].values
            unbound = self.min_max_scalers[col].inverse_transform(data_col)
            
            # Step 2: De-Gaussianize (Inverse Transformer)
            original_scale = self.transformers[col].inverse_transform(unbound)
            
            # Step 3: Safety Clipping to original Min/Max observed during fit
            low, high = self.column_bounds[col]
            clipped = np.clip(original_scale.flatten(), low, high)
            
            # Step 4: Round Binary/Int-like columns
            orig_dtype = self.original_dtypes[col]
            if np.issubdtype(orig_dtype, np.integer):
                clipped = np.round(clipped).astype(orig_dtype)
            
            reconstructed[col] = clipped
            
        return reconstructed
