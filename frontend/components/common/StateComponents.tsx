"use client";

import { Button } from "@/components/ui/button";
import { getUserFriendlyErrorMessage } from "@/lib/errorMessages";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className = "" }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="flex items-center gap-3 text-gray-600">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-400" />
        <span>{message}</span>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon = "@", 
  title, 
  description, 
  action, 
  className = "" 
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl text-gray-400">{icon}</span>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="bg-red-600 hover:bg-red-700">
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  title = "Error", 
  message, 
  onRetry, 
  className = "" 
}: ErrorStateProps) {
  return (
    <div className={`text-center py-12 ${className}`} data-testid="error-state">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl text-red-500">⚠</span>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2" data-testid="error-title">{title}</h3>
      <p className="text-gray-500 mb-4" data-testid="error-message">{getUserFriendlyErrorMessage(message)}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" data-testid="retry-button">
          Try Again
        </Button>
      )}
    </div>
  );
}
