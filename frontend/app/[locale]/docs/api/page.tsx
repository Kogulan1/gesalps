export const metadata = { title: "API" };

export default function APIPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl">API</h1>
      <h2 className="text-lg">Start a run</h2>
      <pre className="text-sm bg-white text-neutral-900 p-4 rounded-lg border overflow-auto" style={{borderColor:'var(--ges-border)'}}>
{`POST /v1/runs
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{
  "dataset_id": "UUID",
  "mode": "agent" | "auto" | "manual",
  "method": "gc|ctgan|tvae",        // optional in agent
  "config_json": {
    "sample_multiplier": 1.0,
    "max_synth_rows": 2000,
    "dp": { "epsilon": 5, "strict": false }
  }
}
`}
      </pre>
      <h2 className="text-lg">Artifacts</h2>
      <p>synthetic.csv, report.json, report.pdf (when enabled)</p>
    </div>
  );
}

