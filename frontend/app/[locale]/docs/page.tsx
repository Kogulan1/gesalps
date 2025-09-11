export const metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Docs</h1>
      <ol className="list-decimal pl-6 space-y-2 text-neutral-700 dark:text-neutral-300">
        <li>Upload a CSV dataset on the Dashboard.</li>
        <li>Click Start to launch an agent-assisted synthesis run.</li>
        <li>Watch privacy/utility metrics update in real time.</li>
        <li>Download the synthetic CSV and audit PDF once complete.</li>
      </ol>
    </div>
  );
}

