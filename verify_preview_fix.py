
import os
from supabase import create_client
import time

# Params
URL = "https://dcshmrmkfybpmixlfddj.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc2htcm1rZnlicG1peGxmZGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MjYxOTcsImV4cCI6MjA3MjMwMjE5N30.LNJlS7cBIhgsELKoO6UseqKaglqMMMVChVJPcRqRPyk"
BUCKET = "artifacts"
RUN_ID = "1b915b27-d867-43c7-a36a-948bb1e16bb8"
FILE_PATH = f"{RUN_ID}/synthetic.csv"

def verify():
    print(f"Verifying access to {BUCKET}/{FILE_PATH} with ANON KEY...")
    client = create_client(URL, ANON_KEY)
    
    try:
        # 1. Create Signed URL
        print("1. Creating signed URL...")
        res = client.storage.from_(BUCKET).create_signed_url(FILE_PATH, 60)
        
        # Check struct
        if 'error' in res and res['error']:
            print(f"❌ Failed to create signed URL: {res['error']}")
            return
            
        # In supabase-py, succes returns a dict with 'signedURL' or 'signed_url' depending on version, 
        # or sometimes it returns the URL string directly if not wrapped? 
        # Let's inspect 'res'. 
        # Actually newer supabase-py returns a dict-like object or a specific response type.
        # Based on typical usage:
        signed_url = None
        if isinstance(res, dict):
            signed_url = res.get('signedURL') or res.get('signed_url')
        elif hasattr(res, 'signedURL'): # object check
             signed_url = res.signedURL
        
        # Just in case it's the raw URL string (unlikely for create_signed_url helper)
        if isinstance(res, str):
            signed_url = res
            
        if not signed_url:
            print(f"❌ Signed URL missing in response: {res}")
            return
            
        print(f"✅ Signed URL created: {signed_url[:50]}...")
        
        # 2. Try to download it
        import requests
        print("2. Downloading file via Signed URL...")
        r = requests.get(signed_url)
        if r.status_code == 200:
            print(f"✅ Download successful! Size: {len(r.content)} bytes")
            print("Preview 1st line:", r.text.split('\n')[0])
        else:
            print(f"❌ Download failed: HTTP {r.status_code}")
            print(r.text)

    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    verify()
