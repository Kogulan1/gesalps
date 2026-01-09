"use client";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RunsContent } from "@/components/runs/RunsContent";

export default function RunsPage() {
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');
  
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DashboardHeader />
        <RunsContent initialRunId={runId || undefined} />
      </div>
    </AuthGuard>
  );
}
