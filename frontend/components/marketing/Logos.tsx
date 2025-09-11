import { copy } from "./copy";

export default function Logos() {
  return (
    <section className="py-6">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center text-center text-sm text-neutral-500 dark:text-neutral-400">
          {copy.logos.map((name) => (
            <div key={name} className="py-2 border rounded-lg" style={{borderColor:'var(--ges-border)'}}>
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

