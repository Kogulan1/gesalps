import { copy } from "./copy";

export default function HowItWorks() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-xl font-semibold">How it works</h2>
        <div className="mt-6 grid md:grid-cols-4 gap-6">
          {copy.how.map((s, i) => (
            <div key={s.title} className="rounded-2xl border p-5" style={{borderColor:'var(--ges-border)'}}>
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--ges-fg-muted)' }}>
                Step {i + 1}
              </div>
              <h3 className="mt-2 font-medium">{s.title}</h3>
              <p className="text-sm mt-2" style={{ color: 'var(--ges-fg-muted)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
