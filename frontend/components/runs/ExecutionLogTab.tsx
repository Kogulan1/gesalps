"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Brain,
  Settings,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronRight
} from "lucide-react";

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
  is_planned?: boolean;
  method_hint?: string | null;
}

interface ExecutionLogTabProps {
  steps: RunStep[];
}

export function ExecutionLogTab({ steps }: ExecutionLogTabProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (stepNo: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNo)) {
      newExpanded.delete(stepNo);
    } else {
      newExpanded.add(stepNo);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (step: RunStep) => {
    if (step.is_error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (step.is_agent_action) return <Brain className="h-4 w-4 text-purple-500" />;
    if (step.is_training) return <Play className="h-4 w-4 text-blue-500" />;
    if (step.is_metrics) return <BarChart3 className="h-4 w-4 text-green-500" />;
    if (step.is_planned) return <Settings className="h-4 w-4 text-gray-500" />;
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getStepColor = (step: RunStep) => {
    if (step.is_error) return "border-red-200 bg-red-50";
    if (step.is_agent_action) return "border-purple-200 bg-purple-50";
    if (step.is_backup_attempt) return "border-orange-200 bg-orange-50";
    if (step.is_training) return "border-blue-200 bg-blue-50";
    if (step.is_metrics) return "border-green-200 bg-green-50";
    return "border-gray-200 bg-gray-50";
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatMetrics = (metrics: Record<string, any> | null | undefined) => {
    if (!metrics) return null;
    
    const sections: Array<{ title: string; data: Record<string, any> }> = [];
    
    if (metrics.utility) {
      sections.push({ title: "Utility", data: metrics.utility });
    }
    if (metrics.privacy) {
      sections.push({ title: "Privacy", data: metrics.privacy });
    }
    if (metrics.fairness) {
      sections.push({ title: "Fairness", data: metrics.fairness });
    }
    
    // Include any top-level metrics
    const topLevel = { ...metrics };
    delete topLevel.utility;
    delete topLevel.privacy;
    delete topLevel.fairness;
    if (Object.keys(topLevel).length > 0) {
      sections.push({ title: "Other", data: topLevel });
    }
    
    return sections;
  };

  if (steps.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>No execution steps available for this run.</p>
        <p className="text-sm mt-2">Step logging may not be enabled for this run.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Execution Timeline</span>
            <Badge variant="outline" className="ml-2">{steps.length} steps</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            
            <div className="space-y-4">
              {steps.map((step, idx) => {
                const isExpanded = expandedSteps.has(step.step_no);
                const hasMetrics = step.metrics_json && Object.keys(step.metrics_json).length > 0;
                const formattedMetrics = formatMetrics(step.metrics_json);
                
                return (
                  <div key={`step-${step.step_no}-${idx}-${step.created_at || idx}`} className="relative pl-12">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 top-1 w-4 h-4 rounded-full border-2 ${
                      step.is_error ? "border-red-500 bg-red-100" :
                      step.is_agent_action ? "border-purple-500 bg-purple-100" :
                      step.is_backup_attempt ? "border-orange-500 bg-orange-100" :
                      step.is_training ? "border-blue-500 bg-blue-100" :
                      step.is_metrics ? "border-green-500 bg-green-100" :
                      "border-gray-400 bg-gray-100"
                    }`} />
                    
                    <div
                      className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${getStepColor(step)}`}
                      onClick={() => toggleStep(step.step_no)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getStepIcon(step)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">
                                Step {step.step_no}: {step.title}
                              </h4>
                              {step.method_hint && (
                                <Badge variant="outline" className="text-xs">
                                  {step.method_hint}
                                </Badge>
                              )}
                              {step.is_agent_action && (
                                <Badge className="bg-purple-100 text-purple-800 text-xs">
                                  <Brain className="h-3 w-3 mr-1" />
                                  Agent
                                </Badge>
                              )}
                              {step.is_backup_attempt && (
                                <Badge className="bg-orange-100 text-orange-800 text-xs">
                                  Backup
                                </Badge>
                              )}
                              {step.is_error && (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Error
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{step.detail}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(step.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {hasMetrics && (
                            <Badge variant="outline" className="text-xs">
                              Metrics
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {hasMetrics && isExpanded && (
                      <div className="mt-2 pl-12">
                        <div className="bg-white border rounded-lg p-4 space-y-4">
                          {formattedMetrics?.map((section, sectionIdx) => (
                            <div key={sectionIdx}>
                              <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                {section.title} Metrics
                              </h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(section.data).map(([key, value]) => {
                                  // Handle nested objects properly
                                  let displayValue: string;
                                  if (typeof value === "number") {
                                    displayValue = value.toFixed(3);
                                  } else if (typeof value === "object" && value !== null) {
                                    // If it's an object, stringify it or display as JSON
                                    displayValue = JSON.stringify(value, null, 2).substring(0, 100);
                                  } else {
                                    displayValue = String(value);
                                  }
                                  return (
                                    <div key={key} className="bg-gray-50 rounded p-2">
                                      <div className="text-xs text-gray-600">{key}</div>
                                      <div className="text-sm font-mono font-medium break-words">
                                        {displayValue}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Step Type Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span>Agent Action</span>
            </div>
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-blue-500" />
              <span>Training</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              <span>Metrics</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>Error</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

