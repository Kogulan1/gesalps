"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Brain,
  Target,
  RefreshCw,
  Settings,
  Info
} from "lucide-react";

interface AgentPlan {
  choice?: {
    method?: string;
    hyperparams?: Record<string, any>;
  };
  backup?: Array<{
    method?: string;
    hyperparams?: Record<string, any>;
  }>;
  rationale?: string;
  dp?: {
    enabled?: boolean;
    epsilon?: number;
  };
  hyperparams?: Record<string, any>;
  method?: string; // Fallback if choice not present
}

interface AgentInterventions {
  used_backup?: boolean;
  replanned?: boolean;
  method_source?: string;
  method_index?: number;
  final_method?: string;
  primary_method?: string;
}

interface AgentPlanTabProps {
  plan: AgentPlan | null;
  interventions: AgentInterventions | null;
  finalMethod?: string;
}

export function AgentPlanTab({ plan, interventions, finalMethod }: AgentPlanTabProps) {
  if (!plan && !interventions) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>No agent plan available for this run.</p>
        <p className="text-sm mt-2">This run may have used manual configuration.</p>
      </div>
    );
  }

  // Handle both object and string format for choice
  let primaryMethod = "Unknown";
  if (plan?.choice) {
    if (typeof plan.choice === "string") {
      primaryMethod = plan.choice;
    } else if (typeof plan.choice === "object" && plan.choice.method) {
      primaryMethod = plan.choice.method;
    }
  }
  if (primaryMethod === "Unknown") {
    primaryMethod = plan?.method || interventions?.primary_method || "Unknown";
  }
  const backupMethods = plan?.backup || [];
  const rationale = plan?.rationale || "No rationale provided";
  const finalMethodActual = finalMethod || interventions?.final_method || primaryMethod;
  const methodSource = interventions?.method_source || "primary";
  const usedBackup = interventions?.used_backup || false;
  const replanned = interventions?.replanned || false;

  const getMethodBadgeColor = (method: string) => {
    const m = method.toLowerCase();
    if (m === "gc") return "bg-blue-100 text-blue-800";
    if (m === "ctgan") return "bg-purple-100 text-purple-800";
    if (m === "tvae") return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const getMethodIcon = (method: string) => {
    const m = method.toLowerCase();
    if (m === "gc") return "🔵";
    if (m === "ctgan") return "🟣";
    if (m === "tvae") return "🟢";
    return "⚪";
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Agent Planning Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Primary Method</p>
                <Badge className={getMethodBadgeColor(primaryMethod)}>
                  {getMethodIcon(primaryMethod)} {primaryMethod.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {methodSource === "primary" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : methodSource === "backup" ? (
                <RefreshCw className="h-5 w-5 text-orange-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-purple-500" />
              )}
              <div>
                <p className="text-sm text-gray-600">Method Used</p>
                <Badge className={getMethodBadgeColor(finalMethodActual)}>
                  {getMethodIcon(finalMethodActual)} {finalMethodActual.toUpperCase()}
                  {methodSource !== "primary" && (
                    <span className="ml-1 text-xs">
                      ({methodSource === "backup" ? "Backup" : "Replanned"})
                    </span>
                  )}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {usedBackup || replanned ? (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <div>
                <p className="text-sm text-gray-600">Agent Intervention</p>
                <p className="text-sm font-medium">
                  {usedBackup ? "Backup Used" : replanned ? "Replanned" : "Primary Succeeded"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rationale Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Agent Rationale</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{rationale}</p>
          </div>
        </CardContent>
      </Card>

      {/* Method Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Primary Choice</span>
              </span>
              {methodSource === "primary" && finalMethodActual.toLowerCase() === primaryMethod.toLowerCase() && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Used
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Badge className={getMethodBadgeColor(primaryMethod)}>
                {primaryMethod.toUpperCase()}
              </Badge>
            </div>
            {plan?.choice && typeof plan.choice === "object" && plan.choice.hyperparams && Object.keys(plan.choice.hyperparams).length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Hyperparameters:</p>
                <div className="bg-gray-50 rounded p-3 space-y-1">
                  {Object.entries(plan.choice.hyperparams).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-mono text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {plan?.hyperparams && Object.keys(plan.hyperparams).length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Hyperparameters:</p>
                <div className="bg-gray-50 rounded p-3 space-y-1">
                  {Object.entries(plan.hyperparams).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-mono text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5" />
                <span>Backup Methods</span>
              </span>
              {backupMethods.length > 0 && (
                <Badge variant="outline">{backupMethods.length} configured</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {backupMethods.length === 0 ? (
              <p className="text-sm text-gray-500">No backup methods configured</p>
            ) : (
              backupMethods.map((backup, idx) => {
                const backupMethod = backup.method || backup?.choice?.method || "Unknown";
                const isUsed = methodSource === "backup" && 
                  (interventions?.method_index === idx + 1 || 
                   finalMethodActual.toLowerCase() === backupMethod.toLowerCase());
                
                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-3 ${
                      isUsed ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getMethodBadgeColor(backupMethod)}>
                        {backupMethod.toUpperCase()}
                      </Badge>
                      {isUsed && (
                        <Badge className="bg-orange-100 text-orange-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Used
                        </Badge>
                      )}
                    </div>
                    {backup.hyperparams && Object.keys(backup.hyperparams).length > 0 && (
                      <div className="text-xs text-gray-600 space-y-1">
                        {Object.entries(backup.hyperparams).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Differential Privacy */}
      {plan?.dp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Differential Privacy</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {plan.dp.enabled ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">DP Enabled</span>
                  {plan.dp.epsilon && (
                    <Badge variant="outline" className="ml-2">
                      ε = {plan.dp.epsilon}
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">DP Disabled</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

