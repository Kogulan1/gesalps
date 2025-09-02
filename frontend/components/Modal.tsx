"use client";
import React from "react";

export default function Modal({ open, title, onClose, children, maxW = "max-w-4xl" }: React.PropsWithChildren<{ open:boolean; title:string; onClose:()=>void; maxW?:string }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <div className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full ${maxW} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="px-3 py-1 rounded-md border" style={{borderColor:'var(--ges-border)'}}>Close</button>
        </div>
        <div className="overflow-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
}
