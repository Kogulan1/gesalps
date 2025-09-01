"use client";
import * as React from "react";

type Variant = "default" | "secondary" | "ghost" | "outline" | "destructive";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "md", asChild, children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
    const sizes: Record<Size, string> = {
      sm: "h-9 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };
    const variants: Record<Variant, string> = {
      default: "text-white",
      secondary: "btn-secondary",
      ghost: "bg-transparent hover:bg-[var(--ges-panel)]",
      outline: "btn-secondary",
      destructive: "bg-red-600 text-white hover:bg-red-700",
    };
    const primary = variant === "default" ? "btn-primary" : "";
    const classes = `${base} ${sizes[size]} ${variants[variant]} ${primary} ${className}`;
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as any, {
        className: `${classes} ${(children as any).props?.className ?? ""}`,
      });
    }
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
