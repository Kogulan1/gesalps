export default function ReportPreview() {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-6xl px-4 grid sm:grid-cols-3 gap-6">
        {[
          { label: "AUROC", value: "0.87" },
          { label: "C-index", value: "0.74" },
          { label: "MIA AUC", value: "0.56" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border p-6 text-center" style={{borderColor:'var(--ges-border)'}}>
            <div className="text-xs uppercase text-neutral-500 dark:text-neutral-400">
              {m.label}
            </div>
            <div className="text-3xl font-semibold mt-1">{m.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

