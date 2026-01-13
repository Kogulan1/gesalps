"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Progress from "@/components/ui/progress";
import { 
  Terminal, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Activity,
  Loader2,
  RefreshCw
} from "lucide-react";
import { getRunLogs } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface RealTimeLogsTabProps {
  runId: string;
  status: string;
}

interface LogProgress {
  status: string;
  current_step: string | null;
  progress_messages: Array<{
    timestamp: string | null;
    message: string;
    type: string;
  }>;
  training_info: {
    epochs?: number;
    batch_size?: number;
    rows?: number;
    elapsed_minutes?: number;
  };
  errors: Array<{
    timestamp: string | null;
    message: string;
  }>;
  warnings: Array<{
    timestamp: string | null;
    message: string;
  }>;
  message?: string;
}

export function RealTimeLogsTab({ runId, status }: RealTimeLogsTabProps) {
  const [logs, setLogs] = useState<LogProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      setError(null);
      const data = await getRunLogs(runId);
      setLogs(data.progress);
      setLastUpdate(new Date());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error('[RealTimeLogsTab] Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [runId]);

  useEffect(() => {
    if (!autoRefresh || status !== 'running') return;

    const interval = setInterval(() => {
      fetchLogs();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, status, runId]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current && logs) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString();
    } catch {
      return ts;
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'training':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'step':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'preprocessing':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading && !logs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600">Loading logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Terminal className="h-5 w-5" />
              <span>Real-Time Progress Logs</span>
              {status === 'running' && (
                <Badge variant="outline" className="ml-2 animate-pulse">
                  <Activity className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {status === 'running' && (
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
                </Button>
              )}
            </div>
          </div>
          {lastUpdate && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {logs?.message && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{logs.message}</span>
              </div>
            </div>
          )}

          {/* Training Info Card */}
          {logs?.training_info && Object.keys(logs.training_info).length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>Training Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {logs.training_info.epochs && (
                    <div>
                      <div className="text-xs text-gray-600">Epochs</div>
                      <div className="text-lg font-semibold">{logs.training_info.epochs}</div>
                    </div>
                  )}
                  {logs.training_info.batch_size && (
                    <div>
                      <div className="text-xs text-gray-600">Batch Size</div>
                      <div className="text-lg font-semibold">{logs.training_info.batch_size}</div>
                    </div>
                  )}
                  {logs.training_info.rows && (
                    <div>
                      <div className="text-xs text-gray-600">Rows</div>
                      <div className="text-lg font-semibold">{logs.training_info.rows.toLocaleString()}</div>
                    </div>
                  )}
                  {logs.training_info.elapsed_minutes !== undefined && (
                    <div>
                      <div className="text-xs text-gray-600">Elapsed</div>
                      <div className="text-lg font-semibold">
                        {logs.training_info.elapsed_minutes.toFixed(1)} min
                      </div>
                    </div>
                  )}
                </div>
                {logs.training_info.epochs && logs.training_info.elapsed_minutes && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Estimated Progress</span>
                      <span>
                        {logs.training_info.epochs > 0
                          ? `${Math.min(100, Math.round((logs.training_info.elapsed_minutes / (logs.training_info.epochs / 100)) * 100))}%`
                          : '0%'}
                      </span>
                    </div>
                    <Progress 
                      value={logs.training_info.epochs > 0
                        ? Math.min(100, (logs.training_info.elapsed_minutes / (logs.training_info.epochs / 100)) * 100)
                        : 0} 
                      className="h-2" 
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Step */}
          {logs?.current_step && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-purple-900">Current Step</div>
                  <div className="text-sm text-purple-700 mt-1">{logs.current_step}</div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Progress Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={scrollRef}
                className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs"
              >
                {logs?.progress_messages && logs.progress_messages.length > 0 ? (
                  logs.progress_messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border ${getMessageTypeColor(msg.type)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-xs opacity-70 mb-1">
                            {formatTimestamp(msg.timestamp)}
                          </div>
                          <div className="break-words">{msg.message}</div>
                        </div>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {msg.type}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Terminal className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No progress messages yet.</p>
                    {status === 'running' && (
                      <p className="text-xs mt-2">Logs will appear here as training progresses...</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          {logs?.errors && logs.errors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span>Errors ({logs.errors.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {logs.errors.map((err, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-red-50 border border-red-200 rounded text-xs"
                    >
                      <div className="text-red-800 opacity-70 mb-1">
                        {formatTimestamp(err.timestamp)}
                      </div>
                      <div className="text-red-900 break-words">{err.message}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {logs?.warnings && logs.warnings.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Warnings ({logs.warnings.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {logs.warnings.map((warn, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs"
                    >
                      <div className="text-yellow-800 opacity-70 mb-1">
                        {formatTimestamp(warn.timestamp)}
                      </div>
                      <div className="text-yellow-900 break-words">{warn.message}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
