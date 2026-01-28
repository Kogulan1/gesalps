import pandas as pd
import csv
import os

# --- PATH CONFIGURATION ---
# Robust path finding relative to this script
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_FILE = os.path.join(BASE_DIR, 'data', 'raw', 'CONCEPT.csv')
OUTPUT_FILE = os.path.join(BASE_DIR, 'data', 'processed', 'CONCEPT_SLIM.csv')

# --- LOGIC: The Clinical Core ---
# We filter for these domains to keep the index efficient
TARGET_DOMAINS = ['Condition', 'Drug', 'Measurement', 'Observation', 'Unit'] 

def is_valid(row):
    # 1. Valid concepts only (invalid_reason is empty)
    if row['invalid_reason']: return False
    # 2. Target domains only
    if row['domain_id'] not in TARGET_DOMAINS: return False
    # 3. Standard ('S') OR Units (UCUM)
    if row['standard_concept'] == 'S': return True
    if row['vocabulary_id'] == 'UCUM': return True
    return False

def run_filter():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    print(f"Reading from: {INPUT_FILE}")
    
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as fin, \
             open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as fout:
            
            reader = csv.DictReader(fin, delimiter='\t')
            writer = csv.DictWriter(fout, fieldnames=reader.fieldnames, delimiter='\t')
            writer.writeheader()
            
            count = 0
            kept = 0
            for row in reader:
                count += 1
                if is_valid(row):
                    writer.writerow(row)
                    kept += 1
                if count % 1000000 == 0: print(f"Scanned {count/1000000:.1f}M rows...")
                
        print(f"✅ Filter Complete. Kept {kept} rows in {OUTPUT_FILE}")

    except FileNotFoundError:
        print(f"❌ ERROR: CONCEPT.csv not found at {INPUT_FILE}")
        print("Please ensure the raw vocabulary files are mounted correctly.")

if __name__ == "__main__":
    run_filter()
