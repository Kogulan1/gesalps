"use client";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  onSelect: (file: File) => Promise<any> | void;
  label?: string;
};

export default function FileDropzone({ onSelect, label = "Choose CSV" }: Props) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f?: File) => {
    if (!f || busy) return;
    try {
      setBusy(true);
      await Promise.resolve(onSelect(f));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ""; // reset for same-file reselect
    }
  }, [onSelect, busy]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    void handleFile(f);
  }, [handleFile]);

  return (
    <div
      className={`rounded-2xl border border-dashed p-6 text-center ${drag? 'bg-[var(--ges-panel)]' : ''}`}
      style={{ borderColor: 'var(--ges-border)' }}
      onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={onDrop}
    >
      <div className="token-muted mb-3">Drag & drop CSV here</div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e)=>{const f=e.target.files?.[0]; void handleFile(f);}}
        disabled={busy}
      />
      <Button
        variant="outline"
        className="btn-secondary rounded-2xl"
        onClick={()=>inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? "Uploading…" : label}
      </Button>
    </div>
  );
}
