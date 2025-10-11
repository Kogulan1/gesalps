"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ChevronDown, Database, Play, FileText, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { CreateProjectModal } from "./CreateProjectModal";
import { FileUploadModal } from "../datasets/FileUploadModal";

interface AddNewMenuProps {
  onProjectCreated?: (project: any) => void;
  onDatasetUploaded?: () => void;
  projects?: Array<{id: string; name: string}>;
}

export function AddNewMenu({ onProjectCreated, onDatasetUploaded, projects = [] }: AddNewMenuProps) {
  const t = useTranslations('dashboard');
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showUploadDataset, setShowUploadDataset] = useState(false);

  const handleMenuAction = (action: string) => {
    setIsOpen(false);
    
    switch (action) {
      case 'project':
        setShowCreateProject(true);
        break;
      case 'dataset':
        setShowUploadDataset(true);
        break;
      case 'run':
        // Navigate to datasets page where user can start a run
        window.location.href = '/en/datasets';
        break;
      case 'team':
        // TODO: Implement team member invitation
        console.log('Invite team member');
        break;
    }
  };

  const handleProjectCreated = (project: any) => {
    onProjectCreated?.(project);
    setShowCreateProject(false);
  };

  const handleDatasetUploaded = () => {
    onDatasetUploaded?.();
    setShowUploadDataset(false);
  };

  const menuItems = [
    {
      key: 'project',
      label: "New Project",
      icon: <Database className="h-4 w-4" />,
      description: "Create a new synthetic data project"
    },
    {
      key: 'dataset',
      label: "Upload Dataset",
      icon: <FileText className="h-4 w-4" />,
      description: "Upload a new dataset to a project"
    },
    {
      key: 'run',
      label: "Start Run",
      icon: <Play className="h-4 w-4" />,
      description: "Start a new synthesis run on a dataset"
    }
  ];

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button className="bg-black hover:bg-gray-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add New...
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 bg-white border-gray-200" align="end">
          {menuItems.map((item, index) => (
            <DropdownMenuItem 
              key={index} 
              className="p-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleMenuAction(item.key)}
            >
              <div className="w-full flex items-start space-x-3">
                <div className="text-gray-600 mt-0.5">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-black">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreate={handleProjectCreated}
      />

      <FileUploadModal
        isOpen={showUploadDataset}
        onClose={() => setShowUploadDataset(false)}
        onSuccess={handleDatasetUploaded}
        projects={projects}
      />
    </>
  );
}
