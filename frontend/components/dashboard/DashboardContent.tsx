"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddNewMenu } from "./AddNewMenu";
import { ProjectCard } from "./ProjectCard";
import { RenameModal } from "@/components/ui/rename-modal";
import { Search, Grid, List, MoreHorizontal, ExternalLink, Github } from "lucide-react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useRouter } from "next/navigation";

const DEMO_PROJECTS = [
  {
    id: "proj-1",
    name: "Clinical Trial Alpha",
    owner_id: "user-123",
    created_at: "2024-01-15T10:30:00Z",
    datasets_count: 3,
    runs_count: 5,
    last_activity: "2 hours ago",
    status: "Active"
  },
  {
    id: "proj-2",
    name: "Synthetic Data Beta",
    owner_id: "user-123",
    created_at: "2024-01-10T14:20:00Z",
    datasets_count: 1,
    runs_count: 2,
    last_activity: "1 day ago",
    status: "Ready"
  },
  {
    id: "proj-3",
    name: "Research Project Gamma",
    owner_id: "user-123",
    created_at: "2024-01-05T09:15:00Z",
    datasets_count: 0,
    runs_count: 0,
    last_activity: "No activity yet",
    status: "Ready"
  }
];

export function DashboardContent() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    projectId: string | null;
    currentName: string;
  }>({
    isOpen: false,
    projectId: null,
    currentName: ""
  });

  const handleProjectCreated = (newProject: any) => {
    setProjects(prev => [newProject, ...prev]);
  };

  const handleViewProject = (projectId: string) => {
    router.push(`/en/projects/${projectId}`);
  };

  const handleProjectEdit = (projectId: string) => {
    console.log('Edit project clicked:', projectId);
    const project = projects.find(p => p.id === projectId);
    console.log('Found project:', project);
    if (project) {
      setRenameModal({
        isOpen: true,
        projectId: projectId,
        currentName: project.name
      });
      console.log('Rename modal state set');
    }
  };

  const handleProjectArchive = (projectId: string) => {
    console.log('Archive project:', projectId);
    // TODO: Implement project archive
  };

  const handleProjectDelete = (projectId: string) => {
    console.log('Delete project:', projectId);
    // TODO: Implement project delete
  };

  const handleRenameConfirm = async (newName: string) => {
    console.log('Rename confirm called with:', newName);
    console.log('Rename modal state:', renameModal);
    if (!renameModal.projectId) return;

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
      console.log('API base URL:', base);
      if (!base) {
        throw new Error('API base URL not configured');
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const url = `${base}/v1/projects/${renameModal.projectId}/rename`;
      console.log('Making API call to:', url);
      console.log('Request body:', { name: newName });
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to rename project: ${response.statusText}`);
      }

      // Update the project in the local state
      setProjects(prev => prev.map(project => 
        project.id === renameModal.projectId 
          ? { ...project, name: newName }
          : project
      ));

    } catch (error) {
      console.error('Error renaming project:', error);
      throw error;
    }
  };

  // Test environment variable
  useEffect(() => {
    console.log('Environment variables test:');
    console.log('NEXT_PUBLIC_BACKEND_API_BASE:', process.env.NEXT_PUBLIC_BACKEND_API_BASE);
    console.log('BACKEND_API_BASE:', process.env.BACKEND_API_BASE);
  }, []);

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
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
        if (!Array.isArray(data)) {
          throw new Error('Unexpected API response shape');
        }

        setProjects(data);
        setUsingDemoData(false);
      } catch (err) {
        console.warn('Dashboard projects API unavailable, falling back to demo data:', err);
        setProjects(DEMO_PROJECTS);
        setUsingDemoData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Only calculate usage data when projects are loaded
  const totalDatasets = projects.length > 0 ? projects.reduce((sum, p) => sum + (p.datasets_count || 0), 0) : 0;
  const totalRuns = projects.length > 0 ? projects.reduce((sum, p) => sum + (p.runs_count || 0), 0) : 0;
  
  const usageData = [
    { 
      label: "Projects", 
      used: projects.length, 
      total: 10, 
      percentage: projects.length > 0 ? Math.min((projects.length / 10) * 100, 100) : 0
    },
    { 
      label: "Datasets", 
      used: totalDatasets, 
      total: 50, 
      percentage: totalDatasets > 0 ? Math.min((totalDatasets / 50) * 100, 100) : 0
    },
    { 
      label: "Runs", 
      used: totalRuns, 
      total: 100, 
      percentage: totalRuns > 0 ? Math.min((totalRuns / 100) * 100, 100) : 0
    }
  ];

  // Debug logging
  console.log('Usage data:', {
    projects: { used: projects.length, total: 10, percentage: (projects.length / 10) * 100 },
    datasets: { used: totalDatasets, total: 50, percentage: (totalDatasets / 50) * 100 },
    runs: { used: totalRuns, total: 100, percentage: (totalRuns / 100) * 100 },
    projectsArray: projects
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-400" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl text-red-500">
            ⚠
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Unable to load projects</h3>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {usingDemoData && (
          <div className="mb-6 rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Showing demo projects while the backend API is unavailable.
          </div>
        )}
        {/* Main Content Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Q Search Projects..."
                className="pl-10 pr-4 py-2 w-80 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center">
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
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Add New Button */}
          <AddNewMenu 
            onProjectCreated={handleProjectCreated}
            onDatasetUploaded={() => {
              // Refresh projects to get updated dataset counts
              window.location.reload();
            }}
            projects={projects.map(p => ({ id: p.id, name: p.name }))}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Usage & Recent Activity */}
          <div className="lg:col-span-1 space-y-6">
            {/* Usage Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Account Usage</CardTitle>
                  <span className="text-sm text-gray-500">Current</span>
                </div>
                <p className="text-sm text-gray-500">Based on your current projects</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {usageData.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium">{item.used} / {item.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#E0342C] h-2 rounded-full" 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                <Button className="w-full bg-black hover:bg-gray-800 text-white">
                  Upgrade Plan
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-gray-400">@</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Recent synthesis runs and activities will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Projects */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E0342C] mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading projects...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-red-400">!</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading projects</h3>
                    <p className="text-gray-500 mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()}>
                      Try Again
                    </Button>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-gray-400">@</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-gray-500 mb-4">Get started by creating your first project.</p>
                    <AddNewMenu onProjectCreated={handleProjectCreated} />
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}>
                    {projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        viewMode={viewMode}
                        onView={handleViewProject}
                        onRun={(id) => console.log('Run project:', id)}
                        onDownload={(id) => console.log('Download project:', id)}
                        onSettings={(id) => console.log('Settings project:', id)}
                        onEdit={handleProjectEdit}
                        onArchive={handleProjectArchive}
                        onDelete={handleProjectDelete}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      <RenameModal
        isOpen={renameModal.isOpen}
        onClose={() => {
          console.log('Closing rename modal');
          setRenameModal({ isOpen: false, projectId: null, currentName: "" });
        }}
        onConfirm={handleRenameConfirm}
        currentName={renameModal.currentName}
        title="Rename Project"
        description="Enter a new name for this project."
        placeholder="Enter project name"
      />
    </div>
  );
}
