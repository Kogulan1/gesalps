"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Database,
  Play,
  Upload,
  Settings,
  MoreHorizontal,
  Clock,
  Activity,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Download,
  Eye,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { getUserFriendlyErrorMessage } from "@/lib/errorMessages";
import { ResultsModal } from "@/components/runs/ResultsModal";
import { DatasetPreviewModal } from "@/components/datasets/DatasetPreviewModal";
import { downloadAllArtifactsZip } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  status: "Active" | "Running" | "Ready" | "Failed";
  datasets_count: number;
  runs_count: number;
  last_activity: string;
}

interface Dataset {
  id: string;
  name: string;
  file_name: string;
  file_size: number;
  rows: number;
  columns: number;
  created_at: string;
  status: "Uploaded" | "Processing" | "Ready" | "Failed";
  runs_count: number;
}

interface Run {
  id: string;
  name: string;
  dataset_name: string;
  status: "Running" | "Completed" | "Failed" | "Queued";
  started_at: string;
  completed_at?: string;
  duration?: number;
  scores: {
    auroc: number;
    c_index: number;
    mia_auc: number;
    privacy_score: number;
    utility_score: number;
  };
}

export function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('dashboard');
  const [project, setProject] = useState<Project | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [usingMockData, setUsingMockData] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; dataset: Dataset | null }>({
    isOpen: false,
    dataset: null
  });
  const [resultsModal, setResultsModal] = useState<{ isOpen: boolean; runId: string | null; runName: string }>({
    isOpen: false,
    runId: null,
    runName: ""
  });

  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchMockProjectData = () => {
    // Mock data for demo when project doesn't exist in database
    const mockProject: Project = {
      id: projectId,
      name: "Clinical Trial Alpha",
      description: "Synthetic data generation for clinical trial research",
      owner_id: "user-123",
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-16T14:20:00Z",
      status: "Active",
      datasets_count: 3,
      runs_count: 5,
      last_activity: "2 hours ago"
    };

    const mockDatasets: Dataset[] = [
      {
        id: "ds-1",
        name: "Clinical Trial Data Alpha",
        file_name: "clinical_trial_alpha.csv",
        file_size: 2048576,
        rows: 1500,
        columns: 25,
        created_at: "2024-01-15T10:30:00Z",
        status: "Ready",
        runs_count: 3
      },
      {
        id: "ds-2",
        name: "Patient Demographics",
        file_name: "patient_demographics.csv",
        file_size: 1024000,
        rows: 800,
        columns: 15,
        created_at: "2024-01-14T14:20:00Z",
        status: "Ready",
        runs_count: 1
      },
      {
        id: "ds-3",
        name: "Treatment Outcomes",
        file_name: "treatment_outcomes.csv",
        file_size: 1536000,
        rows: 1200,
        columns: 20,
        created_at: "2024-01-13T09:15:00Z",
        status: "Processing",
        runs_count: 0
      }
    ];

    const mockRuns: Run[] = [
      {
        id: "run-1",
        name: "Synthesis Run Alpha",
        dataset_name: "Clinical Trial Data Alpha",
        status: "Completed",
        started_at: "2024-01-15T10:30:00Z",
        completed_at: "2024-01-15T11:45:00Z",
        duration: 75,
        scores: {
          auroc: 0.87,
          c_index: 0.74,
          mia_auc: 0.56,
          privacy_score: 0.85,
          utility_score: 0.78
        }
      },
      {
        id: "run-2",
        name: "Patient Data Synthesis",
        dataset_name: "Patient Demographics",
        status: "Running",
        started_at: "2024-01-16T09:15:00Z",
        duration: 45,
        scores: {
          auroc: 0.0,
          c_index: 0.0,
          mia_auc: 0.0,
          privacy_score: 0.0,
          utility_score: 0.0
        }
      },
      {
        id: "run-3",
        name: "Outcome Analysis",
        dataset_name: "Treatment Outcomes",
        status: "Failed",
        started_at: "2024-01-13T09:15:00Z",
        completed_at: "2024-01-13T10:30:00Z",
        duration: 75,
        scores: {
          auroc: 0.0,
          c_index: 0.0,
          mia_auc: 0.0,
          privacy_score: 0.0,
          utility_score: 0.0
        }
      }
    ];

    setProject(mockProject);
    setDatasets(mockDatasets);
    setRuns(mockRuns);
  };

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE;
      
      if (!baseUrl) {
        throw new Error('Backend API base URL not configured. Please set NEXT_PUBLIC_BACKEND_API_BASE environment variable.');
      }

      const url = `${baseUrl}/v1/projects/${projectId}`;
      
      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (fetchError) {
        // Network error (CORS, connection refused, etc.)
        const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown network error';
        console.error('Network error fetching project:', {
          url,
          error: errorMsg,
          baseUrl,
          projectId
        });
        
        // Provide more helpful error message
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
          throw new Error(
            `Cannot connect to backend API at ${baseUrl}. ` +
            `This could be due to CORS issues, network connectivity, or the API server being down. ` +
            `Please check your network connection and ensure the backend is running.`
          );
        }
        throw new Error(`Network error: ${errorMsg}`);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        if (response.status === 404) {
          throw new Error(`Project not found. The project with ID "${projectId}" does not exist or you don't have access to it.`);
        }
        throw new Error(`Failed to fetch project: ${response.status} - ${errorText}`);
      }

      const projectData = await response.json();
      
      // Transform the API response to match our interface
      const transformedProject: Project = {
        id: projectData.id,
        name: projectData.name,
        description: projectData.description || "No description provided",
        owner_id: projectData.owner_id,
        created_at: projectData.created_at,
        updated_at: projectData.updated_at,
        status: projectData.status,
        datasets_count: projectData.datasets_count,
        runs_count: projectData.runs_count,
        last_activity: projectData.last_activity
      };

      // Transform datasets
      const transformedDatasets: Dataset[] = (projectData.datasets || []).map((ds: any) => ({
        id: ds.id,
        name: ds.name,
        file_name: ds.file_name,
        file_size: ds.file_size || 0,
        rows: ds.rows || 0,
        columns: ds.columns || 0,
        created_at: ds.created_at,
        status: ds.status || "Ready",
        runs_count: 0 // This would need to be calculated separately
      }));

      // Transform runs
      const transformedRuns: Run[] = (projectData.runs || []).map((run: any) => ({
        id: run.id,
        name: run.name,
        dataset_name: run.dataset_name || "Unknown Dataset", // Use dataset_name from API
        status: run.status === "succeeded" ? "Completed" : 
                run.status === "running" ? "Running" :
                run.status === "failed" ? "Failed" : "Queued",
        started_at: run.started_at,
        completed_at: run.completed_at || run.finished_at, // Use completed_at from API if available
        duration: (run.completed_at || run.finished_at) && run.started_at ? 
          Math.round((new Date(run.completed_at || run.finished_at).getTime() - new Date(run.started_at).getTime()) / 60000) : undefined,
        scores: {
          auroc: 0.0,
          c_index: 0.0,
          mia_auc: 0.0,
          privacy_score: 0.0,
          utility_score: 0.0
        }
      }));

      setProject(transformedProject);
      setDatasets(transformedDatasets);
      setRuns(transformedRuns);
      setUsingMockData(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching project data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project data';
      
      // Log detailed error information for debugging
      console.error('Project fetch error details:', {
        projectId,
        baseUrl: process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE,
        error: errorMessage,
        errorType: err instanceof TypeError ? 'TypeError' : err instanceof Error ? err.constructor.name : 'Unknown'
      });
      
      // Determine if this is a network error (connection refused, CORS) vs API error (404, 401, 403)
      const isNetworkError = (
        errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('Network error') ||
        errorMessage.includes('Cannot connect to backend')
      ) && !errorMessage.includes('404') && 
         !errorMessage.includes('401') &&
         !errorMessage.includes('403') &&
         !errorMessage.includes('Project not found');
      
      // Only use mock data for actual network failures (connection refused, CORS)
      // Never use mock data for API errors (404, 401, 403) - always show error UI
      if (isNetworkError) {
        // Network error - API might be down, use mock data as fallback
        console.warn('Network error detected, using mock data as fallback');
        setUsingMockData(true);
        fetchMockProjectData();
      } else {
        // API error (404, 401, 403) or other errors - show error UI, no mock data
        setUsingMockData(false);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
      case "Ready":
      case "Completed": return "bg-green-100 text-green-800";
      case "Running":
      case "Processing": return "bg-blue-100 text-blue-800";
      case "Failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
      case "Ready":
      case "Completed": return <CheckCircle className="h-4 w-4" />;
      case "Running":
      case "Processing": return <Activity className="h-4 w-4" />;
      case "Failed": return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading project...</p>
        </div>
      </div>
    );
  }

  // Show error UI for API errors (404, 401, 403) - never use mock data for these
  // Only show error if we're not using mock data (which is only for network failures)
  if (error && !usingMockData && !project) {
    // Determine if this is a network error (for troubleshooting tips) vs API error
    const isNetworkError = (
      error.includes('Cannot connect to backend') || 
      error.includes('Network error') ||
      error.includes('Failed to fetch')
    ) && !error.includes('404') && 
       !error.includes('401') &&
       !error.includes('403') &&
       !error.includes('Project not found');
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-500">⚠</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading project</h3>
          <p className="text-gray-500 mb-4 text-sm">{getUserFriendlyErrorMessage(error)}</p>
          
          {/* Only show troubleshooting tips for actual network errors, not API errors */}
          {isNetworkError && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-left">
              <p className="text-sm text-yellow-800 font-medium mb-1">Troubleshooting:</p>
              <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
                <li>Check if the backend API is running</li>
                <li>Verify CORS settings on the backend</li>
                <li>Check your network connection</li>
                <li>Verify NEXT_PUBLIC_BACKEND_API_BASE is set correctly</li>
              </ul>
            </div>
          )}
          
          <div className="flex items-center justify-center space-x-4">
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
            <Button onClick={() => {
              setError(null);
              setLoading(true);
              fetchProjectData();
            }} variant="default">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If no project and not loading, show error
  if (!project && !loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">⚠</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
          <p className="text-gray-500 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => router.push('/en/projects')} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {usingMockData && (
          <div className="mb-6 rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Showing demo project data while the backend API is unavailable or project not found in database.
          </div>
        )}
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shadow-sm">
                <Database className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-black">{project.name}</h1>
                  <Badge className={getStatusColor(project.status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(project.status)}
                      <span>{project.status}</span>
                    </div>
                  </Badge>
                </div>
                {project.description && (
                  <p className="text-gray-600 text-lg">{project.description}</p>
                )}
                <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Created {formatDate(project.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Activity className="h-4 w-4" />
                    <span>Last activity: {project.last_activity}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
                onClick={() => router.push(`/en/datasets?project=${projectId}`)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Dataset
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => router.push(`/en/datasets?project=${projectId}`)}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Run
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Datasets</p>
                  <p className="text-2xl font-bold text-black">{project.datasets_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Runs</p>
                  <p className="text-2xl font-bold text-black">{project.runs_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-black">
                    {project.runs_count > 0 ? 
                      Math.round((runs.filter(r => r.status === "Completed").length / project.runs_count) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Team Members</p>
                  <p className="text-2xl font-bold text-black">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="datasets">Datasets ({datasets.length})</TabsTrigger>
            <TabsTrigger value="runs">Runs ({runs.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Run "Synthesis Run Alpha" completed successfully</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Dataset "Patient Demographics" uploaded</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Run "Outcome Analysis" failed</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Settings */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Project Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Privacy Level</span>
                    <Badge className="bg-green-100 text-green-800">High</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Data Retention</span>
                    <span className="text-sm text-gray-900">90 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Auto-cleanup</span>
                    <Badge className="bg-blue-100 text-blue-800">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Team Access</span>
                    <span className="text-sm text-gray-900">3 members</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Datasets Tab */}
          <TabsContent value="datasets" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">Datasets in this project</h3>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => router.push(`/en/datasets?project=${projectId}`)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Dataset
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {datasets.map((dataset) => (
                <Card key={dataset.id} className="hover:shadow-md transition-shadow border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shadow-sm">
                          <FileText className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-black">{dataset.name}</h4>
                            <Badge className={getStatusColor(dataset.status)}>
                              {dataset.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{dataset.file_name}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{dataset.rows.toLocaleString()} rows</span>
                            <span>{dataset.columns} columns</span>
                            <span>{formatFileSize(dataset.file_size)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-gray-700 border-gray-300 hover:bg-gray-50"
                          onClick={() => {
                            setPreviewModal({ isOpen: true, dataset });
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-gray-700 border-gray-300 hover:bg-gray-50"
                          onClick={() => router.push(`/en/runs?dataset=${dataset.id}`)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Run
                        </Button>
                      </div>
                      <span className="text-xs text-gray-500">{dataset.runs_count} runs</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Runs Tab */}
          <TabsContent value="runs" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">Runs in this project</h3>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => router.push(`/en/datasets?project=${projectId}`)}
              >
                <Play className="h-4 w-4 mr-2" />
                Start New Run
              </Button>
            </div>
            
            <div className="space-y-4">
              {runs.map((run) => (
                <Card key={run.id} className="hover:shadow-md transition-shadow border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shadow-sm">
                          <BarChart3 className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-black">{run.name}</h4>
                            <Badge className={getStatusColor(run.status)}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(run.status)}
                                <span>{run.status}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">Dataset: {run.dataset_name}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Started {formatDate(run.started_at)}</span>
                            {run.duration && <span>Duration: {run.duration}m</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {run.status === "Completed" && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Performance Scores</h5>
                        <div className="grid grid-cols-5 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">{run.scores.auroc.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">AUROC</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{run.scores.c_index.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">C-Index</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{run.scores.mia_auc.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">MIA AUC</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">{run.scores.privacy_score.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">Privacy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{run.scores.utility_score.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">Utility</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-gray-700 border-gray-300 hover:bg-gray-50"
                          onClick={() => {
                            setResultsModal({ isOpen: true, runId: run.id, runName: run.name });
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-gray-700 border-gray-300 hover:bg-gray-50"
                          onClick={async () => {
                            try {
                              await downloadAllArtifactsZip(run.id);
                            } catch (error) {
                              console.error('Error downloading artifacts:', error);
                              alert('Failed to download artifacts');
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Project Activity Log</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Run "Synthesis Run Alpha" completed successfully</p>
                      <p className="text-xs text-gray-500">2 hours ago • AUROC: 0.87, Privacy: 0.85</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Dataset "Patient Demographics" uploaded and processed</p>
                      <p className="text-xs text-gray-500">1 day ago • 800 rows, 15 columns</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Run "Outcome Analysis" failed due to insufficient data</p>
                      <p className="text-xs text-gray-500">3 days ago • Error: Data validation failed</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Project created</p>
                      <p className="text-xs text-gray-500">1 week ago • Initial setup completed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <DatasetPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, dataset: null })}
        dataset={previewModal.dataset ? {
          id: previewModal.dataset.id,
          name: previewModal.dataset.name,
          description: previewModal.dataset.name,
          file_path: previewModal.dataset.file_name,
          size: `${(previewModal.dataset.file_size / 1024 / 1024).toFixed(2)} MB`,
          rows: previewModal.dataset.rows,
          columns: previewModal.dataset.columns
        } : null}
      />

      <ResultsModal
        isOpen={resultsModal.isOpen}
        onClose={() => setResultsModal({ isOpen: false, runId: null, runName: "" })}
        runId={resultsModal.runId}
        runName={resultsModal.runName}
      />
    </div>
  );
}
