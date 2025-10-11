"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DatasetPreviewModal } from "./DatasetPreviewModal";
import { 
  Search, 
  Grid3X3, 
  List, 
  Plus,
  Filter,
  SortAsc,
  MoreHorizontal,
  Eye,
  Play,
  Download,
  Settings,
  Clock,
  Database,
  Activity,
  FileText,
  Edit,
  Archive,
  Trash2
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
import { FileUploadModal } from "./FileUploadModal";
import { RunExecutionModal } from "./RunExecutionModal";
import { ResultsModal } from "./ResultsModal";

type DemoDataset = {
  id: string;
  name: string;
  project_id?: string;
  project_name?: string;
  description?: string;
  file_name?: string;
  file_size?: number;
  rows?: number;
  columns?: number;
  created_at: string;
  last_modified?: string;
  status: string;
  runs_count?: number;
  last_run?: string;
  size?: string;
  runs?: Array<{
    id: string;
    name: string;
    method: string;
    status: string;
    created_at: string;
    privacy_level: string;
  }>;
};

const DEMO_DATASETS: DemoDataset[] = [
  {
    id: "ds-1",
    name: "Clinical Trial Data Alpha",
    project_id: "proj-1",
    project_name: "Clinical Trial Alpha",
    file_name: "clinical_trial_alpha.csv",
    file_size: 2048576,
    rows: 1500,
    columns: 25,
    created_at: "2024-01-15T10:30:00Z",
    last_modified: "2024-01-15T10:30:00Z",
    status: "Ready",
    runs_count: 3,
    last_run: "2 hours ago",
    runs: [
      {
        id: "run-1",
        name: "High Privacy Synthesis",
        method: "DP-GAN",
        status: "completed",
        created_at: "2 hours ago",
        privacy_level: "High"
      },
      {
        id: "run-2",
        name: "Fast Generation",
        method: "TabDDPM",
        status: "running",
        created_at: "30 min ago",
        privacy_level: "Medium"
      }
    ]
  },
  {
    id: "ds-2",
    name: "Patient Demographics",
    project_id: "proj-1",
    project_name: "Clinical Trial Alpha",
    file_name: "patient_demographics.csv",
    file_size: 1024000,
    rows: 800,
    columns: 15,
    created_at: "2024-01-14T14:20:00Z",
    last_modified: "2024-01-14T14:20:00Z",
    status: "Ready",
    runs_count: 1,
    last_run: "1 day ago",
    runs: [
      {
        id: "run-3",
        name: "Privacy-First Run",
        method: "PATE-GAN",
        status: "completed",
        created_at: "1 day ago",
        privacy_level: "Very High"
      }
    ]
  },
  {
    id: "ds-3",
    name: "Synthetic Data Beta",
    project_id: "proj-2",
    project_name: "Synthetic Data Beta",
    file_name: "synthetic_beta.csv",
    file_size: 512000,
    rows: 300,
    columns: 12,
    created_at: "2024-01-10T09:15:00Z",
    last_modified: "2024-01-10T09:15:00Z",
    status: "Processing",
    runs_count: 0,
    last_run: "Just now",
    runs: []
  },
  {
    id: "ds-4",
    name: "Research Data Gamma",
    project_id: "proj-3",
    project_name: "Research Project Gamma",
    file_name: "research_gamma.csv",
    file_size: 3072000,
    rows: 2000,
    columns: 30,
    created_at: "2024-01-05T11:45:00Z",
    last_modified: "2024-01-05T11:45:00Z",
    status: "Failed",
    runs_count: 0,
    runs: []
  }
];

export function DatasetsContent() {
  const t = useTranslations('dashboard');
  const [datasets, setDatasets] = useState<DemoDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'size' | 'rows'>('created');
  const [filterStatus, setFilterStatus] = useState<'all' | 'uploaded' | 'processing' | 'ready' | 'failed'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    dataset: DemoDataset | null;
  }>({
    isOpen: false,
    dataset: null
  });
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    datasetId: string | null;
    currentName: string;
  }>({
    isOpen: false,
    datasetId: null,
    currentName: ""
  });
  const [uploadModal, setUploadModal] = useState(false);
  const [runExecutionModal, setRunExecutionModal] = useState<{
    isOpen: boolean;
    dataset: DemoDataset | null;
  }>({
    isOpen: false,
    dataset: null
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
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [projects, setProjects] = useState<Array<{id: string; name: string}>>([]);

  const handleDatasetEdit = (datasetId: string) => {
    const dataset = datasets.find(d => d.id === datasetId);
    if (dataset) {
      setRenameModal({
        isOpen: true,
        datasetId: datasetId,
        currentName: dataset.name
      });
    }
  };

  const handleDatasetArchive = (datasetId: string) => {
    console.log('Archive dataset:', datasetId);
    // TODO: Implement dataset archive
  };

  const handleDatasetDelete = (datasetId: string) => {
    console.log('Delete dataset:', datasetId);
    // TODO: Implement dataset delete
  };

  const handlePreviewDataset = (dataset: DemoDataset) => {
    setPreviewModal({
      isOpen: true,
      dataset: dataset
    });
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!renameModal.datasetId) return;

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
      
      if (base) {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('No authentication token available');
        }

        const response = await fetch(`${base}/v1/datasets/${renameModal.datasetId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: newName })
        });

        if (!response.ok) {
          throw new Error(`Failed to rename dataset: ${response.status}`);
        }
      }

      // Update local state
      setDatasets(prev => prev.map(d => 
        d.id === renameModal.datasetId ? { ...d, name: newName } : d
      ));
      
      setRenameModal({ isOpen: false, datasetId: null, currentName: "" });
    } catch (error) {
      console.error('Error renaming dataset:', error);
      throw error;
    }
  };

  const handleUploadSuccess = () => {
    // Refresh the datasets list
    fetchDatasets();
  };

  const handleRunSuccess = () => {
    // Refresh the datasets list
    fetchDatasets();
  };

  const handleViewResults = (runId: string, runName: string) => {
    setResultsModal({
      isOpen: true,
      runId: runId,
      runName: runName
    });
  };

  const handleStartRun = (dataset: DemoDataset) => {
    setRunExecutionModal({
      isOpen: true,
      dataset: dataset
    });
  };

  useEffect(() => {
    fetchDatasets();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE;
    
    try {
      if (!base) {
        throw new Error('Backend API base URL not configured');
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${base}/v1/projects`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setProjects(data.map(p => ({ id: p.id, name: p.name })));
      }
    } catch (err) {
      console.warn('Projects API unavailable:', err);
      // Set empty array as fallback
      setProjects([]);
    }
  };

  const fetchDatasets = async () => {
    setLoading(true);
    setError(null);

    const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE;

    try {
      if (!base) {
        throw new Error('Backend API base URL not configured');
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${base}/v1/datasets`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected API response shape');
      }

      setDatasets(data as DemoDataset[]);
      setUsingDemoData(false);
    } catch (err) {
      console.warn('Datasets API unavailable, falling back to demo data:', err);
      setDatasets(DEMO_DATASETS);
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'uploaded':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const searchLower = searchQuery.trim().toLowerCase();

  const filteredDatasets = datasets.filter(dataset => {
    const description = (dataset.description || '').toLowerCase();
    const nameMatches = dataset.name.toLowerCase().includes(searchLower);
    const descMatches = description.includes(searchLower);
    const statusMatches = (dataset.status || '').toLowerCase();
    const matchesSearch = searchLower === '' ? true : (nameMatches || descMatches);
    const matchesStatus = filterStatus === 'all' || statusMatches === filterStatus;
    const matchesProject = filterProject === 'all' || dataset.project_id === filterProject;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const sortedDatasets = [...filteredDatasets].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'size':
        return (b.size || '').localeCompare(a.size || '');
      case 'rows':
        return (b.rows || 0) - (a.rows || 0);
      default:
        return 0;
    }
  });

  // Group datasets by project
  const groupedDatasets = sortedDatasets.reduce((acc, dataset) => {
    const projectId = dataset.project_id || 'unknown';
    if (!acc[projectId]) {
      acc[projectId] = {
        project: {
          id: projectId,
          name: dataset.project_name || 'Unknown Project'
        },
        datasets: []
      };
    }
    acc[projectId].datasets.push(dataset);
    return acc;
  }, {} as Record<string, { project: { id: string; name: string }; datasets: DemoDataset[] }>);

  const uniqueProjects = Array.from(new Set(datasets.map(d => d.project_id).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-gray-600">Loading datasets...</span>
      </div>
    );
  }

  if (error && datasets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-red-500">⚠</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading datasets</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchDatasets} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {usingDemoData && (
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Showing demo datasets while the backend API is unavailable.
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Datasets</h1>
          <p className="text-gray-600">Manage your uploaded datasets</p>
        </div>
        <Button onClick={() => setUploadModal(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Upload Dataset
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search datasets..."
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
                const project = datasets.find(d => d.project_id === projectId);
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
              <DropdownMenuItem onClick={() => setFilterStatus('uploaded')}>Uploaded</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('processing')}>Processing</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('ready')}>Ready</DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => setSortBy('size')}>Size</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('rows')}>Rows</DropdownMenuItem>
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

      {/* Datasets List */}
      {sortedDatasets.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">📊</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filterStatus !== 'all' || filterProject !== 'all' ? 'No datasets found' : 'No datasets yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || filterStatus !== 'all' || filterProject !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by uploading your first dataset'
            }
          </p>
          {!searchQuery && filterStatus === 'all' && filterProject === 'all' && (
            <Button onClick={() => setUploadModal(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Upload Dataset
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedDatasets).map(({ project, datasets: projectDatasets }) => (
            <div key={project.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <Badge variant="outline" className="text-sm">
                  {projectDatasets.length} dataset{projectDatasets.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-3'}>
                {projectDatasets.map((dataset) => (
                  <Card key={dataset.id} className="hover:shadow-md transition-shadow">
                    <CardContent className={viewMode === 'grid' ? 'p-2' : 'py-3'}>
                      {/* First line: Dataset name and status */}
                      <div className={`flex items-center justify-between ${viewMode === 'grid' ? 'mb-1' : 'mb-2'}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                            <FileText className="h-3 w-3 text-blue-600" />
                          </div>
                          <span className="font-medium text-sm">{dataset.name}</span>
                        </div>
                        {viewMode === 'list' ? (
                          <Badge className={`${getStatusColor(dataset.status)} text-xs px-2 py-1`}>
                            {dataset.status}
                          </Badge>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="default" size="sm" className="bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 h-7 w-7 p-0 border-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-0 shadow-lg">
                              <DropdownMenuItem onClick={() => handleDatasetEdit(dataset.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDatasetArchive(dataset.id)}>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDatasetDelete(dataset.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* Second line: Description, metrics, and actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">{dataset.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Rows: {dataset.rows?.toLocaleString() || 'N/A'}</span>
                            <span>Columns: {dataset.columns || 'N/A'}</span>
                            <span>Size: {dataset.size || 'N/A'}</span>
                            <span>Runs: {dataset.runs?.length || 0}</span>
                            <span>Created {new Date(dataset.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {viewMode === 'list' && (
                          <div className="flex items-center space-x-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900"
                              title="Preview"
                              onClick={() => handlePreviewDataset(dataset)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900"
                              title="Run"
                              onClick={() => handleStartRun(dataset)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="default" size="sm" className="bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 h-7 w-7 p-0 border-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border-0 shadow-lg">
                                <DropdownMenuItem onClick={() => handleDatasetEdit(dataset.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDatasetArchive(dataset.id)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDatasetDelete(dataset.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      {viewMode === 'grid' && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={`${getStatusColor(dataset.status)} text-xs px-2 py-1`}>
                              {dataset.status}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900"
                                title="Preview"
                                onClick={() => handlePreviewDataset(dataset)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900"
                                title="Run"
                                onClick={() => handleStartRun(dataset)}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Recent Runs */}
                          {dataset.runs && dataset.runs.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500 font-medium">Recent Runs</div>
                              <div className="space-y-1">
                                {dataset.runs.slice(0, 2).map((run: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-2 h-2 rounded-full ${
                                        run.status === 'completed' ? 'bg-green-500' :
                                        run.status === 'running' ? 'bg-blue-500' :
                                        run.status === 'failed' ? 'bg-red-500' :
                                        'bg-gray-400'
                                      }`} />
                                      <span className="text-gray-700 truncate">{run.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Badge variant="outline" className="text-xs">
                                        {run.method}
                                      </Badge>
                                      <span className="text-gray-500">{run.created_at}</span>
                                    </div>
                                  </div>
                                ))}
                                {dataset.runs.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{dataset.runs.length - 2} more runs
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <RenameModal
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, datasetId: null, currentName: "" })}
        onConfirm={handleRenameConfirm}
        currentName={renameModal.currentName}
        title="Rename Dataset"
        description="Enter a new name for this dataset."
        placeholder="Enter dataset name"
      />

      <FileUploadModal
        isOpen={uploadModal}
        onClose={() => setUploadModal(false)}
        onSuccess={handleUploadSuccess}
        projects={projects}
      />

      <RunExecutionModal
        isOpen={runExecutionModal.isOpen}
        onClose={() => setRunExecutionModal({ isOpen: false, dataset: null })}
        onSuccess={handleRunSuccess}
        dataset={runExecutionModal.dataset}
      />

      <ResultsModal
        isOpen={resultsModal.isOpen}
        onClose={() => setResultsModal({ isOpen: false, runId: null, runName: "" })}
        runId={resultsModal.runId}
        runName={resultsModal.runName}
      />

      <DatasetPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, dataset: null })}
        dataset={previewModal.dataset}
      />
    </div>
  );
}
