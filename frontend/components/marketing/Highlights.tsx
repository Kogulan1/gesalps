import { copy } from "./copy";

export default function Highlights() {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {copy.highlights.map((h) => (
          <div key={h.title} className="rounded-2xl border p-5" style={{borderColor:'var(--ges-border)'}}>
            <h3 className="font-medium">{h.title}</h3>
            <p className="text-sm mt-2" style={{ color: 'var(--ges-fg-muted)' }}>{h.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
