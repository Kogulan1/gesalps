"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SchemaTable from "@/components/tables/SchemaTable";
import { Button } from "@/components/ui/button";
import { authedFetch, deleteDataset, previewDatasetCSV, previewRunSyntheticCSV, getRunReportJSON, getRunArtifacts, deleteRun } from "@/lib/api";
import { useLocale } from "next-intl";
import { useToast } from "@/components/toast/Toaster";
import PreviewModal from "@/components/PreviewModal";
import ReportView from "@/components/runs/ReportView";

export default function DatasetDetail() {
  const params = useParams<{id:string, locale:string}>();
  const id = params.id;
  const locale = useLocale();
  const supabase = useMemo(()=>createSupabaseBrowserClient(),[]);
  const [ds,setDs] = useState<any|null>(null);
  const [method,setMethod] = useState('ctgan');
  const [mode,setMode] = useState('balanced');
  const [runs,setRuns] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCSV, setPreviewCSV] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<any|null>(null);
  const { toast } = useToast();

  useEffect(()=>{(async()=>{
    const { data } = await supabase.from('datasets').select('*').eq('id', id).single();
    setDs(data||null);
    const rs = await supabase.from('runs').select('*').eq('dataset_id', id).order('started_at', { ascending:false });
    setRuns(rs.data||[]);
  })();},[id,supabase]);

  async function startRun(){
    const r = await authedFetch('/v1/runs',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ dataset_id:id, method, mode })});
    if (r.ok) {
      const { run_id } = await r.json();
      location.href = `/${locale}/runs/${run_id}`;
    }
  }

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

  function RunMenu({ id }: { id:string }){
    const [open,setOpen] = useState(false);
    return (
      <div className="relative inline-block text-left">
        <button className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={()=>setOpen(v=>!v)}>⋯</button>
        {open && (
          <div className="absolute right-0 mt-1 w-44 rounded-md border bg-white dark:bg-neutral-900 shadow z-10" style={{borderColor:'var(--ges-border)'}}>
            <button className="block w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800" onClick={()=>{setOpen(false); onRunPreviewCSV(id);}}>Preview CSV</button>
            <button className="block w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800" onClick={()=>{setOpen(false); onRunPreviewReport(id);}}>Preview Report</button>
            <button className="block w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800" onClick={()=>{setOpen(false); onRunDownloadCSV(id);}}>Download CSV</button>
            <button className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={()=>{setOpen(false); onRunDelete(id);}}>Delete Run</button>
          </div>
        )}
      </div>
    );
  }

  if (!ds) return <div className="mx-auto max-w-3xl px-4 py-8">Loading…</div>;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Card>
        <CardHeader><CardTitle>{ds.name}</CardTitle></CardHeader>
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
          {runs.length===0? (<div className="token-muted">No runs yet.</div>) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left token-muted">
                    <th className="py-2">Status</th>
                    <th className="py-2">Method</th>
                    <th className="py-2">Started</th>
                    <th className="py-2">Finished</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r:any)=> (
                    <tr key={r.id} className="border-t" style={{borderColor:'var(--ges-border)'}}>
                      <td className="py-2">{r.status}</td>
                      <td className="py-2">{r.method}</td>
                      <td className="py-2">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</td>
                      <td className="py-2">{r.finished_at ? new Date(r.finished_at).toLocaleString() : '—'}</td>
                      <td className="py-2 text-right"><RunMenu id={r.id} /></td>
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
          <div className="flex flex-wrap items-center gap-3">
            <select value={method} onChange={e=>setMethod(e.target.value)} className="rounded-2xl border px-3 py-2" style={{borderColor:'var(--ges-border)'}}>
              <option value="ctgan">CTGAN</option>
              <option value="tvae">TVAE</option>
            </select>
            <select value={mode} onChange={e=>setMode(e.target.value)} className="rounded-2xl border px-3 py-2" style={{borderColor:'var(--ges-border)'}}>
              <option value="privacy-first">privacy-first</option>
              <option value="balanced">balanced</option>
              <option value="utility-first">utility-first</option>
            </select>
            <Button className="rounded-2xl" onClick={startRun}>Start</Button>
          </div>
        </CardContent>
      </Card>
      <PreviewModal open={previewOpen} onClose={()=>setPreviewOpen(false)} csv={previewCSV} />
  {reportOpen && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-4xl p-6 border" style={{borderColor:'var(--ges-border)'}}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Report Preview</h3>
          <button className="px-3 py-1 rounded-md border" style={{borderColor:'var(--ges-border)'}} onClick={()=>setReportOpen(false)}>Close</button>
        </div>
        <ReportView report={reportData||{}} />
      </div>
    </div>
  )}
</div>
  );
}
