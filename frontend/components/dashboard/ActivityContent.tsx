
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Clock, 
  User, 
  Database, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BarChart3,
  FileText,
  Folder
} from "lucide-react";
import { useTranslations } from "next-intl";

interface ActivityItem {
  id: string;
  type: 'run_started' | 'run_completed' | 'run_failed' | 'dataset_uploaded' | 'project_created';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  project_name?: string;
  dataset_name?: string;
  run_name?: string;
  status?: 'success' | 'error' | 'warning' | 'info';
}

// Mock activity data - to be replaced with API call
const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    type: "run_completed",
    title: "Run completed successfully",
    description: "fresh_run finished with AUROC 0.87",
    timestamp: "2 hours ago",
    user: "kogulan1",
    project_name: "new project",
    dataset_name: "student_mental_health.csv",
    run_name: "fresh_run",
    status: "success"
  },
  {
    id: "act-2",
    type: "run_started",
    title: "New run started",
    description: "test_run is now running",
    timestamp: "4 hours ago",
    user: "kogulan1",
    project_name: "new project",
    dataset_name: "student_mental_health.csv",
    run_name: "test_run",
    status: "info"
  },
  {
    id: "act-3",
    type: "dataset_uploaded",
    title: "Dataset uploaded",
    description: "sample_clinical_trial.csv added to new project",
    timestamp: "1 day ago",
    user: "kogulan1",
    project_name: "new project",
    dataset_name: "sample_clinical_trial.csv",
    status: "success"
  },
  {
    id: "act-4",
    type: "project_created",
    title: "Project created",
    description: "new project was created",
    timestamp: "2 days ago",
    user: "kogulan1",
    project_name: "new project",
    status: "success"
  },
  {
    id: "act-5",
    type: "run_failed",
    title: "Run failed",
    description: "failed_run encountered an error",
    timestamp: "3 days ago",
    user: "kogulan1",
    project_name: "new project",
    dataset_name: "student_mental_health.csv",
    run_name: "failed_run",
    status: "error"
  }
];

export function ActivityContent() {
  const t = useTranslations('dashboard');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - to be replaced with API call
    setActivities(MOCK_ACTIVITIES);
    setLoading(false);
  }, []);

  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case 'run_started':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'run_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'run_failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'dataset_uploaded':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'project_created':
        return <Folder className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <h2 className="text-3xl font-bold tracking-tight">Activity</h2>
        <p className="text-gray-600">Monitor all activity across your projects</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{activities.length}</div>
            <p className="text-xs text-gray-500">+12% from last week</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Successful Runs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {activities.filter(a => a.type === 'run_completed').length}
            </div>
            <p className="text-xs text-gray-500">+8% from last week</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Failed Runs</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {activities.filter(a => a.type === 'run_failed').length}
            </div>
            <p className="text-xs text-gray-500">-2% from last week</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Datasets Uploaded</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {activities.filter(a => a.type === 'dataset_uploaded').length}
            </div>
            <p className="text-xs text-gray-500">+3 this week</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-black">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
              <p className="text-gray-500">Activity will appear here as you use the platform.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type, activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-black">{activity.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status || 'info'}
                        </Badge>
                        <span className="text-xs text-gray-500">{activity.timestamp}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{activity.user}</span>
                      </div>
                      {activity.project_name && (
                        <div className="flex items-center space-x-1">
                          <Folder className="h-3 w-3" />
                          <span>{activity.project_name}</span>
                        </div>
                      )}
                      {activity.dataset_name && (
                        <div className="flex items-center space-x-1">
                          <Database className="h-3 w-3" />
                          <span>{activity.dataset_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
