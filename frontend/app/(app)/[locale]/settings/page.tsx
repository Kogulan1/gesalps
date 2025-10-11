"use client";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SettingsContent } from "@/components/dashboard/SettingsContent";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DashboardHeader />
        <SettingsContent />
      </div>
    </AuthGuard>
  );
}
