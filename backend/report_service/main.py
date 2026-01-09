# backend/report_service/main.py
import os
import sys
import logging
import traceback
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from datetime import datetime
from io import BytesIO
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, validator

# Add parent directory to path for compliance module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False
    logging.warning("WeasyPrint not available. PDF generation will use fallback.")

try:
    from libs.compliance import ComplianceEvaluator, get_compliance_evaluator
    COMPLIANCE_AVAILABLE = True
except ImportError:
    COMPLIANCE_AVAILABLE = False
    logging.warning("Compliance module not available. Install dependencies.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(name)s: %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Gesalp Report Service",
    description="Clinical-grade report generation with compliance validation",
    version="2.0.0"
)

# Initialize compliance evaluator
compliance_evaluator = None
if COMPLIANCE_AVAILABLE:
    try:
        compliance_evaluator = get_compliance_evaluator()
        logger.info(f"Compliance evaluator initialized: {compliance_evaluator.config.level.value}")
    except Exception as e:
        logger.error(f"Failed to initialize compliance evaluator: {e}")


class MetricsPayload(BaseModel):
    """Validated metrics payload model."""
    metrics: Dict[str, Any] = Field(..., description="Metrics dictionary with privacy, utility, fairness")
    title: Optional[str] = Field(None, description="Report title")
    date: Optional[str] = Field(None, description="Report date")
    
    @validator('metrics')
    def validate_metrics(cls, v):
        """Validate metrics structure."""
        if not isinstance(v, dict):
            raise ValueError("metrics must be a dictionary")
        # Ensure required keys exist (can be empty dicts)
        for key in ['privacy', 'utility']:
            if key not in v:
                v[key] = {}
        return v


@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "ok": True,
        "service": "report-service",
        "weasyprint_available": WEASYPRINT_AVAILABLE,
        "compliance_available": COMPLIANCE_AVAILABLE,
        "timestamp": datetime.utcnow().isoformat(),
    }

def _html_for_metrics(payload: Dict[str, Any]) -> str:
    """Generate HTML report from metrics payload with compliance validation.
    
    Args:
        payload: Dictionary with 'metrics', 'title', 'date' keys.
        
    Returns:
        HTML string for PDF generation.
    """
    # Validate and extract metrics
    try:
        if not isinstance(payload, dict):
            raise ValueError("Payload must be a dictionary")
        
        metrics = payload.get("metrics", {})
        if not isinstance(metrics, dict):
            metrics = {}
        
        title_text = payload.get("title", "Gesalp AI Quality Report")
        date_str = payload.get("date") or datetime.utcnow().strftime("%Y-%m-%d")
        
        p = metrics.get('privacy', {}) if isinstance(metrics, dict) else {}
        u = metrics.get('utility', {}) if isinstance(metrics, dict) else {}
        f = metrics.get('fairness', {}) if isinstance(metrics, dict) else {}
        
        mia = p.get('mia_auc') if isinstance(p, dict) else None
        dup = p.get('dup_rate') if isinstance(p, dict) else None
        k_anon = p.get('k_anonymization') if isinstance(p, dict) else None
        identifiability = p.get('identifiability_score') if isinstance(p, dict) else None
        dp_epsilon = p.get('dp_epsilon') if isinstance(p, dict) else None
        dp_effective = p.get('dp_effective', False) if isinstance(p, dict) else False
        
        ks = u.get('ks_mean') if isinstance(u, dict) else None
        corr = u.get('corr_delta') if isinstance(u, dict) else None
        jensenshannon = u.get('jensenshannon_dist') if isinstance(u, dict) else None
        auroc = u.get('auroc') if isinstance(u, dict) else None
        c_index = u.get('c_index') if isinstance(u, dict) else None
        
        rare_coverage = f.get('rare_coverage') if isinstance(f, dict) else None
        freq_skew = f.get('freq_skew') if isinstance(f, dict) else None
        
        # Compliance evaluation
        compliance_result = None
        if compliance_evaluator:
            try:
                compliance_result = compliance_evaluator.evaluate(metrics)
            except Exception as e:
                logger.warning(f"Compliance evaluation failed: {e}")
        
    except Exception as e:
        logger.error(f"Error processing metrics payload: {e}")
        raise ValueError(f"Invalid metrics payload: {e}")

    def fmt(v, pct=False, precision=3):
        """Format value for display."""
        if v is None:
            return 'N/A'
        if not isinstance(v, (int, float)):
            return str(v)
        if pct:
            return f"{(v*100):.1f}%"
        return f"{v:.{precision}f}"
    
    # Compliance status badge
    compliance_badge = ""
    if compliance_result:
        if compliance_result.get("passed", False):
            compliance_badge = '<div class="cert"><span>✔</span><span>Compliance: PASSED</span></div>'
        else:
            violations = compliance_result.get("violations", [])
            violation_count = len(violations)
            compliance_badge = f'<div class="cert-warn"><span>⚠</span><span>Compliance: {violation_count} violation(s)</span></div>'

    # Generate HTML with enhanced compliance information
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
    .badge-fail {{ background:#fee2e2; color:#991b1b; font-weight:600; font-size:11px; padding:4px 8px; border-radius:9999px; }}
    .section-title {{ display:flex; align-items:center; gap:8px; font-weight:600; margin-bottom:8px; }}
    .interpret {{ color:#6b7280; font-size:12px; margin-top:8px; }}
    .header {{ display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }}
    .brand {{ display:flex; align-items:center; gap:10px; font-weight:700; font-size:18px; }}
    .brand-icon {{ width:22px; height:22px; border-radius:6px; background:#ef4444; display:flex; align-items:center; justify-content:center; color:white; font-weight:800; }}
    .cert {{ display:flex; align-items:center; gap:8px; font-size:12px; color:#065f46; background:#ecfdf5; border:1px solid #a7f3d0; padding:6px 10px; border-radius:9999px; }}
    .cert-warn {{ display:flex; align-items:center; gap:8px; font-size:12px; color:#9a3412; background:#fff7ed; border:1px solid #fdba74; padding:6px 10px; border-radius:9999px; }}
    .violations {{ background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px; margin-top:12px; }}
    .violations ul {{ margin:8px 0; padding-left:20px; }}
    .violations li {{ color:#991b1b; font-size:11px; margin:4px 0; }}
  </style>
  <title>{title_text}</title>
  </head>
  <body>
    <div class='header'>
      <div class='brand'>
        <div class='brand-icon'>+</div>
        <div>Gesalp AI</div>
      </div>
      {compliance_badge if compliance_badge else '<div class="cert"><span>✔</span><span>Certified Quality Report</span></div>'}
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
          {f'<tr><td>k-Anonymity</td><td>{fmt(k_anon, precision=0) if k_anon is not None else "N/A"}</td><td>≥ 5</td><td><span class=\'{"badge-pass" if (k_anon is None or k_anon >= 5) else "badge-warn"}\'> {"Pass" if (k_anon is None or k_anon >= 5) else "Check"}</span></td></tr>' if k_anon is not None else ''}
          {f'<tr><td>Identifiability Score</td><td>{fmt(identifiability)}</td><td>≤ 0.10</td><td><span class=\'{"badge-pass" if (identifiability is None or identifiability <= 0.10) else "badge-warn"}\'> {"Pass" if (identifiability is None or identifiability <= 0.10) else "Check"}</span></td></tr>' if identifiability is not None else ''}
          {f'<tr><td>DP Epsilon</td><td>{fmt(dp_epsilon)}</td><td>≤ 1.0</td><td><span class=\'{"badge-pass" if (dp_epsilon is None or dp_epsilon <= 1.0) else "badge-warn"}\'> {"Pass" if (dp_epsilon is None or dp_epsilon <= 1.0) else "Check"}</span></td></tr>' if dp_epsilon is not None else ''}
          {f'<tr><td>DP Applied</td><td>{"Yes" if dp_effective else "No"}</td><td>Recommended</td><td><span class=\'{"badge-pass" if dp_effective else "badge-warn"}\'> {"Yes" if dp_effective else "No"}</span></td></tr>'}
        </tbody>
      </table>
      <div class='interpret'>Lower privacy risk metrics (e.g., MIA AUC, linkage risk) indicate better protection. Differential Privacy (DP) provides mathematical privacy guarantees.</div>
    </div>

    <div class='card'>
      <div class='section-title'>📊 Utility Assessment</div>
      <table>
        <thead><tr><th>Metric</th><th>Value</th><th>Target</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>KS mean (lower is better)</td><td>{fmt(ks)}</td><td>≤ 0.10</td><td><span class='{('badge-pass' if (ks is None or ks <= 0.10) else 'badge-warn')}'> {('Strong' if (ks is None or ks <= 0.10) else 'Check')}</span></td></tr>
          <tr><td>Correlation Δ (lower is better)</td><td>{fmt(corr)}</td><td>≤ 0.10</td><td><span class='{('badge-pass' if (corr is None or corr <= 0.10) else 'badge-warn')}'> {('Strong' if (corr is None or corr <= 0.10) else 'Check')}</span></td></tr>
          {f'<tr><td>Jensen-Shannon Divergence</td><td>{fmt(jensenshannon)}</td><td>≤ 0.15</td><td><span class=\'{"badge-pass" if (jensenshannon is None or jensenshannon <= 0.15) else "badge-warn"}\'> {"Strong" if (jensenshannon is None or jensenshannon <= 0.15) else "Check"}</span></td></tr>' if jensenshannon is not None else ''}
          {f'<tr><td>AUROC (higher is better)</td><td>{fmt(auroc)}</td><td>≥ 0.80</td><td><span class=\'{"badge-pass" if (auroc is None or auroc >= 0.80) else "badge-warn"}\'> {"Strong" if (auroc is None or auroc >= 0.80) else "Check"}</span></td></tr>' if auroc is not None else ''}
          {f'<tr><td>C-Index (higher is better)</td><td>{fmt(c_index)}</td><td>≥ 0.70</td><td><span class=\'{"badge-pass" if (c_index is None or c_index >= 0.70) else "badge-warn"}\'> {"Strong" if (c_index is None or c_index >= 0.70) else "Check"}</span></td></tr>' if c_index is not None else ''}
        </tbody>
      </table>
      <div class='interpret'>Utility metrics indicate how well synthetic data preserves key statistical properties and relationships.</div>
    </div>

    {f'''
    <div class='card'>
      <div class='section-title'>⚖️ Fairness Assessment</div>
      <table>
        <thead><tr><th>Metric</th><th>Value</th><th>Target</th><th>Status</th></tr></thead>
        <tbody>
          {f'<tr><td>Rare Coverage</td><td>{fmt(rare_coverage, pct=True)}</td><td>≥ 70%</td><td><span class=\'{"badge-pass" if (rare_coverage is None or rare_coverage >= 0.70) else "badge-warn"}\'> {"Pass" if (rare_coverage is None or rare_coverage >= 0.70) else "Check"}</span></td></tr>' if rare_coverage is not None else ''}
          {f'<tr><td>Frequency Skew</td><td>{fmt(freq_skew)}</td><td>≤ 0.30</td><td><span class=\'{"badge-pass" if (freq_skew is None or freq_skew <= 0.30) else "badge-warn"}\'> {"Pass" if (freq_skew is None or freq_skew <= 0.30) else "Check"}</span></td></tr>' if freq_skew is not None else ''}
        </tbody>
      </table>
      <div class='interpret'>Fairness metrics ensure synthetic data represents rare categories and maintains balanced distributions.</div>
    </div>
    ''' if (rare_coverage is not None or freq_skew is not None) else ''}
    
    <div class='card'>
      <div class='section-title'>Overall Evaluation</div>
      {f'''
      <div style="margin-bottom:12px;">
        <strong>Compliance Status:</strong> 
        <span class='{"badge-pass" if compliance_result.get("passed", False) else "badge-fail"}'>
          {"PASSED" if compliance_result.get("passed", False) else "FAILED"}
        </span>
        <span style="margin-left:12px; color:#6b7280; font-size:11px;">
          Level: {compliance_result.get("level", "unknown").upper()}
        </span>
        <span style="margin-left:12px; color:#6b7280; font-size:11px;">
          Score: {compliance_result.get("score", 0.0):.2%}
        </span>
      </div>
      ''' if compliance_result else ''}
      <div style="margin-bottom:8px;">
        {'✅ Meets all privacy, utility, and fairness targets' if ((mia is None or mia <= 0.60) and (dup is None or dup*100 <= 5.0) and (ks is None or ks <= 0.10) and (corr is None or corr <= 0.10)) else '⚠️ Review metrics before release'}
      </div>
      {f'''
      <div class="violations">
        <strong>Compliance Violations ({len(compliance_result.get("violations", []))}):</strong>
        <ul>
          {''.join([f'<li>{v}</li>' for v in compliance_result.get("violations", [])])}
        </ul>
      </div>
      ''' if compliance_result and not compliance_result.get("passed", True) and compliance_result.get("violations") else ''}
    </div>
  </body>
</html>
"""
    return html

def build_report_pdf_bytes(payload: Dict[str, Any]) -> bytes:
    """Build PDF report from metrics payload with error handling.
    
    Args:
        payload: Dictionary with metrics, title, date.
        
    Returns:
        PDF bytes.
        
    Raises:
        ValueError: If payload is invalid.
        RuntimeError: If PDF generation fails.
    """
    try:
        # Validate payload
        validated = MetricsPayload(**payload)
        html = _html_for_metrics(validated.dict())
        
        if WEASYPRINT_AVAILABLE:
            try:
                pdf = HTML(string=html).write_pdf(
                    stylesheets=[CSS(string='@page { size: A4; margin: 18mm; }')]
                )
                return pdf
            except Exception as e:
                logger.error(f"WeasyPrint PDF generation failed: {e}")
                raise RuntimeError(f"PDF generation failed: {e}")
        else:
            # Fallback: return HTML as text (client can convert)
            raise RuntimeError("WeasyPrint not available. Install with: pip install weasyprint")
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        raise
    except Exception as e:
        logger.error(f"Report generation failed: {e}\n{traceback.format_exc()}")
        raise RuntimeError(f"Report generation failed: {e}")


@app.post("/render")
async def render(req: Request):
    """Render PDF report from metrics payload.
    
    Request body:
        {
            "metrics": {
                "privacy": {...},
                "utility": {...},
                "fairness": {...}
            },
            "title": "Optional title",
            "date": "Optional date"
        }
    
    Returns:
        PDF file stream.
    """
    try:
        payload = await req.json()
        logger.info(f"Received render request: title={payload.get('title', 'N/A')}")
        
        # Validate payload structure
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Payload must be a dictionary")
        
        if "metrics" not in payload:
            raise HTTPException(status_code=400, detail="Payload must contain 'metrics' key")
        
        pdf_bytes = build_report_pdf_bytes(payload)
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=gesalp_report.pdf"}
        )
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Render error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@app.post("/validate")
async def validate_metrics(req: Request):
    """Validate metrics against compliance thresholds.
    
    Request body:
        {
            "metrics": {
                "privacy": {...},
                "utility": {...},
                "fairness": {...}
            }
        }
    
    Returns:
        Compliance evaluation result.
    """
    try:
        payload = await req.json()
        
        if not isinstance(payload, dict) or "metrics" not in payload:
            raise HTTPException(status_code=400, detail="Payload must contain 'metrics' key")
        
        if not compliance_evaluator:
            raise HTTPException(
                status_code=503,
                detail="Compliance evaluator not available. Install compliance module."
            )
        
        result = compliance_evaluator.evaluate(payload["metrics"])
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Validation error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@app.get("/thresholds")
async def get_thresholds():
    """Get current compliance thresholds.
    
    Returns:
        Threshold configuration.
    """
    if not compliance_evaluator:
        raise HTTPException(
            status_code=503,
            detail="Compliance evaluator not available"
        )
    
    return JSONResponse(content=compliance_evaluator.get_thresholds())
