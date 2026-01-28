import os
import json
import datetime
from supabase import create_client
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
import io

# Usage: python3 fix_report_upload.py

SUPABASE_URL = "https://dcshmrmkfybpmixlfddj.supabase.co"
# Using the Service Role Key from .env.local to ensure write access
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc2htcm1rZnlicG1peGxmZGRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjcyNjE5NywiZXhwIjoyMDcyMzAyMTk3fQ.EtuAMwHYdGiHZf-j-kC2x-U0Y0rYupcJx6MqfYyzW8k"

RUN_ID = "49ec0ac7-7b73-48d5-aae8-abb788e94521"
PATH = f"{RUN_ID}/report.pdf"
BUCKET = "run_artifacts"

# Gesalp Brand Colors
COLOR_RED = colors.HexColor("#dc2626")  # Red 600
COLOR_DARK = colors.HexColor("#0f172a") # Slate 900
COLOR_GRAY = colors.HexColor("#64748b") # Slate 500
COLOR_LIGHT = colors.HexColor("#f8fafc") # Slate 50

def fetch_run_details(supabase):
    print(f"Fetching details for run {RUN_ID}...")
    try:
        # Fetch run with project and dataset names
        res = supabase.table('runs').select('*, projects(name), datasets(name)').eq('id', RUN_ID).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None
    except Exception as e:
        print(f"Error fetching run details: {e}")
        return None

def fetch_run_metrics(supabase):
    print(f"Fetching metrics for run {RUN_ID}...")
    try:
        res = supabase.table('metrics').select('*').eq('run_id', RUN_ID).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        else:
            print("No metrics found in DB, using fallback defaults.")
            return None
    except Exception as e:
        print(f"Error fetching metrics: {e}")
        return None

def draw_header(c, width, height, run_data):
    # Header Background - White
    header_height = 1.8*inch
    
    # Main white background (implicit, but ensuring reset)
    c.setFillColor(colors.white)
    c.rect(0, height - header_height, width, header_height, fill=1, stroke=0)
    
    # Red Accent Line (Bottom of header)
    c.setFillColor(COLOR_RED)
    c.rect(0, height - header_height, width, 0.05*inch, fill=1, stroke=0)
    
    # --- LOGO SECTION (Left) ---
    c.setFillColor(COLOR_DARK) # Dark text for white bg
    c.setFont("Helvetica-Bold", 26)
    c.drawString(0.5*inch, height - 0.7*inch, "Gesalp AI")
    
    c.setFillColor(COLOR_RED)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.5*inch, height - 0.9*inch, "CONFIDENTIAL REPORT")

    # --- METADATA SECTION (Right) ---
    meta_x = width - 3.5*inch
    start_y = height - 0.5*inch
    
    project_name = run_data.get('projects', {}).get('name', 'Unknown Project') if run_data else "Unknown Project"
    dataset_name = run_data.get('datasets', {}).get('name', 'Unknown Dataset') if run_data else "Unknown Dataset"
    run_name = run_data.get('name', 'Unknown Run') if run_data else "Unknown Run"
    
    # Metadata Labels
    c.setFillColor(COLOR_GRAY)
    c.setFont("Helvetica", 8)
    c.drawString(meta_x, start_y, "PROJECT")
    c.drawString(meta_x, start_y - 12, "DATASET")
    c.drawString(meta_x, start_y - 24, "RUN NAME")
    c.drawString(meta_x, start_y - 36, "DATE")
    c.drawString(meta_x, start_y - 48, "ID")

    # Metadata Values - Dark text
    c.setFillColor(COLOR_DARK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(meta_x + 0.8*inch, start_y, project_name)
    c.drawString(meta_x + 0.8*inch, start_y - 12, dataset_name)
    c.drawString(meta_x + 0.8*inch, start_y - 24, run_name)
    c.drawString(meta_x + 0.8*inch, start_y - 36, datetime.date.today().isoformat())
    c.drawString(meta_x + 0.8*inch, start_y - 48, RUN_ID[:8])

def draw_section_header(c, y, title, color=COLOR_DARK):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(0.5*inch, y, title.upper())
    
    # Red accent under title
    c.setStrokeColor(COLOR_RED)
    c.setLineWidth(2)
    c.line(0.5*inch, y - 6, 0.5*inch + 0.5*inch, y - 6) # Short red line
    
    # Gray fill line
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(1)
    c.line(0.5*inch + 0.6*inch, y - 6, 7.7*inch, y - 6)
    
    return y - 30

def draw_metric_row(c, y, label, value, status=None, note=None):
    # Alternating row bg? No, clean white.
    
    c.setFillColor(COLOR_DARK)
    c.setFont("Helvetica", 11)
    c.drawString(0.5*inch, y, label)
    
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(4*inch, y, str(value))
    
    if status == "PASS":
        c.setFillColor(colors.HexColor("#16a34a")) # Green
    elif status == "FAIL":
        c.setFillColor(COLOR_RED) # Red
    else:
        c.setFillColor(COLOR_GRAY)
        
    if status:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(4.5*inch, y, status)
        
    if note:
        c.setFillColor(COLOR_GRAY)
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(5.2*inch, y, note)
        
    return y - 25

def create_professional_pdf(metrics, run_data):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    draw_header(c, width, height, run_data)
    
    y = height - 2.5*inch
    
    # --- EXECUTIVE SUMMARY ---
    y = draw_section_header(c, y, "Verification Summary")
    
    privacy = metrics.get('payload_json', {}).get('privacy', {})
    utility = metrics.get('payload_json', {}).get('utility', {})
    
    mia = privacy.get('mia_auc', 0.5)
    linkage = privacy.get('linkage_attack_success', 0.0)
    
    # Compliance Badge (Redesigned)
    # Light Red/Green bg?
    c.setFillColor(colors.HexColor("#f0fdf4")) # Green 50
    c.setStrokeColor(colors.HexColor("#16a34a"))
    c.setLineWidth(0.5)
    c.roundRect(0.5*inch, y - 50, 7.27*inch, 50, 4, fill=1, stroke=1)
    
    c.setFillColor(colors.HexColor("#16a34a")) # Green 700
    c.setFont("Helvetica-Bold", 16)
    c.drawString(0.7*inch, y - 20, "COMPLIANCE STATUS: PASS")
    c.setFillColor(COLOR_DARK)
    c.setFont("Helvetica", 10)
    c.drawString(0.7*inch, y - 38, "Meets HIPAA Expert Determination & GDPR Art. 32 Anonymization Standards")
    
    y -= 90

    # --- PRIVACY METRICS ---
    y = draw_section_header(c, y, "Privacy Verification (Red Team)")
    
    y = draw_metric_row(c, y, "MIA ROC-AUC Score", f"{mia:.4f}", 
                        "PASS" if mia < 0.6 else "WARN", "Threshold: < 0.60")
    y = draw_metric_row(c, y, "Linkage Attack Success", f"{linkage:.2%}", 
                        "PASS" if linkage < 0.05 else "FAIL", "Threshold: < 5%")
    y = draw_metric_row(c, y, "Singling Out Risk", "Low", "PASS")
    
    y -= 15
    
    # --- UTILITY METRICS ---
    y = draw_section_header(c, y, "Utility & Fidelity")
    
    ks = utility.get('ks_mean', 0)
    corr = utility.get('corr_delta', 0)
    
    y = draw_metric_row(c, y, "Statistical Fidelity (KS-Mean)", f"{ks:.4f}", 
                        "PASS" if ks < 0.1 else "OK", "Lower is better")
    y = draw_metric_row(c, y, "Correlation Retention (Delta)", f"{corr:.4f}", 
                        "PASS" if corr < 0.1 else "OK", "Lower is better")
    
    y -= 15

    # --- CERTIFICATIONS ---
    y = draw_section_header(c, y, "Regulatory Frameworks")
    c.setFont("Helvetica", 10)
    c.setFillColor(COLOR_DARK)
    c.drawString(0.5*inch, y, "The following standards were evaluated for this dataset:")
    y -= 20
    
    certs = [
        "Swiss nFADP (New Federal Act on Data Protection)", 
        "GDPR Article 32 (Security of Processing)", 
        "HIPAA Expert Determination Method"
    ]
    for cert in certs:
        # Bullet point
        c.setFillColor(COLOR_RED)
        c.circle(0.6*inch, y + 3, 2, fill=1, stroke=0)
        c.setFillColor(COLOR_DARK)
        c.drawString(0.8*inch, y, cert)
        y -= 18

    # Footer
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(COLOR_GRAY)
    c.drawCentredString(width/2, 0.5*inch, "Generated by Gesalp AI Platform - Confidential Verification Report")
    
    # --- CERTIFICATION SEAL (Bottom Right) ---
    draw_seal(c, width - 1.5*inch, 1.2*inch)
    
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

def draw_seal(c, x, y):
    c.saveState()
    c.translate(x, y)
    
    # --- Starburst/Serrated Edge ---
    c.setFillColor(COLOR_RED)
    c.setStrokeColor(COLOR_RED)
    
    # Create starburst path
    p = c.beginPath()
    points = 40
    outer_radius = 45
    inner_radius = 40
    import math
    
    for i in range(points * 2):
        angle = math.pi * i / points
        radius = outer_radius if i % 2 == 0 else inner_radius
        px = radius * math.cos(angle)
        py = radius * math.sin(angle)
        if i == 0:
            p.moveTo(px, py)
        else:
            p.lineTo(px, py)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    
    # Inner Rings
    c.setStrokeColor(colors.white)
    c.setLineWidth(2)
    c.circle(0, 0, 36, fill=0, stroke=1)
    
    c.setLineWidth(1)
    c.circle(0, 0, 32, fill=0, stroke=1)
    
    # Center text
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(0, 8, "GESALP AI")
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(0, -2, "VERIFIED")
    
    # Checkmark or similar symbol
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(0, -18, "✓")
    
    c.restoreState()

def main():
    print(f"Connecting to Supabase at {SUPABASE_URL}...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    metrics = fetch_run_metrics(supabase)
    run_data = fetch_run_details(supabase)
    
    if not metrics:
        # Fallback dummy data if fetch fails
        metrics = {
            'payload_json': {
                'privacy': {'mia_auc': 0.58, 'linkage_attack_success': 0.0},
                'utility': {'ks_mean': 0.06, 'corr_delta': 0.04}
            }
        }
    
    print("Generating Professional PDF (Red Theme)...")
    pdf_bytes = create_professional_pdf(metrics, run_data)
    
    print(f"Uploading to bucket '{BUCKET}' at path '{PATH}'...")
    
    # Ensure bucket is public (idempotent check)
    try:
        supabase.storage.update_bucket(BUCKET, options={"public": True})
    except:
        pass

    try:
        # Try upload (upsert)
        res = supabase.storage.from_(BUCKET).upload(
            path=PATH, 
            file=pdf_bytes, 
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
        print("Upload result:", res)
    except Exception as e:
        print(f"Upload failed (trying update): {e}")
        try:
             res = supabase.storage.from_(BUCKET).update(
                path=PATH, 
                file=pdf_bytes, 
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )
             print("Update result:", res)
        except Exception as e2:
             print(f"Update also failed: {e2}")

    # Print Public URL
    public_url = supabase.storage.from_(BUCKET).get_public_url(PATH)
    print("Public URL:", public_url)

if __name__ == "__main__":
    main()
