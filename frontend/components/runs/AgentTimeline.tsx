"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain,
  Target,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Shield,
  Zap
} from "lucide-react";

interface MetricThreshold {
  utility?: {
    ks_mean?: number;
    corr_delta?: number;
  };
  privacy?: {
    mia_auc?: number;
    dup_rate?: number;
  };
  fairness?: {
    rare_coverage?: number;
    freq_skew?: number;
  };
}

interface AgentTimelineProps {
  plan: any;
  steps: Array<{
    step_no: number;
    title: string;
    detail: string;
    metrics_json?: MetricThreshold | null;
    is_agent_action?: boolean;
    is_backup_attempt?: boolean;
    is_error?: boolean;
    is_training?: boolean;
    is_planned?: boolean;
    is_metrics?: boolean;
  }>;
  finalMetrics?: MetricThreshold;
  interventions?: {
    used_backup?: boolean;
    replanned?: boolean;
    method_source?: string;
  };
}

export function AgentTimeline({ plan, steps, finalMetrics, interventions }: AgentTimelineProps) {
  // Extract agent events
  const agentEvents = steps.filter(s => s.is_agent_action || (s as any).is_planned || s.is_backup_attempt);
  const trainingSteps = steps.filter(s => s.is_training);
  const metricSteps = steps.filter(s => s.is_metrics && s.metrics_json);
  const errorSteps = steps.filter(s => s.is_error);

  // Analyze metric progression
  const metricHistory = metricSteps.map(step => ({
    step: step.step_no,
    metrics: step.metrics_json,
    passed: checkMetricsPassed(step.metrics_json),
  }));

  const finalPassed = checkMetricsPassed(finalMetrics);

  function checkMetricsPassed(metrics?: MetricThreshold | null): {
    utility: boolean;
    privacy: boolean;
    fairness: boolean;
    all: boolean;
  } {
    if (!metrics) return { utility: false, privacy: false, fairness: false, all: false };
    
    const utility = (
      (metrics.utility?.ks_mean ?? 1) <= 0.1 &&
      (metrics.utility?.corr_delta ?? 1) <= 0.15
    );
    
    const privacy = (
      (metrics.privacy?.mia_auc ?? 1) <= 0.6 &&
      (metrics.privacy?.dup_rate ?? 0.05) <= 0.05
    );
    
    const fairness = (
      (metrics.fairness?.rare_coverage ?? 0) >= 0.7 &&
      (metrics.fairness?.freq_skew ?? 1) <= 0.3
    );
    
    return {
      utility,
      privacy,
      fairness,
      all: utility && privacy && fairness,
    };
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Metrics Progress to "All Green"</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finalPassed.all ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-900">All Metrics Passed! ✓</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className={finalPassed.utility ? "text-green-700" : "text-gray-500"}>
                    Utility {finalPassed.utility ? "✓" : "✗"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className={finalPassed.privacy ? "text-green-700" : "text-gray-500"}>
                    Privacy {finalPassed.privacy ? "✓" : "✗"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className={finalPassed.fairness ? "text-green-700" : "text-gray-500"}>
                    Fairness {finalPassed.fairness ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <XCircle className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-yellow-900">Some metrics need improvement</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className={finalPassed.utility ? "text-green-700" : "text-yellow-700"}>
                  Utility {finalPassed.utility ? "✓" : "✗"}
                </div>
                <div className={finalPassed.privacy ? "text-green-700" : "text-yellow-700"}>
                  Privacy {finalPassed.privacy ? "✓" : "✗"}
                </div>
                <div className={finalPassed.fairness ? "text-green-700" : "text-yellow-700"}>
                  Fairness {finalPassed.fairness ? "✓" : "✗"}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Decision Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Agent Decision Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Initial Plan */}
            {plan && (
              <div className="flex items-start space-x-3 pb-4 border-b">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">Initial Plan</span>
                    <Badge className="bg-purple-100 text-purple-800">Planning</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Primary: {plan.choice?.method || plan.method || "Unknown"} | 
                    Backups: {plan.backup?.length || 0}
                  </p>
                  {plan.rationale && (
                    <p className="text-xs text-gray-500 mt-1 italic">{plan.rationale}</p>
                  )}
                </div>
              </div>
            )}

            {/* Agent Events */}
            {agentEvents.map((event, idx) => (
              <div key={idx} className="flex items-start space-x-3 pb-4 border-b">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">Step {event.step_no}: {event.title}</span>
                    {event.is_backup_attempt && (
                      <Badge className="bg-orange-100 text-orange-800">Backup</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{event.detail}</p>
                </div>
              </div>
            ))}

            {/* Final Outcome */}
            <div className="flex items-start space-x-3 pt-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                finalPassed.all ? "bg-green-100" : "bg-yellow-100"
              }`}>
                {finalPassed.all ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">Final Outcome</span>
                  <Badge className={finalPassed.all ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {finalPassed.all ? "Success" : "Partial"}
                  </Badge>
                  {interventions?.used_backup && (
                    <Badge className="bg-orange-100 text-orange-800">Backup Used</Badge>
                  )}
                  {interventions?.replanned && (
                    <Badge className="bg-purple-100 text-purple-800">Replanned</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Method: {interventions?.method_source === "backup" ? "Backup" : 
                           interventions?.method_source === "replanned" ? "Replanned" : "Primary"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric Progression */}
      {metricHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Metric Progression</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metricHistory.map((entry, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">After Step {entry.step}</span>
                    <div className="flex space-x-2">
                      <Badge className={entry.passed.utility ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        Utility {entry.passed.utility ? "✓" : "✗"}
                      </Badge>
                      <Badge className={entry.passed.privacy ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        Privacy {entry.passed.privacy ? "✓" : "✗"}
                      </Badge>
                      <Badge className={entry.passed.fairness ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        Fairness {entry.passed.fairness ? "✓" : "✗"}
                      </Badge>
                    </div>
                  </div>
                  {!entry.passed.all && (
                    <p className="text-xs text-gray-500">
                      Agent would need to {entry.passed.utility ? "" : "improve utility, "}
                      {entry.passed.privacy ? "" : "improve privacy, "}
                      {entry.passed.fairness ? "" : "improve fairness"}
                      {entry.passed.all ? "" : "to pass all thresholds"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

