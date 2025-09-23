"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Grid3X3, 
  List, 
  Plus,
  Filter,
  SortAsc,
  MoreHorizontal,
  Eye,
  Download,
  Settings,
  Clock,
  Play,
  Activity,
  Lock,
  Zap,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { RenameModal } from "@/components/common/RenameModal";
import { ResultsModal } from "./ResultsModal";

export function RunsContent() {
  const t = useTranslations('dashboard');
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'status' | 'duration'>('created');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'running' | 'queued' | 'failed'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    runId: string | null;
    currentName: string;
  }>({
    isOpen: false,
    runId: null,
    currentName: ""
  });
  const [resultsModal, setResultsModal] = useState<{
    isOpen: boolean;
    runId: string | null;
    runName: string;
  }>({
    isOpen: false,
    runId: null,
    runName: ""
  });

  const handleRunEdit = (runId: string) => {
    const run = runs.find(r => r.id === runId);
    if (run) {
      setRenameModal({
        isOpen: true,
        runId: runId,
        currentName: run.name
      });
    }
  };

  const handleRunArchive = (runId: string) => {
    console.log('Archive run:', runId);
    // TODO: Implement run archive
  };

  const handleRunDelete = (runId: string) => {
    console.log('Delete run:', runId);
    // TODO: Implement run delete
  };

  const handleViewResults = (runId: string, runName: string) => {
    setResultsModal({
      isOpen: true,
      runId: runId,
      runName: runName
    });
  };

  const handleDownloadRun = async (runId: string, runName: string) => {
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${base}/v1/runs/${runId}/download`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download run: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${runName}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading run:', error);
    }
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!renameModal.runId) return;

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
      
      if (base) {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('No authentication token available');
        }

        const response = await fetch(`${base}/v1/runs/${renameModal.runId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: newName })
        });

        if (!response.ok) {
          throw new Error(`Failed to rename run: ${response.status}`);
        }
      }

      // Update local state
      setRuns(prev => prev.map(r => 
        r.id === renameModal.runId ? { ...r, name: newName } : r
      ));
      
      setRenameModal({ isOpen: false, runId: null, currentName: "" });
    } catch (error) {
      console.error('Error renaming run:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-yellow-100 text-yellow-800';
      case 'queued':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running':
        return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 60) {
      return `${Math.max(1, duration)}m`;
    } else if (duration < 1440) {
      return `${Math.floor(duration / 60)}h ${duration % 60}m`;
    } else {
      return `${Math.floor(duration / 1440)}d ${Math.floor((duration % 1440) / 60)}h`;
    }
  };

  const getMetricColor = (value: number, threshold: number) => {
    if (value >= threshold) return 'bg-green-500';
    if (value >= threshold * 0.7) return 'bg-orange-500';
    if (value >= threshold * 0.4) return 'bg-red-500';
    return 'bg-gray-300';
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      setError(null);

      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
      
      if (!base) {
        // Use mock data if no API base
        const mockRuns: Run[] = [
          {
            id: "run-1",
            name: "Synthesis Run Alpha",
            project_id: "proj-1",
            project_name: "Clinical Trial Alpha",
            dataset_id: "ds-1",
            dataset_name: "Clinical Trial Data Alpha",
            status: "Completed",
            started_at: "2024-01-15T10:30:00Z",
            finished_at: "2024-01-15T10:30:05Z",
            duration: 1,
            scores: {
              auroc: 0.87,
              c_index: 0.74,
              mia_auc: 0.56,
              dp_epsilon: 1.2,
              privacy_score: 0.85,
              utility_score: 0.78
            },
            metrics: {
              rows_generated: 1500,
              columns_generated: 25,
              privacy_audit_passed: true,
              utility_audit_passed: true,
              privacy: {
                mia_auc: 0.56,
                dup_rate: 0.03
              },
              utility: {
                ks_mean: 0.08,
                corr_delta: 0.12
              }
            },
            created_at: "2024-01-15T10:30:00Z"
          },
          {
            id: "run-2",
            name: "Patient Data Synthesis",
            project_id: "proj-1",
            project_name: "Clinical Trial Alpha",
            dataset_id: "ds-2",
            dataset_name: "Patient Demographics",
            status: "Running",
            started_at: "2024-01-16T09:15:00Z",
            finished_at: "2024-01-16T09:15:03Z",
            duration: 1,
            scores: {
              auroc: 0.82,
              c_index: 0.71,
              mia_auc: 0.58,
              dp_epsilon: 0.8,
              privacy_score: 0.88,
              utility_score: 0.75
            },
            metrics: {
              rows_generated: 800,
              columns_generated: 15,
              privacy_audit_passed: true,
              utility_audit_passed: false,
              privacy: {
                mia_auc: 0.58,
                dup_rate: 0.02
              },
              utility: {
                ks_mean: 0.12,
                corr_delta: 0.15
              }
            },
            created_at: "2024-01-16T09:15:00Z"
          },
          {
            id: "run-3",
            name: "Synthetic Data Generation",
            project_id: "proj-2",
            project_name: "Synthetic Data Beta",
            dataset_id: "ds-3",
            dataset_name: "Synthetic Data Beta",
            status: "Failed",
            started_at: "2024-01-10T09:15:00Z",
            finished_at: "2024-01-10T09:15:02Z",
            duration: 1,
            scores: {
              auroc: 0.0,
              c_index: 0.0,
              mia_auc: 0.0,
              dp_epsilon: 0.0,
              privacy_score: 0.0,
              utility_score: 0.0
            },
            metrics: {
              rows_generated: 0,
              columns_generated: 0,
              privacy_audit_passed: false,
              utility_audit_passed: false,
              privacy: {
                mia_auc: 0.0,
                dup_rate: 0.0
              },
              utility: {
                ks_mean: 0.0,
                corr_delta: 0.0
              }
            },
            created_at: "2024-01-10T09:15:00Z"
          },
          {
            id: "run-4",
            name: "Research Data Synthesis",
            project_id: "proj-3",
            project_name: "Research Project Gamma",
            dataset_id: "ds-4",
            dataset_name: "Research Data Gamma",
            status: "Completed",
            started_at: "2024-01-05T11:45:00Z",
            finished_at: "2024-01-05T11:45:08Z",
            duration: 1,
            scores: {
              auroc: 0.91,
              c_index: 0.79,
              mia_auc: 0.52,
              dp_epsilon: 1.5,
              privacy_score: 0.92,
              utility_score: 0.85
            },
            metrics: {
              rows_generated: 2000,
              columns_generated: 30,
              privacy_audit_passed: true,
              utility_audit_passed: true,
              privacy: {
                mia_auc: 0.52,
                dup_rate: 0.01
              },
              utility: {
                ks_mean: 0.06,
                corr_delta: 0.08
              }
            },
            created_at: "2024-01-05T11:45:00Z"
          }
        ];
        setRuns(mockRuns);
        return;
      }

      // Try to fetch from API, fallback to demo data on error
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('No authentication token available');
        }

        const response = await fetch(`${base}/dev/runs`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        setRuns(data);
      } catch (apiError) {
        console.log('API failed, using mock data:', apiError);
        // Fallback to mock data
        const mockRuns: Run[] = [
          {
            id: "run-1",
            name: "Synthesis Run Alpha",
            project_id: "proj-1",
            project_name: "Clinical Trial Alpha",
            dataset_id: "ds-1",
            dataset_name: "Clinical Trial Data Alpha",
            status: "Completed",
            started_at: "2024-01-15T10:30:00Z",
            finished_at: "2024-01-15T10:30:05Z",
            duration: 1,
            scores: {
              auroc: 0.87,
              c_index: 0.74,
              mia_auc: 0.56,
              dp_epsilon: 1.2,
              privacy_score: 0.85,
              utility_score: 0.78
            },
            metrics: {
              rows_generated: 1500,
              columns_generated: 25,
              privacy_audit_passed: true,
              utility_audit_passed: true,
              privacy: {
                mia_auc: 0.56,
                dup_rate: 0.03
              },
              utility: {
                ks_mean: 0.08,
                corr_delta: 0.12
              }
            },
            created_at: "2024-01-15T10:30:00Z"
          },
          {
            id: "run-2",
            name: "Patient Data Synthesis",
            project_id: "proj-1",
            project_name: "Clinical Trial Alpha",
            dataset_id: "ds-2",
            dataset_name: "Patient Demographics",
            status: "Running",
            started_at: "2024-01-16T09:15:00Z",
            finished_at: "2024-01-16T09:15:03Z",
            duration: 1,
            scores: {
              auroc: 0.82,
              c_index: 0.71,
              mia_auc: 0.58,
              dp_epsilon: 0.8,
              privacy_score: 0.88,
              utility_score: 0.75
            },
            metrics: {
              rows_generated: 800,
              columns_generated: 15,
              privacy_audit_passed: true,
              utility_audit_passed: false,
              privacy: {
                mia_auc: 0.58,
                dup_rate: 0.02
              },
              utility: {
                ks_mean: 0.12,
                corr_delta: 0.15
              }
            },
            created_at: "2024-01-16T09:15:00Z"
          },
          {
            id: "run-3",
            name: "Synthetic Data Generation",
            project_id: "proj-2",
            project_name: "Synthetic Data Beta",
            dataset_id: "ds-3",
            dataset_name: "Synthetic Data Beta",
            status: "Failed",
            started_at: "2024-01-10T09:15:00Z",
            finished_at: "2024-01-10T09:15:02Z",
            duration: 1,
            scores: {
              auroc: 0.0,
              c_index: 0.0,
              mia_auc: 0.0,
              dp_epsilon: 0.0,
              privacy_score: 0.0,
              utility_score: 0.0
            },
            metrics: {
              rows_generated: 0,
              columns_generated: 0,
              privacy_audit_passed: false,
              utility_audit_passed: false,
              privacy: {
                mia_auc: 0.0,
                dup_rate: 0.0
              },
              utility: {
                ks_mean: 0.0,
                corr_delta: 0.0
              }
            },
            created_at: "2024-01-10T09:15:00Z"
          },
          {
            id: "run-4",
            name: "Research Data Synthesis",
            project_id: "proj-3",
            project_name: "Research Project Gamma",
            dataset_id: "ds-4",
            dataset_name: "Research Data Gamma",
            status: "Completed",
            started_at: "2024-01-05T11:45:00Z",
            finished_at: "2024-01-05T11:45:08Z",
            duration: 1,
            scores: {
              auroc: 0.91,
              c_index: 0.79,
              mia_auc: 0.52,
              dp_epsilon: 1.5,
              privacy_score: 0.92,
              utility_score: 0.85
            },
            metrics: {
              rows_generated: 2000,
              columns_generated: 30,
              privacy_audit_passed: true,
              utility_audit_passed: true,
              privacy: {
                mia_auc: 0.52,
                dup_rate: 0.01
              },
              utility: {
                ks_mean: 0.06,
                corr_delta: 0.08
              }
            },
            created_at: "2024-01-05T11:45:00Z"
          }
        ];
        setRuns(mockRuns);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching runs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch runs');
      setLoading(false);
    }
  };

  const filteredRuns = runs.filter(run => {
    const matchesSearch = run.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         run.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         run.dataset_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || run.status.toLowerCase() === filterStatus;
    const matchesProject = filterProject === 'all' || run.project_id === filterProject;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const sortedRuns = [...filteredRuns].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'status':
        return a.status.localeCompare(b.status);
      case 'duration':
        return (b.duration || 0) - (a.duration || 0);
      default:
        return 0;
    }
  });

  // Group runs by project and then by dataset
  const groupedRuns = sortedRuns.reduce((acc, run) => {
    const projectId = run.project_id || 'unknown';
    const datasetId = run.dataset_id || 'unknown';
    
    if (!acc[projectId]) {
      acc[projectId] = {
        project: {
          id: projectId,
          name: run.project_name || 'Unknown Project'
        },
        datasets: {}
      };
    }
    
    if (!acc[projectId].datasets[datasetId]) {
      acc[projectId].datasets[datasetId] = {
        dataset: {
          id: datasetId,
          name: run.dataset_name || 'Unknown Dataset'
        },
        runs: []
      };
    }
    
    acc[projectId].datasets[datasetId].runs.push(run);
    return acc;
  }, {} as Record<string, { 
    project: { id: string; name: string }; 
    datasets: Record<string, { dataset: { id: string; name: string }; runs: DemoRun[] }> 
  }>);

  const uniqueProjects = Array.from(new Set(runs.map(r => r.project_id).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-gray-600">Loading runs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-red-500">⚠</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading runs</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchRuns} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
          <p className="text-gray-600">Monitor your data synthesis runs</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search runs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {filterProject === 'all' ? 'All Projects' : 'Project'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterProject('all')}>All Projects</DropdownMenuItem>
              {uniqueProjects.map(projectId => {
                const project = runs.find(r => r.project_id === projectId);
                return (
                  <DropdownMenuItem key={projectId} onClick={() => setFilterProject(projectId)}>
                    {project?.project_name || 'Unknown Project'}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {filterStatus === 'all' ? 'All Status' : filterStatus}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>All Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('completed')}>Completed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('running')}>Running</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('queued')}>Queued</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('failed')}>Failed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SortAsc className="h-4 w-4 mr-2" />
                Sort by {sortBy}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('name')}>Name</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('created')}>Created</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('status')}>Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('duration')}>Duration</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Runs List */}
      {sortedRuns.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">⚡</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filterStatus !== 'all' || filterProject !== 'all' ? 'No runs found' : 'No runs yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || filterStatus !== 'all' || filterProject !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Start a run from the datasets page to see results here'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedRuns).map(({ project, datasets }) => (
            <div key={project.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <Badge variant="outline" className="text-sm">
                  {Object.values(datasets).reduce((acc, d) => acc + d.runs.length, 0)} run{Object.values(datasets).reduce((acc, d) => acc + d.runs.length, 0) !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {Object.values(datasets).map(({ dataset, runs: datasetRuns }) => (
                <div key={dataset.id} className="space-y-3">
                  <h4 className="text-md font-medium text-gray-700 ml-4">{dataset.name}</h4>
                  
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                    {datasetRuns.map((run) => (
                      <Card key={run.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Play className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{run.name}</CardTitle>
                                <p className="text-sm text-gray-600 mt-1">{run.method}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(run.status)}
                              <Badge className={getStatusColor(run.status)}>
                                {run.status}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-2" />
                              Started {new Date(run.started_at).toLocaleDateString()}
                              {run.duration && (
                                <span className="ml-2">
                                  • {formatDuration(run.duration)}
                                </span>
                              )}
                            </div>
                            
                            {/* Metric Lines */}
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                <Lock className="h-3 w-3 text-gray-500" />
                                <div className="flex space-x-1">
                                  <div className={`w-1 h-6 rounded ${getMetricColor(run.privacy?.mia_auc || 0, 0.5)}`} title={`MIA AUC: ${run.privacy?.mia_auc || 0}`}></div>
                                  <div className={`w-1 h-6 rounded ${getMetricColor(run.privacy?.dup_rate || 0, 0.05)}`} title={`Dup Rate: ${run.privacy?.dup_rate || 0}`}></div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Zap className="h-3 w-3 text-gray-500" />
                                <div className="flex space-x-1">
                                  <div className={`w-1 h-6 rounded ${getMetricColor(run.utility?.ks_mean || 0, 0.1)}`} title={`KS Mean: ${run.utility?.ks_mean || 0}`}></div>
                                  <div className={`w-1 h-6 rounded ${getMetricColor(run.utility?.corr_delta || 0, 0.15)}`} title={`Corr Delta: ${run.utility?.corr_delta || 0}`}></div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-3">
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                                  title="View Results"
                                  onClick={() => handleViewResults(run.id, run.name)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                                  title="Download Report"
                                  onClick={() => handleDownloadRun(run.id, run.name)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleRunEdit(run.id)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRunArchive(run.id)}>
                                    Archive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleRunDelete(run.id)}
                                    className="text-red-600"
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <RenameModal
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, runId: null, currentName: "" })}
        onConfirm={handleRenameConfirm}
        currentName={renameModal.currentName}
        title="Rename Run"
        description="Enter a new name for this run."
        placeholder="Enter run name"
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