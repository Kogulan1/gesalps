"use client";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";

type Metrics = {
  privacy?: { mia_auc?: number | null; dup_rate?: number | null; k_anon?: number | null; dp_epsilon?: number | null };
  utility?: { ks_mean?: number | null; corr_delta?: number | null; auroc?: number | null; c_index?: number | null };
} | null;

type Grade = "strong" | "good" | "check" | "na";

function gradeFor(value: number | null | undefined, kind: "ks" | "corr" | "mia" | "dup" | "k" | "eps" | "auroc" | "cidx"): Grade {
  if (value === null || value === undefined || Number.isNaN(value)) return "na";
  if (kind === "ks") {
    if (value <= 0.08) return "strong";
    if (value <= 0.10) return "good";
    return "check"; // higher is worse
  }
  if (kind === "corr") {
    if (value <= 0.08) return "strong";
    if (value <= 0.10) return "good";
    return "check"; // higher is worse
  }
  if (kind === "mia") { // lower is better
    if (value <= 0.55) return "strong";
    if (value <= 0.60) return "good";
    return "check";
  }
  if (kind === "dup") { // dup_rate in [0,1], lower is better, target <=5%
    const pct = value * 100;
    if (pct <= 3) return "strong";
    if (pct <= 5) return "good";
    return "check";
  }
  if (kind === "k") { // k-anon higher is better
    if (value >= 10) return "strong";
    if (value >= 5) return "good";
    return "check";
  }
  if (kind === "eps") { // dp epsilon lower is better
    if (value <= 1.0) return "strong";
    if (value <= 2.0) return "good";
    return "check";
  }
  if (kind === "auroc") { // higher is better
    if (value >= 0.85) return "strong";
    if (value >= 0.80) return "good";
    return "check";
  }
  if (kind === "cidx") { // higher is better
    if (value >= 0.75) return "strong";
    if (value >= 0.70) return "good";
    return "check";
  }
  return "na";
}

function barStyle(grade: Grade): { height: number; className: string } {
  switch (grade) {
    case "strong":
      return { height: 28, className: "bg-emerald-600" };
    case "good":
      return { height: 22, className: "bg-emerald-500" };
    case "check":
      return { height: 16, className: "bg-amber-500" };
    case "na":
    default:
      return { height: 10, className: "bg-neutral-300" };
  }
}

export default function RunMetricsCell({ runId, status }: { runId: string; status?: string }) {
  const [metrics, setMetrics] = useState<Metrics>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await authedFetch(`/v1/runs/${runId}/metrics`);
        if (!res.ok) return;
        const js = await res.json();
        if (!cancelled) setMetrics(js);
      } catch {
        // ignore
      }
    }
    // Try to load immediately; re-run when status becomes succeeded
    load();
    // If running, poll once after short delay to catch recent completion
    if (status && (status === "running" || status === "queued")) {
      const t = setTimeout(load, 2000);
      return () => { cancelled = true; clearTimeout(t); };
    }
    return () => { cancelled = true; };
  }, [runId, status]);

  const ks = metrics?.utility?.ks_mean ?? null;
  const corr = metrics?.utility?.corr_delta ?? null;
  const auroc = metrics?.utility?.auroc ?? null;
  const cidx = metrics?.utility?.c_index ?? null;
  const mia = metrics?.privacy?.mia_auc ?? null;
  const dup = metrics?.privacy?.dup_rate ?? null;
  const k = metrics?.privacy?.k_anon ?? null;
  const eps = metrics?.privacy?.dp_epsilon ?? null;

  const privacyBars = [
    { key: "mia", value: mia, grade: gradeFor(mia as any, "mia"), label: "MIA AUC" },
    { key: "dup", value: dup, grade: gradeFor(dup as any, "dup"), label: "Linkage %" },
    { key: "k", value: k, grade: gradeFor(k as any, "k"), label: "k-Anon" },
    { key: "eps", value: eps, grade: gradeFor(eps as any, "eps"), label: "ε" },
  ];
  const utilityBars = [
    { key: "ks", value: ks, grade: gradeFor(ks as any, "ks"), label: "KS mean" },
    { key: "corr", value: corr, grade: gradeFor(corr as any, "corr"), label: "Corr Δ" },
    { key: "auroc", value: auroc, grade: gradeFor(auroc as any, "auroc"), label: "AUROC" },
    { key: "cidx", value: cidx, grade: gradeFor(cidx as any, "cidx"), label: "C-Index" },
  ];

  function renderBars(arr: typeof privacyBars) {
    return arr.map(b => {
      const s = barStyle(b.grade);
      let valTxt: string;
      if (b.value === null || b.value === undefined || Number.isNaN(b.value as any)) {
        valTxt = 'N/A';
      } else if (b.key === 'dup') {
        valTxt = `${(((b.value as number) || 0) * 100).toFixed(1)}%`;
      } else if (typeof b.value === 'number') {
        valTxt = (b.value as number).toFixed(3);
      } else {
        valTxt = String(b.value);
      }
      const title = `${b.label}: ${valTxt}`;
      return (
        <div key={b.key} className="relative overflow-hidden rounded-sm bg-neutral-200" title={title} style={{ height: 32, width: 3 }}>
          <div className={`${s.className} absolute bottom-0 left-0 right-0`} style={{ height: s.height }} />
        </div>
      );
    });
  }

  return (
    <div className="h-9 flex items-end gap-2">
      <div className="flex items-end gap-1">
        <div className="h-8 flex flex-col justify-start" title="Privacy metrics">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-neutral-500">
            <path d="M6 10V8a6 6 0 1112 0v2" stroke="currentColor" strokeWidth="2"/>
            <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        {renderBars(privacyBars)}
      </div>
      <div className="flex items-end gap-1">
        <div className="h-8 flex flex-col justify-start" title="Utility metrics">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-neutral-500">
            <path d="M4 18l4-6 4 4 8-10" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        </div>
        {renderBars(utilityBars)}
      </div>
    </div>
  );
}
