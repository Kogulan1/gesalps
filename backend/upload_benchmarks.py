import os
from supabase import create_client, Client

# Hardcode from .env just to be safe and quick
url = "https://dcshmrmkfybpmixlfddj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc2htcm1rZnlicG1peGxmZGRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjcyNjE5NywiZXhwIjoyMDcyMzAyMTk3fQ.EtuAMwHYdGiHZf-j-kC2x-U0Y0rYupcJx6MqfYyzW8k"

supabase: Client = create_client(url, key)

files = [
    "backend/local_benchmarks/raw/healthcare-dataset-stroke-data.csv",
    "backend/local_benchmarks/raw/mimic_iv_proxy_admissions.csv",
    "backend/local_benchmarks/raw/diabetic_data.csv"
]

print("Uploading benchmark datasets to Supabase 'datasets' bucket...")

for file_path in files:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path} (not found)")
        continue
        
    filename = os.path.basename(file_path)
    print(f"Uploading {filename}...")
    
    with open(file_path, 'rb') as f:
        try:
            supabase.storage.from_("datasets").upload(
                file=f,
                path=filename,
                file_options={"upsert": "true", "contentType": "text/csv"}
            )
            print(f"✅ Uploaded {filename}")
            
            # Create a DB entry in 'datasets' table so it appears in UI
            # We need to clean filename for a pretty name
            name = filename.replace(".csv", "").replace("_", " ").title()
            
            # Count rows
            df = None
            try:
                import pandas as pd
                df = pd.read_csv(file_path)
                rows = len(df)
            except:
                rows = 0
                
            data = {
                "name": f"[Benchmark] {name}",
                "file_url": filename, # Path in storage
                "rows_count": rows,
                "schema_json": {},
                "created_at": "now()"
                # user_id is optional or handled by RLS, validation might fail if not authenticated user.
                # However, service role bypasses RLS.
            }
            
            # Check if exists
            res = supabase.table("datasets").select("id").eq("file_url", filename).execute()
            if res.data:
                print(f"  -> Updating DB record for {filename}")
                supabase.table("datasets").update(data).eq("id", res.data[0]['id']).execute()
            else:
                # We need a user_id usually. Let's try inserting without it (if column allows null)
                # Or fetch a user.
                print(f"  -> Creating DB record for {filename}")
                # We will reuse the project_id from the existing record if possible, or a default
                # data['project_id'] = '7f5a4c07-054e-4cee-abd4-b9111c7e3ffa' 
                
                # Check if we can find a project_id
                projects = supabase.table("projects").select("id").limit(1).execute()
                if projects.data:
                     data['project_id'] = projects.data[0]['id']
                else:
                     # Fallback to the one seen in logs, or skip
                     # datasets table might allow null, let's try
                     pass
                
                supabase.table("datasets").insert(data).execute()
                
        except Exception as e:
            print(f"❌ Failed to upload {filename}: {e}")

print("Upload complete.")
