import * as React from "react";

type Tone = "good" | "warn" | "risk" | "neutral";

const toneColor: Record<Tone, string> = {
  good: "#10B981",
  warn: "#F59E0B",
  risk: "#EF4444",
  neutral: "#64748B",
};

export function Metric({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: Tone }) {
  return (
    <div
      className="rounded-2xl border p-4 shadow-sm bg-white"
      style={{ borderColor: "var(--ges-border)", borderLeftWidth: 4, borderLeftColor: toneColor[tone] }}
    >
      <div className="text-xs token-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1" style={{ color: "var(--ges-accent)" }}>{value}</div>
    </div>
  );
}

