"use client";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { UsageContent } from "@/components/dashboard/UsageContent";

export default function UsagePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DashboardHeader />
        <UsageContent />
      </div>
    </AuthGuard>
  );
}
