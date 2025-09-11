# backend/report_service/main.py
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from datetime import datetime
from io import BytesIO
from weasyprint import HTML, CSS

app = FastAPI()

@app.get("/health")
def health():
    return {"ok": True}

def _html_for_metrics(payload):
    metrics = payload.get("metrics", {}) if isinstance(payload, dict) else {}
    title_text = payload.get("title", "Gesalps Quality Report")
    date_str = payload.get("date") or datetime.utcnow().strftime("%Y-%m-%d")
    p = metrics.get('privacy', {}) if isinstance(metrics, dict) else {}
    u = metrics.get('utility', {}) if isinstance(metrics, dict) else {}
    mia = p.get('mia_auc'); dup = p.get('dup_rate')
    ks = u.get('ks_mean'); corr = u.get('corr_delta')

    def fmt(v, pct=False):
        if v is None:
            return 'N/A'
        return f"{(v*100):.1f}%" if pct else f"{v:.3f}" if isinstance(v, (int,float)) else str(v)

    # Simple inline logo (red cross + Gesalps text) and a certified badge.
    html = f"""
<!doctype html>
<html>
<head>
  <meta charset='utf-8'/>
  <style>
    body {{ font-family: 'DejaVu Sans', 'Liberation Sans', Arial, sans-serif; color:#0f172a; margin:24px; }}
    .card {{ border:1px solid #e5e7eb; border-radius:16px; padding:16px; margin-bottom:16px; }}
    .title {{ font-size:20px; font-weight:600; margin-bottom:4px; }}
    .subtle {{ color:#6b7280; font-size:12px; }}
    table {{ width:100%; border-collapse:collapse; font-size:12px; }}
    th, td {{ padding:10px 12px; border-top:1px solid #e5e7eb; }}
    thead tr th {{ color:#6b7280; text-align:left; border-top:none; }}
    .badge-pass {{ background:#ecfdf5; color:#065f46; font-weight:600; font-size:11px; padding:4px 8px; border-radius:9999px; }}
    .badge-warn {{ background:#fff7ed; color:#9a3412; font-weight:600; font-size:11px; padding:4px 8px; border-radius:9999px; }}
    .section-title {{ display:flex; align-items:center; gap:8px; font-weight:600; margin-bottom:8px; }}
    .interpret {{ color:#6b7280; font-size:12px; margin-top:8px; }}
    .header {{ display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }}
    .brand {{ display:flex; align-items:center; gap:10px; font-weight:700; font-size:18px; }}
    .brand-icon {{ width:22px; height:22px; border-radius:6px; background:#ef4444; display:flex; align-items:center; justify-content:center; color:white; font-weight:800; }}
    .cert {{ display:flex; align-items:center; gap:8px; font-size:12px; color:#065f46; background:#ecfdf5; border:1px solid #a7f3d0; padding:6px 10px; border-radius:9999px; }}
  </style>
  <title>{title_text}</title>
  </head>
  <body>
    <div class='header'>
      <div class='brand'>
        <div class='brand-icon'>+</div>
        <div>Gesalps</div>
      </div>
      <div class='cert'>
        <span>✔</span><span>Certified Quality Report</span>
      </div>
    </div>
    <div class='title'>{title_text}</div>
    <div class='subtle'>Date: {date_str}</div>

    <div class='card'>
      <div class='section-title'>🔒 Privacy Assessment</div>
      <table>
        <thead><tr><th>Test</th><th>Result</th><th>Threshold</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Membership Inference AUC</td><td>{fmt(mia)}</td><td>≤ 0.60</td><td><span class='{('badge-pass' if (mia is None or mia <= 0.60) else 'badge-warn')}'> {('Pass' if (mia is None or mia <= 0.60) else 'Check')}</span></td></tr>
          <tr><td>Record Linkage Risk (%)</td><td>{fmt(dup, pct=True) if isinstance(dup,(int,float)) else 'N/A'}</td><td>≤ 5%</td><td><span class='{('badge-pass' if (dup is None or dup*100 <= 5.0) else 'badge-warn')}'> {('Pass' if (dup is None or dup*100 <= 5.0) else 'Check')}</span></td></tr>
        </tbody>
      </table>
      <div class='interpret'>Lower privacy risk metrics (e.g., MIA AUC, linkage risk) indicate better protection.</div>
    </div>

    <div class='card'>
      <div class='section-title'>📊 Utility Assessment</div>
      <table>
        <thead><tr><th>Metric</th><th>Value</th><th>Target</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>KS mean (lower is better)</td><td>{fmt(ks)}</td><td>≤ 0.10</td><td><span class='{('badge-pass' if (ks is None or ks <= 0.10) else 'badge-warn')}'> {('Strong' if (ks is None or ks <= 0.10) else 'Check')}</span></td></tr>
          <tr><td>Correlation Δ (lower is better)</td><td>{fmt(corr)}</td><td>≤ 0.10</td><td><span class='{('badge-pass' if (corr is None or corr <= 0.10) else 'badge-warn')}'> {('Strong' if (corr is None or corr <= 0.10) else 'Check')}</span></td></tr>
        </tbody>
      </table>
      <div class='interpret'>Utility metrics indicate how well synthetic data preserves key properties.</div>
    </div>

    <div class='card'>
      <div class='section-title'>Overall Evaluation</div>
      <div>{'Meets privacy and utility targets' if ((mia is None or mia <= 0.60) and (dup is None or dup*100 <= 5.0) and (ks is None or ks <= 0.10) and (corr is None or corr <= 0.10)) else 'Review metrics before release'}</div>
    </div>
  </body>
</html>
"""
    return html

def build_report_pdf_bytes(payload):
    html = _html_for_metrics(payload)
    pdf = HTML(string=html).write_pdf(stylesheets=[CSS(string='@page { size: A4; margin: 18mm; }')])
    return pdf

@app.post("/render")
async def render(req: Request):
    payload = await req.json()
    pdf_bytes = build_report_pdf_bytes(payload)
    return StreamingResponse(BytesIO(pdf_bytes), media_type="application/pdf")
