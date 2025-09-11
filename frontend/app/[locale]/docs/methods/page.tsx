export const metadata = { title: "Methods" };

export default function Methods() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl">Methods</h1>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>Gaussian Copula (GC):</strong> Fast, robust baseline for tabular data.</li>
        <li><strong>CTGAN:</strong> GAN for mixed types and skewed categoricals.</li>
        <li><strong>TVAE:</strong> Variational autoencoder variant for tabular.</li>
        <li><strong>Diffusion (TabDDPM)</strong> & <strong>Tabular Transformers</strong> (roadmap).</li>
        <li><strong>Differential Privacy (DP):</strong> DP-SGD trainers (planned) and DP-capable backends. Current builds support DP flags and audit reporting; strict DP training integrates when backends are enabled.</li>
      </ul>
    </div>
  );
}

