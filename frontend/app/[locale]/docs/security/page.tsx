export const metadata = { title: "Security & Privacy" };

export default function Security() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl">Security & Privacy</h1>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>Hosting:</strong> Local Docker for dev; cloud options available (EU/CH).</li>
        <li><strong>Storage:</strong> Private buckets; signed URLs; RLS on datasets/runs.</li>
        <li><strong>Audit:</strong> Exportable PDF with thresholds, metrics, and metadata.</li>
        <li><strong>DP:</strong> Flags supported in config; strict DP requires DP-capable backend (roadmap).</li>
      </ul>
    </div>
  );
}

