import os
import json
from supabase import create_client, Client

url = "https://dcshmrmkfybpmixlfddj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc2htcm1rZnlicG1peGxmZGRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjcyNjE5NywiZXhwIjoyMDcyMzAyMTk3fQ.EtuAMwHYdGiHZf-j-kC2x-U0Y0rYupcJx6MqfYyzW8k"

try:
    supabase: Client = create_client(url, key)

    response = supabase.table("runs").select("id, name, status, started_at, config_json").order("started_at", desc=True).limit(10).execute()

    if response.data:
        print(f"Found {len(response.data)} runs:")
        for run in response.data:
             print(f"[{run.get('started_at')}] {run.get('name')} ({run.get('status')}) ID: {run.get('id')}")
             
             # Fetch metrics from 'metrics' table
             m_res = supabase.table("metrics").select("payload_json").eq("run_id", run.get('id')).execute()
             
             if m_res.data:
                 payload = m_res.data[0].get('payload_json', {})
                 print("--- METRICS PAYLOAD ---")
                 # Print only relevant keys to avoid flood
                 relevant = {
                     k: payload.get(k) for k in ['privacy', 'utility', 'fairness', 'compliance']
                 }
                 if 'utility' in payload:
                      relevant['utility']['auroc'] = payload['utility'].get('auroc')
                      relevant['utility']['c_index'] = payload['utility'].get('c_index')
                 print(json.dumps(relevant, indent=2))
                 print("-----------------------")
             else:
                 print("No metrics record found.")
             
             if run.get('name') == 'new_AILG':
                 print("^^^ THIS IS THE TARGET RUN ^^^")
    else:
        print("No runs found.")
except Exception as e:
    print(f"Error: {e}")
