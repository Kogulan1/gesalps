"use client";
import React from "react";

type Report = {
  privacy?: { 
    mia_auc?: number | null; 
    dup_rate?: number | null; 
    k_anonymization?: number | null;
    k_anon?: number | null; 
    identifiability_score?: number | null;
    dp_epsilon?: number | null;
    dp_delta?: number | null;
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
  };
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

function cell(v: number | string | null | undefined, digits = 3) {
  if (v === null || v === undefined) return "N/A";
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return "N/A";
    return v.toFixed(digits);
  }
  return String(v);
}

export default function ReportView({ report }: { report: Report }) {
  const p = report?.privacy || {};
  const u = report?.utility || {};
  const f = report?.fairness || {};
  const compliance = report?.compliance;
  const meta = report?.meta || {};

  // Threshold logic
  const passMIA = typeof p.mia_auc === "number" ? p.mia_auc <= 0.60 : null;
  const dupPct = typeof p.dup_rate === "number" ? p.dup_rate * 100 : null;
  const passDup = typeof dupPct === "number" ? dupPct <= 5.0 : null;
  const kAnon = p.k_anonymization ?? p.k_anon ?? null;
  const passKAnon = typeof kAnon === "number" ? kAnon >= 5 : null;
  const passIdentifiability = typeof p.identifiability_score === "number" ? p.identifiability_score <= 0.10 : null;
  const passDPEpsilon = typeof p.dp_epsilon === "number" ? p.dp_epsilon <= 1.0 : null;

  const passKS = typeof u.ks_mean === "number" ? u.ks_mean <= 0.10 : null;
  const passCorr = typeof u.corr_delta === "number" ? u.corr_delta <= 0.10 : null;
  const passJensenShannon = typeof u.jensenshannon_dist === "number" ? u.jensenshannon_dist <= 0.15 : null;
  const passAUROC = typeof u.auroc === "number" ? u.auroc >= 0.80 : null;
  const passCIdx = typeof u.c_index === "number" ? u.c_index >= 0.70 : null;
  
  // Strength heuristics (tune as desired)
  const ksStrength: 'strong' | 'good' | null = typeof u.ks_mean === 'number' ? (u.ks_mean <= 0.08 ? 'strong' : (u.ks_mean <= 0.10 ? 'good' : null)) : null;
  const corrStrength: 'strong' | 'good' | null = typeof u.corr_delta === 'number' ? (u.corr_delta <= 0.08 ? 'strong' : (u.corr_delta <= 0.10 ? 'good' : null)) : null;
  const aurocStrength: 'strong' | 'good' | null = typeof u.auroc === 'number' ? (u.auroc >= 0.85 ? 'strong' : (u.auroc >= 0.80 ? 'good' : null)) : null;
  const cidxStrength: 'strong' | 'good' | null = typeof u.c_index === 'number' ? (u.c_index >= 0.75 ? 'strong' : (u.c_index >= 0.70 ? 'good' : null)) : null;

  // Fairness metrics
  const passRareCoverage = typeof f.rare_coverage === "number" ? f.rare_coverage >= 0.70 : null;
  const passFreqSkew = typeof f.freq_skew === "number" ? f.freq_skew <= 0.30 : null;

  // Overall evaluation - use compliance result if available, otherwise calculate
  const privacyOK = compliance?.privacy_passed ?? ((passMIA ?? true) && (passDup ?? true));
  const utilityOK = compliance?.utility_passed ?? ((passKS ?? true) && (passCorr ?? true));
  const fairnessOK = compliance?.fairness_passed ?? ((passRareCoverage ?? true) && (passFreqSkew ?? true));
  const overallOK = compliance?.passed ?? (privacyOK && utilityOK);

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
              <tr className="bg-neutral-50 text-neutral-800">
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Test</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Result</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Threshold</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Membership Inference AUC</td>
                <td className="px-3 py-2">{cell(p.mia_auc, 3)}</td>
                <td className="px-3 py-2">≤ 0.60</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${statusLabel(passMIA).pill}`}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {statusLabel(passMIA).label}
                  </span>
                </td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Record Linkage Risk (%)</td>
                <td className="px-3 py-2">{dupPct === null ? 'N/A' : `${dupPct.toFixed(1)}%`}</td>
                <td className="px-3 py-2">≤ 5%</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${statusLabel(passDup).pill}`}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {statusLabel(passDup).label}
                  </span>
                </td>
              </tr>
              {kAnon !== null && (
                <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                  <td className="px-3 py-2">k-Anonymity</td>
                  <td className="px-3 py-2">{cell(kAnon, 0)}</td>
                  <td className="px-3 py-2">≥ 5</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${statusLabel(passKAnon).pill}`}>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {statusLabel(passKAnon).label}
                    </span>
                  </td>
                </tr>
              )}
              {p.identifiability_score !== null && p.identifiability_score !== undefined && (
                <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                  <td className="px-3 py-2">Identifiability Score</td>
                  <td className="px-3 py-2">{cell(p.identifiability_score, 3)}</td>
                  <td className="px-3 py-2">≤ 0.10</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${statusLabel(passIdentifiability).pill}`}>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {statusLabel(passIdentifiability).label}
                    </span>
                  </td>
                </tr>
              )}
              {p.dp_epsilon !== null && p.dp_epsilon !== undefined && (
                <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                  <td className="px-3 py-2">Differential Privacy ε</td>
                  <td className="px-3 py-2">{cell(p.dp_epsilon, 2)}</td>
                  <td className="px-3 py-2">≤ 1.0</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${statusLabel(passDPEpsilon).pill}`}>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {statusLabel(passDPEpsilon).label}
                    </span>
                  </td>
                </tr>
              )}
              {p.dp_effective !== null && p.dp_effective !== undefined && (
                <tr>
                  <td className="px-3 py-2">DP Applied</td>
                  <td className="px-3 py-2">{p.dp_effective ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">Recommended</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${p.dp_effective ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {p.dp_effective ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              )}
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
              <tr className="bg-neutral-50 text-neutral-800">
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Metric</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Value</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Target</th>
                <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">KS mean (lower is better)</td>
                <td className="px-3 py-2">{cell(u.ks_mean, 3)}</td>
                <td className="px-3 py-2">≤ 0.10</td>
                <td className="px-3 py-2">
                  {(() => { const g = gradeGoodStrong(passKS, ksStrength); return <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${g.pill}`}><span className="w-2 h-2 rounded-full bg-current"></span>{g.label}</span> })()}
                </td>
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                <td className="px-3 py-2">Correlation Δ (lower is better)</td>
                <td className="px-3 py-2">{cell(u.corr_delta, 3)}</td>
                <td className="px-3 py-2">≤ 0.10</td>
                <td className="px-3 py-2">
                  {(() => { const g = gradeGoodStrong(passCorr, corrStrength); return <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${g.pill}`}><span className="w-2 h-2 rounded-full bg-current"></span>{g.label}</span> })()}
                </td>
              </tr>
              {u.jensenshannon_dist !== null && u.jensenshannon_dist !== undefined && (
                <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                  <td className="px-3 py-2">Jensen-Shannon Divergence</td>
                  <td className="px-3 py-2">{cell(u.jensenshannon_dist, 3)}</td>
                  <td className="px-3 py-2">≤ 0.15</td>
                  <td className="px-3 py-2">
                    {(() => { 
                      const jsStrength: 'strong' | 'good' | null = u.jensenshannon_dist! <= 0.12 ? 'strong' : (u.jensenshannon_dist! <= 0.15 ? 'good' : null);
                      const g = gradeGoodStrong(passJensenShannon, jsStrength); 
                      return <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${g.pill}`}><span className="w-2 h-2 rounded-full bg-current"></span>{g.label}</span> 
                    })()}
                  </td>
                </tr>
              )}
              {u.auroc !== null && u.auroc !== undefined && (
                <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                  <td className="px-3 py-2">AUROC (higher is better)</td>
                  <td className="px-3 py-2">{cell(u.auroc, 3)}</td>
                  <td className="px-3 py-2">≥ 0.80</td>
                  <td className="px-3 py-2">
                    {(() => { const g = gradeGoodStrong(passAUROC, aurocStrength); return <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${g.pill}`}><span className="w-2 h-2 rounded-full bg-current"></span>{g.label}</span> })()}
                  </td>
                </tr>
              )}
              {u.c_index !== null && u.c_index !== undefined && (
                <tr>
                  <td className="px-3 py-2">C-Index (higher is better)</td>
                  <td className="px-3 py-2">{cell(u.c_index, 3)}</td>
                  <td className="px-3 py-2">≥ 0.70</td>
                  <td className="px-3 py-2">
                    {(() => { const g = gradeGoodStrong(passCIdx, cidxStrength); return <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${g.pill}`}><span className="w-2 h-2 rounded-full bg-current"></span>{g.label}</span> })()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm token-muted">Interpretation: Utility metrics indicate how well the synthetic data preserves important properties of the real data. Values meeting or exceeding targets suggest strong fidelity.</p>
      </section>

      {/* Fairness Assessment */}
      {(f.rare_coverage !== null || f.freq_skew !== null) && (
        <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--ges-border)' }}>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><span>⚖️</span> Fairness Assessment</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-800">
                  <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Metric</th>
                  <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Value</th>
                  <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Target</th>
                  <th className="text-left px-3 py-2 border-b" style={{ borderColor: 'var(--ges-border)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {f.rare_coverage !== null && f.rare_coverage !== undefined && (
                  <tr className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                    <td className="px-3 py-2">Rare Coverage</td>
                    <td className="px-3 py-2">{(f.rare_coverage * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2">≥ 70%</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${statusLabel(passRareCoverage).pill}`}>
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {statusLabel(passRareCoverage).label}
                      </span>
                    </td>
                  </tr>
                )}
                {f.freq_skew !== null && f.freq_skew !== undefined && (
                  <tr>
                    <td className="px-3 py-2">Frequency Skew</td>
                    <td className="px-3 py-2">{cell(f.freq_skew, 3)}</td>
                    <td className="px-3 py-2">≤ 0.30</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${statusLabel(passFreqSkew).pill}`}>
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {statusLabel(passFreqSkew).label}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm token-muted">Interpretation: Fairness metrics ensure synthetic data represents rare categories and maintains balanced distributions across all groups.</p>
        </section>
      )}

      {/* Compliance Status */}
      {compliance && (
        <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--ges-border)' }}>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><span>✅</span> Compliance Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Compliance:</span>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                  compliance.passed 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {compliance.passed ? 'PASSED' : 'FAILED'}
                </span>
                {compliance.score !== null && compliance.score !== undefined && (
                  <span className="text-sm text-gray-600">
                    Score: {(compliance.score * 100).toFixed(1)}%
                  </span>
                )}
                {compliance.level && (
                  <span className="text-xs text-gray-500">
                    Level: {compliance.level.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2 border-t" style={{ borderColor: 'var(--ges-border)' }}>
              <div>
                <div className="text-xs text-gray-600 mb-1">Privacy</div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                  compliance.privacy_passed 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {compliance.privacy_passed ? '✓' : '✗'} {compliance.privacy_passed ? 'Pass' : 'Fail'}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Utility</div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                  compliance.utility_passed 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {compliance.utility_passed ? '✓' : '✗'} {compliance.utility_passed ? 'Pass' : 'Fail'}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Fairness</div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                  compliance.fairness_passed 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {compliance.fairness_passed ? '✓' : '—'} {compliance.fairness_passed ? 'Pass' : 'N/A'}
                </span>
              </div>
            </div>
            {compliance.violations && compliance.violations.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-medium text-red-800 mb-2">
                  Violations ({compliance.violations.length}):
                </div>
                <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                  {compliance.violations.map((v, idx) => (
                    <li key={idx}>{v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Overall Evaluation & Recommendation */}
      <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--ges-border)' }}>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Overall Evaluation</h3>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${overallOK ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {overallOK ? 'Meets privacy and utility targets' : 'Review metrics before release'}
            </div>
            {meta.n_real && meta.n_synth && (
              <div className="mt-3 text-xs text-gray-600">
                Generated {meta.n_synth.toLocaleString()} synthetic rows from {meta.n_real.toLocaleString()} real rows
                {meta.model && ` using ${meta.model.toUpperCase()}`}
              </div>
            )}
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
