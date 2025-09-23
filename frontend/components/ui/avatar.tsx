import * as React from "react";

export function Avatar({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AvatarFallback({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full text-sm font-medium ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

