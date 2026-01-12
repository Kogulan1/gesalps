"use client";

import { useSearchParams, useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { NewRunLayout } from "@/components/runs/NewRunLayout";

export default function NewRunPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const datasetId = searchParams.get('datasetId');
  
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <NewRunLayout projectId={projectId} initialDatasetId={datasetId || undefined} />
        </main>
      </div>
    </AuthGuard>
  );
}
