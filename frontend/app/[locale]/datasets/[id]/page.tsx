"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SchemaTable from "@/components/tables/SchemaTable";
import { Button } from "@/components/ui/button";
import { authedFetch, deleteDataset, previewDatasetCSV } from "@/lib/api";
import { useLocale } from "next-intl";
import { useToast } from "@/components/toast/Toaster";
import PreviewModal from "@/components/PreviewModal";

export default function DatasetDetail() {
  const params = useParams<{id:string, locale:string}>();
  const id = params.id;
  const locale = useLocale();
  const supabase = useMemo(()=>createSupabaseBrowserClient(),[]);
  const [ds,setDs] = useState<any|null>(null);
  const [method,setMethod] = useState('ctgan');
  const [mode,setMode] = useState('balanced');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCSV, setPreviewCSV] = useState("");
  const { toast } = useToast();

  useEffect(()=>{(async()=>{
    const { data } = await supabase.from('datasets').select('*').eq('id', id).single();
    setDs(data||null);
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
    </div>
  );
}
