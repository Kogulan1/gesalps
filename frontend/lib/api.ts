"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export async function authedFetch(path: string, init: RequestInit = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  
  // Handle refresh token errors gracefully
  if (error && error.message?.includes('Refresh Token')) {
    console.warn('[API] Auth error, signing out:', error.message);
    await supabase.auth.signOut().catch(() => {});
    // Redirect to sign in if we're in the browser
    if (typeof window !== 'undefined') {
      window.location.href = '/signin';
    }
    throw new Error('Authentication expired. Please sign in again.');
  }
  
  const token = data?.session?.access_token;
  const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || "";
  
  if (!base) {
    console.error('[API] NEXT_PUBLIC_BACKEND_API_BASE is not set! Please configure it in Vercel environment variables.');
    throw new Error('Backend API URL not configured. Please set NEXT_PUBLIC_BACKEND_API_BASE environment variable.');
  }
  
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Disable caching to avoid stale metrics/artifacts during polling
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  
  const url = `${base}${path}`;
  console.log(`[API] ${init.method || 'GET'} ${url}`);
  
  return fetch(url, { cache: "no-store", ...init, headers });
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

export async function previewRunSyntheticCSV(runId: string) {
  const res = await authedFetch(`/v1/runs/${runId}/synthetic/preview`);
  if (!res.ok) throw new Error(`Synthetic preview failed: ${res.status}`);
  return await res.text();
}

export async function getRunReportJSON(runId: string) {
  const res = await authedFetch(`/v1/runs/${runId}/report`);
  if (!res.ok) throw new Error(`Load report failed: ${res.status}`);
  return await res.json();
}


export async function getRunArtifacts(runId: string) {
  const res = await authedFetch(`/v1/runs/${runId}/artifacts`);
  if (!res.ok) throw new Error(`Artifacts failed: ${res.status}`);
  return await res.json();
}

export async function deleteRun(runId: string) {
  const res = await authedFetch(`/v1/runs/${runId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete run failed: ${res.status}`);
  return await res.json();
}

export async function getRunDetails(runId: string) {
  const res = await authedFetch(`/v1/runs/${runId}`);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.detail || j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return await res.json();
}

export async function getRunMetrics(runId: string) {
  const res = await authedFetch(`/v1/runs/${runId}/metrics`);
  if (!res.ok) {
    // 404 is expected for cancelled/failed runs, return empty object
    if (res.status === 404) return {};
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.detail || j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return await res.json();
}

export async function getRunSteps(runId: string) {
  const res = await authedFetch(`/v1/runs/${runId}/steps`);
  if (!res.ok) return [] as any[]; // graceful fallback if endpoint missing
  return await res.json();
}

// Generate or fetch a signed URL for the formatted PDF report
export async function ensureReportPDF(runId: string) {
  const res = await authedFetch(`/v1/runs/${runId}/report/pdf`, { method: 'POST' });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.detail || j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return await res.json() as Promise<{ path: string; signedUrl?: string }>;
}

// Download all artifacts as a ZIP (streams a blob)
export async function downloadAllArtifactsZip(runId: string) {
  const res = await authedFetch(`/v1/runs/${runId}/download/all`);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.detail || j?.message || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `run_${runId}_artifacts.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Optional typed helper for starting runs with explicit payload
export type StartRunBody =
  | {
      dataset_id: string;
      method: 'ddpm'|'gc'|'ctgan'|'tvae';
      mode: 'balanced'|'privacy-first'|'utility-first';
      config_json: { sample_multiplier: number; max_synth_rows: number };
    }
  | {
      dataset_id: string;
      method: 'auto';
      mode: 'agent';
      config_json: {
        sample_multiplier: number;
        max_synth_rows: number;
        agent: { provider: 'ollama'|'openrouter'; model: string; temperature: number; prompt?: string };
      };
    };

export async function startRunBody(body: StartRunBody & { name?: string }) {
  const res = await authedFetch('/v1/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.detail || j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<{ run_id: string }>;
}

export async function renameRun(runId: string, name: string) {
  const res = await authedFetch(`/v1/runs/${runId}/name`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.detail || j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return await res.json();
}

export type StartRunOptions = {
  method?: "ddpm" | "gc" | "ctgan" | "tvae";
  mode?: "balanced" | "privacy-first" | "utility-first" | "agent";
  prompt?: string;
  sampleMultiplier?: number;                   // e.g., 1.0
  maxSynthRows?: number;                       // e.g., 5000
  agent?: {
    provider?: "ollama" | "openrouter";
    model?: string;                            // e.g., "gpt-oss:20b"
    temperature?: number;                      // 0..2
    seed?: number;
  };
  extra?: Record<string, any>;                 // future knobs
};

export async function startRun(datasetId: string, opts: StartRunOptions = {}) {
  const {
    method = "ddpm",
    mode = "balanced",
    prompt = "",
    sampleMultiplier,
    maxSynthRows,
    agent,
    extra = {}
  } = opts;

  const config_json: Record<string, any> = {
    prompt,
    sample_multiplier: sampleMultiplier,
    max_synth_rows: maxSynthRows,
    agent,
    ...extra,
  };

  const body: any = {
    dataset_id: datasetId,
    method,
    mode,
    config_json: config_json,
  };
  if (mode === "agent" || agent) {
    if (agent?.provider) body.agent_provider = agent.provider;
    if (agent?.model) body.agent_model = agent.model;
    if (prompt) body.agent_prompt = prompt;
  }

  const res = await authedFetch(`/v1/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const b = await res.json(); msg = b?.detail || b?.message || JSON.stringify(b); } catch {}
    throw new Error(`startRun failed: ${msg}`);
  }
  return await res.json(); // { run_id }
}
