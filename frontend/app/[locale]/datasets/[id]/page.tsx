"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SchemaTable from "@/components/tables/SchemaTable";
import { Button } from "@/components/ui/button";
import { authedFetch } from "@/lib/api";
import { useLocale } from "next-intl";

export default function DatasetDetail() {
  const params = useParams<{id:string, locale:string}>();
  const id = params.id;
  const locale = useLocale();
  const supabase = useMemo(()=>createSupabaseBrowserClient(),[]);
  const [ds,setDs] = useState<any|null>(null);
  const [method,setMethod] = useState('ctgan');
  const [mode,setMode] = useState('balanced');

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

  if (!ds) return <div className="mx-auto max-w-3xl px-4 py-8">Loading…</div>;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Card>
        <CardHeader><CardTitle>{ds.name}</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 token-muted">{ds.rows_count ?? '-'} rows • {ds.cols_count ?? '-'} cols</div>
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
    </div>
  );
}

