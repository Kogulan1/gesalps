import { copy } from "./copy";

function Col({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border p-6" style={{borderColor:'var(--ges-border)'}}>
      <div className="text-sm font-medium">{title}</div>
      <ul className="text-sm text-neutral-600 dark:text-neutral-300 mt-3 space-y-2">
        {items.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Roadmap() {
  const r = copy.roadmap;
  return (
    <section id="roadmap" className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-xl font-semibold">Public roadmap</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <Col title="Near term" items={r.near} />
          <Col title="Next" items={r.next} />
          <Col title="Later" items={r.later} />
        </div>
      </div>
    </section>
  );
}

