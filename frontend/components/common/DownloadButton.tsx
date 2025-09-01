"use client";
import { Button } from "@/components/ui/button";

export default function DownloadButton({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" className="btn-secondary rounded-2xl">
      <a href={href} target="_blank" rel="noreferrer noopener">{label}</a>
    </Button>
  );
}

