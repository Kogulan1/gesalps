"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  X, 
  Download, 
  FileText, 
  BarChart3, 
  Shield, 
  Zap,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string | null;
  runName?: string;
}

interface RunMetrics {
  utility: {
    ks_mean: number;
    corr_delta: number;
    auroc?: number;
    c_index?: number;
  };
  privacy: {
    mia_auc: number;
    dup_rate: number;
    dp_effective?: boolean;
    dp_epsilon?: number;
  };
  fairness?: {
    rare_coverage: number;
    freq_skew: number;
  };
  meta: {
    model: string;
    attempt: number;
    n_real: number;
    n_synth: number;
    dp_effective: boolean;
  };
}

interface Artifact {
  kind: string;
  signedUrl: string;
  bytes?: number;
  mime?: string;
}

export function ResultsModal({ 
  isOpen, 
  onClose, 
  runId,
  runName 
}: ResultsModalProps) {
  const [metrics, setMetrics] = useState<RunMetrics | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'artifacts' | 'report'>('overview');

  useEffect(() => {
    if (isOpen && runId) {
      fetchResults();
    }
  }, [isOpen, runId]);

  const fetchResults = async () => {
    if (!runId) return;

    setLoading(true);
    setError(null);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Fetch metrics
      const metricsResponse = await fetch(`${base}/v1/runs/${runId}/metrics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Fetch artifacts
      const artifactsResponse = await fetch(`${base}/v1/runs/${runId}/artifacts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (artifactsResponse.ok) {
        const artifactsData = await artifactsResponse.json();
        setArtifacts(artifactsData.artifacts || []);
      }

    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadArtifact = (artifact: Artifact) => {
    if (artifact.signedUrl) {
      // Create a temporary link element to download the artifact
      const link = document.createElement('a');
      link.href = artifact.signedUrl;
      link.download = artifact.name || `artifact_${artifact.kind}`;
      link.target = '_blank';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadReport = async () => {
    if (!runId) return;

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
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

      if (response.ok) {
        const result = await response.json();
        if (result.signedUrl) {
          // Create a temporary link element to download the PDF
          const link = document.createElement('a');
          link.href = result.signedUrl;
          link.download = `gesalps_quality_report_${runId}.pdf`;
          link.target = '_blank';
          
          // Add to DOM, click, and remove
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      setError(err instanceof Error ? err.message : 'Failed to download report');
    }
  };

  const getScoreColor = (score: number, threshold: number) => {
    return score <= threshold ? "text-green-600" : "text-red-600";
  };

  const getScoreIcon = (score: number, threshold: number) => {
    return score <= threshold ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getArtifactIcon = (kind: string) => {
    switch (kind) {
      case 'synthetic_csv': return <FileText className="h-4 w-4" />;
      case 'report_json': return <BarChart3 className="h-4 w-4" />;
      case 'report_pdf': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getArtifactName = (kind: string) => {
    switch (kind) {
      case 'synthetic_csv': return 'Synthetic Data (CSV)';
      case 'report_json': return 'Report Data (JSON)';
      case 'report_pdf': return 'Quality Report (PDF)';
      default: return kind;
    }
  };

  if (!isOpen || !runId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-red-600" />
            <span>Run Results: {runName || 'Synthesis Run'}</span>
          </DialogTitle>
          <DialogDescription>
            View detailed metrics, download artifacts, and generate reports for this synthesis run.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <span className="ml-2 text-gray-600">Loading results...</span>
          </div>
        ) : error ? (
          <div className="flex items-center space-x-2 text-red-600 text-sm p-3 bg-red-50 rounded border border-red-200">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {[
                { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
                { id: 'metrics', label: 'Metrics', icon: <Target className="h-4 w-4" /> },
                { id: 'artifacts', label: 'Artifacts', icon: <Download className="h-4 w-4" /> },
                { id: 'report', label: 'Report', icon: <FileText className="h-4 w-4" /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && metrics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <h3 className="font-medium text-blue-900">Privacy Score</h3>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {((1 - metrics.privacy.mia_auc) * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-blue-700">
                      MIA AUC: {metrics.privacy.mia_auc.toFixed(3)}
                    </p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="h-5 w-5 text-green-600" />
                      <h3 className="font-medium text-green-900">Utility Score</h3>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {((1 - metrics.utility.ks_mean) * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-green-700">
                      KS Mean: {metrics.utility.ks_mean.toFixed(3)}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      <h3 className="font-medium text-purple-900">Data Generated</h3>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {metrics.meta.n_synth.toLocaleString()}
                    </div>
                    <p className="text-sm text-purple-700">
                      from {metrics.meta.n_real.toLocaleString()} real rows
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Model Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Method:</span>
                      <span className="ml-2 font-medium">{metrics.meta.model.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Attempt:</span>
                      <span className="ml-2 font-medium">{metrics.meta.attempt}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">DP Enabled:</span>
                      <span className="ml-2 font-medium">{metrics.meta.dp_effective ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Epsilon:</span>
                      <span className="ml-2 font-medium">{metrics.privacy.dp_epsilon || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Tab */}
            {activeTab === 'metrics' && metrics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Privacy Metrics */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-red-600" />
                      <span>Privacy Metrics</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Membership Inference AUC</div>
                          <div className="text-sm text-gray-600">Lower is better (≤ 0.60)</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getScoreIcon(metrics.privacy.mia_auc, 0.60)}
                          <span className={`font-bold ${getScoreColor(metrics.privacy.mia_auc, 0.60)}`}>
                            {metrics.privacy.mia_auc.toFixed(3)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Record Linkage Risk</div>
                          <div className="text-sm text-gray-600">Lower is better (≤ 5%)</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getScoreIcon(metrics.privacy.dup_rate * 100, 5.0)}
                          <span className={`font-bold ${getScoreColor(metrics.privacy.dup_rate * 100, 5.0)}`}>
                            {(metrics.privacy.dup_rate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Utility Metrics */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-green-600" />
                      <span>Utility Metrics</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">KS Mean</div>
                          <div className="text-sm text-gray-600">Lower is better (≤ 0.10)</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getScoreIcon(metrics.utility.ks_mean, 0.10)}
                          <span className={`font-bold ${getScoreColor(metrics.utility.ks_mean, 0.10)}`}>
                            {metrics.utility.ks_mean.toFixed(3)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Correlation Delta</div>
                          <div className="text-sm text-gray-600">Lower is better (≤ 0.10)</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getScoreIcon(metrics.utility.corr_delta, 0.10)}
                          <span className={`font-bold ${getScoreColor(metrics.utility.corr_delta, 0.10)}`}>
                            {metrics.utility.corr_delta.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Artifacts Tab */}
            {activeTab === 'artifacts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Generated Artifacts</h3>
                  <Button
                    onClick={handleDownloadReport}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate PDF Report
                  </Button>
                </div>

                {artifacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No artifacts available yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {artifacts.map((artifact, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getArtifactIcon(artifact.kind)}
                            <div>
                              <div className="font-medium text-gray-900">
                                {getArtifactName(artifact.kind)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatBytes(artifact.bytes)}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDownloadArtifact(artifact)}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Report Tab */}
            {activeTab === 'report' && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Quality Report</h3>
                  <p className="text-gray-600 mb-4">
                    Generate a comprehensive PDF report with detailed metrics and analysis
                  </p>
                  <Button
                    onClick={handleDownloadReport}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate PDF Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
