"use client";

import { Button } from "@/components/ui/button";
import { Grid, List } from "lucide-react";

interface ViewModeToggleProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  className?: string;
}

export function ViewModeToggle({ viewMode, onViewModeChange, className = "" }: ViewModeToggleProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('list')}
        className="rounded-r-none"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className="rounded-l-none"
      >
        <Grid className="h-4 w-4" />
      </Button>
    </div>
  );
}
