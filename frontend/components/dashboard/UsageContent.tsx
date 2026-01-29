"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Play, 
  Activity, 
  HardDrive
} from "lucide-react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

interface UsageMetric {
  name: string;
  current: number;
  unit: string;
  icon: React.ReactNode;
}

export function UsageContent() {
  const t = useTranslations('dashboard');
  const [metrics, setMetrics] = useState<UsageMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${base}/v1/usage/stats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Construct detailed metrics from aggregated response
        const newMetrics: UsageMetric[] = [
          {
            name: "Active Projects",
            current: data.total_projects,
            unit: "projects",
            icon: <Activity className="h-4 w-4 text-indigo-500" />
          },
          {
            name: "Runs Executed",
            current: data.total_runs,
            unit: "runs",
            icon: <Play className="h-4 w-4 text-blue-500" />
          },
          {
            name: "Datasets",
            current: data.total_datasets,
            unit: "files",
            icon: <HardDrive className="h-4 w-4 text-orange-500" />
          },
          {
            name: "Rows Managed",
            current: data.total_rows_managed,
            unit: "rows",
            icon: <Database className="h-4 w-4 text-green-500" />
          }
        ];
        setMetrics(newMetrics);
      }
    } catch (error) {
      console.error("Failed to fetch usage stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Usage</h2>
        <p className="text-gray-600">Monitor your platform usage</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {metrics.map((metric) => {
          return (
            <Card key={metric.name} className="border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">{metric.name}</CardTitle>
                {metric.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  {metric.current.toLocaleString()} {metric.unit}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
