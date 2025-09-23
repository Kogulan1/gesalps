"use client";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProjectsContent } from "@/components/projects/ProjectsContent";

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DashboardHeader />
        <ProjectsContent />
      </div>
    </AuthGuard>
  );
}
