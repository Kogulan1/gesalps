"use client";

export default function JSONPreview({ data }: { data: any }) {
  return (
    <pre className="text-xs bg-white text-neutral-900 p-4 rounded-lg overflow-auto max-h-[60vh] border" style={{borderColor:'var(--ges-border)'}}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
