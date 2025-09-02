export type Artifact = {
  kind: string;
  signedUrl?: string;
  bytes?: number | null;
  mime?: string | null;
};

export type ArtifactMap = Partial<Record<
  "synthetic_csv" | "report_json" | "report_pdf", Artifact
>>;

export function toArtifactMap(items: Artifact[] = []): ArtifactMap {
  const map: Record<string, Artifact> = {};
  for (const it of items) {
    if (!it?.kind) continue;
    const prev = map[it.kind];
    if (!prev) { map[it.kind] = it; continue; }
    if (!prev.signedUrl && it.signedUrl) map[it.kind] = it; else map[it.kind] = it;
  }
  return {
    synthetic_csv: map["synthetic_csv"],
    report_json:   map["report_json"],
    report_pdf:    map["report_pdf"],
  };
}

export function fmtBytes(n?: number | null): string {
  if (!n || n <= 0) return "";
  const units = ["B","KB","MB","GB"]; let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function forceDownloadUrl(url: string, filename?: string) {
  const dl = filename ? `download=${encodeURIComponent(filename)}` : `download`;
  return url + (url.includes('?') ? '&' : '?') + dl;
}
