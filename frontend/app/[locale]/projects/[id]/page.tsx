"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileDropzone from "@/components/files/FileDropzone";
import { StatusBadge } from "@/components/runs/RunStatus";
import RunMetricsCell from "@/components/runs/RunMetricsCell";
import { authedFetch, deleteDataset, previewDatasetCSV,deleteRun, renameRun } from "@/lib/api";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useToast } from "@/components/toast/Toaster";
import PreviewModal from "@/components/PreviewModal";

export default function ProjectDetail() {
  const params = useParams<{id:string, locale:string}>();
  const projectId = params.id;
  const locale = useLocale();
  const supabase = useMemo(()=>createSupabaseBrowserClient(),[]);
  const { toast } = useToast();
  const [datasets,setDatasets] = useState<any[]>([]);
  const [runs,setRuns] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCSV, setPreviewCSV] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string|null>(null);
  const [openDatasetMenuId, setOpenDatasetMenuId] = useState<string|null>(null);

  async function load(){
    const { data:ds } = await supabase.from('datasets').select('*').eq('project_id', projectId).order('created_at',{ascending:false});
    const { data:rs } = await supabase.from('runs').select('*').eq('project_id', projectId).order('started_at',{ascending:false});
    setDatasets(ds||[]); setRuns(rs||[]);
  }
  useEffect(()=>{load();},[]);

  // Realtime updates for runs (project-scoped)
  useEffect(()=>{
    const channel = supabase.channel(`runs_project_${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs', filter: `project_id=eq.${projectId}` }, (payload:any)=>{
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
  },[projectId, supabase]);

  // Close open run menu on outside click
  useEffect(()=>{
    function onDoc(){
      if (openMenuId) setOpenMenuId(null);
      if (openDatasetMenuId) setOpenDatasetMenuId(null);
    }
    if (openMenuId || openDatasetMenuId){
      document.addEventListener('click', onDoc);
      return ()=> document.removeEventListener('click', onDoc);
    }
  },[openMenuId, openDatasetMenuId]);

  async function onUpload(file: File){
    try {
      const fd = new FormData();
      fd.append('project_id', projectId);
      fd.append('file', file);
      const r = await authedFetch('/v1/datasets/upload', { method:'POST', body: fd });
      if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try {
          const body = await r.json();
          msg = body?.detail || body?.message || JSON.stringify(body);
        } catch {
          try { msg = await r.text(); } catch {}
        }
        toast({ title: 'Upload failed', description: msg, variant: 'error' });
        return;
      }
      toast({ title: 'Dataset uploaded', variant: 'success' });
      load();
    } catch (e:any) {
      toast({ title: 'Upload error', description: String(e?.message || e), variant: 'error' });
    }
  }

  async function onDeleteRun(id: string) {
  if (!confirm("Delete this run and all its artifacts? This cannot be undone.")) return;
  try {
    await deleteRun(id);
    setRuns(prev => prev.filter(r => r.id !== id));
    toast({ title: "Run deleted", variant: "success" });
  } catch (e: any) {
    toast({ title: "Delete failed", description: String(e?.message || e), variant: "error" });
  }
}

  function fmtDuration(start?: string, end?: string, status?: string){
    if(!start) return '—';
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : (status==='running'? Date.now() : NaN);
    if(!Number.isFinite(e)) return '—';
    let secs = Math.max(0, Math.floor((e - s)/1000));
    const h = Math.floor(secs/3600); secs -= h*3600;
    const m = Math.floor(secs/60); secs -= m*60;
    if (h>0) return `${h}h ${m}m`;
    if (m>0) return `${m}m ${secs}s`;
    return `${secs}s`;
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

  function RunMenu({ id, open, onToggle, onClose }: { id:string; open:boolean; onToggle:()=>void; onClose:()=>void }){
    return (
      <div className="relative inline-flex justify-end items-center">
        <button
          aria-label="Run actions"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-200 dark:hover:text-neutral-50 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          onClick={(e)=>{ e.stopPropagation(); setOpenDatasetMenuId(null); onToggle(); }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="3" cy="8" r="1.4"/>
            <circle cx="8" cy="8" r="1.4"/>
            <circle cx="13" cy="8" r="1.4"/>
          </svg>
        </button>
        {open && (
          <div className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 w-48 rounded-lg border shadow-lg z-50 bg-white text-black ring-1 ring-black/5 overflow-hidden" style={{borderColor:'var(--ges-border)'}}>
            <Link className="block px-3 py-2 hover:bg-neutral-50" href={`/${locale}/runs/${id}`} onClick={onClose}>Open</Link>
            <button className="block w-full text-left px-3 py-2 hover:bg-neutral-50" onClick={async ()=>{ onClose(); const cur=(runs.find(r=>r.id===id)?.name)||''; const name=prompt('Rename run', cur); if(name!==null){ try{ await renameRun(id, name.trim()); setRuns(prev=>prev.map(r=>r.id===id? {...r, name:name.trim()}:r)); }catch(e:any){ alert(`Rename failed: ${String(e?.message||e)}`);} } }}>Rename</button>
            <button className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50" onClick={()=>{ onClose(); onDeleteRun(id); }}>Delete</button>
          </div>
        )}
      </div>
    );
  }

  function DatasetMenu({ id, open, onToggle, onClose }: { id:string; open:boolean; onToggle:()=>void; onClose:()=>void }){
    return (
      <div className="relative inline-flex justify-end items-center">
        <button
          aria-label="Dataset actions"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-200 dark:hover:text-neutral-50 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          onClick={(e)=>{ e.stopPropagation(); setOpenMenuId(null); onToggle(); }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="3" cy="8" r="1.4"/>
            <circle cx="8" cy="8" r="1.4"/>
            <circle cx="13" cy="8" r="1.4"/>
          </svg>
        </button>
        {open && (
          <div className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 w-56 rounded-lg border shadow-lg z-50 bg-white text-black ring-1 ring-black/5 overflow-hidden" style={{borderColor:'var(--ges-border)'}}>
            <button className="block w-full text-left px-3 py-2 hover:bg-neutral-50" onClick={()=>{ onClose(); onPreview(id); }}>Preview</button>
            <Link className="block px-3 py-2 hover:bg-neutral-50" href={`/${locale}/datasets/${id}`} onClick={onClose}>Open</Link>
            <button className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50" onClick={()=>{ onClose(); onDelete(id); }}>Delete</button>
          </div>
        )}
      </div>
    );
  }

  async function onPreview(id: string){
    try {
      const csv = await previewDatasetCSV(id);
      setPreviewCSV(csv); setPreviewOpen(true);
    } catch(e:any){
      toast({ title: 'Preview failed', description: String(e?.message || e), variant: 'error' });
    }
  }

  async function onDelete(id: string){
    if (!confirm('Delete this dataset and all its runs/artifacts? This cannot be undone.')) return;
    try {
      await deleteDataset(id);
      setDatasets(prev=>prev.filter(d=>d.id!==id));
      toast({ title: 'Dataset deleted', variant: 'success' });
    } catch(e:any){
      toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'error' });
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-4">
          <Card>
            <CardHeader><CardTitle>Upload dataset</CardTitle></CardHeader>
            <CardContent>
              <FileDropzone onSelect={onUpload} />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-8 space-y-6">
          <Card>
            <CardHeader><CardTitle>Datasets</CardTitle></CardHeader>
            <CardContent>
              {datasets.length===0? (
                <div className="token-muted">No datasets yet.</div>
              ) : (
                <div className="overflow-visible">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left token-muted">
                        <th className="py-2">Name</th>
                        <th className="py-2">Rows</th>
                        <th className="py-2">Created</th>
                        <th className="py-2 text-right" style={{width:48}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasets.map(d => (
                        <tr key={d.id} className="border-t" style={{borderColor:'var(--ges-border)'}}>
                          <td className="py-2">
                            <Link
                              className="inline-flex items-center px-2 py-1 rounded hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                              href={`/${locale}/datasets/${d.id}`}
                            >
                              {d.name}
                            </Link>
                          </td>
                          <td className="py-2">{d.rows_count ?? '-'}</td>
                          <td className="py-2">{new Date(d.created_at).toLocaleString()}</td>
                          <td className="py-2 align-middle">
                            <div className="flex justify-end min-w-[48px]">
                              <DatasetMenu
                                id={d.id}
                                open={openDatasetMenuId===d.id}
                                onToggle={()=> setOpenDatasetMenuId(prev => prev===d.id ? null : d.id)}
                                onClose={()=> setOpenDatasetMenuId(null)}
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
            <CardHeader><CardTitle>Runs</CardTitle></CardHeader>
            <CardContent>
              {runs.length===0? (
                <div className="token-muted">No runs yet.</div>
              ) : (
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
                      {runs.map(r => (
                        <tr key={r.id} className="border-t" style={{borderColor:'var(--ges-border)'}}>
                          <td className="py-2">
                            <div className="max-w-[260px] truncate" title={r.name || r.id}>
                              <Link
                                className="inline-flex items-center px-2 py-1 rounded hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 whitespace-nowrap"
                                href={`/${locale}/runs/${r.id}`}
                              >
                                {r.name || r.id}
                              </Link>
                            </div>
                          </td>
                          <td className="py-2">{r.method}</td>
                          <td className="py-2"><StatusBadge status={r.status} /></td>
                          <td className="py-2">{fmtStartDate(r.started_at)}</td>
                          <td className="py-2">{r.started_at ? new Date(r.started_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '—'}</td>
                          <td className="py-2">{fmtDuration(r.started_at, r.finished_at, r.status)}</td>
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
        </div>
      </div>
      <PreviewModal open={previewOpen} onClose={()=>setPreviewOpen(false)} csv={previewCSV} />
    </div>
  );
}
