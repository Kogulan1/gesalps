import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss
import pickle
import os

# --- PATH CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_FILE = os.path.join(BASE_DIR, 'data', 'raw', 'CONCEPT.csv')
INDEX_FILE = os.path.join(BASE_DIR, 'models', 'omop.index')
META_FILE = os.path.join(BASE_DIR, 'models', 'omop_meta.pkl')
# Clinical-specific BERT model
MODEL_NAME = 'all-MiniLM-L6-v2'

def build_engine():
    # 1. LOAD DATA
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Error: {INPUT_FILE} not found. Run filter_vocab.py first.")
        return
    
    print("Loading Vocabulary...")
    df = pd.read_csv(INPUT_FILE, sep='\t', dtype=str)
    
    # 2. INITIALIZE BIOBERT
    # This downloads the model (~400MB) on first run
    print(f"Initializing BioBERT ({MODEL_NAME})...")
    model = SentenceTransformer(MODEL_NAME)
    
    # 3. GENERATE VECTORS
    print("Encoding Concepts (This will take 20-40 mins)...")
    # Batch processing to manage RAM usage
    concept_names = df['concept_name'].fillna("").tolist()
    embeddings = model.encode(concept_names, batch_size=64, show_progress_bar=True)

    # 4. BUILD FAISS INDEX
    print("Building Vector Index...")
    faiss.normalize_L2(embeddings) # Normalize for Cosine Similarity
    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings)
    
    # 5. SAVE ARTIFACTS
    os.makedirs(os.path.dirname(INDEX_FILE), exist_ok=True)
    print(f"Saving Index to {INDEX_FILE}...")
    faiss.write_index(index, INDEX_FILE)
    
    print(f"Saving Metadata to {META_FILE}...")
    with open(META_FILE, 'wb') as f:
        pickle.dump(df, f)
        
    print(f"✅ Antigravity Engine Ready.")

if __name__ == "__main__":
    build_engine()
