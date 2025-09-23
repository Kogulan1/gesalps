"use client";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RunsContent } from "@/components/runs/RunsContent";

export default function RunsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DashboardHeader />
        <RunsContent />
      </div>
    </AuthGuard>
  );
}
