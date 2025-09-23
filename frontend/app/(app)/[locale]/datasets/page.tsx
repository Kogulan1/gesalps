"use client";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DatasetsContent } from "@/components/datasets/DatasetsContent";

export default function DatasetsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DashboardHeader />
        <DatasetsContent />
      </div>
    </AuthGuard>
  );
}
