"use client";
import React from "react";

type ProgressProps = {
  value?: number; // 0..100
  indeterminate?: boolean;
  label?: string;
  className?: string;
  indicatorColor?: string;
};

export function Progress({ value = 0, indeterminate, label, className, indicatorColor }: ProgressProps) {
  // Use explicit hex for light gray track to avoid global overrides
  const cl = `w-full bg-[#F3F4F6] dark:bg-neutral-800 rounded-full h-2 overflow-hidden ${className||""}`;
  const pct = Math.max(0, Math.min(100, value));
  
  // Determine styles based on whether a custom color is provided
  const indicatorStyle: React.CSSProperties = {
    width: `${pct}%`,
    backgroundColor: indicatorColor || undefined,
    backgroundImage: indicatorColor ? 'none' : 'linear-gradient(to right, #60A5FA, #3B82F6)',
    boxShadow: indicatorColor ? 'none' : '0 0 8px rgba(59,130,246,0.3)'
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <div className="text-xs token-muted">{label}</div>}
      <div className={cl} role="progressbar" aria-valuenow={indeterminate? undefined : pct} aria-valuemin={0} aria-valuemax={100}>
        {indeterminate ? (
          <div className="h-full w-1/3 bg-blue-500 animate-[indeterminate_1.2s_infinite] rounded-full" style={{backgroundImage:'linear-gradient(to right, #60A5FA, #3B82F6)', boxShadow:'0 0 8px rgba(59,130,246,0.3)'}} />
        ) : (
          <div 
            className={`h-full rounded-full transition-all ${!indicatorColor ? "bg-blue-500" : ""}`} 
            style={indicatorStyle} 
          />
        )}
      </div>
      <style jsx>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(150%); }
        }
      `}</style>
    </div>
  );
}

