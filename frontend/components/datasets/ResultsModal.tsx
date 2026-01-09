"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Database,
  FileText,
  BarChart3,
  Shield,
  Zap,
  Lock
} from "lucide-react";

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string | null;
  runName: string;
}

export function ResultsModal({ isOpen, onClose, runId, runName }: ResultsModalProps) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (isOpen && runId) {
      loadResults();
    }
  }, [isOpen, runId]);

  const loadResults = async () => {
    if (!runId) return;

    setLoading(true);
    setError(null);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE;
      if (!base) {
        throw new Error('Backend API URL not configured');
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch run details
      const runResponse = await fetch(`${base}/v1/runs/${runId}`, { headers });
      if (!runResponse.ok) {
        throw new Error(`Failed to load run: ${runResponse.status}`);
      }
      const runData = await runResponse.json();

      // Fetch metrics
      const metricsResponse = await fetch(`${base}/v1/runs/${runId}/metrics`, { headers });
      const metricsData = metricsResponse.ok ? await metricsResponse.json() : {};

      // Calculate duration
      let duration = 0;
      if (runData.started_at && runData.finished_at) {
        const start = new Date(runData.started_at);
        const end = new Date(runData.finished_at);
        duration = Math.floor((end.getTime() - start.getTime()) / 60000); // minutes
      }

      // Build results object
      const resultsData = {
        id: runData.id,
        name: runData.name || runName,
        status: runData.status === 'succeeded' ? 'Completed' : runData.status,
        method: runData.method || 'Unknown',
        started_at: runData.started_at,
        finished_at: runData.finished_at,
        duration,
        scores: {
          auroc: metricsData?.utility?.auroc || 0,
          c_index: metricsData?.utility?.c_index || 0,
          mia_auc: metricsData?.privacy?.mia_auc || 0,
          dp_epsilon: runData.config_json?.dp?.epsilon || 0,
          privacy_score: metricsData?.privacy_score || 0,
          utility_score: metricsData?.utility_score || 0
        },
        metrics: {
          rows_generated: metricsData?.rows_generated || 0,
          columns_generated: metricsData?.columns_generated || 0,
          privacy_audit_passed: (metricsData?.privacy?.mia_auc || 1) <= 0.6 && (metricsData?.privacy?.dup_rate || 1) <= 0.05,
          utility_audit_passed: (metricsData?.utility?.ks_mean || 1) <= 0.1 && (metricsData?.utility?.corr_delta || 1) <= 0.15,
          privacy: {
            mia_auc: metricsData?.privacy?.mia_auc || 0,
            dup_rate: metricsData?.privacy?.dup_rate || 0
          },
          utility: {
            ks_mean: metricsData?.utility?.ks_mean || 0,
            corr_delta: metricsData?.utility?.corr_delta || 0
          }
        }
      };
      setResults(resultsData);
    } catch (err) {
      console.error('Error loading results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!runId) return;
    
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE;
      if (!base) {
        throw new Error('Backend API URL not configured');
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${base}/v1/runs/${runId}/report/pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.status}`);
      }

      const result = await response.json();
      if (result.signedUrl) {
        const link = document.createElement('a');
        link.href = result.signedUrl;
        link.download = `${runName}-report.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('No signed URL returned from server');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert(error instanceof Error ? error.message : 'Failed to download report');
    }
  };

  const handleDownloadData = async () => {
    if (!runId) return;
    
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE;
      if (!base) {
        throw new Error('Backend API URL not configured');
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${base}/v1/runs/${runId}/synthetic-data`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download synthetic data: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${runName}-synthetic-data.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading synthetic data:', error);
      alert(error instanceof Error ? error.message : 'Failed to download synthetic data');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'running':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 60) {
      return `${Math.max(1, duration)} minutes`;
    } else if (duration < 1440) {
      return `${Math.floor(duration / 60)} hours ${duration % 60} minutes`;
    } else {
      return `${Math.floor(duration / 1440)} days ${Math.floor((duration % 1440) / 60)} hours`;
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2 text-gray-600">Loading results...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !results) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-red-500">⚠</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading results</h3>
            <p className="text-gray-500 mb-4">{error || 'No results found'}</p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            {getStatusIcon(results.status)}
            <span>{results.name}</span>
            <Badge className={getStatusColor(results.status)}>
              {results.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="utility">Utility</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Run Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium">{results.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started:</span>
                    <span className="font-medium">
                      {new Date(results.started_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">
                      {formatDuration(results.duration)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rows Generated:</span>
                    <span className="font-medium">
                      {results.metrics.rows_generated.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Columns Generated:</span>
                    <span className="font-medium">
                      {results.metrics.columns_generated}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Overall Scores</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">AUROC:</span>
                    <span className="font-medium">{results.scores.auroc.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">C-Index:</span>
                    <span className="font-medium">{results.scores.c_index.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Privacy Score:</span>
                    <span className="font-medium">{results.scores.privacy_score.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utility Score:</span>
                    <span className="font-medium">{results.scores.utility_score.toFixed(3)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex space-x-4">
              <Button onClick={handleDownloadReport} className="bg-red-600 hover:bg-red-700">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <Button onClick={handleDownloadData} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Download Synthetic Data
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Privacy Audit</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <div className="flex items-center space-x-2">
                      {results.metrics.privacy_audit_passed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={results.metrics.privacy_audit_passed ? 'text-green-600' : 'text-red-600'}>
                        {results.metrics.privacy_audit_passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MIA AUC:</span>
                    <span className="font-medium">{results.metrics.privacy.mia_auc.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duplicate Rate:</span>
                    <span className="font-medium">{(results.metrics.privacy.dup_rate * 100).toFixed(2)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Utility Audit</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <div className="flex items-center space-x-2">
                      {results.metrics.utility_audit_passed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={results.metrics.utility_audit_passed ? 'text-green-600' : 'text-red-600'}>
                        {results.metrics.utility_audit_passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">KS Mean:</span>
                    <span className="font-medium">{results.metrics.utility.ks_mean.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Correlation Delta:</span>
                    <span className="font-medium">{results.metrics.utility.corr_delta.toFixed(3)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Privacy Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Membership Inference Attack (MIA) AUC</span>
                      <span className="font-medium">{results.scores.mia_auc.toFixed(3)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(results.scores.mia_auc * 100, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Lower values indicate better privacy protection
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Differential Privacy Epsilon (ε)</span>
                      <span className="font-medium">{results.scores.dp_epsilon.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((results.scores.dp_epsilon / 5) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Lower values provide stronger privacy guarantees
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="utility" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Utility Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">AUROC (Area Under ROC)</span>
                      <span className="font-medium">{results.scores.auroc.toFixed(3)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${results.scores.auroc * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Higher values indicate better predictive performance
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">C-Index (Concordance Index)</span>
                      <span className="font-medium">{results.scores.c_index.toFixed(3)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${results.scores.c_index * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Higher values indicate better ranking performance
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
