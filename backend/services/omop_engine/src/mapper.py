import faiss
import pickle
import numpy as np
import os
import torch
from sentence_transformers import SentenceTransformer

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_FILE = os.path.join(BASE_DIR, 'models', 'omop.index')
META_FILE = os.path.join(BASE_DIR, 'models', 'omop_meta.pkl')
MODEL_NAME = 'all-MiniLM-L6-v2'

class ProductionMapper:
    _instance = None
    _is_ready = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ProductionMapper, cls).__new__(cls)
            cls._instance.initialize()
        return cls._instance

    def initialize(self):
        print("🚀 Initializing Chimera OMOP Engine (REAL PRODUCTION)...", flush=True)
        try:
            # 1. Load Model
            print(f"   - Loading Transformer: {MODEL_NAME}...", flush=True)
            self.model = SentenceTransformer(MODEL_NAME, device='cpu')
            
            # 2. Load FAISS Index
            print(f"   - Loading Vector Index: {INDEX_FILE}...", flush=True)
            if not os.path.exists(INDEX_FILE):
                raise FileNotFoundError(f"Index not found at {INDEX_FILE}")
            
            self.index = faiss.read_index(INDEX_FILE)
            
            # 3. Load Metadata
            print(f"   - Loading Metadata: {META_FILE}...", flush=True)
            with open(META_FILE, 'rb') as f:
                self.metadata = pickle.load(f)
                
            self._is_ready = True
            print("✅ Chimera Engine Online. Ready to map.", flush=True)
        except Exception as e:
            print(f"❌ Chimera Initialization Failed: {e}", flush=True)
            self._is_ready = False

    def map_columns(self, column_names, threshold=0.60):
        """
        Takes a list of strings (headers) and returns OMOP Concept IDs.
        """
        if not self._is_ready or not column_names:
            return {}
        
        # Ensure input is a list of strings
        if not isinstance(column_names, list):
            print(f"[Mapper] Warning: Input is not a list ({type(column_names)}). Attempting conversion.")
            try:
                # If it's a dataframe, get columns
                if hasattr(column_names, 'columns'):
                    column_names = column_names.columns.tolist()
                else:
                    column_names = list(column_names)
            except Exception:
                return {"error": "Invalid input format. Expected list of strings."}

        try:
            # Encode inputs
            vectors = self.model.encode(column_names, convert_to_numpy=True)
            faiss.normalize_L2(vectors)
            
            # Search (Top 1 match)
            # faiss expects float32
            vectors = vectors.astype(np.float32)
            D, I = self.index.search(vectors, k=1)
            
            results = {}
            for i, col_name in enumerate(column_names):
                score = float(D[i][0])
                idx = I[i][0]
                
                if score > threshold:
                    # Metadata is expected to be a DataFrame or list of dicts
                    # If DataFrame:
                    try:
                        match = self.metadata.iloc[idx]
                        results[col_name] = {
                            "omop_id": int(match['concept_id']),
                            "omop_name": str(match['concept_name']),
                            "domain": str(match['domain_id']),
                            "confidence": round(score, 4),
                            "status": "MATCH"
                        }
                    except Exception:
                        results[col_name] = {"status": "ERROR", "details": "Metadata lookup failed"}
                else:
                    results[col_name] = {
                        "status": "UNKNOWN",
                        "confidence": round(score, 4),
                        "details": "Below threshold"
                    }
                    
            return results
        except Exception as e:
            print(f"[Mapper] Search failed: {e}")
            return {"error": str(e)}
