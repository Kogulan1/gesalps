"use client";
import * as React from "react";

export function Accordion({ items }: { items: { id: string; question: string; answer: React.ReactNode }[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  return (
    <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {items.map((it) => (
        <div key={it.id}>
          <button
            className="w-full text-left px-5 py-4 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
            onClick={() => setOpenId((o) => (o === it.id ? null : it.id))}
          >
            {it.question}
          </button>
          {openId === it.id && <div className="px-5 pb-4 text-neutral-600 dark:text-neutral-300">{it.answer}</div>}
        </div>
      ))}
    </div>
  );
}

