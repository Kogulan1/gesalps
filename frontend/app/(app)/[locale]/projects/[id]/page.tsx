"use client";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProjectDetailContent } from "@/components/projects/ProjectDetailContent";

interface ProjectDetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DashboardHeader />
        <ProjectDetailContent />
      </div>
    </AuthGuard>
  );
}
