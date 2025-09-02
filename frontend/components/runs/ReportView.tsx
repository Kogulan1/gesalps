"use client";
import React from "react";

type Report = {
  privacy?: { mia_auc?: number | null; dup_rate?: number | null; k_anon?: number | null; dp_epsilon?: number | null };
  utility?: { ks_mean?: number | null; corr_delta?: number | null; auroc?: number | null; c_index?: number | null };
};

function statusLabel(ok?: boolean | null) {
  if (ok === null || ok === undefined) return { label: "N/A", className: "text-neutral-500" };
  return ok ? { label: "Pass", className: "text-emerald-600" } : { label: "Check", className: "text-amber-600" };
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
                <td className={`px-3 py-2 ${statusLabel(passMIA).className}`}>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-current"></span>{statusLabel(passMIA).label}</span>
                </td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Record Linkage Risk (%)</td>
                <td className="px-3 py-2">{dupPct === null ? '—' : `${dupPct.toFixed(1)}%`}</td>
                <td className="px-3 py-2">≤ 5%</td>
                <td className={`px-3 py-2 ${statusLabel(passDup).className}`}>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-current"></span>{statusLabel(passDup).label}</span>
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
                <td className={`px-3 py-2 ${statusLabel(passKS).className}`}><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-current"></span>{statusLabel(passKS).label}</span></td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Correlation Δ (lower is better)</td>
                <td className="px-3 py-2">{cell(u.corr_delta)}</td>
                <td className="px-3 py-2">≤ 0.10</td>
                <td className={`px-3 py-2 ${statusLabel(passCorr).className}`}><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-current"></span>{statusLabel(passCorr).label}</span></td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">AUROC (synthetic)</td>
                <td className="px-3 py-2">{cell(u.auroc)}</td>
                <td className="px-3 py-2">≥ 0.80</td>
                <td className={`px-3 py-2 ${statusLabel(passAUROC).className}`}><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-current"></span>{statusLabel(passAUROC).label}</span></td>
              </tr>
              <tr>
                <td className="px-3 py-2">Survival C-Index (synthetic)</td>
                <td className="px-3 py-2">{cell(u.c_index)}</td>
                <td className="px-3 py-2">≥ 0.70</td>
                <td className={`px-3 py-2 ${statusLabel(passCIdx).className}`}><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-current"></span>{statusLabel(passCIdx).label}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm token-muted">Interpretation: Utility metrics indicate how well the synthetic data preserves important properties of the real data. Values meeting or exceeding targets suggest strong fidelity.</p>
      </section>
    </div>
  );
}
