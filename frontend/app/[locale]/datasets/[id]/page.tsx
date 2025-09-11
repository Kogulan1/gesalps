"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SchemaTable from "@/components/tables/SchemaTable";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import { authedFetch, deleteDataset, previewDatasetCSV, previewRunSyntheticCSV, getRunReportJSON, getRunArtifacts, deleteRun, getRunSteps } from "@/lib/api";
import { useLocale } from "next-intl";
import { useToast } from "@/components/toast/Toaster";
import PreviewModal from "@/components/PreviewModal";
import BackLink from "@/components/common/BackLink";
import ReportView from "@/components/runs/ReportView";
import { StatusBadge } from "@/components/runs/RunStatus";
import RunMetricsCell from "@/components/runs/RunMetricsCell";
import StartRun from "@/components/runs/StartRun";

export default function DatasetDetail() {
  const params = useParams<{id:string, locale:string}>();
  const id = params.id;
  const locale = useLocale();
  const supabase = useMemo(()=>createSupabaseBrowserClient(),[]);
  const [ds,setDs] = useState<any|null>(null);
  const [runs,setRuns] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCSV, setPreviewCSV] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<any|null>(null);
  const { toast } = useToast();
  const [agentSteps, setAgentSteps] = useState<any[]>([]);
  const [activeAgentRun, setActiveAgentRun] = useState<any|null>(null);
  const [openMenuId, setOpenMenuId] = useState<string|null>(null);
  const hasActiveRun = runs.some((r:any)=> r?.status==='queued' || r?.status==='running');

  useEffect(()=>{(async()=>{
    const { data } = await supabase.from('datasets').select('*').eq('id', id).single();
    setDs(data||null);
    const rs = await supabase.from('runs').select('*').eq('dataset_id', id).order('started_at', { ascending:false });
    setRuns(rs.data||[]);
    const active = (rs.data||[]).find((r:any)=> r.mode==='agent' && (r.status==='queued' || r.status==='running')) || null;
    setActiveAgentRun(active||null);
  })();},[id,supabase]);

  // Realtime updates for runs (method/status/name changes)
  useEffect(()=>{
    const channel = supabase.channel(`runs_dataset_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs', filter: `dataset_id=eq.${id}` }, (payload:any)=>{
        if (payload.eventType === 'DELETE') {
          setRuns(prev => prev.filter(r => r.id !== payload.old.id));
          return;
        }
        const row = payload.new;
        setRuns(prev => {
          const idx = prev.findIndex(r => r.id === row.id);
          if (idx === -1) return [row, ...prev];
          const copy = prev.slice();
          copy[idx] = { ...copy[idx], ...row };
          return copy;
        });
      })
      .subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[id, supabase]);

  // Close any open menu on outside click
  useEffect(()=>{
    function onDoc(e: MouseEvent){
      // Close on any document click; simple and effective
      if (openMenuId) setOpenMenuId(null);
    }
    if (openMenuId){
      document.addEventListener('click', onDoc);
      return ()=> document.removeEventListener('click', onDoc);
    }
  },[openMenuId]);

  // Poll agent steps while an agent run is active
  useEffect(()=>{
    if (!activeAgentRun) return;
    let timer: any;
    const tick = async ()=>{
      try { const rows = await getRunSteps(activeAgentRun.id); setAgentSteps(rows||[]); } catch {}
    };
    tick();
    timer = setInterval(tick, 2000);
    return ()=>{ if(timer) clearInterval(timer); };
  },[activeAgentRun]);

  // StartRun UI moved into shared component

  async function onPreview(){
    try {
      const csv = await previewDatasetCSV(id);
      setPreviewCSV(csv); setPreviewOpen(true);
    } catch(e:any){
      toast({ title: 'Preview failed', description: String(e?.message || e), variant: 'error' });
    }
  }

  async function onDelete(){
    if (!confirm('Delete this dataset and all its runs/artifacts? This cannot be undone.')) return;
    try {
      await deleteDataset(id);
      location.href = `/${locale}/projects/${ds.project_id}`;
    } catch(e:any){
      toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'error' });
    }
  }

  // --- Run menu actions ---
  async function onRunPreviewCSV(runId: string){
    try { const csv = await previewRunSyntheticCSV(runId); setPreviewCSV(csv); setPreviewOpen(true); }
    catch(e:any){ toast({ title:'Preview failed', description:String(e?.message||e), variant:'error'}); }
  }

  function fmtStartDate(date?: string){
    if(!date) return '—';
    const d = new Date(date);
    const now = new Date();
    const same = (a: Date,b: Date)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
    const yest = new Date(now); yest.setDate(now.getDate()-1);
    if (same(d, now)) return 'Today';
    if (same(d, yest)) return 'Yesterday';
    return d.toLocaleDateString();
  }

  async function onRunPreviewReport(runId: string){
    try { const js = await getRunReportJSON(runId); setReportData(js); setReportOpen(true); }
    catch(e:any){ toast({ title:'Load report failed', description:String(e?.message||e), variant:'error'}); }
  }

  async function onRunDownloadCSV(runId: string){
    try { const arts = await getRunArtifacts(runId); const a = (arts||[]).find((x:any)=>x.kind==='synthetic_csv'); if(a?.signedUrl) window.open(a.signedUrl,'_blank'); else throw new Error('No CSV'); }
    catch(e:any){ toast({ title:'Download failed', description:String(e?.message||e), variant:'error'}); }
  }

  async function onRunDelete(runId: string){
    if(!confirm('Delete this run and related data?')) return;
    try { await deleteRun(runId); setRuns(prev=>prev.filter(r=>r.id!==runId)); toast({ title:'Run deleted', variant:'success' }); }
    catch(e:any){ toast({ title:'Delete run failed', description:String(e?.message||e), variant:'error'}); }
  }
  async function onRunRename(runId: string){
    const cur = (runs.find((r:any)=>r.id===runId)?.name)||"";
    const name = prompt('Rename run', cur);
    if (name===null) return;
    try { await renameRun(runId, name.trim()); setRuns(prev=> prev.map(r=> r.id===runId? {...r, name:name.trim()}: r)); }
    catch(e:any){ toast({ title:'Rename failed', description:String(e?.message||e), variant:'error'}); }
  }

  function RunMenu({ id, open, onToggle, onClose }: { id:string; open:boolean; onToggle:()=>void; onClose:()=>void }){
    return (
      <div className="relative inline-flex justify-end items-center">
        <button
          aria-label="Run actions"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-200 dark:hover:text-neutral-50 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          onClick={onToggle}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="3" cy="8" r="1.4"/>
            <circle cx="8" cy="8" r="1.4"/>
            <circle cx="13" cy="8" r="1.4"/>
          </svg>
        </button>
        {open && (
          <div className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 w-56 rounded-lg border shadow-xl z-50 bg-white text-black ring-1 ring-black/10 overflow-hidden" style={{borderColor:'var(--ges-border)'}}>
            <button className="block w-full text-left px-3 py-2 hover:bg-neutral-50 whitespace-nowrap" onClick={()=>{onClose(); onRunPreviewCSV(id);}}>Preview CSV</button>
            <button className="block w-full text-left px-3 py-2 hover:bg-neutral-50 whitespace-nowrap" onClick={()=>{onClose(); onRunPreviewReport(id);}}>Preview Report</button>
            <button className="block w-full text-left px-3 py-2 hover:bg-neutral-50 whitespace-nowrap" onClick={()=>{onClose(); onRunDownloadCSV(id);}}>Download CSV</button>
            <button className="block w-full text-left px-3 py-2 hover:bg-neutral-50 whitespace-nowrap" onClick={()=>{onClose(); onRunRename(id);}}>Rename</button>
            <button className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 whitespace-nowrap" onClick={()=>{onClose(); onRunDelete(id);}}>Delete Run</button>
          </div>
        )}
      </div>
    );
  }

  if (!ds) return <div className="mx-auto max-w-3xl px-4 py-8">Loading…</div>;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {ds?.project_id && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackLink href={`/${locale}/projects/${ds.project_id}`} ariaLabel="Back to Project" iconOnly />
            <h1 className="text-2xl font-semibold">{ds.name}</h1>
          </div>
        </div>
      )}
      <Card>
        <CardHeader hidden><CardTitle>{ds.name}</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 token-muted">{ds.rows_count ?? '-'} rows • {ds.cols_count ?? '-'} cols</div>
          <div className="mb-4 flex gap-3">
            <Button variant="outline" className="rounded-2xl" onClick={onPreview}>Preview</Button>
            <Button variant="outline" className="rounded-2xl text-red-600 border-red-600" onClick={onDelete}>Delete dataset</Button>
          </div>
          <SchemaTable schema={ds.schema_json} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Runs</CardTitle></CardHeader>
        <CardContent>
          {hasActiveRun && (
            <div data-testid="synth-working" className="mb-4 flex items-center gap-2 rounded-md border bg-gray-50 px-4 py-3 text-gray-700" style={{borderColor:'var(--ges-border)'}}>
              <Spinner size={14} />
              <span>Synthesizing… our agent is optimizing your configuration</span>
            </div>
          )}
          {runs.length===0? (<div className="token-muted">No runs yet.</div>) : (
            <div className="overflow-visible">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left token-muted">
                    <th className="py-2">Name</th>
                    <th className="py-2">Method</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Start Date</th>
                    <th className="py-2">Start Time</th>
                    <th className="py-2">Duration</th>
                    <th className="py-2">Metrics</th>
                    <th className="py-2 text-right" style={{width:48}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r:any)=> (
                    <tr key={r.id} className="border-t" style={{borderColor:'var(--ges-border)'}}>
                      <td className="py-2">
                        <div className="max-w-[260px] truncate" title={r.name || r.id}>
                          <a href={`/${locale}/runs/${r.id}`} className="inline-flex items-center px-2 py-1 rounded hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 whitespace-nowrap">{r.name || r.id}</a>
                        </div>
                      </td>
                      <td className="py-2">{r.method}</td>
                      <td className="py-2"><StatusBadge status={r.status} /></td>
                      <td className="py-2">{fmtStartDate(r.started_at)}</td>
                      <td className="py-2">{r.started_at ? new Date(r.started_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '—'}</td>
                      <td className="py-2">{(function(){
                        if(!r.started_at) return '—';
                        const s = new Date(r.started_at).getTime();
                        const e = r.finished_at ? new Date(r.finished_at).getTime() : (r.status==='running'? Date.now() : NaN);
                        if(!Number.isFinite(e)) return '—';
                        let secs = Math.max(0, Math.floor((e - s)/1000));
                        const h = Math.floor(secs/3600); secs -= h*3600; const m = Math.floor(secs/60); secs -= m*60;
                        if(h>0) return `${h}h ${m}m`;
                        if(m>0) return `${m}m ${secs}s`;
                        return `${secs}s`;
                      })()}</td>
                      <td className="py-2"><RunMetricsCell runId={r.id} status={r.status} /></td>
                      <td className="py-2 align-middle">
                        <div className="flex justify-end min-w-[48px]">
                          <RunMenu
                            id={r.id}
                            open={openMenuId===r.id}
                            onToggle={()=> setOpenMenuId(prev => prev===r.id ? null : r.id)}
                            onClose={()=> setOpenMenuId(null)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Start Run</CardTitle></CardHeader>
        <CardContent>
          <StartRun datasetId={id} />
        </CardContent>
      </Card>

      {activeAgentRun && (
        <Card>
          <CardHeader><CardTitle>Agent in progress…</CardTitle></CardHeader>
          <CardContent>
            {agentSteps.length === 0 ? (
              <div className="token-muted text-sm">Waiting for planner steps…</div>
            ) : (
              <ol className="space-y-2 text-sm">
                {agentSteps.map((s:any)=> (
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
      <PreviewModal open={previewOpen} onClose={()=>setPreviewOpen(false)} csv={previewCSV} />
  {reportOpen && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
      <div className="bg-white text-black rounded-2xl shadow-xl w-full max-w-4xl p-6 border" style={{borderColor:'var(--ges-border)'}}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Report Preview</h3>
          <button className="px-3 py-1 rounded-md border text-neutral-800" style={{borderColor:'var(--ges-border)'}} onClick={()=>setReportOpen(false)}>Close</button>
        </div>
        <ReportView report={reportData||{}} />
      </div>
    </div>
  )}
</div>
  );
}
