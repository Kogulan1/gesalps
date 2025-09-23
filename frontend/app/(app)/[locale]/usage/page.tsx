import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { UsageContent } from "@/components/dashboard/UsageContent";

export default function UsagePage() {
  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader />
      <UsageContent />
    </div>
  );
}
