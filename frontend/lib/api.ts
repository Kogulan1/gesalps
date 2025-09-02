"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export async function authedFetch(path: string, init: RequestInit = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || "";
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${base}${path}`, { ...init, headers });
}

export async function previewDatasetCSV(datasetId: string) {
  const res = await authedFetch(`/v1/datasets/${datasetId}/preview`);
  if (!res.ok) throw new Error(`Preview failed: ${res.status}`);
  return await res.text();
}

export async function deleteDataset(datasetId: string) {
  const res = await authedFetch(`/v1/datasets/${datasetId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  return await res.json();
}
