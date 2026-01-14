from fpdf import FPDF
from pathlib import Path
from datetime import datetime

class PDFReport(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 15)
        self.cell(0, 10, 'GreenGuard Synthetic Data Report', align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')

def generate_report(metrics: dict, privacy: dict, all_green: bool, output_path: str):
    pdf = PDFReport()
    pdf.add_page()
    
    # Timestamp
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 10, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", align="R", new_x="LMARGIN", new_y="NEXT")
    
    # Verdict
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 16)
    if all_green:
        pdf.set_text_color(0, 128, 0)
        pdf.cell(0, 10, "VERDICT: ALL GREEN - PASSED", align="C", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.set_text_color(200, 0, 0)
        pdf.cell(0, 10, "VERDICT: CAUTION - THRESHOLDS NOT MET", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_text_color(0, 0, 0)
    pdf.ln(10)
    
    # Utility Metrics
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Utility Metrics", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 12)
    
    ks_mean = metrics.get('ks_mean')
    corr_delta = metrics.get('corr_delta')
    
    limit_ks = 0.15 # Relaxed threshold as per logic
    limit_corr = 0.10
    
    # Helper to print metric line
    def print_metric(name, value, threshold, lower_is_better=True):
        status = "PASS"
        if value is None:
            status = "N/A"
            color = (128, 128, 128)
        else:
            is_pass = (value <= threshold) if lower_is_better else (value >= threshold)
            status = "PASS" if is_pass else "FAIL"
            color = (0, 128, 0) if is_pass else (200, 0, 0)
            
        pdf.set_text_color(0, 0, 0)
        pdf.cell(80, 10, f"{name}:", border=0)
        
        pdf.set_text_color(*color)
        val_str = f"{value:.4f}" if isinstance(value, (float, int)) else "N/A"
        pdf.cell(50, 10, val_str, border=0)
        pdf.cell(30, 10, status, border=0, new_x="LMARGIN", new_y="NEXT")

    print_metric("KS Mean (<= 0.15)", ks_mean, 0.15)
    print_metric("Correlation Delta (<= 0.10)", corr_delta, 0.10)
    
    pdf.ln(5)
    
    # Privacy Metrics
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Privacy Metrics", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 12)
    
    mia = privacy.get('mia_auc')
    dup = privacy.get('dup_rate')
    
    # MIA pass if <= 0.60 (or >= 0.5 depending on interpretation, usually closer to 0.5 is better, >0.6 bad)
    # GreenGuard logic says <= 0.60 is acceptable from previous context? Or maybe just report it.
    # From test_greenguard_breast_cancer.py: thresholds["mia_auc"] = 0.60
    
    print_metric("MIA AUC (<= 0.60)", mia, 0.60)
    print_metric("Duplicate Rate (<= 0.05)", dup, 0.05)
    
    pdf.ln(10)
    
    # Disclaimer
    pdf.set_text_color(100, 100, 100)
    pdf.set_font("Helvetica", "I", 10)
    pdf.multi_cell(0, 5, "This report is generated automatically by GreenGuard. 'All Green' status indicates that the synthetic data has met the configured utility and privacy thresholds suitable for general analytical use. Always review sensitive outliers manually.")
    
    pdf.output(output_path)
    return output_path
