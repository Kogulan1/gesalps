"use client";
import React from "react";

export function csvToRows(csv: string): string[][] {
  return csv.trim().split(/\r?\n/).map((line) => line.split(","));
}

export default function PreviewModal({ open, onClose, csv }: { open: boolean; onClose: () => void; csv: string }) {
  if (!open) return null;
  const rows = csvToRows(csv);
  const [head, ...body] = rows;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-4xl p-6 border" style={{ borderColor: 'var(--ges-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Preview (first 20 rows)</h3>
          <button onClick={onClose} className="px-3 py-1 rounded-md border" style={{ borderColor: 'var(--ges-border)' }}>Close</button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead>
              <tr>{head?.map((h, i) => (<th key={i} className="text-left border-b px-2 py-2" style={{ borderColor: 'var(--ges-border)' }}>{h}</th>))}</tr>
            </thead>
            <tbody>
              {body.map((r, i) => (
                <tr key={i} className="border-b" style={{ borderColor: 'var(--ges-border)' }}>
                  {r.map((c, j) => (<td key={j} className="px-2 py-2">{c}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

