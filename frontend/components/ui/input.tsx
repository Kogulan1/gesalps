"use client";
import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`h-10 w-full rounded-2xl border bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--ges-primary)] ${className}`}
      style={{ borderColor: "var(--ges-border)", boxShadow: "none" }}
      {...props}
    />
  )
);
Input.displayName = "Input";
