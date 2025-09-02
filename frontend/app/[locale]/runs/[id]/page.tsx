"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/api";
import MetricCard from "@/components/runs/MetricCard";
import DownloadButton from "@/components/common/DownloadButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [projectId,setProjectId] = useState<string|undefined>(undefined);
  const [csvModal,setCsvModal] = useState(false);
  const [jsonModal,setJsonModal] = useState(false);
  const [csvText,setCsvText] = useState("");
  const [reportJSON,setReportJSON] = useState<any>(null);

  useEffect(()=>{
    let alive = true;
    const supabase = createSupabaseBrowserClient();
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
    (async ()=>{ const rr = await supabase.from('runs').select('project_id').eq('id', id).single(); setProjectId(rr.data?.project_id); })();
    poll();
    return ()=>{alive=false};
  },[id]);

  const artifactsMap = useMemo(()=> toArtifactMap(artifacts || []), [artifacts]);

  async function onPreviewCSV(){ try { const txt = await previewRunSyntheticCSV(id); setCsvText(txt); setCsvModal(true); } catch { toast({ title: 'Could not preview CSV', variant: 'error' }); } }
  async function onPreviewJSON(){ try { const rpt = await getRunReportJSON(id); setReportJSON(rpt); setJsonModal(true); } catch { toast({ title: 'Could not load report', variant: 'error' }); } }
  // PDF preview removed: we render the full report below and offer a clean download

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {projectId && (<Link href={`/${'en'}/projects/${projectId}`} className="text-sm underline">← Back to Project</Link>)}
          <h1 className="text-2xl font-semibold">Run</h1>
        </div>
        <StatusBadge status={status.status} />
      </div>

      <Card>
        <CardHeader><CardTitle>Metrics</CardTitle></CardHeader>
        <CardContent>
          {status.status === 'failed' && (<div className="mb-6 rounded-md border border-red-200 bg-red-50 text-red-800 px-4 py-3">Run failed. Please check logs and try again.</div>)}
          {status.status !== 'succeeded' && status.status !== 'failed' && (<div className="mb-6 rounded-md border bg-gray-50 text-gray-700 px-4 py-3">This run is {status.status}. Artifacts will appear when finished.</div>)}
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

      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <button className="px-3 py-2 rounded-md border disabled:opacity-50" onClick={onPreviewCSV} disabled={status.status!=="succeeded" || !artifactsMap.synthetic_csv} title={status.status!=="succeeded"?"Run must complete":""}>Preview Synthetic CSV</button>
            <button className="px-3 py-2 rounded-md border disabled:opacity-50" onClick={onPreviewJSON} disabled={status.status!=="succeeded" || !artifactsMap.report_json} title={status.status!=="succeeded"?"Run must complete":""}>View Report (JSON)</button>
            {/* PDF preview removed; use download below */}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Downloads</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-center">
            {artifactsMap.synthetic_csv?.signedUrl && (
              <a href={forceDownloadUrl(artifactsMap.synthetic_csv.signedUrl!, 'synthetic.csv')} className="px-3 py-2 rounded-md border inline-flex items-center gap-2">Synthetic CSV <span className="text-xs token-muted">{fmtBytes(artifactsMap.synthetic_csv.bytes)}</span></a>
            )}
            {artifactsMap.report_json?.signedUrl && (
              <a href={forceDownloadUrl(artifactsMap.report_json.signedUrl!, 'report.json')} className="px-3 py-2 rounded-md border inline-flex items-center gap-2">Report JSON <span className="text-xs token-muted">{fmtBytes(artifactsMap.report_json.bytes)}</span></a>
            )}
            {artifactsMap.report_pdf?.signedUrl && (
              <a href={forceDownloadUrl(artifactsMap.report_pdf.signedUrl!, 'report.pdf')} className="px-3 py-2 rounded-md border inline-flex items-center gap-2">Report PDF <span className="text-xs token-muted">{fmtBytes(artifactsMap.report_pdf.bytes)}</span></a>
            )}
          </div>
          {!artifactsMap.synthetic_csv && !artifactsMap.report_json && !artifactsMap.report_pdf && (
            <div className="text-sm token-muted mt-2">No artifacts available yet.</div>
          )}
        </CardContent>
      </Card>
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
