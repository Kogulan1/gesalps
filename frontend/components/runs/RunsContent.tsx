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
  XCircle,
  Edit,
  Archive,
  Trash2,
  StopCircle,
  Loader2
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
import { RunDetailsExpansion } from "@/components/runs/RunDetailsExpansion";
import Progress from "@/components/ui/progress";

interface Run {
  id: string;
  name: string;
  project_id: string;
  project_name: string;
  dataset_id: string;
  dataset_name: string;
  status: string;
  method?: string;
  started_at: string;
  finished_at?: string;
  duration?: number;
  scores: {
    auroc: number;
    c_index: number;
    mia_auc: number;
    dp_epsilon: number;
    privacy_score: number;
    utility_score: number;
  };
  metrics: {
    rows_generated: number;
    columns_generated: number;
    privacy_audit_passed: boolean;
    utility_audit_passed: boolean;
    privacy: {
      mia_auc: number;
      dup_rate: number;
    };
    utility: {
      ks_mean: number;
      corr_delta: number;
    };
  };
  privacy?: {
    mia_auc: number;
    dup_rate: number;
  };
  utility?: {
    ks_mean: number;
    corr_delta: number;
  };
  created_at: string;
}

const DEMO_RUNS: Run[] = [
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
      auroc: 0,
      c_index: 0,
      mia_auc: 0,
      dp_epsilon: 0,
      privacy_score: 0,
      utility_score: 0
    },
    metrics: {
      rows_generated: 0,
      columns_generated: 0,
      privacy_audit_passed: false,
      utility_audit_passed: false,
      privacy: {
        mia_auc: 0,
        dup_rate: 0
      },
      utility: {
        ks_mean: 0,
        corr_delta: 0
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

export function RunsContent() {
  const t = useTranslations('dashboard');
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);
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
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runSteps, setRunSteps] = useState<Record<string, any[]>>({}); // Track steps for each run
  const [cancellingRunId, setCancellingRunId] = useState<string | null>(null);

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

  const handleViewResults = (runId: string, runName: string, event?: React.MouseEvent) => {
    // Prevent event bubbling
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    console.log('handleViewResults called:', { runId, currentExpanded: expandedRunId });
    
    // Toggle expansion: if already expanded, collapse; otherwise expand
    if (expandedRunId === runId) {
      console.log('Collapsing run:', runId);
      setExpandedRunId(null);
    } else {
      console.log('Expanding run:', runId);
      setExpandedRunId(runId);
    }
  };

  const handleCloseExpansion = () => {
    setExpandedRunId(null);
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

  const getStatusColor = (status: string | undefined) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'completed':
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'completed with failures':
        return 'bg-orange-100 text-orange-800';
      case 'running':
        return 'bg-yellow-100 text-yellow-800';
      case 'queued':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running':
        return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleRenameRun = (runId: string, currentName: string) => {
    setRenameModal({
      isOpen: true,
      runId: runId,
      currentName: currentName
    });
  };

  const handleArchiveRun = (runId: string) => {
    console.log('Archive run:', runId);
    // TODO: Implement archive functionality
  };

      const handleCancelRun = async (runId: string) => {
        if (!window.confirm('Cancel this run? This action cannot be undone.')) return;
        
        setCancellingRunId(runId);
        try {
          const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
          if (!base) {
            throw new Error('Backend API URL not configured');
          }

          const supabase = createSupabaseBrowserClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error('No authentication token available');
          }

          const response = await fetch(`${base}/v1/runs/${runId}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to cancel run: ${response.status} - ${errorText}`);
          }

          // Update local state
          setRuns(prev => prev.map(r => 
            r.id === runId ? { ...r, status: 'cancelled' } : r
          ));

          // Close expansion if this run was expanded
          if (expandedRunId === runId) {
            setExpandedRunId(null);
          }
        } catch (err) {
          console.error('Error cancelling run:', err);
          alert(`Failed to cancel run: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          setCancellingRunId(null);
        }
      };

      const handleDeleteRun = async (runId: string) => {
        try {
          const confirmed = window.confirm('Delete this run? This action cannot be undone.');
          if (!confirmed) return;

          const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
          
          if (!base) {
            alert('Backend API URL not configured. Please set NEXT_PUBLIC_BACKEND_API_BASE in Vercel environment variables.');
            console.error('[Delete Run] NEXT_PUBLIC_BACKEND_API_BASE is not set');
            return;
          }

          const supabase = createSupabaseBrowserClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) throw new Error('No authentication token available');

          const url = `${base}/v1/runs/${runId}`;
          console.log(`[Delete Run] Calling: DELETE ${url}`);

          const res = await fetch(url, {
            method: 'DELETE',
            headers: { 
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
          });
          
          if (!res.ok) {
            const msg = await res.text();
            console.error(`[Delete Run] API Error ${res.status}:`, msg);
            throw new Error(`API ${res.status}: ${msg || 'Failed to delete run'}`);
          }

          // Close expansion if this run was expanded
          if (expandedRunId === runId) {
            setExpandedRunId(null);
          }
          
          // Remove from UI
          setRuns(prev => prev.filter(r => r.id !== runId));
          console.log(`[Delete Run] Successfully deleted run ${runId}`);
        } catch (err) {
          console.error('Error deleting run:', err);
          alert(`Failed to delete run: ${err instanceof Error ? err.message : String(err)}`);
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

  // Poll for running/queued runs to get real-time updates
  useEffect(() => {
    const hasActiveRuns = runs.some(r => r.status === 'running' || r.status === 'queued');
    if (!hasActiveRuns) return;

    const pollInterval = setInterval(async () => {
      const activeRuns = runs.filter(r => r.status === 'running' || r.status === 'queued');
      if (activeRuns.length === 0) return;

      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
      if (!base) return;

      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const headers = {
          'Authorization': `Bearer ${session.access_token}`,
        };

        // Update status and steps for each active run
        for (const run of activeRuns) {
          try {
            // Fetch status
            const statusRes = await fetch(`${base}/v1/runs/${run.id}/status`, { headers });
            if (statusRes.ok) {
              const status = await statusRes.json();
              setRuns(prev => prev.map(r => 
                r.id === run.id ? { ...r, status: status.status } : r
              ));
            }

            // Fetch steps for progress calculation
            const stepsRes = await fetch(`${base}/v1/runs/${run.id}/steps`, { headers });
            if (stepsRes.ok) {
              const steps = await stepsRes.json();
              setRunSteps(prev => ({ ...prev, [run.id]: steps || [] }));
            }
          } catch (err) {
            console.error(`Error polling run ${run.id}:`, err);
          }
        }
      } catch (err) {
        console.error('Error polling runs:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [runs]);

  // Close expansion only when clicking on another run's view button (not automatic click-outside)
  // This prevents accidental closure and allows users to interact with the expansion freely

  const fetchRuns = async () => {
    setLoading(true);
    setError(null);

    const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';

    try {
      if (!base) {
        throw new Error('Backend API base URL not configured');
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Fetch runs with agent intervention data
      const response = await fetch(`${base}/v1/runs`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Fallback to dev endpoint if main endpoint fails
        const devResponse = await fetch(`${base}/dev/runs`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!devResponse.ok) {
          throw new Error(`API error: ${devResponse.status}`);
        }
        
        const data = await devResponse.json();
        if (!Array.isArray(data)) {
          throw new Error('Unexpected API response shape');
        }
        setRuns(data as Run[]);
      } else {
        const runsData = await response.json();
        if (!Array.isArray(runsData)) {
          throw new Error('Unexpected API response shape');
        }
        
        // Enrich runs with agent intervention data and compute correct status
        const enrichedRuns = await Promise.all(
          runsData.map(async (run: any) => {
            try {
              const runDetailResponse = await fetch(`${base}/v1/runs/${run.id}`, {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                }
              });
              if (runDetailResponse.ok) {
                const runDetail = await runDetailResponse.json();
                
                // Fetch metrics to compute status
                const metricsResponse = await fetch(`${base}/v1/runs/${run.id}/metrics`, {
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                  }
                });
                
                let computedStatus = run.status || runDetail.status;
                if ((computedStatus === 'succeeded' || computedStatus === 'completed') && metricsResponse.ok) {
                  const metricsData = await metricsResponse.json();
                  const privacyPassed = (metricsData?.privacy?.mia_auc || 1) <= 0.6 && (metricsData?.privacy?.dup_rate || 1) <= 0.05;
                  const utilityPassed = (metricsData?.utility?.ks_mean || 1) <= 0.1 && (metricsData?.utility?.corr_delta || 1) <= 0.15;
                  if (!privacyPassed || !utilityPassed) {
                    computedStatus = 'Completed with Failures';
                  }
                }
                
                // Merge metrics from both sources (API response and individual fetch)
                const mergedRun = { 
                  ...run, 
                  status: computedStatus,
                  agent_interventions: runDetail.agent_interventions,
                  // Ensure privacy/utility from original API response are preserved
                  privacy: run.privacy || runDetail.privacy,
                  utility: run.utility || runDetail.utility,
                  metrics: run.metrics || runDetail.metrics
                };
                
                // Debug logging for TabDDPM runs
                if (run.id === '0f6d5294-efe8-45a9-a9ea-caf8d9386485' || run.id === '76e916ea-7bae-43fd-89b9-a711417bf6b2') {
                  console.log('[RunsContent] Run data:', {
                    runId: run.id,
                    originalPrivacy: run.privacy,
                    originalUtility: run.utility,
                    originalMetrics: run.metrics,
                    detailPrivacy: runDetail.privacy,
                    detailUtility: runDetail.utility,
                    mergedPrivacy: mergedRun.privacy,
                    mergedUtility: mergedRun.utility
                  });
                }
                
                return mergedRun;
              }
            } catch {
              // Ignore errors for individual run details
            }
            return run;
          })
        );
        
        setRuns(enrichedRuns as Run[]);
      }
      setUsingDemoData(false);
    } catch (err) {
      console.warn('Runs API unavailable, falling back to demo data:', err);
      setRuns(DEMO_RUNS);
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  const searchLower = searchQuery.trim().toLowerCase();

  const filteredRuns = runs.filter(run => {
    const name = (run.name || '').toLowerCase();
    const projectName = (run.project_name || '').toLowerCase();
    const datasetName = (run.dataset_name || '').toLowerCase();
    const status = (run.status || '').toLowerCase();
    const matchesSearch = searchLower === '' ||
      name.includes(searchLower) ||
      projectName.includes(searchLower) ||
      datasetName.includes(searchLower);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
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
        return (a.status || '').localeCompare(b.status || '');
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
  }, {  } as Record<string, { 
    project: { id: string; name: string }; 
    datasets: Record<string, { dataset: { id: string; name: string }; runs: Run[] }> 
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

  if (error && runs.length === 0) {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {usingDemoData && (
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Showing demo runs while the backend API is unavailable.
        </div>
      )}
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

          <div className="flex">
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
          {Object.values(groupedRuns).map(({ project, datasets }: { project: { id: string; name: string }; datasets: Record<string, { dataset: { id: string; name: string }; runs: Run[] }> }) => (
            <div key={project.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <Badge className="text-sm border border-gray-300">
                  {Object.values(datasets).reduce((acc, d) => acc + d.runs.length, 0)} run{Object.values(datasets).reduce((acc, d) => acc + d.runs.length, 0) !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {Object.values(datasets).map(({ dataset, runs: datasetRuns }: { dataset: { id: string; name: string }; runs: Run[] }) => (
                <div key={dataset.id} className="space-y-3">
                  <h4 className="text-md font-medium text-gray-700 ml-4">{dataset.name}</h4>
                  
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
                    {datasetRuns.map((run: Run) => {
                      const isRunning = run.status === 'running' || run.status === 'queued';
                      const steps = runSteps[run.id] || [];
                      // Calculate progress: completed steps / total steps
                      // If no steps yet, show 0%, otherwise show percentage of completed steps
                      const completedSteps = steps.filter((s: any) => 
                        s.status === 'completed' || s.status === 'success' || s.status === 'done'
                      ).length;
                      const inProgressSteps = steps.filter((s: any) => 
                        s.status === 'running' || s.status === 'in_progress'
                      ).length;
                      const totalSteps = steps.length;
                      // Progress: completed steps count, with a small boost if there's a step in progress
                      const progress = totalSteps > 0 
                        ? Math.min(100, Math.round(((completedSteps + (inProgressSteps * 0.5)) / totalSteps) * 100))
                        : 0;
                      const latestStep = steps.length > 0 ? steps[steps.length - 1] : null;
                      
                      return (
                      <div key={run.id}>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              {/* Left side: Run name and status */}
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                                  {isRunning ? (
                                    <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3 text-purple-600" />
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <span className="font-medium text-sm truncate">{run.name}</span>
                                <Badge className={`${getStatusColor(run.status)} text-xs px-2 py-1 flex-shrink-0`}>
                                  {run.status === 'succeeded' ? 'Completed' : run.status === 'cancelled' ? 'Cancelled' : run.status}
                                </Badge>
                                {isRunning && (
                                  <Badge className="bg-green-100 text-green-800 border-green-300 text-xs flex-shrink-0">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1"></div>
                                    LIVE
                                  </Badge>
                                )}
                                  {/* Agent intervention indicators */}
                                  {(run as any).agent_interventions?.used_backup && (
                                    <Badge className="bg-orange-100 text-orange-800 text-xs" title="Agent used backup method">
                                      🔄 Backup
                                    </Badge>
                                  )}
                                  {(run as any).agent_interventions?.replanned && (
                                    <Badge className="bg-purple-100 text-purple-800 text-xs" title="Agent replanned during execution">
                                      🧠 Replanned
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Center: Metric lines */}
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1">
                                  <Lock className="h-3 w-3 text-gray-500" />
                                  <div className="flex space-x-1">
                                    <div className={`w-1 h-4 rounded ${getMetricColor(run.privacy?.mia_auc || run.metrics?.privacy?.mia_auc || 0, 0.5)}`} title={`MIA AUC: ${run.privacy?.mia_auc || run.metrics?.privacy?.mia_auc || 0}`}></div>
                                    <div className={`w-1 h-4 rounded ${getMetricColor(run.privacy?.dup_rate || run.metrics?.privacy?.dup_rate || 0, 0.05)}`} title={`Dup Rate: ${run.privacy?.dup_rate || run.metrics?.privacy?.dup_rate || 0}`}></div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Zap className="h-3 w-3 text-gray-500" />
                                  <div className="flex space-x-1">
                                    <div className={`w-1 h-4 rounded ${getMetricColor(run.utility?.ks_mean || run.metrics?.utility?.ks_mean || 0, 0.1)}`} title={`KS Mean: ${run.utility?.ks_mean || run.metrics?.utility?.ks_mean || 0}`}></div>
                                    <div className={`w-1 h-4 rounded ${getMetricColor(run.utility?.corr_delta || run.metrics?.utility?.corr_delta || 0, 0.15)}`} title={`Corr Delta: ${run.utility?.corr_delta || run.metrics?.utility?.corr_delta || 0}`}></div>
                                  </div>
                                </div>
                              </div>

                              {/* Right side: Action buttons */}
                              <div className="flex items-center space-x-1">
                                {isRunning && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelRun(run.id)}
                                    disabled={cancellingRunId === run.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                                    title="Cancel run"
                                  >
                                    <StopCircle className="h-4 w-4 mr-1" />
                                    {cancellingRunId === run.id ? 'Cancelling...' : 'Cancel'}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleViewResults(run.id, run.name, e)}
                                  data-view-button
                                  className={`text-gray-600 hover:text-gray-900 h-7 w-7 p-0 ${
                                    expandedRunId === run.id ? 'bg-blue-100' : ''
                                  }`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {!isRunning && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadRun(run.id, run.name)}
                                    className="text-gray-600 hover:text-gray-900 h-7 w-7 p-0"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="default" size="sm" className="bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 h-7 w-7 p-0 border-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-white border-0 shadow-lg">
                                    <DropdownMenuItem onClick={() => handleRenameRun(run.id, run.name)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleArchiveRun(run.id)}>
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteRun(run.id)} className="text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            {/* Progress bar and current step for active runs */}
                            {isRunning && (
                              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Progress</span>
                                  <span className="font-medium text-gray-900">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-1.5" />
                                {latestStep && (
                                  <div className="text-xs text-gray-600 truncate">
                                    <span className="font-medium">Current:</span> {latestStep.title || latestStep.step_name || 'Processing...'}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        {/* Expandable details section */}
                        {expandedRunId === run.id && (
                          <RunDetailsExpansion
                            runId={run.id}
                            runName={run.name}
                            onClose={handleCloseExpansion}
                          />
                        )}
                      </div>
                    );
                    })}
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

    </div>
  );
}
