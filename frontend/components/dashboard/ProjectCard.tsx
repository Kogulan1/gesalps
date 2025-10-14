"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  MoreHorizontal, 
  Play, 
  Eye, 
  Clock,
  Database,
  Activity,
  TrendingUp,
  Trash2,
  Edit
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
    datasets_count: number;
    runs_count: number;
    last_activity: string;
    status: "Active" | "Running" | "Ready" | "Failed";
  };
  viewMode?: 'grid' | 'list';
  onView?: (id: string) => void;
  onRun?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ProjectCard({ 
  project, 
  viewMode = 'list',
  onView, 
  onRun, 
  onEdit,
  onDelete
}: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800";
      case "Running": return "bg-blue-100 text-blue-800";
      case "Ready": return "bg-yellow-100 text-yellow-800";
      case "Failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-200">
      <CardContent className={viewMode === 'grid' ? 'p-2' : 'p-3'}>
        <div className={`flex items-start justify-between ${viewMode === 'grid' ? 'mb-1' : 'mb-2'}`}>
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shadow-sm">
              <Database className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-black text-lg">{project.name}</h3>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Created {formatDate(project.created_at)}
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Last activity: {project.last_activity}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Database className="h-3 w-3" />
                  <span>{project.datasets_count} datasets</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Activity className="h-3 w-3" />
                  <span>{project.runs_count} runs</span>
                </div>
              </div>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onView?.(project.id)}
                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onRun?.(project.id)}
                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Play className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuItem onClick={() => onEdit?.(project.id)} className="text-black hover:bg-gray-50">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(project.id)} className="text-red-600 hover:bg-red-50">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-gray-200">
                <DropdownMenuItem onClick={() => onEdit?.(project.id)} className="text-black hover:bg-gray-50">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(project.id)} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {viewMode === 'grid' && (
          <div className="flex items-center justify-end space-x-1 mt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onView?.(project.id)}
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onRun?.(project.id)}
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}