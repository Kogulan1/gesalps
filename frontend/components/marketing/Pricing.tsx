import Link from "next/link";
import { copy } from "./copy";

export default function Pricing() {
  return (
    <section id="pricing" className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-xl font-semibold">Pricing</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          {copy.pricing.tiers.map((t) => (
            <div key={t.name} className="rounded-2xl border p-6 flex flex-col" style={{borderColor:'var(--ges-border)'}}>
              <div className="font-medium">{t.name}</div>
              <div className="text-3xl font-semibold mt-1">{t.price}</div>
              <ul className="text-sm text-neutral-600 dark:text-neutral-300 mt-4 space-y-2">
                {t.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 rounded-xl border px-4 py-2 text-center">
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

