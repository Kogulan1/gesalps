"use client";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RunsContent } from "@/components/runs/RunsContent";

import { Suspense } from "react";

function RunsContentWrapper() {
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');
  
  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader />
      <RunsContent initialRunId={runId || undefined} />
    </div>
  );
}

export default function RunsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <RunsContentWrapper />
      </Suspense>
    </AuthGuard>
  );
}
