export const metadata = { title: "Roadmap" };

export default function RoadmapDocs() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <h1 className="text-2xl">Public Roadmap</h1>
      <div>
        <h2 className="text-lg">Near term</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>DP-SGD trainers (CTGAN/TVAE) or DP-capable backends</li>
          <li>Auto-benchmark & auto-select across GC/CTGAN/TVAE</li>
          <li>Agent explanations & reproducibility bundle</li>
        </ul>
      </div>
      <div>
        <h2 className="text-lg">Next</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Diffusion & Transformer tabular generators</li>
          <li>Fairness metrics & mitigation (minority coverage)</li>
          <li>Time-series & survival modeling enhancements</li>
        </ul>
      </div>
      <div>
        <h2 className="text-lg">Later</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Federated synthesis (hospital-local training)</li>
          <li>Multimodal tabular+text+imaging</li>
          <li>Regulatory templates (FDA/EMA submissions)</li>
        </ul>
      </div>
    </div>
  );
}

