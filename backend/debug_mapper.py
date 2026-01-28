import sys
import os
import traceback
import numpy as np

try:
    print("Importing modules...")
    import faiss
    from sentence_transformers import SentenceTransformer
    import pickle
    
    BASE_DIR = "/app/services/omop_engine"
    INDEX_FILE = os.path.join(BASE_DIR, 'models', 'omop.index')
    META_FILE = os.path.join(BASE_DIR, 'models', 'omop_meta.pkl')
    MODEL_NAME = 'all-MiniLM-L6-v2'

    print(f"Loading model {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME, device='cpu')
    
    print(f"Loading index from {INDEX_FILE}...")
    if not os.path.exists(INDEX_FILE):
        print(f"ERROR: Index file not found at {INDEX_FILE}")
        sys.exit(1)
        
    index = faiss.read_index(INDEX_FILE)
    print(f"Index loaded. ntotal: {index.ntotal}")
    print(f"Index dimension (d): {index.d}")
    
    print("Encoding sample...")
    query = ["diabetes", "heatt rate"]
    vectors = model.encode(query, convert_to_numpy=True)
    faiss.normalize_L2(vectors)
    vectors = vectors.astype(np.float32)
    
    print(f"Searching index (shapes: {vectors.shape})...")
    D, I = index.search(vectors, k=1)
    
    print("Results:")
    print(I)
    print("SUCCESS")

except Exception:
    traceback.print_exc()
