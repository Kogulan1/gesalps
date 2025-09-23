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
  Play,
  Download,
  Settings,
  Clock,
  Database,
  Activity,
  Edit,
  Archive,
  Trash2
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { RenameModal } from "@/components/common/RenameModal";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectCard } from "@/components/dashboard/ProjectCard";

export function ProjectsContent() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'activity'>('created');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ready' | 'running' | 'failed'>('all');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    projectId: string | null;
    currentName: string;
  }>({
    isOpen: false,
    projectId: null,
    currentName: ""
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, always use mock data to ensure it shows up
      console.log('Using mock data for projects in Projects page');
      const mockProjects = [
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
      setProjects(mockProjects);
      setLoading(false);
      return;

      /* 
      // API logic commented out for now - using mock data
      // Try to fetch from API, fallback to demo data on error
      try {
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
        setProjects(data);
      } catch (apiError) {
        console.log('API failed, using mock data:', apiError);
        // Fallback to mock data
        setProjects([...]);
      }
      */
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      setLoading(false);
    }
  };

  const handleProjectCreated = (project: any) => {
    setProjects(prev => [project, ...prev]);
    setShowCreateProject(false);
  };

  const handleViewProject = (projectId: string) => {
    router.push(`/en/projects/${projectId}`);
  };

  const handleProjectEdit = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setRenameModal({
        isOpen: true,
        projectId: projectId,
        currentName: project.name
      });
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

  const handleStartRun = (projectId: string) => {
    console.log('Start run for project:', projectId);
    // TODO: Implement start run - could navigate to runs page or open a modal
    router.push(`/en/runs?project=${projectId}`);
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!renameModal.projectId) return;

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE;
      
      if (base) {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('No authentication token available');
        }

        const response = await fetch(`${base}/v1/projects/${renameModal.projectId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: newName })
        });

        if (!response.ok) {
          throw new Error(`Failed to rename project: ${response.status}`);
        }
      }

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === renameModal.projectId ? { ...p, name: newName } : p
      ));
      
      setRenameModal({ isOpen: false, projectId: null, currentName: "" });
    } catch (err) {
      console.error('Error renaming project:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename project');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'running':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'activity':
        return a.last_activity.localeCompare(b.last_activity);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-gray-600">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-red-500">⚠</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading projects</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchProjects} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Manage your data synthesis projects</p>
        </div>
        <Button onClick={() => setShowCreateProject(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search projects..."
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
                {filterStatus === 'all' ? 'All Status' : filterStatus}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>All Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('active')}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('ready')}>Ready</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('running')}>Running</DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => setSortBy('activity')}>Activity</DropdownMenuItem>
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

      {/* Projects List */}
      {sortedProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">@</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filterStatus !== 'all' ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating your first project'
            }
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <Button onClick={() => setShowCreateProject(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
          {sortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onView={handleViewProject}
              onRun={handleStartRun}
              onEdit={handleProjectEdit}
              onArchive={handleProjectArchive}
              onDelete={handleProjectDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateProject && (
        <CreateProjectModal
          isOpen={showCreateProject}
          onClose={() => setShowCreateProject(false)}
          onSuccess={handleProjectCreated}
        />
      )}

      <RenameModal
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, projectId: null, currentName: "" })}
        onConfirm={handleRenameConfirm}
        currentName={renameModal.currentName}
        title="Rename Project"
        description="Enter a new name for this project."
        placeholder="Enter project name"
      />
    </div>
  );
}