"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Database,
  FileText,
  BarChart3,
  Shield,
  Zap,
  Brain,
  Play,
  TrendingUp,
  ChevronUp
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { getRunDetails, getRunMetrics, getRunSteps } from "@/lib/api";
import { getUserFriendlyErrorMessage } from "@/lib/errorMessages";
import { AgentPlanTab } from "./AgentPlanTab";
import { AgentTimeline } from "./AgentTimeline";
import { ExecutionLogTab } from "./ExecutionLogTab";
import { RealTimeLogsTab } from "./RealTimeLogsTab";
import ReportView from "./ReportView";

interface RunDetailsExpansionProps {
  runId: string;
  runName: string;
  onClose: () => void;
}

interface RunResults {
  id: string;
  name: string;
  status: string;
  method: string;
  started_at: string;
  finished_at: string;
  duration: number;
  scores: {
    auroc: number;
    c_index: number;
    mia_auc: number;
    dp_epsilon: number;
    privacy_score: number;
    utility_score: number;
  };
  metrics: {
    rows_generated: number;
    columns_generated: number;
    privacy_audit_passed: boolean;
    utility_audit_passed: boolean;
    privacy: {
      mia_auc: number;
      dup_rate: number;
    };
    utility: {
      ks_mean: number;
      corr_delta: number;
    };
  };
}

interface RunStep {
  step_no: number;
  title: string;
  detail: string;
  metrics_json?: Record<string, any> | null;
  created_at: string;
  is_agent_action?: boolean;
  is_backup_attempt?: boolean;
  is_error?: boolean;
  is_training?: boolean;
  is_metrics?: boolean;
  method_hint?: string | null;
}

export function RunDetailsExpansion({ runId, runName, onClose }: RunDetailsExpansionProps) {
  const [results, setResults] = useState<RunResults | null>(null);
  const [runData, setRunData] = useState<any>(null);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (runId) {
      loadResults();
    }
  }, [runId]);

  const loadResults = async () => {
    if (!runId) return;

    setLoading(true);

    try {
      // Fetch run details with plan
      const runDataResult = await getRunDetails(runId);
      setRunData(runDataResult);

      // Fetch metrics (may not exist for cancelled/failed runs)
      let metricsData: any = {};
      try {
        metricsData = await getRunMetrics(runId);
      } catch (err) {
        // 404 is expected for cancelled/failed runs, other errors should be logged
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (!errorMsg.includes('404')) {
          console.warn('[RunDetailsExpansion] Error fetching metrics:', err);
        }
        // Continue without metrics - cancelled runs won't have them
      }

      // Fetch steps (should always exist, even for cancelled runs)
      let stepsData: RunStep[] = [];
      try {
        stepsData = await getRunSteps(runId);
      } catch (err) {
        console.warn('[RunDetailsExpansion] Error fetching steps:', err);
        // Steps are important, but don't fail completely if they can't be loaded
      }
      setSteps(stepsData);

      // Calculate duration
      let duration = 0;
      if (runDataResult.started_at && runDataResult.finished_at) {
        const start = new Date(runDataResult.started_at);
        const end = new Date(runDataResult.finished_at);
        duration = Math.floor((end.getTime() - start.getTime()) / 60000); // minutes
      }

      // Calculate status based on metrics (if run completed)
      let computedStatus = runDataResult.status;
      if (runDataResult.status === 'cancelled') {
        computedStatus = 'Cancelled';
      } else if (runDataResult.status === 'succeeded') {
        computedStatus = 'Succeeded';
        if (metricsData && Object.keys(metricsData).length > 0) {
          const hasMetrics = metricsData?.utility || metricsData?.privacy;
          const rowsGenerated = metricsData?.rows_generated;
          
          // Only mark as Failed if we have metrics but rows_generated is explicitly 0
          // If rows_generated is missing, we assume it's a successful legacy run or intercepted run
          if (rowsGenerated === 0 && hasMetrics) {
            computedStatus = 'Failed';
          } else {
            const privacyPassed = metricsData?.privacy?.mia_auc <= 0.6 && metricsData?.privacy?.dup_rate <= 0.05;
            const utilityPassed = metricsData?.utility?.ks_mean <= 0.15 && metricsData?.utility?.corr_delta <= 0.10;
            if (!privacyPassed || !utilityPassed) {
              computedStatus = 'Completed with Failures';
            }
          }
        }
      } else if (runDataResult.status === 'failed') {
        computedStatus = 'Failed';
      }

      // Build results object
      const runResults: RunResults = {
        id: runDataResult.id,
        name: runDataResult.name || runName,
        status: computedStatus,
        method: runDataResult.method || 'Unknown',
        started_at: runDataResult.started_at,
        finished_at: runDataResult.finished_at,
        duration,
        scores: {
          auroc: metricsData?.utility?.auroc || 0,
          c_index: metricsData?.utility?.c_index || 0,
          mia_auc: metricsData?.privacy?.mia_auc || 0,
          dp_epsilon: runDataResult.config_json?.dp?.epsilon || 0,
          privacy_score: metricsData?.privacy_score || 0,
          utility_score: metricsData?.utility_score || 0
        },
        metrics: {
          rows_generated: metricsData?.rows_generated || (metricsData ? 1 : 0),
          columns_generated: metricsData?.columns_generated || 0,
          privacy_audit_passed: (metricsData?.privacy?.mia_auc ?? 1) <= 0.6 && (metricsData?.privacy?.dup_rate ?? 1) <= 0.05,
          utility_audit_passed: (metricsData?.utility?.ks_mean ?? 1) <= 0.15 && (metricsData?.utility?.corr_delta ?? 1) <= 0.10,
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
      setResults(runResults);
      setError(null); // Clear any previous errors
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err as any);
      console.error('Error loading results:', err);
      
      // Only close expansion if run is truly not found (404)
      const errorStr = err instanceof Error ? err.message : String(err);
      if (errorStr.includes('404') || errorStr.includes('not found')) {
        console.warn(`[RunDetailsExpansion] Run ${runId} not found`);
        onClose();
        return;
      }
      
      // For other errors (like 405, CORS, network), show error message
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!results?.id) return;
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Use signed URL for private bucket access
      // Path relative to bucket root: {run_id}/report.pdf
      const path = `${results.id}/report.pdf`;
      const { data, error } = await supabase.storage
        .from('run_artifacts')
        .createSignedUrl(path, 60); // 1 minute expiry

      if (error || !data?.signedUrl) throw new Error('Failed to generate secure link');

      // Trigger download
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = `${results.name}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Artifact may not exist.');
    }
  };

  const handleDownloadData = async () => {
    if (!results?.id) return;
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Use signed URL for private bucket access
      // Path relative to bucket root: {run_id}/synthetic.csv
      const path = `${results.id}/synthetic.csv`;
      const { data, error } = await supabase.storage
        .from('run_artifacts')
        .createSignedUrl(path, 60); // 1 minute expiry

      if (error || !data?.signedUrl) throw new Error('Failed to generate secure link');

      // Trigger download
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = `${results.name}-synthetic-data.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading synthetic data:', error);
      alert('Failed to download data. Artifact may not exist.');
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

  // Show loading state but keep component visible
  if (loading || (!results && !error)) {
    return (
      <Card className="mt-3 border-t-2 border-blue-500 shadow-lg" data-expansion>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-3 text-lg">
              <span>{runName}</span>
              <Badge className="bg-gray-100 text-gray-800">Loading...</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2 text-gray-600">Loading details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="mt-3 border-t-2 border-red-500 shadow-lg" data-expansion>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-3 text-lg">
              <span>{runName}</span>
              <Badge className="bg-red-100 text-red-800">Error</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <div className="text-center">
              <p className="text-red-600 font-medium mb-2">Failed to load run details</p>
              <p className="text-gray-600 text-sm">{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setError(null);
                loadResults();
              }}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results) return null;

  return (
    <Card className="mt-3 border-t-2 border-blue-500 shadow-lg" data-expansion>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-3 text-lg">
            <span>{results?.name}</span>
            <Badge className={
              results.status === 'Completed' ? 'bg-green-100 text-green-800' :
              results.status === 'Completed with Failures' ? 'bg-orange-100 text-orange-800' :
              results.status === 'Cancelled' ? 'bg-yellow-100 text-yellow-800' :
              results.status === 'Failed' || results.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }>
              {results.status}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto border-b rounded-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="report" className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>Report</span>
            </TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="utility">Utility</TabsTrigger>
            <TabsTrigger value="agent-plan" className="flex items-center space-x-1">
              <Brain className="h-3 w-3" />
              <span>Agent Plan</span>
            </TabsTrigger>
            <TabsTrigger value="execution-log" className="flex items-center space-x-1">
              <Play className="h-3 w-3" />
              <span>Execution</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>Live Logs</span>
            </TabsTrigger>
            <TabsTrigger value="agent-timeline" className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>Timeline</span>
            </TabsTrigger>
          </TabsList>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <TabsContent value="overview" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <Database className="h-4 w-4" />
                      <span>Run Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-medium">{results.method}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Started:</span>
                      <span className="font-medium">
                        {new Date(results.started_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{formatDuration(results.duration)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rows Generated:</span>
                      <span className="font-medium">{results.metrics.rows_generated.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <BarChart3 className="h-4 w-4" />
                      <span>Overall Scores</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Privacy Score:</span>
                      <span className="font-medium">{results.scores.privacy_score.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Utility Score:</span>
                      <span className="font-medium">{results.scores.utility_score.toFixed(3)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex space-x-4">
                <Button onClick={handleDownloadReport} className="bg-red-600 hover:bg-red-700" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button onClick={handleDownloadData} variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <Shield className="h-4 w-4" />
                      <span>Privacy Audit</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
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
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">MIA AUC:</span>
                      <span className={`font-medium ${results.metrics.privacy.mia_auc <= 0.6 ? 'text-green-600' : 'text-red-600'}`}>
                        {results.metrics.privacy.mia_auc.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Duplicate Rate:</span>
                      <span className={`font-medium ${results.metrics.privacy.dup_rate <= 0.05 ? 'text-green-600' : 'text-red-600'}`}>
                        {(results.metrics.privacy.dup_rate * 100).toFixed(2)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <Zap className="h-4 w-4" />
                      <span>Utility Audit</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
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
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">KS Mean:</span>
                      <span className={`font-medium ${results.metrics.utility.ks_mean <= 0.15 ? 'text-green-600' : 'text-red-600'}`}>
                        {results.metrics.utility.ks_mean.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Correlation Delta:</span>
                      <span className={`font-medium ${results.metrics.utility.corr_delta <= 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                        {results.metrics.utility.corr_delta.toFixed(3)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Shield className="h-4 w-4" />
                    <span>Privacy Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-gray-600">MIA AUC:</span>
                      <span className="font-medium">{results.scores.mia_auc.toFixed(3)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(results.scores.mia_auc * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-gray-600">DP Epsilon (ε):</span>
                      <span className="font-medium">{results.scores.dp_epsilon.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((results.scores.dp_epsilon / 5) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="utility" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <BarChart3 className="h-4 w-4" />
                    <span>Utility Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-gray-600">AUROC:</span>
                      <span className="font-medium">{results.scores.auroc.toFixed(3)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${results.scores.auroc * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-gray-600">C-Index:</span>
                      <span className="font-medium">{results.scores.c_index.toFixed(3)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${results.scores.c_index * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agent-plan" className="mt-4">
              <AgentPlanTab
                plan={runData?.config_json?.plan || null}
                interventions={runData?.agent_interventions || null}
                finalMethod={runData?.method}
              />
            </TabsContent>

            <TabsContent value="execution-log" className="mt-4">
              {/* Use ExecutionLogTab component for proper formatting */}
              <div className="max-h-[60vh] overflow-y-auto">
                <ExecutionLogTab steps={steps} />
              </div>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <RealTimeLogsTab runId={runId} status={results.status} />
            </TabsContent>

            <TabsContent value="agent-timeline" className="mt-4">
              <AgentTimeline
                plan={runData?.config_json?.plan || null}
                steps={steps}
                finalMetrics={results?.metrics}
                interventions={runData?.agent_interventions || null}
              />
            </TabsContent>
            <TabsContent value="report" className="mt-4">
              <ReportView report={{
                privacy: {
                  mia_auc: results.metrics.privacy.mia_auc,
                  dup_rate: results.metrics.privacy.dup_rate,
                  k_anonymization: (runData?.config_json?.privacy || {}).k_anon,
                  identifiability_score: results.scores.privacy_score, // Using score as proxy if actual metric missing
                  dp_epsilon: results.scores.dp_epsilon,
                  dp_effective: results.scores.dp_epsilon > 0
                },
                utility: {
                  ks_mean: results.metrics.utility.ks_mean,
                  corr_delta: results.metrics.utility.corr_delta,
                  auroc: results.scores.auroc,
                  c_index: results.scores.c_index
                },
                // Fairness not always present in basic results, try to get from runData if available
                fairness: runData?.metrics?.fairness,
                compliance: {
                  passed: results.metrics.privacy_audit_passed && results.metrics.utility_audit_passed,
                  privacy_passed: results.metrics.privacy_audit_passed,
                  utility_passed: results.metrics.utility_audit_passed,
                  score: (results.scores.privacy_score + results.scores.utility_score) / 2
                },
                meta: {
                  n_real: runData?.metrics?.meta?.n_real || 0,
                  n_synth: results.metrics.rows_generated,
                  model: results.method
                }
              }} />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

