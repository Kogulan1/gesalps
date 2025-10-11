"use client";

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Activity
} from 'lucide-react';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

interface RunStatus {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress?: number;
  currentStep?: string;
  startedAt?: string;
  finishedAt?: string;
  metrics?: {
    utility?: {
      ks_mean?: number;
      corr_delta?: number;
    };
    privacy?: {
      mia_auc?: number;
      dup_rate?: number;
    };
  };
}

interface RealTimeRunStatusProps {
  runId: string;
  onStatusChange?: (status: RunStatus) => void;
}

export function RealTimeRunStatus({ runId, onStatusChange }: RealTimeRunStatusProps) {
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // WebSocket connection for real-time updates (commented out for now)
  // const { isConnected, sendMessage } = useWebSocket({
  //   url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
  //   onMessage: (event) => {
  //     try {
  //       const data = JSON.parse(event.data);
  //       if (data.type === 'run_update' && data.runId === runId) {
  //         setRunStatus(data.status);
  //         onStatusChange?.(data.status);
  //       }
  //     } catch (error) {
  //       console.error('Failed to parse WebSocket message:', error);
  //     }
  //   },
  // });
  const isConnected = false; // Temporary fallback

  // Fallback polling if WebSocket is not available
  useEffect(() => {
    if (!isConnected && runId) {
      setIsPolling(true);
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/v1/runs/${runId}/status`);
          if (response.ok) {
            const status = await response.json();
            setRunStatus(status);
            onStatusChange?.(status);
            
            // Stop polling if run is completed
            if (status.status === 'succeeded' || status.status === 'failed') {
              setIsPolling(false);
              clearInterval(pollInterval);
            }
          }
        } catch (error) {
          console.error('Failed to poll run status:', error);
        }
      }, 2000);

      return () => {
        clearInterval(pollInterval);
        setIsPolling(false);
      };
    }
  }, [isConnected, runId, onStatusChange]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (startedAt?: string, finishedAt?: string) => {
    if (!startedAt) return 'Not started';
    
    const start = new Date(startedAt);
    const end = finishedAt ? new Date(finishedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    return `${diffMins}m ${diffSecs}s`;
  };

  if (!runStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading run status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {getStatusIcon(runStatus.status)}
            <span>{runStatus.name || `Run ${runId.slice(0, 8)}`}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(runStatus.status)}>
              {runStatus.status}
            </Badge>
            {isConnected && (
              <Badge variant="outline" className="text-green-600">
                Live
              </Badge>
            )}
            {isPolling && (
              <Badge variant="outline" className="text-blue-600">
                Polling
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {runStatus.status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{runStatus.progress || 0}%</span>
            </div>
            <Progress value={runStatus.progress || 0} className="w-full" />
            {runStatus.currentStep && (
              <p className="text-sm text-gray-600">{runStatus.currentStep}</p>
            )}
          </div>
        )}

        {/* Duration */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Duration:</span>
          <span className="font-medium">
            {formatDuration(runStatus.startedAt, runStatus.finishedAt)}
          </span>
        </div>

        {/* Metrics Preview */}
        {runStatus.metrics && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Utility</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>KS Mean:</span>
                  <span className="font-mono">
                    {runStatus.metrics.utility?.ks_mean?.toFixed(3) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Corr Δ:</span>
                  <span className="font-mono">
                    {runStatus.metrics.utility?.corr_delta?.toFixed(3) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Privacy</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>MIA AUC:</span>
                  <span className="font-mono">
                    {runStatus.metrics.privacy?.mia_auc?.toFixed(3) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dup Rate:</span>
                  <span className="font-mono">
                    {runStatus.metrics.privacy?.dup_rate ? 
                      `${(runStatus.metrics.privacy.dup_rate * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
