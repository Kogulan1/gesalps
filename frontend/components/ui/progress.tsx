"use client";
import React from "react";

type ProgressProps = {
  value?: number; // 0..100
  indeterminate?: boolean;
  label?: string;
  className?: string;
  indicatorClassName?: string;
};

export function Progress({ value = 0, indeterminate, label, className, indicatorClassName }: ProgressProps) {
  const cl = `w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden ${className||""}`;
  const pct = Math.max(0, Math.min(100, value));
  
  // Default blue gradient styles
  const defaultStyle = { 
    width: `${pct}%`, 
    backgroundImage: 'linear-gradient(to right, #60A5FA, #3B82F6)', 
    boxShadow: '0 0 8px rgba(59,130,246,0.3)'
  };
  
  // Custom style (only width) if indicatorClassName is provided
  const customStyle = { width: `${pct}%` };

  return (
    <div className="flex flex-col gap-2">
      {label && <div className="text-xs token-muted">{label}</div>}
      <div className={cl} role="progressbar" aria-valuenow={indeterminate? undefined : pct} aria-valuemin={0} aria-valuemax={100}>
        {indeterminate ? (
          <div className="h-full w-1/3 bg-blue-500 animate-[indeterminate_1.2s_infinite] rounded-full" style={{backgroundImage:'linear-gradient(to right, #60A5FA, #3B82F6)', boxShadow:'0 0 8px rgba(59,130,246,0.3)'}} />
        ) : (
          <div 
            className={`h-full rounded-full transition-all ${indicatorClassName || "bg-blue-500"}`} 
            style={indicatorClassName ? customStyle : defaultStyle} 
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

