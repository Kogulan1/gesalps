"use client";
import { copy } from "./copy";

export default function FAQ() {
  return (
    <section id="faq" className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-xl font-semibold">Frequently asked questions</h2>
        <div className="mt-4 rounded-2xl border" style={{borderColor:'var(--ges-border)'}}>
          {copy.faq.map(({ q, a }, idx) => (
            <details key={idx} className="group border-b last:border-none" style={{borderColor:'var(--ges-border)'}}>
              <summary className="px-4 py-3 cursor-pointer list-none font-medium text-left marker:hidden flex items-center justify-between">
                <span>{q}</span>
                <span className="transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="px-4 pb-4 text-sm text-neutral-600 dark:text-neutral-300">
                {a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

