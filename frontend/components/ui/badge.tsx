import * as React from "react";

export function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${className}`}
      style={{
        background: 'var(--ges-badge-bg)',
        color: 'var(--ges-badge-fg)',
        borderColor: 'var(--ges-border)'
      }}
      {...props}
    />
  );
}
