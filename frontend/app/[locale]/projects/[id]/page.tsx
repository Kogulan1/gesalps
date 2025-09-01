"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileDropzone from "@/components/files/FileDropzone";
import { StatusBadge } from "@/components/runs/RunStatus";
import { authedFetch } from "@/lib/api";
import Link from "next/link";
import { useLocale } from "next-intl";

export default function ProjectDetail() {
  const params = useParams<{id:string, locale:string}>();
  const projectId = params.id;
  const locale = useLocale();
  const supabase = useMemo(()=>createSupabaseBrowserClient(),[]);
  const [datasets,setDatasets] = useState<any[]>([]);
  const [runs,setRuns] = useState<any[]>([]);

  async function load(){
    const { data:ds } = await supabase.from('datasets').select('*').eq('project_id', projectId).order('created_at',{ascending:false});
    const { data:rs } = await supabase.from('runs').select('*').eq('project_id', projectId).order('started_at',{ascending:false});
    setDatasets(ds||[]); setRuns(rs||[]);
  }
  useEffect(()=>{load();},[]);

  async function onUpload(file: File){
    const fd = new FormData();
    fd.append('project_id', projectId);
    fd.append('file', file);
    const r = await authedFetch('/v1/datasets/upload', { method:'POST', body: fd });
    if (r.ok) load();
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left token-muted">
                        <th className="py-2">Name</th>
                        <th className="py-2">Rows</th>
                        <th className="py-2">Created</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {datasets.map(d => (
                        <tr key={d.id} className="border-t" style={{borderColor:'var(--ges-border)'}}>
                          <td className="py-2">{d.name}</td>
                          <td className="py-2">{d.rows_count ?? '-'}</td>
                          <td className="py-2">{new Date(d.created_at).toLocaleString()}</td>
                          <td className="py-2 text-right"><Link className="underline" href={`/${locale}/datasets/${d.id}`}>Open</Link></td>
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left token-muted">
                        <th className="py-2">Status</th>
                        <th className="py-2">Method</th>
                        <th className="py-2">Started</th>
                        <th className="py-2">Finished</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map(r => (
                        <tr key={r.id} className="border-t" style={{borderColor:'var(--ges-border)'}}>
                          <td className="py-2"><StatusBadge status={r.status} /></td>
                          <td className="py-2">{r.method}</td>
                          <td className="py-2">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</td>
                          <td className="py-2">{r.finished_at ? new Date(r.finished_at).toLocaleString() : '—'}</td>
                          <td className="py-2 text-right"><Link className="underline" href={`/${locale}/runs/${r.id}`}>Open</Link></td>
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
    </div>
  );
}
