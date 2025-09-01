"use client";
import * as React from "react";

type Tab = { value: string; label: string };

export function Tabs({ tabs, value, onValueChange, className = "" }: { tabs: Tab[]; value: string; onValueChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => onValueChange(t.value)}
            className={`px-3 py-2 text-sm rounded-t-lg border-b-2 -mb-[1px] ${
              value === t.value
                ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TabsContent({ when, value, children }: { when: string; value: string; children: React.ReactNode }) {
  if (when !== value) return null;
  return <div className="pt-4">{children}</div>;
}

