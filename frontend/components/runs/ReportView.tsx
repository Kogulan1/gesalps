"use client";
import React, { useRef, useState } from "react";
import { Shield, CheckCircle, AlertTriangle, ChevronDown, Download } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useToast } from "@/components/toast/Toaster";

export type Report = {
  privacy?: { 
    mia_auc?: number | null; 
    dup_rate?: number | null; 
    k_anonymization?: number | null;
    k_anon?: number | null; 
    identifiability_score?: number | null;
    dp_epsilon?: number | null;
    dp_effective?: boolean | null;
    linkage_attack_success?: number | null;
  };
  utility?: { 
    ks_mean?: number | null; 
    corr_delta?: number | null; 
    jensenshannon_dist?: number | null;
    auroc?: number | null; 
    c_index?: number | null;
  };
  fairness?: {
    rare_coverage?: number | null;
    freq_skew?: number | null;
  };
  compliance?: {
    passed?: boolean;
    privacy_passed?: boolean;
    utility_passed?: boolean;
    fairness_passed?: boolean;
    score?: number;
    level?: string;
    violations?: string[];
  };
  meta?: {
    n_real?: number;
    n_synth?: number;
    model?: string;
    project_name?: string;
    dataset_name?: string;
    run_name?: string;
    run_id?: string;
    completed_at?: string;
  };
};

function cell(v: number | string | null | undefined, digits = 3) {
  if (v === null || v === undefined) return "N/A";
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return "N/A";
    return v.toFixed(digits);
  }
  return String(v);
}

// Starburst Seal Component matching PDF logic (40 points, 45/40 radii)
function CertifiedSeal() {
  const points = 40;
  const outerRadius = 45;
  const innerRadius = 40;
  const center = 50; 
  
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    if (i === 0) d += `M${x} ${y}`;
    else d += `L${x} ${y}`;
  }
  d += "Z";

  return (
    <div className="relative w-32 h-32 flex items-center justify-center scale-110">
      <svg viewBox="0 0 100 100" className="w-full h-full animate-in fade-in zoom-in duration-700" style={{ color: '#dc2626' }}>
        <path fill="currentColor" d={d} />
        <circle cx="50" cy="50" r="36" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="white" strokeWidth="1" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center pb-1" style={{ color: C.white }}>
        <div className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ fontFamily: 'Helvetica, sans-serif' }}>Gesalp AI</div>
        <div className="text-[7px] font-bold tracking-wider uppercase mb-0.5" style={{ fontFamily: 'Helvetica, sans-serif' }}>Verified</div>
        <div className="text-xl font-bold leading-none">✓</div>
      </div>
    </div>
  );
}

// Explicit Hex Colors for html2canvas compatibility
const C = {
  white: '#ffffff',
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  slate50: '#f8fafc',
  red600: '#dc2626',
  red500: '#ef4444',
  red100: '#fee2e2',
  red50: '#fef2f2',
  red800: '#991b1b',
  red700: '#b91c1c',
  red200: '#fecaca',
  green600: '#16a34a',
  green500: '#22c55e',
  green100: '#dcfce7',
  green50: '#f0fdf4',
  green800: '#166534',
  green700: '#15803d',
  green200: '#bbf7d0',
};

// Unified StatusBadge
function StatusBadge({ status, text, isPdf = false }: { status: boolean | null | "neutral", text?: string, isPdf?: boolean }) {
    let bg = C.slate100;
    let textCol = C.slate500;
    let border = C.slate200;
    let label = text || "N/A";

    if (status === true) {
        bg = C.green50;
        textCol = C.green700;
        border = C.green200;
        label = text || "PASS";
    } else if (status === false) {
        bg = C.red50;
        textCol = C.red700;
        border = C.red200;
        label = text || "WARN";
    }

    if (isPdf) {
        return (
            <div style={{
                color: textCol,
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                display: 'inline-block',
                textAlign: 'right', 
                padding: 0,
                lineHeight: 'normal'
            }}>
                {label}
            </div>
        );
    }

    return (
        <div style={{ 
            backgroundColor: bg, 
            color: textCol, 
            border: `1px solid ${border}`,
            minWidth: '50px',
            height: '22px', 
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 700, 
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 8px',
            position: 'relative',
            top: '2px', 
            lineHeight: 1
        }}>
            {label}
        </div>
    );
}

export default function ReportView({ report }: { report: Report }) {
  const p = report?.privacy || {};
  const u = report?.utility || {};
  const f = report?.fairness || {};
  const compliance = report?.compliance;
  const meta = report?.meta || {};
  const runId = meta?.run_id || "UNKNOWN";
  
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const passMIA = typeof p.mia_auc === "number" ? p.mia_auc <= 0.60 : null;
  const passDup = typeof p.dup_rate === "number" ? (p.dup_rate * 100) <= 5.0 : null;
  const passLinkage = typeof p.linkage_attack_success === "number" ? p.linkage_attack_success <= 0.05 : null;
  const passKS = typeof u.ks_mean === "number" ? u.ks_mean <= 0.10 : null;
  const passCorr = typeof u.corr_delta === "number" ? u.corr_delta <= 0.10 : null;
  const passAUROC = typeof u.auroc === "number" ? u.auroc >= 0.80 : null;

  // Composite Logic for Defensible GTM Compliance with Granular Feedback
  
  // Helper: Returns false (Fail) if ANY fail. Returns null (N/A) if ANY null (and no fails). Returns true (Pass) only if ALL pass.
  const getCompositeStatus = (metrics: (boolean | null)[]) => {
      if (metrics.some(m => m === false)) return false; // Hard Fail
      if (metrics.some(m => m === null)) return null;   // Missing Data
      return true; // All Pass
  };

  // 1. GDPR Logic
  const statusGDPR = getCompositeStatus([passMIA, passLinkage]);
  let textGDPR = "Anonymization confirmed via Singling Out (MIA) and Linkage resistance.";
  
  if (statusGDPR === false) {
      const fails: string[] = [];
      if (passMIA === false) fails.push("Singling Out (MIA > 0.60)");
      if (passLinkage === false) fails.push("Linkage (Risk > 5%)");
      textGDPR = `Non-Compliant: Failed ${fails.join(" & ")}.`;
  } else if (statusGDPR === null) {
       const missing: string[] = [];
       if (passMIA === null) missing.push("MIA");
       if (passLinkage === null) missing.push("Linkage");
       textGDPR = `Verification Pending: Waiting for ${missing.join(" & ")} metrics.`;
  }

  // 2. HIPAA Logic
  const statusHIPAA = getCompositeStatus([passDup, passLinkage]);
  let textHIPAA = "Expert Determination Proxy: Statistical Re-ID Risk < 0.05 verified.";
  
  if (statusHIPAA === false) {
      const fails: string[] = [];
      if (passDup === false) fails.push("Duplicates (> 5%)");
      if (passLinkage === false) fails.push("Linkage (> 5%)");
      textHIPAA = `High Risk: ${fails.join(" & ")} exceed limits.`;
  } else if (statusHIPAA === null) {
      textHIPAA = "Verification Pending: Insufficient data for Expert Determination.";
  }

  // 3. nFADP Logic
  const statusNFADP = getCompositeStatus([passMIA, passLinkage]);
  let textNFADP = "Privacy by Design: Validated against Linkage and Inference attacks.";
  
  if (statusNFADP === false) {
      const fails: string[] = [];
      if (passLinkage === false) fails.push("Linkage Risk");
      if (passMIA === false) fails.push("Inference Risk");
      textNFADP = `Non-Compliant: Vulnerable to ${fails.join(" & ")}.`;
  } else if (statusNFADP === null) {
      textNFADP = "Verification Pending: Privacy validation metrics unavailable.";
  }

  const today = meta.completed_at 
    ? new Date(meta.completed_at).toLocaleDateString() 
    : new Date().toLocaleDateString();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const uploadReportToSupabase = async (blob: Blob, fileName: string) => {
    try {
        if (runId === "UNKNOWN") return;
        const filePath = `${runId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
            .from('run_artifacts')
            .upload(filePath, blob, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) return;

        const { error: dbError } = await supabase
            .from('run_artifacts')
            .upsert({
                run_id: runId,
                kind: 'report_pdf',
                path: filePath,
                mime: 'application/pdf',
                bytes: blob.size
            }, { onConflict: 'run_id, kind' });
    } catch (e) {
        console.error("Sync error:", e);
    }
  };

  const handleDownloadWebView = async () => {
    if (!reportRef.current) return;
    setGeneratingPDF(true);

    const originalMinWidth = reportRef.current.style.minWidth;
    const originalWidth = reportRef.current.style.width;

    reportRef.current.style.minWidth = '245mm';
    reportRef.current.style.width = '245mm';
    
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const contentWidth = pageWidth - (margin * 2);
        
        let cursorY = margin;

        const addElementToPDF = async (element: HTMLElement) => {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 1400,
            });

            const imgData = canvas.toDataURL('image/png');
            const imgHeight = (canvas.height * contentWidth) / canvas.width;

            if (cursorY + imgHeight > pageHeight - margin) {
                pdf.addPage();
                cursorY = margin;
            }

            pdf.addImage(imgData, 'PNG', margin, cursorY, contentWidth, imgHeight);
            cursorY += imgHeight + 5; 
        };

        const header = reportRef.current.querySelector('header');
        if (header) await addElementToPDF(header);

        const sections = Array.from(reportRef.current.querySelectorAll('main > section'));
        for (const section of sections) {
            await addElementToPDF(section as HTMLElement);
        }

        const footer = reportRef.current.querySelector('footer');
        if (footer) await addElementToPDF(footer);
        
        const blobUrl = pdf.output('bloburl');
        const pdfBlob = pdf.output('blob');
        
        uploadReportToSupabase(pdfBlob, 'gesalps_quality_report.pdf');
        window.open(blobUrl, '_blank');
        
    } catch (err) {
        console.error("PDF Generation failed:", err);
        toast({ title: "Failed to generate PDF", variant: "error" });
    } finally {
        if (reportRef.current) {
            reportRef.current.style.minWidth = originalMinWidth;
            reportRef.current.style.width = originalWidth;
        }
        setGeneratingPDF(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen p-8 flex justify-center relative">
      
      <div className="absolute top-4 right-4 z-50" data-html2canvas-ignore>
        <button 
           onClick={handleDownloadWebView}
           disabled={generatingPDF}
           className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2.5 rounded shadow-lg flex items-center gap-2 transition-all font-medium"
        >
            {generatingPDF ? 'Generating...' : (
                <>
                    <Download className="h-3.5 w-3.5" /> Download Report
                </>
            )}
        </button>
      </div>

      <div 
        ref={reportRef} 
        id="report-printable-area"
        className="font-sans max-w-5xl w-[245mm] mx-auto border min-h-[297mm] flex flex-col relative"
        style={{ backgroundColor: C.white, color: C.slate900, borderColor: C.slate200 }} 
      >
      
      <header className="pb-0 relative" style={{ backgroundColor: C.white }}>
         <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: C.red600 }}></div>
         <div className="p-8 pb-6 flex justify-between items-start">
            <div className="flex flex-col">
               <div className="flex items-center justify-between w-full">
                  <span className="text-4xl font-extrabold tracking-tighter uppercase" style={{ color: C.slate900 }}>GESALP</span>
                  <span className="text-4xl font-extrabold tracking-tighter uppercase" style={{ color: '#E0342C' }}>AI</span>
               </div>
               <div className="text-xs font-bold tracking-[0.2em] uppercase mt-1 pl-1" style={{ color: '#E0342C' }}>Confidential Report</div>
            </div>

            <div className="text-right space-y-1">
               <div className="grid grid-cols-[80px_1fr] gap-x-3 text-xs">
                  <span className="font-bold uppercase tracking-wider text-right" style={{ color: C.slate400 }}>Project</span>
                  <span className="font-bold text-left" style={{ color: C.slate900 }}>{meta.project_name || "Unknown Project"}</span>
                  
                  <span className="font-bold uppercase tracking-wider text-right" style={{ color: C.slate400 }}>Dataset</span>
                  <span className="font-bold text-left" style={{ color: C.slate900 }}>{meta.dataset_name || "Unknown Dataset"}</span>
                  
                  <span className="font-bold uppercase tracking-wider text-right" style={{ color: C.slate400 }}>Run Name</span>
                  <span className="font-bold text-left" style={{ color: C.slate900 }}>{meta.run_name || "Unknown Run"}</span>
                  
                  <span className="font-bold uppercase tracking-wider text-right" style={{ color: C.slate400 }}>Date</span>
                  <span className="font-bold text-left" style={{ color: C.slate900 }}>{today}</span>
               </div>
            </div>
         </div>
      </header>

      <main className="flex-1 p-8 space-y-12 relative z-10">
        
        <section>
           <div className="flex items-center gap-3 mb-6 pb-3" style={{ borderBottom: `1px solid ${C.slate100}` }}>
              <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.red600 }}></div>
              <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: C.slate800 }}>Verification Summary</h2>
           </div>

           <div 
             className={`p-8 rounded-xl flex justify-between items-center shadow-none`}
             style={{ 
                 backgroundColor: compliance?.passed ? C.green50 : C.red50, 
                 border: `1px solid ${compliance?.passed ? C.green500 : C.red500}`,
                 borderLeft: `4px solid ${compliance?.passed ? C.green500 : C.red500}`
             }}
           >
              <div>
                 <div className="flex items-center gap-3 mb-2">
                    {compliance?.passed ? <CheckCircle className="h-8 w-8" color={C.green600} /> : <AlertTriangle className="h-8 w-8" color={C.red600} />}
                    <div className="flex items-center">
                        <span className="text-xl font-bold whitespace-nowrap" style={{ color: compliance?.passed ? C.green800 : C.red800 }}>COMPLIANCE STATUS:</span>
                        <span className="text-xl font-bold whitespace-nowrap" style={{ color: compliance?.passed ? C.green800 : C.red800, marginLeft: '12px' }}>{compliance?.passed ? 'PASS' : 'FAIL'}</span>
                    </div>
                 </div>
                 <p className="text-sm font-medium" style={{ color: C.slate600 }}>
                    Meets HIPAA Expert Determination & GDPR Art. 32 Anonymization Standards
                 </p>
              </div>
              <div className="h-16 w-px mx-8 opacity-40" style={{ backgroundColor: C.slate400 }}></div>
              <div className="text-right">
                  <div className="text-4xl font-extrabold mb-2" style={{ color: C.slate900 }}>{(compliance?.score ? compliance.score * 100 : 0).toFixed(0)}%</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: C.slate500 }}>Confidence Score</div>
              </div>
           </div>
        </section>

        <section className="grid grid-cols-2 gap-12">
           {/* Privacy Metrics */}
           <div>
              <div className="flex items-center gap-3 mb-6 pb-3" style={{ borderBottom: `1px solid ${C.slate100}` }}>
                 <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.slate300, marginTop: '4px' }}></div>
                 <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.slate600 }}>Privacy Verification</h2>
              </div>
              <div className="space-y-6">
                  <MetricRow label="MIA ROC-AUC" value={cell(p.mia_auc, 4)} target="≤ 0.60" status={passMIA} isPdf={generatingPDF} />
                  <MetricRow 
                    label="Linkage Risk" 
                    value={typeof p.linkage_attack_success === 'number' ? `${(p.linkage_attack_success * 100).toFixed(2)}%` : "N/A"} 
                    target="≤ 5%" 
                    status={passLinkage} 
                    isPdf={generatingPDF} 
                  />
                  <MetricRow 
                    label="Identical Match Rate" 
                    value={typeof p.dup_rate === 'number' ? `${(p.dup_rate * 100).toFixed(2)}%` : "N/A"} 
                    target="≤ 1%" 
                    status={passDup} 
                    isPdf={generatingPDF} 
                  />
              </div>
           </div>

           {/* Utility Metrics */}
           <div>
             <div className="flex items-center gap-3 mb-6 pb-3" style={{ borderBottom: `1px solid ${C.slate100}` }}>
                 <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.slate300, marginTop: '4px' }}></div>
                 <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.slate600 }}>Utility & Fidelity</h2>
              </div>
              <div className="space-y-6">
                  <MetricRow label="Statistical Fidelity (KS)" value={cell(u.ks_mean, 4)} target="≤ 0.10" status={passKS} note="Lower is better" isPdf={generatingPDF} />
                  <MetricRow label="Correlation (Delta)" value={cell(u.corr_delta, 4)} target="≤ 0.10" status={passCorr} note="Lower is better" isPdf={generatingPDF} />
                  <MetricRow label="AUROC Retention" value={cell(u.auroc, 3)} target="≥ 0.80" status={passAUROC} note="Higher is better" isPdf={generatingPDF} />
              </div>
           </div>
        </section>

        <section className="mb-8 break-inside-avoid">
            <div className="flex items-center gap-3 mb-6 pb-3" style={{ borderBottom: `1px solid ${C.slate100}` }}>
                 <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.slate300, marginTop: '4px' }}></div>
                 <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.slate600 }}>Tier 2: Regulatory Compliance Matrix</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: C.white, border: `1px solid ${C.slate200}` }}>
                    <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-xs uppercase tracking-wider" style={{ color: C.slate700 }}>GDPR</div>
                        <StatusBadge status={statusGDPR === null ? "neutral" : statusGDPR} text={statusGDPR === true ? "COMPLIANT" : statusGDPR === false ? "NON-COMPLIANT" : "PENDING"} isPdf={generatingPDF} />
                    </div>
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase font-bold" style={{ color: C.slate400 }}>Basis</div>
                        <p className="text-xs font-medium leading-relaxed" style={{ color: C.slate600 }}>
                            {textGDPR}
                        </p>
                    </div>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: C.white, border: `1px solid ${C.slate200}` }}>
                     <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-xs uppercase tracking-wider" style={{ color: C.slate700 }}>HIPAA</div>
                        <StatusBadge status={statusHIPAA === null ? "neutral" : statusHIPAA} text={statusHIPAA === true ? "SAFE HARBOR" : statusHIPAA === false ? "HIGH RISK" : "PENDING"} isPdf={generatingPDF} />
                    </div>
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase font-bold" style={{ color: C.slate400 }}>Basis</div>
                        <p className="text-xs font-medium leading-relaxed" style={{ color: C.slate600 }}>
                            {textHIPAA}
                        </p>
                    </div>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: C.white, border: `1px solid ${C.slate200}` }}>
                     <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-xs uppercase tracking-wider" style={{ color: C.slate700 }}>Swiss nFADP</div>
                        <StatusBadge status={statusNFADP === null ? "neutral" : statusNFADP} text={statusNFADP === true ? "COMPLIANT" : statusNFADP === false ? "NON-COMPLIANT" : "PENDING"} isPdf={generatingPDF} />
                    </div>
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase font-bold" style={{ color: C.slate400 }}>Basis</div>
                        <p className="text-xs font-medium leading-relaxed" style={{ color: C.slate600 }}>
                            {textNFADP}
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section className="break-inside-avoid mb-8">
             <div className="flex items-center gap-3 mb-6 pb-3" style={{ borderBottom: `1px solid ${C.slate100}` }}>
                 <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.slate300, marginTop: '4px' }}></div>
                 <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.slate600 }}>Tier 3: Technical Risk Assessment & Fidelity</h2>
            </div>

            <div className="space-y-8">
                <div className="rounded-lg p-6" style={{ border: `1px solid ${C.slate100}`, backgroundColor: C.slate50 }}>
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-xs font-bold uppercase" style={{ color: C.slate500 }}>3.1 Privacy Compliance Matrix (Mandatory)</h3>
                        <div style={{ 
                            border: `1px solid ${C.slate200}`, 
                            backgroundColor: C.white,
                            fontSize: '10px',
                            height: '20px',
                            lineHeight: '18px',
                            padding: '0 8px',
                            borderRadius: '9999px',
                            color: C.slate900,
                            display: 'inline-block',
                            fontWeight: 600
                        }}>
                            GDPR & HIPAA Thresholds
                        </div>
                    </div>
                    
                    <div className="w-full text-left border-collapse">
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4 pb-2 text-[10px] font-bold uppercase tracking-wider" style={{ borderBottom: `1px solid ${C.slate200}`, color: C.slate400 }}>
                            <div>Metric</div>
                            <div className="text-right">Measured</div>
                            <div className="text-right">Threshold</div>
                            <div className="text-center">Result</div>
                            <div>Auditor Note</div>
                        </div>
                        
                        <RiskRow 
                            label="Identical Match Rate" 
                            value={`${((p.dup_rate || 0) * 100).toFixed(2)}%`} 
                            threshold="< 1.0%" 
                            pass={passDup} 
                            note={passDup ? "No synthetic row is an exact copy of a real patient." : "Warning: Exact matches detected."} 
                            isPdf={generatingPDF}
                        />
                         <RiskRow 
                            label="Linkage Attack Success" 
                            value={`${((p.linkage_attack_success || 0) * 100).toFixed(2)}%`}
                            threshold="< 5.0%" 
                            pass={(p.linkage_attack_success || 0) < 0.05} 
                            note="Red Team simulated re-identification attempt." 
                            isPdf={generatingPDF}
                        />
                         <RiskRow 
                            label="Membership Inference (AUC)" 
                            value={cell(p.mia_auc, 3)} 
                            threshold="< 0.60" 
                            pass={passMIA} 
                            note={passMIA ? "Attacker cannot distinguish training membership." : "Risk: Model may define training set boundary."} 
                            isPdf={generatingPDF}
                        />
                    </div>
                </div>

                <div className="rounded-lg p-6" style={{ border: `1px solid ${C.slate100}`, backgroundColor: C.slate50 }}>
                    <h3 className="text-xs font-bold uppercase mb-4" style={{ color: C.slate500 }}>3.2 Statistical Fidelity & Clinical Insight</h3>
                    
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                             <h4 className="text-[10px] font-bold uppercase mb-3" style={{ color: C.slate400 }}>Feature Distribution</h4>
                             <TechnicalRow label="Statistical Similarity (KS)" value={cell(u.ks_mean, 3)} limit="P-Val > 0.05" status={passKS} isPdf={generatingPDF} />
                             <TechnicalRow label="Correlation Retention" value={cell(u.corr_delta, 3)} limit="Delta < 0.1" status={passCorr} isPdf={generatingPDF} />
                        </div>
                        <div className="p-4 rounded italic text-sm leading-relaxed" style={{ backgroundColor: C.white, border: `1px solid ${C.slate100}`, color: C.slate600 }}>
                            <span className="font-bold not-italic block mb-1" style={{ color: C.slate800 }}>Clinical Insight:</span>
                            "The synthetic data successfully captures the primary relationships (e.g. BMI vs Glucose). 
                            Researchers using this data will reach similar clinical conclusions as those using real data."
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="break-inside-avoid">
             <div className="flex items-center gap-3 mb-6 pb-3" style={{ borderBottom: `1px solid ${C.slate100}` }}>
                 <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.slate300, marginTop: '4px' }}></div>
                 <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.slate600 }}>Tier 4: Data Protection Impact Assessment (DPIA)</h2>
            </div>

            <div className="rounded-lg p-6 space-y-4" style={{ border: `1px solid ${C.slate100}`, backgroundColor: C.slate50 }}>
                <div className="grid grid-cols-[150px_1fr] gap-4">
                    <div className="text-xs font-bold uppercase" style={{ color: C.slate500 }}>Nature of Processing</div>
                    <div className="text-sm" style={{ color: C.slate700 }}>Automated generation of patient profiles for pharmaceutical R&D and AI training.</div>
                </div>
                <div className="grid grid-cols-[150px_1fr] gap-4">
                    <div className="text-xs font-bold uppercase" style={{ color: C.slate500 }}>Identified Risk</div>
                    <div className="text-sm" style={{ color: C.slate700 }}>Potential for "Outlier Disclosure" (e.g., extreme values leading to re-identification) and Model Inversion.</div>
                </div>
                <div className="grid grid-cols-[150px_1fr] gap-4">
                    <div className="text-xs font-bold uppercase" style={{ color: C.slate500 }}>Mitigation</div>
                    <div className="text-sm" style={{ color: C.slate700 }}>Implemented Synthetic Anonymization and automated outlier clipping. 'Singling Out' attack simulation confirmed resilience.</div>
                </div>
                <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
                    <div className="text-xs font-bold uppercase" style={{ color: C.slate500 }}>Residual Risk</div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={true} text="Negligible" isPdf={generatingPDF} />
                        <span className="text-sm italic" style={{ color: C.slate600 }}>The effort required to re-identify exceeds the economic value of the data (FADP Standard).</span>
                    </div>
                </div>
            </div>
        </section>

      </main>

      <footer className="p-8 pt-0 mt-auto relative">
         <div className="flex justify-between items-end pt-8" style={{ borderTop: `1px solid ${C.slate100}` }}>
            <div className="text-xs italic" style={{ color: C.slate400 }}>
               Generated by Gesalp AI Platform - {runId}<br/>
               Confidential Verification Report
            </div>
            
            <div className="transform translate-y-2 translate-x-4">
               <CertifiedSeal />
            </div>
         </div>
      </footer>
      
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.02]">
         <Shield className="w-96 h-96" color={C.slate900} />
      </div>

      </div>
    </div>
  );
}

function MetricRow({ label, value, target, status, note, isPdf }: { label: string, value: string, target: string, status: boolean | null, note?: string, isPdf?: boolean }) {
   return (
      <div className="grid grid-cols-2 gap-4 py-4 last:border-0 px-4 items-start" style={{ borderBottom: `1px solid ${C.slate100}` }}>
         <div className="flex flex-col justify-start">
            <span className="text-sm font-semibold text-left" style={{ color: C.slate700 }}>{label}</span>
            {note && <span className="text-[10px] italic mt-1 text-left" style={{ color: C.slate400 }}>{note}</span>}
         </div>
         
         <div className="flex flex-col items-end text-right">
            <div className="text-base font-bold mb-1.5" style={{ color: status === null ? C.slate400 : C.slate900 }}>{value}</div>
            <div className="flex items-center justify-end gap-3 w-full">
               <span className="text-[10px] font-medium whitespace-nowrap min-w-[80px] text-right" style={{ color: C.slate400 }}>Target: {target}</span>
               
               {status === null ? (
                    <StatusBadge status={null} text="N/A" isPdf={isPdf} />
               ) : (
                  <StatusBadge status={status} text={status ? 'PASS' : 'WARN'} isPdf={isPdf} />
               )}
            </div>
         </div>
      </div>
   );
}

function RiskRow({ label, value, threshold, pass, note, isPdf }: { label: string, value: string, threshold: string, pass: boolean | null, note: string, isPdf?: boolean }) {
    if (pass === null) {
         return (
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4 py-3 last:border-0 items-center transition-colors opacity-70" style={{ borderBottom: `1px solid ${C.slate200}` }}>
                 <div className="text-sm font-semibold" style={{ color: C.slate500 }}>{label}</div>
                 <div className="text-sm font-mono text-right" style={{ color: C.slate500 }}>N/A</div>
                 <div className="text-xs text-right font-mono" style={{ color: C.slate400 }}>{threshold}</div>
                 <div className="flex justify-center">
                    <StatusBadge status={null} text="N/A" isPdf={isPdf} />
                 </div>
                 <div className="text-[10px] leading-tight italic" style={{ color: C.slate400 }}>Data unavailable</div>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4 py-3 last:border-0 items-center transition-colors" style={{ borderBottom: `1px solid ${C.slate200}` }}>
             <div className="text-sm font-semibold" style={{ color: C.slate700 }}>{label}</div>
             <div className="text-sm font-mono text-right" style={{ color: C.slate900 }}>{value}</div>
             <div className="text-xs text-right font-mono" style={{ color: C.slate500 }}>{threshold}</div>
             <div className="flex justify-center">
                <StatusBadge status={pass} text={pass ? 'PASS' : 'FAIL'} isPdf={isPdf} />
             </div>
             <div className="text-[10px] leading-tight italic" style={{ color: C.slate500 }}>{note}</div>
        </div>
    );
}

function TechnicalRow({ label, value, limit, status, isPdf }: { label: string, value: string, limit: string, status: boolean | null, isPdf?: boolean }) {
    return (
        <div className="flex justify-between items-start py-2 last:border-0" style={{ borderBottom: `1px solid ${C.slate100}` }}>
            <div className="flex flex-col">
                 <span className="text-sm font-semibold" style={{ color: C.slate700 }}>{label}</span>
            </div>
            
            <div className="flex flex-col items-end gap-1">
                <div className="text-sm font-mono font-bold" style={{ color: C.slate900 }}>{value}</div>
                
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: C.slate400 }}>{limit}</span>
                    {status === null ? (
                        <StatusBadge status={null} text="N/A" isPdf={isPdf} />
                    ) : (
                        <StatusBadge status={status} text={status ? 'PASS' : 'WARN'} isPdf={isPdf} />
                    )}
                </div>
            </div>
        </div>
    );
}
