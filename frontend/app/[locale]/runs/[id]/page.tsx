"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch, ensureReportPDF, downloadAllArtifactsZip } from "@/lib/api";
import MetricCard from "@/components/runs/MetricCard";
import DownloadButton from "@/components/common/DownloadButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Spinner from "@/components/ui/spinner";
import { StatusBadge } from "@/components/runs/RunStatus";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import Link from "next/link";
import { previewRunSyntheticCSV, getRunReportJSON } from "@/lib/api";
import ReportView from "@/components/runs/ReportView";
import Modal from "@/components/Modal";
import CSVPreview from "@/components/CSVPreview";
import JSONPreview from "@/components/JSONPreview";
import { useMemo } from "react";
import { toArtifactMap, fmtBytes, forceDownloadUrl } from "@/lib/artifacts";
import BackLink from "@/components/common/BackLink";
import { useLocale } from "next-intl";
import { useToast } from "@/components/toast/Toaster";
 

export default function RunDetail() {
  const params = useParams<{id:string}>();
  const id = params.id;
  const locale = useLocale();
  const [status,setStatus] = useState<any>({ status:'queued' });
  const [metrics,setMetrics] = useState<any|null>(null);
  const [artifacts,setArtifacts] = useState<any[]>([]);
  const [artifactsReady, setArtifactsReady] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCSV, setPreviewCSV] = useState("");
  const [report, setReport] = useState<any|null>(null);
  const { toast } = useToast();
  const [projectId,setProjectId] = useState<string|undefined>(undefined);
  const [csvModal,setCsvModal] = useState(false);
  const [jsonModal,setJsonModal] = useState(false);
  const [csvText,setCsvText] = useState("");
  const [reportJSON,setReportJSON] = useState<any>(null);
  const [steps,setSteps] = useState<any[]>([]);
  const [runInfo,setRunInfo] = useState<any>(null);
  const [progressLabel,setProgressLabel] = useState<string>("");
  const prevStatusRef = useRef<string | undefined>(undefined);

  // no stepper/animation state

  useEffect(()=>{
    let alive = true;
    const supabase = createSupabaseBrowserClient();
    // Realtime subscription: runs row and run_steps
    const ch = supabase.channel(`run_${id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'runs', filter:`id=eq.${id}` }, (payload:any)=>{
        const row = payload.new || payload.old;
        if (!row) return;
        // toast on meaningful status transitions
        const prev = prevStatusRef.current;
        if (row.status && prev !== row.status) {
          prevStatusRef.current = row.status;
          try {
            if (row.status === 'succeeded') toast({ title:'Run succeeded', variant:'success' });
            else if (row.status === 'failed') toast({ title:'Run failed', variant:'error' });
          } catch {}
        }
        setStatus((s:any)=> ({...s, status: row.status ?? s.status, name: row.name ?? s.name, method: row.method ?? s.method, started_at: row.started_at ?? s.started_at, finished_at: row.finished_at ?? s.finished_at }));
        setRunInfo((ri:any)=> ({...(ri||{}), name: row.name ?? ri?.name, method: row.method ?? ri?.method }));
        if (row.status === 'succeeded') {
          loadFinal();
        }
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'run_steps', filter:`run_id=eq.${id}` }, async (_evt:any)=>{
        try { const st = await authedFetch(`/v1/runs/${id}/steps`); if(st.ok){ const rows = await st.json(); setSteps(rows||[]); } } catch {}
      })
      .subscribe();
    async function refreshOnce(){
      try {
        const r = await authedFetch(`/v1/runs/${id}/status`);
        if (r.ok){
          const js = await r.json();
          setStatus(js);
          if (typeof js?.artifacts_ready === 'boolean') setArtifactsReady(!!js.artifacts_ready);
          if(js.status==='succeeded'){
            setProgressLabel('Completed');
            await loadFinal();
            return;
          }
        }
      } catch {}
      try {
        const st = await authedFetch(`/v1/runs/${id}/steps`);
        if(st.ok){
          const rows = await st.json();
          setSteps(rows||[]);
          const latest = (rows||[]).reduce((m:number, it:any)=> Math.max(m, Number(it?.step_no||0)), 0);
          const last = (rows||[]).find((it:any)=> Number(it?.step_no||0) === latest);
          const cur = (status as any)?.status;
          const label = cur==='queued' ? 'Queued' : (cur==='running' ? (last? `Step ${latest}: ${last?.title||''}` : 'Running') : cur);
          setProgressLabel(label);
        }
      } catch {}
    }
    async function loadFinal(){
      const m = await authedFetch(`/v1/runs/${id}/metrics`); if (m.ok) setMetrics(await m.json());
      const a = await authedFetch(`/v1/runs/${id}/artifacts`);
      if (a.ok) {
        const body = await a.json();
        // Support both legacy array and new { artifacts_ready, artifacts }
        if (Array.isArray(body)) { setArtifacts(body); setArtifactsReady(true); }
        else { setArtifacts(Array.isArray(body?.artifacts)? body.artifacts: []); setArtifactsReady(!!body?.artifacts_ready); }
      }
      try { const rj = await authedFetch(`/v1/runs/${id}/report`); if (rj.ok) setReport(await rj.json()); } catch {}
      try { const st = await authedFetch(`/v1/runs/${id}/steps`); if(st.ok){ const rows = await st.json(); setSteps(rows||[]); } } catch {}
    }
    (async ()=>{ const rr = await supabase.from('runs').select('project_id,method,mode,config_json,name').eq('id', id).single(); setProjectId(rr.data?.project_id); setRunInfo(rr.data||null); })();
    // initial one-shot fetch
    refreshOnce();
    // occasional safety refresh every 60s
    const safety = setInterval(refreshOnce, 60000);
    return ()=>{alive=false; clearInterval(safety); supabase.removeChannel(ch);} ;
  },[id]);

  const artifactsMap = useMemo(()=> toArtifactMap(artifacts || []), [artifacts]);

  // Polling loop for run + metrics + artifacts; stops after success + metrics with one extra poll
  useEffect(() => {
    let mounted = true;
    let extraPollsRemaining = 1;
    const poll = async () => {
      if (!mounted) return;
      try {
        const r = await authedFetch(`/v1/runs/${id}/status`);
        if (r.ok) {
          const js = await r.json();
          setStatus((s:any) => ({ ...s, ...js }));
          if (typeof js?.artifacts_ready === 'boolean') setArtifactsReady(!!js.artifacts_ready);
        }
      } catch {}
      try {
        const m = await authedFetch(`/v1/runs/${id}/metrics`);
        if (m.ok) setMetrics(await m.json());
      } catch {}
      try {
        const a = await authedFetch(`/v1/runs/${id}/artifacts`);
        if (a.ok) {
          const body = await a.json();
          if (Array.isArray(body)) { setArtifacts(body); }
          else { setArtifacts(Array.isArray(body?.artifacts) ? body.artifacts : []); setArtifactsReady(!!body?.artifacts_ready); }
        }
      } catch {}

      const done = ((status?.status || '').toLowerCase() === 'succeeded') && Boolean(metrics && Object.keys(metrics || {}).length);
      if (done) extraPollsRemaining = Math.max(-1, extraPollsRemaining - 1);
    };
    const handle = setInterval(async () => {
      if (extraPollsRemaining < 0) {
        clearInterval(handle);
        return;
      }
      await poll();
    }, 2000);
    // kick off immediately
    poll();
    return () => { mounted = false; clearInterval(handle); };
  }, [id]);

  async function onPreviewCSV(){ try { const txt = await previewRunSyntheticCSV(id); setCsvText(txt); setCsvModal(true); } catch { toast({ title: 'Could not preview CSV', variant: 'error' }); } }
  async function onPreviewJSON(){ try { const rpt = await getRunReportJSON(id); setReportJSON(rpt); setJsonModal(true); } catch { toast({ title: 'Could not load report', variant: 'error' }); } }
  async function onGeneratePDF(){
    try {
      const r = await ensureReportPDF(id);
      // refresh artifacts to show the PDF link
      const a = await authedFetch(`/v1/runs/${id}/artifacts`); if (a.ok) setArtifacts(await a.json());
      // optionally open in new tab if signedUrl returned
      if (r?.signedUrl) window.open(r.signedUrl, '_blank');
    } catch (e:any) {
      toast({ title: 'PDF generation failed', description: String(e?.message||e), variant: 'error' });
    }
  }
  async function onDownloadAll(){
    try { await downloadAllArtifactsZip(id); }
    catch(e:any){ toast({ title: 'Download failed', description: String(e?.message||e), variant: 'error' }); }
  }
  // PDF preview removed: we render the full report below and offer a clean download

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {projectId && (<BackLink href={`/${locale}/projects/${projectId}`} ariaLabel="Back to Project" iconOnly />)}
          <h1 className="text-2xl font-semibold">Run{(status as any)?.name ? ` – ${(status as any).name}` : (runInfo?.name ? ` – ${runInfo.name}`: '')}</h1>
        </div>
        <StatusBadge status={status.status} />
      </div>

      {/* Removed live animation panel and stepper */}

      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
          {metrics?.meta?.model && (
            <div className="mt-1 text-xs inline-flex items-center gap-2 rounded-full px-2 py-1 border" style={{borderColor:'var(--ges-border)'}}>
              <span className="opacity-70">Attempt</span>
              <span className="font-medium">{String(metrics?.meta?.attempt ?? 1)}</span>
              <span className="opacity-70">Model</span>
              <span className="font-medium uppercase">{String(metrics?.meta?.model)}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {status.status === 'failed' && (<div className="mb-6 rounded-md border border-red-200 bg-red-50 text-red-800 px-4 py-3">Run failed. Please check logs and try again.</div>)}
          {status.status !== 'succeeded' && status.status !== 'failed' && (
            <div className="mb-6 rounded-md border bg-gray-50 text-gray-700 px-4 py-3">
              This run is {status.status}. Artifacts will appear when finished.
            </div>
          )}
          {metrics ? (
            <div className="grid md:grid-cols-3 gap-4">
              <MetricCard label="KS mean" value={metrics.utility?.ks_mean ?? null} />
              <MetricCard label="Corr Δ" value={metrics.utility?.corr_delta ?? null} />
              <MetricCard label="MIA AUC" value={metrics.privacy?.mia_auc ?? null} />
            </div>
          ) : (
            <div className="text-gray-600 flex items-center gap-2"><Spinner size={14} /> <span>Waiting for results…</span></div>
          )}
        </CardContent>
      </Card>

      {/* Restore previous Artifacts behavior */}
      {/* Show spinner section until artifacts are ready */}
      {artifactsReady ? (
      <Card>
        <CardHeader><CardTitle>Artifacts</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left token-muted">
                  <th className="py-2">Type</th>
                  <th className="py-2">Size</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t" style={{borderColor:'var(--ges-border)'}}>
                  <td className="py-2">Synthetic CSV</td>
                  <td className="py-2">{fmtBytes(artifactsMap.synthetic_csv?.bytes)}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button aria-label="Preview synthetic CSV" className="px-2 py-1 rounded-md border disabled:opacity-50 inline-flex items-center" onClick={onPreviewCSV} disabled={!artifactsMap.synthetic_csv || status.status!=="succeeded"} title="Preview">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5c5 0 9 4 10 7-1 3-5 7-10 7S3 15 2 12c1-3 5-7 10-7Z" stroke="currentColor"/><circle cx="12" cy="12" r="3" stroke="currentColor"/></svg>
                      </button>
                      <a aria-label="Download synthetic CSV" className={`px-2 py-1 rounded-md border inline-flex items-center ${!artifactsMap.synthetic_csv? 'pointer-events-none opacity-50':''}`}
                         href={artifactsMap.synthetic_csv?.signedUrl ? forceDownloadUrl(artifactsMap.synthetic_csv.signedUrl!, 'synthetic.csv') : undefined}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4 4-4" stroke="currentColor"/><path d="M5 21h14" stroke="currentColor"/></svg>
                      </a>
                    </div>
                  </td>
                </tr>
                <tr className="border-t" style={{borderColor:'var(--ges-border)'}}>
                  <td className="py-2">Report (JSON)</td>
                  <td className="py-2">{fmtBytes(artifactsMap.report_json?.bytes)}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button aria-label="Preview report JSON" className="px-2 py-1 rounded-md border disabled:opacity-50 inline-flex items-center" onClick={onPreviewJSON} disabled={!artifactsMap.report_json || status.status!=="succeeded"} title="View JSON">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5c5 0 9 4 10 7-1 3-5 7-10 7S3 15 2 12c1-3 5-7 10-7Z" stroke="currentColor"/><circle cx="12" cy="12" r="3" stroke="currentColor"/></svg>
                      </button>
                      <a aria-label="Download report JSON" className={`px-2 py-1 rounded-md border inline-flex items-center ${!artifactsMap.report_json? 'pointer-events-none opacity-50':''}`}
                         href={artifactsMap.report_json?.signedUrl ? forceDownloadUrl(artifactsMap.report_json.signedUrl!, 'report.json') : undefined}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4 4-4" stroke="currentColor"/><path d="M5 21h14" stroke="currentColor"/></svg>
                      </a>
                    </div>
                  </td>
                </tr>
                <tr className="border-t" style={{borderColor:'var(--ges-border)'}}>
                  <td className="py-2">Quality Report (PDF)</td>
                  <td className="py-2">{fmtBytes(artifactsMap.report_pdf?.bytes)}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      {artifactsMap.report_pdf?.signedUrl ? (
                        <>
                          <a aria-label="Preview report PDF" className="px-2 py-1 rounded-md border inline-flex items-center" href={artifactsMap.report_pdf.signedUrl} target="_blank" rel="noreferrer" title="Open PDF">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5c5 0 9 4 10 7-1 3-5 7-10 7S3 15 2 12c1-3 5-7 10-7Z" stroke="currentColor"/><circle cx="12" cy="12" r="3" stroke="currentColor"/></svg>
                          </a>
                          <a aria-label="Download report PDF" className="px-2 py-1 rounded-md border inline-flex items-center" href={forceDownloadUrl(artifactsMap.report_pdf.signedUrl!, 'report.pdf')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4 4-4" stroke="currentColor"/><path d="M5 21h14" stroke="currentColor"/></svg>
                          </a>
                        </>
                      ) : (
                        <button className="px-2 py-1 rounded-md border" onClick={onGeneratePDF}>Generate PDF</button>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <button className="px-3 py-2 rounded-md border inline-flex items-center gap-2" onClick={onDownloadAll} disabled={!artifactsMap.synthetic_csv && !artifactsMap.report_json && !artifactsMap.report_pdf}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4 4-4" stroke="currentColor"/><path d="M5 21h14" stroke="currentColor"/></svg>
              Download All
            </button>
          </div>
        </CardContent>
      </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Artifacts</CardTitle></CardHeader>
          <CardContent>
            <div data-testid="synth-working" className="mb-2 flex items-center gap-2 rounded-md border bg-gray-50 px-4 py-3 text-gray-700" style={{borderColor:'var(--ges-border)'}}>
              <Spinner size={14} />
              <span>Synthesizing… our agent is optimizing your configuration</span>
            </div>
          </CardContent>
        </Card>
      )}
      {(steps.length>0 || runInfo?.mode === 'agent') && (
        <Card>
          <CardHeader><CardTitle>Agent Steps</CardTitle></CardHeader>
          <CardContent>
            {steps.length===0 ? (
              <div className="text-sm token-muted">No steps yet.</div>
            ) : (
              <ol className="space-y-2 text-sm">
                {steps.map((s:any)=> (
                  <li key={`${s.step_no}-${s.created_at}`} className="border rounded p-2" style={{borderColor:'var(--ges-border)'}}>
                    <div className="font-medium">Step {s.step_no}: {s.title}</div>
                    {s.detail && <div className="token-muted">{s.detail}</div>}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}
      {report && (<Card><CardHeader><CardTitle>Report</CardTitle></CardHeader><CardContent className="space-y-4"><ReportView report={report} /></CardContent></Card>)}
      {/* Modals */}
      <Modal open={csvModal} title="Synthetic CSV (first 20 rows)" onClose={()=>setCsvModal(false)}>
        <CSVPreview csv={csvText} />
      </Modal>
      <Modal open={jsonModal} title="Report (JSON)" onClose={()=>setJsonModal(false)}>
        <JSONPreview data={reportJSON} />
      </Modal>
      {/* No PDF modal: rely on download link */}
    </div>
  );
}
