"use client";

export default function PDFViewer({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      className="w-full h-[70vh] rounded-lg border"
      title="Report PDF"
    />
  );
}
