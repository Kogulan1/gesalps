"use client";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function FileDropzone({ onSelect, label = "Choose CSV" }: { onSelect: (file: File) => void; label?: string }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false);
    const f = e.dataTransfer.files?.[0]; if (f) onSelect(f);
  }, [onSelect]);
  return (
    <div
      className={`rounded-2xl border border-dashed p-6 text-center ${drag? 'bg-[var(--ges-panel)]' : ''}`}
      style={{ borderColor: 'var(--ges-border)' }}
      onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={onDrop}
    >
      <div className="token-muted mb-3">Drag & drop CSV here</div>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) onSelect(f);}} />
      <Button variant="outline" className="btn-secondary rounded-2xl" onClick={()=>inputRef.current?.click()}>{label}</Button>
    </div>
  );
}

