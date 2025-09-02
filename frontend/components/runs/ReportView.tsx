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

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--ges-border)' }}>
        <h3 className="text-lg font-semibold mb-3">Privacy Assessment</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800">
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Test</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Result</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Threshold</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Membership Inference AUC</td>
                <td className="px-3 py-2">{cell(p.mia_auc)}</td>
                <td className="px-3 py-2">≤ 0.60</td>
                <td className={`px-3 py-2 ${statusLabel(passMIA).className}`}>{statusLabel(passMIA).label}</td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Record Linkage Risk (%)</td>
                <td className="px-3 py-2">{dupPct === null ? '—' : `${dupPct.toFixed(1)}%`}</td>
                <td className="px-3 py-2">≤ 5%</td>
                <td className={`px-3 py-2 ${statusLabel(passDup).className}`}>{statusLabel(passDup).label}</td>
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
      </section>

      <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--ges-border)' }}>
        <h3 className="text-lg font-semibold mb-3">Utility Assessment</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800">
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Metric</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Value</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Target</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">KS mean (lower is better)</td>
                <td className="px-3 py-2">{cell(u.ks_mean)}</td>
                <td className="px-3 py-2">≤ 0.10</td>
                <td className={`px-3 py-2 ${statusLabel(passKS).className}`}>{statusLabel(passKS).label}</td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Correlation Δ (lower is better)</td>
                <td className="px-3 py-2">{cell(u.corr_delta)}</td>
                <td className="px-3 py-2">≤ 0.10</td>
                <td className={`px-3 py-2 ${statusLabel(passCorr).className}`}>{statusLabel(passCorr).label}</td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">AUROC (synthetic)</td>
                <td className="px-3 py-2">{cell(u.auroc)}</td>
                <td className="px-3 py-2">≥ 0.80</td>
                <td className={`px-3 py-2 ${statusLabel(passAUROC).className}`}>{statusLabel(passAUROC).label}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Survival C-Index (synthetic)</td>
                <td className="px-3 py-2">{cell(u.c_index)}</td>
                <td className="px-3 py-2">≥ 0.70</td>
                <td className={`px-3 py-2 ${statusLabel(passCIdx).className}`}>{statusLabel(passCIdx).label}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

