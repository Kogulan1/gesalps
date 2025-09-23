"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      // Mock data for now
      const mockResults = {
        id: runId,
        name: runName,
        status: "Completed",
        method: "TabDDPM",
        started_at: "2024-01-15T11:00:00Z",
        finished_at: "2024-01-15T11:15:00Z",
        duration: 15,
        scores: {
          auroc: 0.87,
          c_index: 0.74,
          mia_auc: 0.56,
          dp_epsilon: 1.2,
          privacy_score: 0.85,
          utility_score: 0.78
        },
        metrics: {
          rows_generated: 1500,
          columns_generated: 25,
          privacy_audit_passed: true,
          utility_audit_passed: true,
          privacy: {
            mia_auc: 0.56,
            dup_rate: 0.03
          },
          utility: {
            ks_mean: 0.08,
            corr_delta: 0.12
          }
        }
      };
      setResults(mockResults);
    } catch (err) {
      console.error('Error loading results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    console.log('Downloading report for run:', runId);
    // TODO: Implement download logic
  };

  const handleDownloadData = async () => {
    console.log('Downloading synthetic data for run:', runId);
    // TODO: Implement download logic
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
