"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Database, 
  Play, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Activity,
  HardDrive,
  Cpu,
  Zap
} from "lucide-react";
import { useTranslations } from "next-intl";

interface UsageMetric {
  name: string;
  current: number;
  previous: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}

export function UsageContent() {
  const t = useTranslations('dashboard');
  const [metrics, setMetrics] = useState<UsageMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now
    const mockMetrics: UsageMetric[] = [
      {
        name: "Runs Executed",
        current: 47,
        previous: 32,
        unit: "runs",
        trend: "up",
        icon: <Play className="h-4 w-4 text-blue-500" />
      },
      {
        name: "Data Processed",
        current: 2.4,
        previous: 1.8,
        unit: "GB",
        trend: "up",
        icon: <Database className="h-4 w-4 text-green-500" />
      },
      {
        name: "Compute Hours",
        current: 156,
        previous: 142,
        unit: "hours",
        trend: "up",
        icon: <Cpu className="h-4 w-4 text-purple-500" />
      },
      {
        name: "Storage Used",
        current: 8.7,
        previous: 7.2,
        unit: "GB",
        trend: "up",
        icon: <HardDrive className="h-4 w-4 text-orange-500" />
      },
      {
        name: "API Calls",
        current: 1247,
        previous: 892,
        unit: "calls",
        trend: "up",
        icon: <Zap className="h-4 w-4 text-yellow-500" />
      },
      {
        name: "Active Projects",
        current: 3,
        previous: 3,
        unit: "projects",
        trend: "stable",
        icon: <Activity className="h-4 w-4 text-indigo-500" />
      }
    ];
    
    setMetrics(mockMetrics);
    setLoading(false);
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <div className="h-3 w-3 bg-gray-300 rounded-full" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6 bg-white text-black">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-white text-black">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Usage</h2>
        <p className="text-gray-600">Monitor your platform usage and limits</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const percentageChange = calculatePercentageChange(metric.current, metric.previous);
          
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
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-xs ${getTrendColor(metric.trend)}`}>
                    {percentageChange > 0 ? '+' : ''}{percentageChange}% from last month
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Previous: {metric.previous.toLocaleString()} {metric.unit}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-black">Usage Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Runs this month</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div className="w-3/4 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">75%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Storage usage</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div className="w-1/2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">50%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API calls</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div className="w-5/6 h-2 bg-purple-500 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">83%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-black">Plan Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly runs</span>
                <Badge className="bg-blue-100 text-blue-800">47 / 100</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Storage</span>
                <Badge className="bg-green-100 text-green-800">8.7GB / 50GB</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Projects</span>
                <Badge className="bg-purple-100 text-purple-800">3 / 10</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API calls</span>
                <Badge className="bg-yellow-100 text-yellow-800">1,247 / 5,000</Badge>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-black">Recent Usage Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <Play className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600">Run executed: fresh_run</span>
              </div>
              <span className="text-xs text-gray-500">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <Database className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">Dataset uploaded: sample_clinical_trial.csv</span>
              </div>
              <span className="text-xs text-gray-500">1 day ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-gray-600">API call: /v1/runs</span>
              </div>
              <span className="text-xs text-gray-500">3 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <Cpu className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-gray-600">Compute job completed</span>
              </div>
              <span className="text-xs text-gray-500">4 hours ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
