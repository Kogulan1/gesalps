export const metadata = { title: "Pricing & Limits" };

export default function PricingLimits() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl">Pricing & Limits</h1>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>Research (Free):</strong> 1 project, ≤ 5k rows, GC/CTGAN, basic report.</li>
        <li><strong>Starter ($199/mo):</strong> 5 projects, GC/CTGAN/TVAE, full metrics, email support.</li>
        <li><strong>Pharma ($2,000/mo):</strong> Unlimited projects, diffusion+DP (when enabled), full privacy suite, SSO & on-prem option.</li>
      </ul>
    </div>
  );
}

