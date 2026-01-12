"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Progress from "@/components/ui/progress";
import { Metric } from "@/components/ui/Metric";
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  ShieldCheck, 
  Activity, 
  Download,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

interface RealTimeProgressDashboardProps {
  runId: string | null;
  status: string;
  onComplete: () => void;
  onFail: () => void;
}

const STEPS = [
  { id: 'analyzing', label: 'Analyzing Dataset', description: 'Detecting distributions & features' },
  { id: 'preprocessing', label: 'Adaptive Preprocessing', description: 'Domain-aware encoding in progress' },
  { id: 'generating', label: 'Model Generation', description: 'Training v18 engine architectures' },
  { id: 'evaluating', label: 'Clinical Audit', description: 'Verifying privacy & utility gates' },
];

export function RealTimeProgressDashboard({ runId, status, onComplete, onFail }: RealTimeProgressDashboardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (runId) {
      startPolling();
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      clearInterval(timerRef.current);
    };
  }, [runId]);

  const startPolling = async () => {
    const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const poll = async () => {
      try {
        // Poll for steps
        const stepsRes = await fetch(`${base}/v1/runs/${runId}/steps`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (stepsRes.ok) {
          const steps = await stepsRes.json();
          // Map backend steps to our UI steps
          const latestStep = steps[steps.length - 1];
          if (latestStep) {
            if (latestStep.title.includes('train')) setCurrentStepIndex(2);
            else if (latestStep.title.includes('metric')) setCurrentStepIndex(3);
            else if (latestStep.title.includes('preprocess')) setCurrentStepIndex(1);
          }
        }

        // Poll for metrics (even partial)
        const metricsRes = await fetch(`${base}/v1/runs/${runId}/metrics`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (metricsRes.ok) {
          const m = await metricsRes.json();
          setMetrics(m);
        }

        // Check overall status
        const statusRes = await fetch(`${base}/v1/runs/${runId}/status`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (statusRes.ok) {
          const s = await statusRes.json();
          if (s.status === 'succeeded') {
            setCurrentStepIndex(4);
            onComplete();
            clearInterval(timerRef.current);
          } else if (s.status === 'failed' || s.status === 'cancelled') {
            onFail();
            clearInterval(timerRef.current);
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    };

    const intervalId = setInterval(poll, 2000);
    return () => clearInterval(intervalId);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}m ${secs}s`;
  };

  const isCompleted = currentStepIndex === 4;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="border-2 border-primary/5 shadow-lg overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center space-x-2">
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                )}
                <span>{isCompleted ? "Run Complete" : "Generating Synthetic Data..."}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Run ID: <code className="text-[10px] bg-muted px-1 rounded">{runId?.slice(0, 8)}...</code>
              </p>
            </div>
            <Badge variant="outline" className="h-8 px-4 font-mono">
              {formatTime(elapsedTime)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-8 pb-8">
          {/* Custom Stepper */}
          <div className="space-y-8">
            {STEPS.map((step, idx) => {
              const state = idx < currentStepIndex ? 'complete' : idx === currentStepIndex ? 'active' : 'upcoming';
              return (
                <div key={step.id} className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${
                      state === 'complete' ? 'bg-green-500 border-green-500 text-white' : 
                      state === 'active' ? 'border-primary text-primary bg-primary/5 ring-4 ring-primary/10' : 
                      'border-muted text-muted-foreground'
                    }`}>
                      {state === 'complete' ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`w-0.5 h-12 transition-colors duration-500 ${state === 'complete' ? 'bg-green-500' : 'bg-muted'}`} />
                    )}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h4 className={`font-semibold text-sm ${state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {step.label}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {state === 'active' ? step.description : state === 'complete' ? 'Task finished successfully' : 'Pending...'}
                    </p>
                    {state === 'active' && (
                      <div className="mt-3 w-full max-w-xs">
                        <Progress value={45} className="h-1 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Metrics Preview */}
          {metrics && (
            <div className="mt-12 pt-8 border-t space-y-4 animate-in slide-in-from-bottom-5 duration-700">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Real-time Quality Preview</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Metric 
                  label="KS Mean (lower is better)" 
                  value={metrics.utility?.ks_mean?.toFixed(4) || "0.0000"} 
                  tone={metrics.utility?.ks_mean < 0.15 ? "good" : "warn"}
                />
                <Metric 
                  label="Privacy Score" 
                  value={`${((1 - metrics.privacy?.mia_auc) * 100).toFixed(1)}%`}
                  tone={metrics.privacy?.mia_auc < 0.6 ? "good" : "risk"}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Badge & Action */}
      {isCompleted && (
        <Card className="bg-green-50 border-green-100 dark:bg-green-950/20 dark:border-green-900 animate-in zoom-in-95 duration-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                  <ShieldCheck className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-green-900 dark:text-green-100">All Green Audit Passed</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">Dataset is clinically safe and utility verified.</p>
                </div>
              </div>
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white shadow-xl">
                <Download className="mr-2 h-4 w-4" /> Download Audit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'failed' && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700 font-medium">Generation failed. Please try again with adjusted privacy settings.</p>
        </div>
      )}
    </div>
  );
}
