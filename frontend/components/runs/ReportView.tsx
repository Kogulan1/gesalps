"use client";
import React from "react";

type Report = {
  privacy?: { mia_auc?: number | null; dup_rate?: number | null; k_anon?: number | null; dp_epsilon?: number | null };
  utility?: { ks_mean?: number | null; corr_delta?: number | null; auroc?: number | null; c_index?: number | null };
};

function statusLabel(ok?: boolean | null) {
  if (ok === null || ok === undefined) return { label: "N/A", className: "text-neutral-500", pill: "bg-neutral-200 text-neutral-800" };
  return ok
    ? { label: "Pass", className: "text-emerald-600", pill: "bg-emerald-100 text-emerald-700" }
    : { label: "Check", className: "text-amber-700", pill: "bg-amber-100 text-amber-800" };
}

// Utility grading for nicer labels (Strong/Good)
function gradeGoodStrong(ok: boolean | null | undefined, strength?: 'strong' | 'good' | null) {
  if (ok === null || ok === undefined) return { label: 'N/A', pill: 'bg-neutral-200 text-neutral-800' };
  if (!ok) return { label: 'Check', pill: 'bg-amber-100 text-amber-800' };
  if (strength === 'strong') return { label: 'Strong', pill: 'bg-emerald-100 text-emerald-700' };
  return { label: 'Good', pill: 'bg-emerald-50 text-emerald-700' };
}

function cell(v: number | string | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return String(v);
}

export default function ReportView({ report }: { report: Report }) {
  const p = report?.privacy || {};
  const u = report?.utility || {};

  // Threshold logic
  const passMIA = typeof p.mia_auc === "number" ? p.mia_auc <= 0.60 : null;
  const dupPct = typeof p.dup_rate === "number" ? p.dup_rate * 100 : null;
  const passDup = typeof dupPct === "number" ? dupPct <= 5.0 : null;

  const passKS = typeof u.ks_mean === "number" ? u.ks_mean <= 0.10 : null;
  const passCorr = typeof u.corr_delta === "number" ? u.corr_delta <= 0.10 : null;
  const passAUROC = typeof u.auroc === "number" ? u.auroc >= 0.80 : null;
  const passCIdx = typeof u.c_index === "number" ? u.c_index >= 0.70 : null;
  // Strength heuristics (tune as desired)
  const ksStrength: 'strong' | 'good' | null = typeof u.ks_mean === 'number' ? (u.ks_mean <= 0.08 ? 'strong' : (u.ks_mean <= 0.10 ? 'good' : null)) : null;
  const corrStrength: 'strong' | 'good' | null = typeof u.corr_delta === 'number' ? (u.corr_delta <= 0.08 ? 'strong' : (u.corr_delta <= 0.10 ? 'good' : null)) : null;
  const aurocStrength: 'strong' | 'good' | null = typeof u.auroc === 'number' ? (u.auroc >= 0.85 ? 'strong' : (u.auroc >= 0.80 ? 'good' : null)) : null;
  const cidxStrength: 'strong' | 'good' | null = typeof u.c_index === 'number' ? (u.c_index >= 0.75 ? 'strong' : (u.c_index >= 0.70 ? 'good' : null)) : null;

  // Overall evaluation
  const privacyOK = (passMIA ?? true) && (passDup ?? true);
  const utilityOK = (passKS ?? true) && (passCorr ?? true) && (passAUROC ?? true) && (passCIdx ?? true);
  const overallOK = privacyOK && utilityOK;

  const today = new Date().toLocaleDateString();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--ges-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2"><span>🔒</span> Privacy Assessment</h3>
          <div className="text-xs token-muted">{today}</div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-900 text-white">
                <th className="text-left px-3 py-2 border-b border-neutral-700">Test</th>
                <th className="text-left px-3 py-2 border-b border-neutral-700">Result</th>
                <th className="text-left px-3 py-2 border-b border-neutral-700">Threshold</th>
                <th className="text-left px-3 py-2 border-b border-neutral-700">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Membership Inference AUC</td>
                <td className="px-3 py-2">{cell(p.mia_auc)}</td>
                <td className="px-3 py-2">≤ 0.60</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${statusLabel(passMIA).pill}`}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {statusLabel(passMIA).label === 'Pass' ? 'Accept' : statusLabel(passMIA).label}
                  </span>
                </td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Record Linkage Risk (%)</td>
                <td className="px-3 py-2">{dupPct === null ? '—' : `${dupPct.toFixed(1)}%`}</td>
                <td className="px-3 py-2">≤ 5%</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${statusLabel(passDup).pill}`}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {statusLabel(passDup).label === 'Pass' ? 'Accept' : statusLabel(passDup).label}
                  </span>
                </td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">k-Anonymity (k ≥ 5)</td>
                <td className="px-3 py-2">{cell(p.k_anon)}</td>
                <td className="px-3 py-2">k ≥ 5</td>
                <td className="px-3 py-2 text-neutral-500">N/A</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Differential Privacy ε</td>
                <td className="px-3 py-2">{cell(p.dp_epsilon)}</td>
                <td className="px-3 py-2">≤ 2.0</td>
                <td className="px-3 py-2 text-neutral-500">N/A</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm token-muted">Interpretation: Lower privacy risk metrics (e.g., MIA AUC, linkage risk) indicate better protection against re-identification. Thresholds reflect acceptable levels for release.</p>
      </section>

      <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--ges-border)' }}>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><span>📊</span> Utility Assessment</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-900 text-white">
                <th className="text-left px-3 py-2 border-b border-neutral-700">Metric</th>
                <th className="text-left px-3 py-2 border-b border-neutral-700">Value</th>
                <th className="text-left px-3 py-2 border-b border-neutral-700">Target</th>
                <th className="text-left px-3 py-2 border-b border-neutral-700">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">KS mean (lower is better)</td>
                <td className="px-3 py-2">{cell(u.ks_mean)}</td>
                <td className="px-3 py-2">≤ 0.10</td>
                <td className="px-3 py-2">
                  {(() => { const g = gradeGoodStrong(passKS, ksStrength); return <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${g.pill}`}><span className="w-2 h-2 rounded-full bg-current"></span>{g.label}</span> })()}
                </td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Correlation Δ (lower is better)</td>
                <td className="px-3 py-2">{cell(u.corr_delta)}</td>
                <td className="px-3 py-2">≤ 0.10</td>
                <td className="px-3 py-2">
                  {(() => { const g = gradeGoodStrong(passCorr, corrStrength); return <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${g.pill}`}><span className="w-2 h-2 rounded-full bg-current"></span>{g.label}</span> })()}
                </td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">AUROC (synthetic)</td>
                <td className="px-3 py-2">{cell(u.auroc)}</td>
                <td className="px-3 py-2">≥ 0.80</td>
                <td className="px-3 py-2">
                  {(() => { const g = gradeGoodStrong(passAUROC, aurocStrength); return <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${g.pill}`}><span className="w-2 h-2 rounded-full bg-current"></span>{g.label}</span> })()}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2">Survival C-Index (synthetic)</td>
                <td className="px-3 py-2">{cell(u.c_index)}</td>
                <td className="px-3 py-2">≥ 0.70</td>
                <td className="px-3 py-2">
                  {(() => { const g = gradeGoodStrong(passCIdx, cidxStrength); return <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${g.pill}`}><span className="w-2 h-2 rounded-full bg-current"></span>{g.label}</span> })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm token-muted">Interpretation: Utility metrics indicate how well the synthetic data preserves important properties of the real data. Values meeting or exceeding targets suggest strong fidelity.</p>
      </section>

      {/* Overall Evaluation & Recommendation */}
      <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--ges-border)' }}>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Overall Evaluation</h3>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${overallOK ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {overallOK ? 'Meets privacy and utility targets' : 'Review metrics before release'}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Recommendation</h3>
            <p className="text-sm token-muted">
              {overallOK
                ? 'Proceed to export and share with stakeholders. Consider generating a PDF report for records.'
                : 'Address flagged metrics (e.g., tighten privacy or improve fidelity) and re-run synthesis.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
