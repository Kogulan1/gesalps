"use client";

export default function JSONPreview({ data }: { data: any }) {
  return (
    <pre className="text-xs bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg overflow-auto max-h-[60vh]">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
