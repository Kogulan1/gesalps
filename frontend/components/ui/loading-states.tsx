"use client";

import { Loader2, Database, Brain, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {text && <span className="ml-2 text-gray-600">{text}</span>}
    </div>
  );
}

interface LoadingCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  progress?: number;
  steps?: string[];
  currentStep?: number;
}

export function LoadingCard({ 
  title, 
  description, 
  icon, 
  progress, 
  steps, 
  currentStep = 0 
}: LoadingCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {icon || <Database className="h-8 w-8 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
            
            {progress !== undefined && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {steps && steps.length > 0 && (
              <div className="mt-4 space-y-2">
                {steps.map((step, index) => (
                  <div 
                    key={index}
                    className={`flex items-center space-x-2 text-sm ${
                      index < currentStep 
                        ? 'text-green-600' 
                        : index === currentStep 
                        ? 'text-blue-600' 
                        : 'text-gray-400'
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : index === currentStep ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SynthesisLoadingProps {
  method: string;
  progress?: number;
  currentStep?: string;
  metrics?: {
    utility?: number;
    privacy?: number;
  };
}

export function SynthesisLoading({ method, progress, currentStep, metrics }: SynthesisLoadingProps) {
  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'ctgan':
        return <Brain className="h-8 w-8 text-purple-600" />;
      case 'tvae':
        return <Database className="h-8 w-8 text-green-600" />;
      case 'gc':
        return <Shield className="h-8 w-8 text-blue-600" />;
      default:
        return <Database className="h-8 w-8 text-blue-600" />;
    }
  };

  const getMethodName = (method: string) => {
    switch (method.toLowerCase()) {
      case 'ctgan':
        return 'CTGAN (Conditional Tabular GAN)';
      case 'tvae':
        return 'TVAE (Tabular VAE)';
      case 'gc':
        return 'Gaussian Copula';
      default:
        return method.toUpperCase();
    }
  };

  const steps = [
    'Initializing model',
    'Loading dataset',
    'Training synthesizer',
    'Generating synthetic data',
    'Computing metrics',
    'Finalizing results'
  ];

  return (
    <LoadingCard
      title={`Synthesizing with ${getMethodName(method)}`}
      description={currentStep || 'Processing your data...'}
      icon={getMethodIcon(method)}
      progress={progress}
      steps={steps}
      currentStep={Math.floor((progress || 0) / 16.67)} // Convert percentage to step index
    />
  );
}

interface DataTableLoadingProps {
  rows?: number;
  columns?: number;
}

export function DataTableLoading({ rows = 10, columns = 5 }: DataTableLoadingProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">Loading data preview...</span>
          </div>
          
          <div className="overflow-hidden">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {/* Header row */}
              {Array.from({ length: columns }).map((_, i) => (
                <div key={`header-${i}`} className="h-8 bg-gray-200 rounded animate-pulse" />
              ))}
              
              {/* Data rows */}
              {Array.from({ length: rows }).map((_, rowIndex) => (
                Array.from({ length: columns }).map((_, colIndex) => (
                  <div 
                    key={`cell-${rowIndex}-${colIndex}`} 
                    className="h-6 bg-gray-100 rounded animate-pulse" 
                  />
                ))
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
