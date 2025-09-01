"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: string; title?: string; description?: string; variant?: "success" | "error" | "default" };

type ToastContextType = {
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToasterProvider");
  return ctx;
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...t }]);
    const ttl = t.variant === "error" ? 7000 : 4000;
    setTimeout(() => dismiss(id), ttl);
  }, [dismiss]);
  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-[90vw] md:max-w-md rounded-xl px-4 py-3 shadow-lg backdrop-blur bg-white/95 dark:bg-neutral-900/95 border break-words whitespace-pre-wrap ${
              t.variant === "error"
                ? "border-red-300 text-red-800 dark:text-red-300"
                : t.variant === "success"
                ? "border-emerald-300 text-emerald-800 dark:text-emerald-300"
                : "border-neutral-300 text-neutral-900 dark:text-neutral-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                {t.title && <div className="font-semibold leading-snug">{t.title}</div>}
                {t.description && <div className="text-sm opacity-90 leading-snug">{t.description}</div>}
              </div>
              <button
                aria-label="Dismiss"
                className="text-sm opacity-60 hover:opacity-100"
                onClick={() => dismiss(t.id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
