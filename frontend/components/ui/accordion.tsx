"use client";
import * as React from "react";

export function Accordion({ items }: { items: { id: string; question: string; answer: React.ReactNode }[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  return (
    <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {items.map((it) => {
        const open = openId === it.id;
        return (
          <div key={it.id}>
            <button
              aria-expanded={open}
              aria-controls={`acc-${it.id}`}
              className={`w-full text-left px-5 py-4 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors ${open ? 'bg-neutral-50 dark:bg-neutral-900' : 'bg-transparent'} text-inherit`}
              onClick={() => setOpenId((o) => (o === it.id ? null : it.id))}
            >
              {it.question}
            </button>
            {open && (
              <div id={`acc-${it.id}`} className="px-5 pb-4 text-neutral-600 dark:text-neutral-300">
                {it.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
