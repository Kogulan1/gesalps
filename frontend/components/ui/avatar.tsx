import * as React from "react";

export function Avatar({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

