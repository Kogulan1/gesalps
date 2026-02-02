"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "ghost" | "outline" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
          {
            "h-9 px-3 text-sm": size === "sm",
            "h-10 px-4 text-sm": size === "md", 
            "h-12 px-6 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          {
            "bg-[#E0342C] text-white hover:bg-[#E0342C]/90": variant === "default",
            "bg-gray-100 text-gray-900 hover:bg-gray-200": variant === "secondary",
            "bg-transparent hover:bg-gray-100": variant === "ghost",
            "border border-gray-300 bg-transparent hover:bg-gray-100": variant === "outline",
            "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
