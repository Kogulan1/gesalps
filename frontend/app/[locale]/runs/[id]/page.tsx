"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/api";
import MetricCard from "@/components/runs/MetricCard";
import DownloadButton from "@/components/common/DownloadButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/runs/RunStatus";
import { previewRunSyntheticCSV, getRunReportJSON } from "@/lib/api";
import PreviewModal from "@/components/PreviewModal";
import ReportView from "@/components/runs/ReportView";
import { useToast } from "@/components/toast/Toaster";

export default function RunDetail() {
  const params = useParams<{id:string}>();
  const id = params.id;
  const [status,setStatus] = useState<any>({ status:'queued' });
  const [metrics,setMetrics] = useState<any|null>(null);
  const [artifacts,setArtifacts] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCSV, setPreviewCSV] = useState("");
  const [report, setReport] = useState<any|null>(null);
  const { toast } = useToast();

  useEffect(()=>{
    let alive = true;
    async function poll(){
      const r = await authedFetch(`/v1/runs/${id}/status`);
      if (!alive) return; if (r.ok){ const js=await r.json(); setStatus(js); if(js.status==='succeeded'){ loadFinal(); return; } }
      setTimeout(poll, 3000);
    }
    async function loadFinal(){
      const m = await authedFetch(`/v1/runs/${id}/metrics`); if (m.ok) setMetrics(await m.json());
      const a = await authedFetch(`/v1/runs/${id}/artifacts`); if (a.ok) setArtifacts(await a.json());
      try { const rj = await authedFetch(`/v1/runs/${id}/report`); if (rj.ok) setReport(await rj.json()); } catch {}
    }
    poll();
    return ()=>{alive=false};
  },[id]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Run</h1>
        <StatusBadge status={status.status} />
      </div>

      <Card>
        <CardHeader><CardTitle>Metrics</CardTitle></CardHeader>
        <CardContent>
          {metrics ? (
            <div className="grid md:grid-cols-3 gap-4">
              <MetricCard label="KS mean" value={metrics.utility?.ks_mean ?? null} />
              <MetricCard label="Corr Δ" value={metrics.utility?.corr_delta ?? null} />
              <MetricCard label="MIA AUC" value={metrics.privacy?.mia_auc ?? null} />
            </div>
          ) : (
            <div className="token-muted">Waiting for results…</div>
          )}
        </CardContent>
      </Card>

      {artifacts?.length>0 && (
        <Card>
          <CardHeader><CardTitle>Downloads</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-center">
            {artifacts.map((a:any)=>(
              <DownloadButton key={a.kind} href={a.signedUrl} label={a.kind} />
            ))}
            <button
              className="underline"
              onClick={async()=>{
                try { const csv = await previewRunSyntheticCSV(id); setPreviewCSV(csv); setPreviewOpen(true);} catch(e:any){ toast({ title:'Preview failed', description:String(e?.message||e), variant:'error'});} 
              }}
            >Preview synthetic_csv</button>
            <button
              className="underline"
              onClick={async()=>{
                try { const js = await getRunReportJSON(id); setReport(js);} catch(e:any){ toast({ title:'Load report failed', description:String(e?.message||e), variant:'error'});} 
              }}
            >View report</button>
            <button
              className="underline"
              onClick={async()=>{
                try {
                  const r = await authedFetch(`/v1/runs/${id}/report/pdf`,{ method:'POST' });
                  if (r.ok){ const { signedUrl } = await r.json(); if (signedUrl) window.open(signedUrl, '_blank'); }
                } catch(e:any){ toast({ title:'Generate PDF failed', description:String(e?.message||e), variant:'error'}); }
              }}
            >Generate report (PDF)</button>
</CardContent>
        </Card>
      )}
      {report && (
        <Card>
          <CardHeader><CardTitle>Report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ReportView report={report} />
            <button
              className="underline"
              onClick={async()=>{
                try {
                  const r = await authedFetch(`/v1/runs/${id}/report/pdf`,{ method:'POST' });
                  if (r.ok){ const { signedUrl } = await r.json(); if (signedUrl) window.open(signedUrl, '_blank'); }
                } catch(e:any){ toast({ title:'Generate PDF failed', description:String(e?.message||e), variant:'error'}); }
              }}
            >Generate report (PDF)</button>
          </CardContent>
        </Card>
      )}
      <PreviewModal open={previewOpen} onClose={()=>setPreviewOpen(false)} csv={previewCSV} />
    </div>
  );
}
