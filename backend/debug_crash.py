import sys
import os
import time
import uuid
from typing import Any, Dict

# Ensure paths
sys.path.append(os.getcwd())

# Import worker code
try:
    import worker
    print(f"Successfully imported worker. File: {worker.__file__}")
except Exception as e:
    print(f"Failed to import worker: {e}")
    sys.exit(1)

# Initialize Supabase (reuse worker's client)
supabase = worker.supabase

def get_latest_dataset():
    try:
        # Get latest dataset created by verification script
        # Assuming name starts with 'prod_verify' or just latest
        resp = supabase.table("datasets").select("id, name, file_url").order("created_at", desc=True).limit(1).execute()
        if resp.data:
            return resp.data[0]
        return None
    except Exception as e:
        print(f"Error fetching dataset: {e}")
        return None

def run_debug():
    print("Fetching latest dataset...")
    ds = get_latest_dataset()
    if not ds:
        print("No dataset found in DB. Cannot debug.")
        return

    print(f"Using dataset: {ds['name']} (ID: {ds['id']})")
    
    # Construct mock run
    run = {
        "id": str(uuid.uuid4()),
        "dataset_id": ds['id'],
        "user_id": "debug-user",
        "project_id": "debug-project",
        "status": "queued",
        "config_json": {
            "method": "gc", # Simple method
            "epochs": 1 
        },
        "mode": "default",
        "method": "gc"
    }

    print("Invoking _process_run...")
    try:
        # We need to ensure _process_run exists
        if hasattr(worker, '_process_run'):
            worker._process_run(run)
        else:
            print("ERROR: _process_run not found in worker module!")
            # Check for other names
            print(f"Available attributes: {dir(worker)}")
            
    except Exception as e:
        print(f"CAUGHT EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
    except BaseException as e:
        print(f"CAUGHT BASE EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_debug()
