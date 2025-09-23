import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SettingsContent } from "@/components/dashboard/SettingsContent";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader />
      <SettingsContent />
    </div>
  );
}
