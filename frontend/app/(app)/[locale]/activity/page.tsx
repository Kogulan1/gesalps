"use client";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ActivityContent } from "@/components/dashboard/ActivityContent";

export default function ActivityPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DashboardHeader />
        <ActivityContent />
      </div>
    </AuthGuard>
  );
}
