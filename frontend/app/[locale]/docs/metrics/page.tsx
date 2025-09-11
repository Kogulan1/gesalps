export const metadata = { title: "Metrics" };

export default function Metrics() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl">Metrics</h1>
      <h2 className="text-lg mt-4">Utility</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>KS mean (↓):</strong> Distribution distance across numeric columns.</li>
        <li><strong>Correlation Δ (↓):</strong> L1 difference of correlation matrices.</li>
        <li><strong>Task metrics (if labels present):</strong> AUROC, C-Index.</li>
      </ul>
      <h2 className="text-lg mt-4">Privacy</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>MIA AUC (↓):</strong> Membership inference classifier separability proxy.</li>
        <li><strong>Duplicate rate (↓):</strong> Exact row matches.</li>
        <li><strong>DP budget (ε, δ):</strong> When DP trainers are active.</li>
        <li><strong>Record linkage risk (↓):</strong> Linkage estimate (if enabled).</li>
      </ul>
      <div className="mt-4 text-sm">Target thresholds (defaults): <code>KS mean ≤ 0.10</code>, <code>Correlation Δ ≤ 0.10</code>, <code>MIA AUC ≤ 0.60</code>.</div>
    </div>
  );
}

