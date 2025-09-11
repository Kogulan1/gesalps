"use client";
import clsx from "clsx";

export type RunStep = "queued" | "running" | "synthesizing" | "evaluating" | "completed" | "failed";

const ORDER: RunStep[] = ["queued", "running", "synthesizing", "evaluating", "completed"];

const LABELS: Record<RunStep, string> = {
  queued: "Queued",
  running: "Running",
  synthesizing: "Synthesizing",
  evaluating: "Evaluating",
  completed: "Completed",
  failed: "Failed",
};

export default function RunStepper({ current }: { current: RunStep }) {
  const idx = Math.max(0, ORDER.indexOf(current as any));
  return (
    <div className="flex items-center gap-3">
      {ORDER.map((step, i) => {
        const active = i <= idx && current !== "failed";
        const isCurrent = i === idx;
        return (
          <div key={step} className="flex items-center">
            <div
              className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                active ? "bg-emerald-600 text-white" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600",
                isCurrent && !active ? "ring-2 ring-emerald-400" : ""
              )}
              title={LABELS[step]}
            >
              {i + 1}
            </div>
            {i < ORDER.length - 1 && (
              <div
                className={clsx(
                  "w-10 h-0.5 mx-2",
                  i < idx ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"
                )}
              />
            )}
          </div>
        );
      })}
      {current === "failed" && (
        <span className="ml-2 text-red-600 text-sm">Failed</span>
      )}
    </div>
  );
}

export function mapStatusToStep(opts: {
  status: string;           // runs.status
  hasMetrics: boolean;      // metrics row exists
  hasArtifacts: boolean;    // optional, not required
  inTraining?: boolean;     // optional signal if available
}): RunStep {
  const s = (opts.status || "").toLowerCase();
  if (s === "failed") return "failed";
  if (s === "queued") return "queued";
  if (s === "running") {
    // If we have an internal “phase”, prefer it
    if (opts.inTraining) return "synthesizing";
    // Otherwise assume training first
    return "running";
  }
  if (s === "succeeded") {
    // If metrics not yet fetched, show "evaluating" to give a sense of progress
    if (!opts.hasMetrics) return "evaluating";
    return "completed";
  }
  // default
  return "queued";
}

