export const metadata = { title: "Getting Started" };

export default function GettingStarted() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl">Getting Started</h1>
      <ol className="list-decimal pl-6 space-y-2 text-neutral-800 dark:text-neutral-200">
        <li><strong>Sign up</strong> and create a project.</li>
        <li><strong>Upload</strong> a single CSV table.</li>
        <li>Click <strong>Start run</strong>. By default, <strong>Agent Mode</strong> selects the model and tuning.</li>
        <li><strong>Evaluate</strong>: Inspect privacy & utility metrics.</li>
        <li><strong>Download</strong> synthetic CSV + <strong>Audit PDF</strong>.</li>
      </ol>
      <div className="text-sm text-neutral-600 dark:text-neutral-300">
        Tips: Many categoricals → CTGAN. Small/clean tables → Gaussian Copula. Survival/time-to-event → TVAE or survival-aware path (coming).
      </div>
    </div>
  );
}

