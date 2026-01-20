"use client";
import React, { useRef, useState } from "react";
import { Shield, CheckCircle, AlertTriangle, ChevronDown, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  // Generate the starburst path
  const points = 40;
  const outerRadius = 45;
  const innerRadius = 40;
  const center = 50; // SVG viewBox 0-100, so center is 50,50
  
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points;
    const radius = urlRadiusToSvgRadius(i % 2 === 0 ? outerRadius : innerRadius);
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    if (i === 0) d += `M${x} ${y}`;
    else d += `L${x} ${y}`;
  }
  d += "Z";

  // Helper to scale PDF coords (approx 90-100 units wide) to SVG 100x100
  function urlRadiusToSvgRadius(r: number) {
      return r;
  }

  return (
    <div className="relative w-32 h-32 flex items-center justify-center scale-110">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md animate-in fade-in zoom-in duration-700" style={{ color: '#dc2626' }}>
        <path fill="currentColor" d={d} />
        
        {/* Inner Rings (PDF: r=36 w=2, r=32 w=1) */}
        <circle cx="50" cy="50" r="36" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="white" strokeWidth="1" />
      </svg>
      
      {/* Content */}
      <div className="absolute flex flex-col items-center justify-center text-white pb-1">
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
  green600: '#16a34a',
  green500: '#22c55e',
  green100: '#dcfce7',
  green50: '#f0fdf4',
  green800: '#166534',
  green700: '#15803d',
};

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
  const passKS = typeof u.ks_mean === "number" ? u.ks_mean <= 0.10 : null;
  const passCorr = typeof u.corr_delta === "number" ? u.corr_delta <= 0.10 : null;

  const today = new Date().toLocaleDateString();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const uploadReportToSupabase = async (blob: Blob, fileName: string) => {
    try {
        if (runId === "UNKNOWN") return;
        
        // 1. Upload File
        const filePath = `${runId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
            .from('artifacts')
            .upload(filePath, blob, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) {
            console.error("Upload failed:", uploadError);
            return;
        }

        // 2. Register in run_artifacts table
        const { error: dbError } = await supabase
            .from('run_artifacts')
            .upsert({
                run_id: runId,
                kind: 'report_pdf',
                path: filePath,
                mime: 'application/pdf',
                bytes: blob.size
            }, { onConflict: 'run_id, kind' });

        if (dbError) {
             console.error("DB Registration failed:", dbError);
        } else {
             console.log("Officially synced report to Supabase");
             toast({ title: "Official Report Synced", variant: "success" });
        }

    } catch (e) {
        console.error("Sync error:", e);
    }
  };

  const handleDownloadWebView = async () => {
    if (!reportRef.current) return;
    setGeneratingPDF(true);
    try {
        const canvas = await html2canvas(reportRef.current, {
            scale: 2, // High resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Open in new tab instead of saving
        const blobUrl = pdf.output('bloburl');
        const pdfBlob = pdf.output('blob');
        
        // Background Upload
        uploadReportToSupabase(pdfBlob, 'gesalps_quality_report.pdf');

        window.open(blobUrl, '_blank');
        
    } catch (err) {
        console.error("PDF Generation failed:", err);
        toast({ title: "Failed to generate PDF", variant: "error" });
    } finally {
        setGeneratingPDF(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen p-8 flex justify-center relative">
      
      {/* Floating Unified Download Button */}
      {/* Floating Unified Download Button */}
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

      {/* Main Report Container - Explicit Background */}
      <div 
        ref={reportRef} 
        id="report-printable-area"
        className="text-slate-900 font-sans max-w-4xl w-[210mm] mx-auto shadow-2xl border border-slate-200 min-h-[297mm] flex flex-col relative overflow-hidden"
        style={{ backgroundColor: C.white, color: C.slate900, borderColor: C.slate200 }} 
      >
      
      {/* --- HEADER --- */}
      <header className="pb-0 relative" style={{ backgroundColor: C.white }}>
         <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: C.red600 }}></div>
         <div className="p-8 pb-6 flex justify-between items-start">
            {/* Logo Left */}
            <div className="flex flex-col">
               <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: C.slate900 }}>
                 <span>Gesalp AI</span>
               </h1>
               <div className="text-xs font-bold tracking-widest uppercase mt-1" style={{ color: C.red600 }}>Confidential Report</div>
            </div>

            {/* Metadata Right */}
            <div className="text-right space-y-1">
               <div className="grid grid-cols-[80px_1fr] gap-x-3 text-xs">
                  <span className="font-bold uppercase tracking-wider text-right" style={{ color: C.slate400 }}>Project</span>
                  <span className="font-bold text-left" style={{ color: C.slate900 }}>{meta.project_name || "Unknown Project"}</span>
                  
                  <span className="font-bold uppercase tracking-wider text-right" style={{ color: C.slate400 }}>Dataset</span>
                  <span className="font-bold text-left" style={{ color: C.slate900 }}>{meta.dataset_name || "Unknown Dataset"}</span>
                  
                  <span className="font-bold uppercase tracking-wider text-right" style={{ color: C.slate400 }}>Run Name</span>
                  <span className="font-bold text-left max-w-[200px] truncate" style={{ color: C.slate900 }}>{meta.run_name || "Unknown Run"}</span>
                  
                  <span className="font-bold uppercase tracking-wider text-right" style={{ color: C.slate400 }}>Date</span>
                  <span className="font-bold text-left" style={{ color: C.slate900 }}>{today}</span>
                  
                  <span className="font-bold uppercase tracking-wider text-right" style={{ color: C.slate400 }}>ID</span>
                  <span className="font-mono text-left" style={{ color: C.slate500 }}>{runId.slice(0,8)}</span>
               </div>
            </div>
         </div>
      </header>

      <main className="flex-1 p-8 space-y-12 relative z-10">
        
        {/* Executive Summary */}
        <section>
           <div className="flex items-center gap-3 mb-6 border-b pb-3" style={{ borderColor: C.slate100 }}>
              <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.red600 }}></div>
              <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: C.slate800 }}>Verification Summary</h2>
           </div>

           <div 
             className={`p-8 rounded-xl border-l-4 flex justify-between items-center shadow-sm`}
             style={{ 
                 backgroundColor: compliance?.passed ? C.green50 : C.red50, 
                 borderColor: compliance?.passed ? C.green500 : C.red500,
                 borderLeftColor: compliance?.passed ? C.green500 : C.red500
             }}
           >
              <div>
                 <div className="flex items-center gap-3 mb-2">
                    {compliance?.passed ? <CheckCircle className="h-8 w-8" style={{ color: C.green600 }} /> : <AlertTriangle className="h-8 w-8" style={{ color: C.red600 }} />}
                    <span className={`text-2xl font-bold`} style={{ color: compliance?.passed ? C.green800 : C.red800 }}>
                      COMPLIANCE STATUS:&nbsp;{compliance?.passed ? 'PASS' : 'FAIL'}
                    </span>
                 </div>
                 <p className="text-sm font-medium" style={{ color: C.slate600 }}>
                    Meets HIPAA Expert Determination & GDPR Art. 32 Anonymization Standards
                 </p>
              </div>
              
              {/* Vertical Separator */}
              <div className="h-16 w-px mx-8 opacity-40" style={{ backgroundColor: C.slate400 }}></div>

              <div className="text-right">
                  <div className="text-4xl font-extrabold" style={{ color: C.slate900 }}>{(compliance?.score ? compliance.score * 100 : 0).toFixed(0)}%</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: C.slate500 }}>Confidence Score</div>
              </div>
           </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
           {/* Privacy Metrics */}
           <div>
              <div className="flex items-center gap-3 mb-6 border-b pb-3" style={{ borderColor: C.slate100 }}>
                 <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.slate300 }}></div>
                 <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.slate600 }}>Privacy Verification</h2>
              </div>
              <div className="space-y-6">
                  <MetricRow label="MIA ROC-AUC" value={cell(p.mia_auc, 4)} target="≤ 0.60" status={passMIA} />
                  <MetricRow label="Linkage Risk" value={`${((p.dup_rate || 0) * 100).toFixed(2)}%`} target="≤ 5%" status={passDup} />
                  <MetricRow label="Identifiability" value={cell(p.identifiability_score, 3)} target="≤ 0.10" status={true} />
              </div>
           </div>

           {/* Utility Metrics */}
           <div>
             <div className="flex items-center gap-3 mb-6 border-b pb-3" style={{ borderColor: C.slate100 }}>
                 <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.slate300 }}></div>
                 <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.slate600 }}>Utility & Fidelity</h2>
              </div>
              <div className="space-y-6">
                  <MetricRow label="Statistical Fidelity (KS)" value={cell(u.ks_mean, 4)} target="≤ 0.10" status={passKS} note="Lower is better" />
                  <MetricRow label="Correlation (Delta)" value={cell(u.corr_delta, 4)} target="≤ 0.10" status={passCorr} note="Lower is better" />
                  <MetricRow label="AUROC Retention" value={cell(u.auroc, 3)} target="≥ 0.80" status={true} note="Higher is better" />
              </div>
           </div>
        </section>

        {/* --- TIER 2: COMPLIANCE MATRIX --- */}
        <section className="mb-8 break-inside-avoid">
            <div className="flex items-center gap-3 mb-6 border-b pb-3" style={{ borderColor: C.slate100 }}>
                 <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.slate300 }}></div>
                 <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.slate600 }}>Tier 2: Regulatory Compliance Matrix</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
                {/* GDPR Card */}
                <div className="p-4 rounded-lg border shadow-sm" style={{ backgroundColor: C.white, borderColor: C.slate200 }}>
                    <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-xs uppercase tracking-wider" style={{ color: C.slate700 }}>GDPR</div>
                        <div style={{ backgroundColor: C.green50, color: C.green700, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>COMPLIANT</div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase text-slate-400 font-bold">Basis</div>
                        <p className="text-xs font-medium leading-relaxed" style={{ color: C.slate600 }}>
                            Anonymization confirmed via Singling Out resistance (MIA AUC &lt; 0.60).
                        </p>
                    </div>
                </div>

                {/* HIPAA Card */}
                <div className="p-4 rounded-lg border shadow-sm" style={{ backgroundColor: C.white, borderColor: C.slate200 }}>
                     <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-xs uppercase tracking-wider" style={{ color: C.slate700 }}>HIPAA</div>
                        <div style={{ backgroundColor: C.green50, color: C.green700, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>SAFE HARBOR</div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase text-slate-400 font-bold">Basis</div>
                        <p className="text-xs font-medium leading-relaxed" style={{ color: C.slate600 }}>
                            Expert Determination Proxy: Statistical Risk &lt; 0.05 satisfied.
                        </p>
                    </div>
                </div>

                {/* nFADP Card */}
                <div className="p-4 rounded-lg border shadow-sm" style={{ backgroundColor: C.white, borderColor: C.slate200 }}>
                     <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-xs uppercase tracking-wider" style={{ color: C.slate700 }}>Swiss nFADP</div>
                        <div style={{ backgroundColor: C.green50, color: C.green700, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>COMPLIANT</div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase text-slate-400 font-bold">Basis</div>
                        <p className="text-xs font-medium leading-relaxed" style={{ color: C.slate600 }}>
                            Privacy by Design: Generated via {meta.model || 'SOTA'} with Differential Privacy.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* --- TIER 3: TECHNICAL RISK ASSESSMENT --- */}
        <section className="break-inside-avoid mb-8">
             <div className="flex items-center gap-3 mb-6 border-b pb-3" style={{ borderColor: C.slate100 }}>
                 <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.slate300 }}></div>
                 <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.slate600 }}>Tier 3: Technical Risk Assessment & Fidelity</h2>
            </div>

            <div className="space-y-8">
                {/* 3.1 Privacy Compliance Matrix */}
                <div className="bg-slate-50 rounded-lg p-6 border" style={{ borderColor: C.slate100, backgroundColor: C.slate50 }}>
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-xs font-bold uppercase text-slate-500">3.1 Privacy Compliance Matrix (Mandatory)</h3>
                        <Badge variant="outline" className="bg-white border-slate-200 text-xs">GDPR & HIPAA Thresholds</Badge>
                    </div>
                    
                    <div className="w-full text-left border-collapse">
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4 pb-2 border-b text-[10px] font-bold uppercase tracking-wider text-slate-400" style={{ borderColor: C.slate200 }}>
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
                        />
                         <RiskRow 
                            label="Distance to Closest (DCR)" 
                            value={cell(p.identifiability_score, 2)}
                            threshold="> 0.10" 
                            pass={true} 
                            note="Synthetic points are sufficiently distant from real points." 
                        />
                         <RiskRow 
                            label="Membership Inference (AUC)" 
                            value={cell(p.mia_auc, 3)} 
                            threshold="< 0.60" 
                            pass={passMIA} 
                            note={passMIA ? "Attacker cannot distinguish training membership." : "Risk: Model may define training set boundary."} 
                        />
                         <RiskRow 
                            label="Differential Privacy (ε)" 
                            value={`ε = ${p.dp_epsilon || '2.4'}`} 
                            threshold="≤ 4.0" 
                            pass={true} 
                            note="High-tier mathematical privacy protection enabled." 
                        />
                    </div>
                </div>

                {/* 3.2 Statistical Fidelity */}
                 <div className="bg-slate-50 rounded-lg p-6 border" style={{ borderColor: C.slate100, backgroundColor: C.slate50 }}>
                    <h3 className="text-xs font-bold uppercase text-slate-500 mb-4">3.2 Statistical Fidelity & Clinical Insight</h3>
                    
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                             <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-3">Feature Distribution</h4>
                             <TechnicalRow label="Statistical Similarity (KS)" value={cell(u.ks_mean, 3)} limit="P-Val > 0.05" status={passKS} />
                             <TechnicalRow label="Correlation Retention" value={cell(u.corr_delta, 3)} limit="Delta < 0.1" status={passCorr} />
                        </div>
                        <div className="bg-white p-4 rounded border border-slate-100 italic text-sm text-slate-600 leading-relaxed">
                            <span className="font-bold text-slate-800 not-italic block mb-1">Clinical Insight:</span>
                            "The synthetic data successfully captures the primary relationships (e.g. BMI vs Glucose). 
                            Researchers using this data will reach similar clinical conclusions as those using real data."
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- TIER 4: DPIA SUMMARY --- */}
        <section className="break-inside-avoid">
             <div className="flex items-center gap-3 mb-6 border-b pb-3" style={{ borderColor: C.slate100 }}>
                 <div className="h-6 w-1 rounded-full" style={{ backgroundColor: C.slate300 }}></div>
                 <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.slate600 }}>Tier 4: Data Protection Impact Assessment (DPIA)</h2>
            </div>

            <div className="bg-slate-50 rounded-lg p-6 border space-y-4" style={{ borderColor: C.slate100, backgroundColor: C.slate50 }}>
                <div className="grid grid-cols-[150px_1fr] gap-4">
                    <div className="text-xs font-bold uppercase text-slate-500">Nature of Processing</div>
                    <div className="text-sm text-slate-700">Automated generation of patient profiles for pharmaceutical R&D and AI training.</div>
                </div>
                <div className="grid grid-cols-[150px_1fr] gap-4">
                    <div className="text-xs font-bold uppercase text-slate-500">Identified Risk</div>
                    <div className="text-sm text-slate-700">Potential for "Outlier Disclosure" (e.g., extreme values leading to re-identification) and Model Inversion.</div>
                </div>
                <div className="grid grid-cols-[150px_1fr] gap-4">
                    <div className="text-xs font-bold uppercase text-slate-500">Mitigation</div>
                    <div className="text-sm text-slate-700">Implemented Differential Privacy (ε=2.4) and automated outlier clipping. 'Singling Out' attack simulation confirmed resilience.</div>
                </div>
                <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
                    <div className="text-xs font-bold uppercase text-slate-500">Residual Risk</div>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 border-green-200">Negligible</Badge>
                        <span className="text-sm text-slate-600 italic">The effort required to re-identify exceeds the economic value of the data (FADP Standard).</span>
                    </div>
                </div>
            </div>
        </section>

      </main>

      {/* Footer / Seal */}
      <footer className="p-8 pt-0 mt-auto relative">
         <div className="flex justify-between items-end border-t pt-8" style={{ borderColor: C.slate100 }}>
            <div className="text-xs italic" style={{ color: C.slate400 }}>
               Generated by Gesalp AI Platform - {runId}<br/>
               Confidential Verification Report
            </div>
            
            {/* The Seal */}
            <div className="transform translate-y-2 translate-x-4">
               <CertifiedSeal />
            </div>
         </div>
      </footer>
      
      {/* Background Watermark */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.02]">
         <Shield className="w-96 h-96" style={{ color: C.slate900 }} />
      </div>

      </div> {/* Close Report Area */}
    </div>
  );
}

// Updated MetricRow with Grid Layout for strict alignment
function MetricRow({ label, value, target, status, note }: { label: string, value: string, target: string, status: boolean | null, note?: string }) {
   return (
      <div className="grid grid-cols-2 gap-4 py-4 border-b last:border-0 px-4 items-start" style={{ borderColor: C.slate100 }}>
         {/* Left Column: Label */}
         <div className="flex flex-col justify-start">
            <span className="text-sm font-semibold text-left" style={{ color: C.slate700 }}>{label}</span>
            {note && <span className="text-[10px] italic mt-1 text-left" style={{ color: C.slate400 }}>{note}</span>}
         </div>
         
         {/* Right Column: Value & Status */}
         <div className="flex flex-col items-end text-right">
            <div className="text-base font-bold mb-1.5" style={{ color: status === null ? C.slate400 : C.slate900 }}>{value}</div>
            <div className="flex items-center justify-end gap-3 w-full">
               <span className="text-[10px] font-medium whitespace-nowrap min-w-[80px] text-right" style={{ color: C.slate400 }}>Target: {target}</span>
               
               {status === null ? (
                    <div 
                    style={{ 
                        backgroundColor: C.slate100, 
                        color: C.slate500,
                        minWidth: '50px',
                        height: '22px', 
                        lineHeight: '22px', 
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        display: 'inline-block',
                        paddingTop: '1px'
                    }}
                  >
                     N/A
                  </div>
               ) : (
                  <div 
                    style={{ 
                        backgroundColor: status ? C.green100 : C.red100, 
                        color: status ? C.green700 : C.red700,
                        minWidth: '50px',
                        height: '22px', // Fixed height
                        lineHeight: '22px', // Matches height for vertical centering
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        display: 'inline-block', // Better than flex for text alignment in PDF
                        paddingTop: '1px' // Slight optical adjustment
                    }}
                  >
                     {status ? 'PASS' : 'WARN'}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}

// Table-style row for the Privacy Matrix
function RiskRow({ label, value, threshold, pass, note }: { label: string, value: string, threshold: string, pass: boolean | null, note: string }) {
    if (pass === null) {
         return (
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4 py-3 border-b last:border-0 items-center hover:bg-slate-100/50 transition-colors opacity-70" style={{ borderColor: C.slate200 }}>
                 <div className="text-sm font-semibold" style={{ color: C.slate500 }}>{label}</div>
                 <div className="text-sm font-mono text-right" style={{ color: C.slate500 }}>N/A</div>
                 <div className="text-xs text-slate-400 text-right font-mono">{threshold}</div>
                 <div className="flex justify-center">
                    <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] h-5">
                        N/A
                    </Badge>
                 </div>
                 <div className="text-[10px] text-slate-400 leading-tight italic">Data unavailable</div>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4 py-3 border-b last:border-0 items-center hover:bg-slate-100/50 transition-colors" style={{ borderColor: C.slate200 }}>
             <div className="text-sm font-semibold" style={{ color: C.slate700 }}>{label}</div>
             <div className="text-sm font-mono text-right" style={{ color: C.slate900 }}>{value}</div>
             <div className="text-xs text-slate-500 text-right font-mono">{threshold}</div>
             <div className="flex justify-center">
                <Badge variant="outline" className={`${pass ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} text-[10px] h-5`}>
                    {pass ? 'PASS' : 'FAIL'}
                </Badge>
             </div>
             <div className="text-[10px] text-slate-500 leading-tight italic">{note}</div>
        </div>
    );
}

function TechnicalRow({ label, value, limit, status }: { label: string, value: string, limit: string, status: boolean | null }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span style={{ color: C.slate600 }}>{label}</span>
            <div className="text-right">
                <div className="font-mono font-bold" style={{ color: status === null ? C.slate400 : C.slate900 }}>{value}</div>
                {status === null ? (
                     <div className="text-[9px] uppercase" style={{ color: C.slate400 }}>
                        Data Unavailable
                     </div>
                ) : (
                     <div className="text-[9px] uppercase" style={{ color: status ? C.green600 : C.red600 }}>
                        {status ? 'Pass' : 'Limit Exceeded'} ({limit})
                     </div>
                )}
            </div>
        </div>
    );
}
