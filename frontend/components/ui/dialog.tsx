"use client";
import * as React from "react";

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      {/* Container for centering, but actual card styling is in DialogContent */}
      <div className="relative z-50 w-full flex justify-center pointer-events-none">
        {/* We use pointer-events-auto on Content to re-enable interaction */}
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className || 'mb-4'}`}>{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold leading-none tracking-tight">{children}</h3>;
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  // Styles moved here: white bg, shadow, border, rounded
  return (
    <div className={`pointer-events-auto relative w-full border border-gray-200 bg-white shadow-lg duration-200 sm:rounded-lg ${className || 'max-w-lg'}`}>
      {children}
    </div>
  );
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600">{children}</p>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>;
}

