"use client";
export default function MetricCard({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-2xl border p-4 bg-white" style={{borderColor:'var(--ges-border)'}}>
      <div className="text-xs token-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value ?? '—'}</div>
    </div>
  );
}

