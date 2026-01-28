"use client";
import { useEffect, useState } from "react";
import { startRunBody } from "@/lib/api";
import { useToast } from "@/components/toast/Toaster";
import { useLocale } from "next-intl";

type Mode = "balanced" | "privacy-first" | "utility-first";
type Method = "ddpm" | "gc" | "ctgan" | "tvae";

type Props = {
  datasetId: string;
  defaultAgentEnabled?: boolean;
  defaultModel?: string;          // e.g., "gpt-oss:20b"
  defaultProvider?: 'ollama' | 'openrouter';       // default "ollama"
  defaultTemperature?: number;    // default 0.2
  defaultSampleMult?: number;     // default 1
  defaultMaxRows?: number;        // default 2000
  defaultMethod?: Method;
  defaultMode?: Mode;
};

export default function StartRun({ datasetId, defaultAgentEnabled, defaultModel, defaultProvider, defaultTemperature, defaultSampleMult, defaultMaxRows, defaultMethod = "ddpm", defaultMode = "balanced" }: Props) {
  const { toast } = useToast();
  const locale = useLocale();
  const [agentEnabled, setAgentEnabled] = useState<boolean>(true);
  const [customize, setCustomize] = useState<boolean>(false);
  const [omopEnabled, setOmopEnabled] = useState<boolean>(true);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [method, setMethod] = useState<Method>(defaultMethod);
  const [prompt, setPrompt] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [provider, setProvider] = useState<'ollama'|'openrouter'>((process.env.NEXT_PUBLIC_AGENT_PROVIDER as any) || 'ollama');
  const [model, setModel] = useState<string>((process.env.NEXT_PUBLIC_AGENT_MODEL as string) || "gpt-oss:20b");
  const [temperature, setTemperature] = useState<number>(0.2);
  const [sampleMultiplier, setSampleMultiplier] = useState<number>(1.0);
  const [maxSynthRows, setMaxSynthRows] = useState<number>(2000);
  const [ctganEpochs, setCtganEpochs] = useState<number | undefined>(undefined);
  const [ctganBatch, setCtganBatch] = useState<number | undefined>(undefined);
  const [tvaeEpochs, setTvaeEpochs] = useState<number | undefined>(undefined);
  const [tvaeBatch, setTvaeBatch] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [runName, setRunName] = useState<string>("");
  const [dpEnabled, setDpEnabled] = useState<boolean>(false);
  const [dpEpsilon, setDpEpsilon] = useState<string>("");
  const [dpAvailable, setDpAvailable] = useState<boolean>(false);
  const [dpBackend, setDpBackend] = useState<string>('none');

  useEffect(()=>{
    (async()=>{
      try{
        const r = await fetch((process.env.NEXT_PUBLIC_BACKEND_API_BASE||'') + '/v1/capabilities', { cache:'no-store' });
        if(r.ok){ const j = await r.json(); setDpAvailable(!!j?.dp_available); setDpBackend(String(j?.dp_backend||'none')); }
        else { setDpAvailable(false); setDpBackend('none'); }
      }catch{ setDpAvailable(false); setDpBackend('none'); }
    })();
  },[]);

  async function onStart() {
    if (!datasetId) {
      toast({ title: "No dataset", description: "Please upload or select a dataset first.", variant: "error" });
      return;
    }
    setBusy(true);
    try {
      // Compose payload variants
      let body: any = {};
      if (!customize) {
        // Minimal agent payload (default)
        body = {
          dataset_id: datasetId,
          method: 'auto',
          mode: 'agent',
          name: (runName||'').trim() || undefined,
          config_json: {
            preference: { tradeoff: 'balanced' },
            omop_enabled: omopEnabled
          }
        };
      } else if (customize && agentEnabled) {
        // Agent with extra hints
        body = {
          dataset_id: datasetId,
          method: 'auto',
          mode: 'agent',
          name: (runName||'').trim() || undefined,
          config_json: {
            preference: { tradeoff: mode },
            prompt: (prompt||'').trim() || undefined,
            goal: (goal||'').trim() || undefined,
            agent: { provider, model, temperature },
            omop_enabled: omopEnabled
          }
        };
      } else {
        // Manual custom mode
        const hp: any = { sample_multiplier: Number(sampleMultiplier)||1, max_synth_rows: Number(maxSynthRows)||2000 };
        if (method === 'ctgan') {
          hp.ctgan = { epochs: ctganEpochs, batch_size: ctganBatch };
        } else if (method === 'tvae') {
          hp.tvae = { epochs: tvaeEpochs, batch_size: tvaeBatch };
        }
        body = {
          dataset_id: datasetId,
          method,
          mode: 'custom',
          name: (runName||'').trim() || undefined,
          config_json: {
            hyperparams: hp,
            dp: { enabled: false },
            agent: { enabled: false },
            omop_enabled: omopEnabled
          }
        };
      }
      const { run_id } = await startRunBody(body as any);
      // Navigate to run page
      if (run_id) {
        location.href = `/${locale}/runs/${run_id}`;
      } else {
        toast({ title: "Run queued", variant: "success" });
      }
    } catch (e: any) {
      let desc = String(e?.message || e);
      if (agentEnabled && provider === 'ollama' && /model/i.test(desc) && /not/i.test(desc)) {
        desc += `\nHint: pull the model in Docker: docker exec -it gesalps_ollama ollama pull ${model}`;
      }
      toast({ title: "Failed to start run", description: desc, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <span>Agent</span>
          <input type="checkbox" className="h-4 w-8 appearance-none rounded-full bg-neutral-300 relative before:content-[''] before:absolute before:top-[2px] before:left-[2px] before:h-3 before:w-3 before:bg-white before:rounded-full before:transition-all checked:bg-emerald-600 checked:before:left-[calc(100%-14px)]" checked={agentEnabled} disabled={!customize} onChange={(e)=> setAgentEnabled(e.target.checked)} />
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <span>Customize</span>
          <input type="checkbox" className="h-4 w-8 appearance-none rounded-full bg-neutral-300 relative before:content-[''] before:absolute before:top-[2px] before:left-[2px] before:h-3 before:w-3 before:bg-white before:rounded-full before:transition-all checked:bg-emerald-600 checked:before:left-[calc(100%-14px)]" checked={customize} onChange={(e)=> setCustomize(e.target.checked)} />
        </label>
      </div>

      <div>
        <label className="text-sm font-medium">Run name</label>
        <input type="text" placeholder="e.g., Project baseline" className="w-full border rounded px-2 py-1 bg-transparent" value={runName} onChange={(e)=>setRunName(e.target.value)} />
      </div>

      {customize && !agentEnabled && (
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm font-medium">Method</label>
        <select
          className="border rounded px-2 py-1 bg-transparent"
          value={method}
          onChange={(e)=>setMethod(e.target.value as Method)}
          title="TabDDPM = 2025 SOTA diffusion model for clinical data"
        >
          <option value="ddpm">TabDDPM (Diffusion - Highest Fidelity) ⭐ SOTA</option>
          <option value="gc">Gaussian Copula</option>
          <option value="ctgan">CTGAN</option>
          <option value="tvae">TVAE</option>
        </select>
      </div>
      )}

      {!customize ? (
        <div className="text-xs token-muted">Tip: Our AI data scientist will choose model & tuning automatically.</div>
      ) : null}

      {customize && agentEnabled && (
        <>
          <div>
            <label className="text-sm font-medium">Prompt</label>
            <textarea
              className="w-full border rounded p-2 bg-transparent"
              rows={5}
              placeholder={`(Optional) Describe your goal. Example: "Maximize utility for treatment-outcome signals, keep MIA AUC ≤ 0.6, KS ≤ 0.1, prefer CTGAN if many categoricals."`}
              value={prompt}
              onChange={(e)=>setPrompt(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Goal (optional)</label>
            <input className="w-full border rounded p-2 bg-transparent" value={goal} onChange={(e)=>setGoal(e.target.value)} placeholder="e.g., Publishable quality for analysis" />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm font-medium">Provider</label>
            <select
              className="border rounded px-2 py-1 bg-transparent"
              value={provider}
              onChange={(e)=>setProvider(e.target.value as any)}
            >
              <option value="ollama">Ollama (local)</option>
              <option value="openrouter">OpenRouter (cloud)</option>
            </select>

            <label className="text-sm font-medium">Model</label>
            <input
              className="border rounded px-2 py-1 bg-transparent"
              value={model}
              onChange={(e)=>setModel(e.target.value)}
              placeholder="gpt-oss:20b"
            />

            <label className="text-sm font-medium">Temperature</label>
            <input
              type="number" step="0.1" min={0} max={1}
              className="w-24 border rounded px-2 py-1 bg-transparent"
              value={temperature}
              onChange={(e)=>setTemperature(parseFloat(e.target.value))}
            />
          </div>
        </>
      )}

      {customize && !agentEnabled && (
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm font-medium">Sample ×</label>
        <input
          type="number" step="0.1" min={0.1}
          className="w-24 border rounded px-2 py-1 bg-transparent"
          value={sampleMultiplier}
          onChange={(e)=>setSampleMultiplier(parseFloat(e.target.value))}
        />

        <label className="text-sm font-medium">Max rows</label>
        <input
          type="number" min={100}
          className="w-28 border rounded px-2 py-1 bg-transparent"
          value={maxSynthRows}
          onChange={(e)=>setMaxSynthRows(parseInt(e.target.value))}
        />
        {(method==='ctgan' || method==='tvae') && (
          <>
            <label className="text-sm font-medium">Epochs</label>
            <input type="number" min={10} className="w-24 border rounded px-2 py-1 bg-transparent" value={method==='ctgan'? (ctganEpochs??''): (tvaeEpochs??'')} onChange={(e)=> (method==='ctgan'? setCtganEpochs(parseInt(e.target.value||'0')||undefined): setTvaeEpochs(parseInt(e.target.value||'0')||undefined))} />
            <label className="text-sm font-medium">Batch</label>
            <input type="number" min={16} className="w-24 border rounded px-2 py-1 bg-transparent" value={method==='ctgan'? (ctganBatch??''): (tvaeBatch??'')} onChange={(e)=> (method==='ctgan'? setCtganBatch(parseInt(e.target.value||'0')||undefined): setTvaeBatch(parseInt(e.target.value||'0')||undefined))} />
          </>
        )}
      </div>
      )}

      {false && (
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <span>Differential Privacy</span>
          <input
            type="checkbox"
            className="h-4 w-8 appearance-none rounded-full bg-neutral-300 relative before:content-[''] before:absolute before:top-[2px] before:left-[2px] before:h-3 before:w-3 before:bg-white before:rounded-full before:transition-all checked:bg-emerald-600 checked:before:left-[calc(100%-14px)]"
            checked={dpEnabled}
            disabled
            onChange={(e)=>setDpEnabled(e.target.checked)}
          />
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm token-muted">epsilon</label>
          <input
            type="number"
            placeholder="e.g., 5"
            className="w-24 border rounded px-2 py-1 bg-transparent"
            value={dpEpsilon}
            disabled
            onChange={(e)=>setDpEpsilon(e.target.value)}
          />
        </div>
      </div>)}
      <div className="text-xs token-muted">Tip: Our AI data scientist will choose model & tuning automatically.</div>

      <button
        className="mt-2 inline-flex items-center rounded-lg px-3 py-2 bg-black text-white disabled:opacity-60"
        onClick={onStart}
        disabled={busy}
      >
        {busy ? "Starting..." : "Start run"}
      </button>
      <div className="text-xs token-muted">Tip: Agent Mode lets an AI data scientist pick method and tuning to maximize your objective.</div>
    </div>
  );
}
