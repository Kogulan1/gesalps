"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Progress from "@/components/ui/progress";
import { 
  Play, 
  Settings, 
  Shield, 
  Brain, 
  Clock, 
  Database, 
  Info,
  CheckCircle,
  AlertCircle,
  Loader2,
  XCircle,
  Download,
  Eye,
  FileText,
  TrendingUp
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { ExecutionLogTab } from "@/components/runs/ExecutionLogTab";
import { AgentPlanTab } from "@/components/runs/AgentPlanTab";

interface RunExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dataset: any;
  onViewResults?: (runId: string, runName: string) => void;
}

type RunState = 'config' | 'started' | 'running' | 'completed' | 'failed';

export function RunExecutionModal({ isOpen, onClose, onSuccess, dataset, onViewResults }: RunExecutionModalProps) {
  const [runName, setRunName] = useState("");
  const [method, setMethod] = useState("TabDDPM");
  const [privacyLevel, setPrivacyLevel] = useState("Medium");
  const [useAgentic, setUseAgentic] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNameConfirm, setShowNameConfirm] = useState(false);
  
  // Run tracking state
  const [runState, setRunState] = useState<RunState>('config');
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<any>(null);
  const [runSteps, setRunSteps] = useState<any[]>([]);
  const [previousStepCount, setPreviousStepCount] = useState(0); // Track previous step count for announcements
  const [runMetrics, setRunMetrics] = useState<any>(null);
  const [runData, setRunData] = useState<any>(null); // Full run data including agent plan
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [announcement, setAnnouncement] = useState<string>(""); // For aria-live announcements
  const timelineRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling timeline

  const methods = [
    { 
      value: "TabDDPM", 
      label: "TabDDPM", 
      description: "Denoising Diffusion Probabilistic Models for tabular data",
      category: "Diffusion",
      recommended: true,
      baseTime: 20 // minutes
    },
    { 
      value: "CTGAN", 
      label: "CTGAN", 
      description: "Conditional Tabular GAN with training by sampling",
      category: "GAN",
      recommended: false,
      baseTime: 15
    },
    { 
      value: "DP-GAN", 
      label: "DP-GAN", 
      description: "Differentially Private GAN with privacy guarantees",
      category: "Privacy-Preserving",
      recommended: true,
      baseTime: 25
    },
    { 
      value: "PATE-GAN", 
      label: "PATE-GAN", 
      description: "Private Aggregation of Teacher Ensembles GAN",
      category: "Privacy-Preserving",
      recommended: false,
      baseTime: 30
    },
    { 
      value: "WGAN-GP", 
      label: "WGAN-GP", 
      description: "Wasserstein GAN with Gradient Penalty",
      category: "GAN",
      recommended: false,
      baseTime: 18
    },
    { 
      value: "VAE", 
      label: "VAE", 
      description: "Variational Autoencoder for tabular data",
      category: "Autoencoder",
      recommended: false,
      baseTime: 12
    }
  ];

  const privacyLevels = [
    { 
      value: "Low", 
      label: "Low Privacy", 
      epsilon: "ε = 10.0",
      description: "Fast generation, lower privacy protection",
      color: "bg-red-100 text-red-800",
      timeMultiplier: 0.8
    },
    { 
      value: "Medium", 
      label: "Medium Privacy", 
      epsilon: "ε = 1.0",
      description: "Balanced privacy and utility",
      color: "bg-yellow-100 text-yellow-800",
      timeMultiplier: 1.0
    },
    { 
      value: "High", 
      label: "High Privacy", 
      epsilon: "ε = 0.1",
      description: "Strong privacy protection, slower generation",
      color: "bg-orange-100 text-orange-800",
      timeMultiplier: 1.3
    },
    { 
      value: "Very High", 
      label: "Very High Privacy", 
      epsilon: "ε = 0.01",
      description: "Maximum privacy, slowest generation",
      color: "bg-green-100 text-green-800",
      timeMultiplier: 1.6
    }
  ];

  // Calculate dynamic estimated time
  const calculateEstimatedTime = () => {
    const selectedMethod = methods.find(m => m.value === method);
    const selectedPrivacy = privacyLevels.find(p => p.value === privacyLevel);
    if (!selectedMethod || !selectedPrivacy) return "15-30 min";
    
    const baseTime = selectedMethod.baseTime;
    const adjustedTime = Math.round(baseTime * selectedPrivacy.timeMultiplier);
    const minTime = Math.max(5, Math.round(adjustedTime * 0.7));
    const maxTime = Math.round(adjustedTime * 1.3);
    
    return `${minTime}-${maxTime} min`;
  };

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Get dynamic status label based on latest step
  const getDynamicStatus = (): string => {
    if (runState === 'config' || !runSteps || runSteps.length === 0) {
      return runState === 'started' ? 'Run Started' : 'Configuring Run';
    }

    const latestStep = runSteps[runSteps.length - 1];
    const stepNumber = latestStep.step_no;
    
    // Extract method from step detail if available
    const methodMatch = latestStep.detail?.match(/method=(\w+)/i);
    const methodName = methodMatch ? methodMatch[1].toUpperCase() : null;

    if (latestStep.title === 'training') {
      return `Training ${methodName ? `(${methodName})` : ''} – Step ${stepNumber}`;
    } else if (latestStep.title === 'metrics') {
      return `Metrics Evaluation – Step ${stepNumber}`;
    } else if (latestStep.title === 'error') {
      const errorType = latestStep.detail?.split(':')[0] || 'Error';
      return `Error – ${errorType} at Step ${stepNumber}`;
    } else if (latestStep.title === 'planned') {
      return `Planned – Step ${stepNumber}`;
    }
    
    return `Step ${stepNumber} – ${latestStep.title}`;
  };

  // Poll for run status and steps (also poll when started to catch early steps)
  useEffect(() => {
    if ((runState === 'running' || runState === 'started') && runId) {
      // Reset previous step count when starting a new run
      if (previousStepCount === 0 && runSteps.length === 0) {
        setPreviousStepCount(0);
      }
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      
      const fetchStatus = async () => {
        try {
          const supabase = createSupabaseBrowserClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.access_token) return;

          const headers = {
            'Authorization': `Bearer ${session.access_token}`,
          };

          // Fetch full run data (includes agent plan in config_json)
          const runDataResponse = await fetch(`${base}/v1/runs/${runId}`, { headers });
          if (runDataResponse.ok) {
            const fullRunData = await runDataResponse.json();
            setRunData(fullRunData);
            setRunStatus({ 
              status: fullRunData.status,
              name: fullRunData.name 
            });
            
            if (fullRunData.status === 'succeeded') {
              setRunState('completed');
              // Fetch final metrics
              const metricsResponse = await fetch(`${base}/v1/runs/${runId}/metrics`, { headers });
              if (metricsResponse.ok) {
                const metrics = await metricsResponse.json();
                setRunMetrics(metrics);
              }
            } else if (fullRunData.status === 'failed') {
              setRunState('failed');
            }
          } else {
            // Fallback to status endpoint if full run endpoint fails
            const statusResponse = await fetch(`${base}/v1/runs/${runId}/status`, { headers });
            if (statusResponse.ok) {
              const status = await statusResponse.json();
              setRunStatus(status);
              
              if (status.status === 'succeeded') {
                setRunState('completed');
              } else if (status.status === 'failed') {
                setRunState('failed');
              }
            }
          }

          // Fetch steps
          const stepsResponse = await fetch(`${base}/v1/runs/${runId}/steps`, { headers });
          if (stepsResponse.ok) {
            const steps = await stepsResponse.json();
            const newSteps = steps || [];
            
            // Detect new steps and announce them
            if (newSteps.length > previousStepCount) {
              const newStepCount = newSteps.length - previousStepCount;
              const latestStep = newSteps[newSteps.length - 1];
              let announcementText = '';
              
              if (latestStep.title === 'training') {
                const methodMatch = latestStep.detail?.match(/method=(\w+)/i);
                const methodName = methodMatch ? methodMatch[1].toUpperCase() : '';
                announcementText = `Training started for ${methodName || 'model'} at step ${latestStep.step_no}`;
              } else if (latestStep.title === 'metrics') {
                announcementText = `Metrics evaluation completed for step ${latestStep.step_no}`;
              } else if (latestStep.title === 'error') {
                const errorType = latestStep.detail?.split(':')[0] || 'Error';
                announcementText = `Error occurred: ${errorType} at step ${latestStep.step_no}`;
              } else {
                announcementText = `Step ${latestStep.step_no}: ${latestStep.title}`;
              }
              
              if (announcementText) {
                setAnnouncement(announcementText);
                // Clear announcement after a delay so it can be announced again
                setTimeout(() => setAnnouncement(""), 100);
              }
              
              setPreviousStepCount(newSteps.length);
            }
            
            setRunSteps(newSteps);
            
            // Auto-scroll timeline to bottom when new steps arrive
            if (newSteps.length > previousStepCount && timelineRef.current) {
              setTimeout(() => {
                timelineRef.current?.scrollTo({
                  top: timelineRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }, 100);
            }
          }
        } catch (error) {
          console.error('Error fetching run status:', error);
        }
      };

      // Initial fetch
      fetchStatus();
      
      // Poll every 2 seconds
      const interval = setInterval(fetchStatus, 2000);
      
      return () => clearInterval(interval);
    }
  }, [runState, runId]);

  // Auto-transition from started to running immediately when we get status
  useEffect(() => {
    if (runState === 'started' && runId && runStatus?.status) {
      // Immediately transition to running if status indicates it
      if (runStatus.status === 'running' || runStatus.status === 'queued') {
        setRunState('running');
      } else if (runStatus.status === 'succeeded') {
        setRunState('completed');
      } else if (runStatus.status === 'failed') {
        setRunState('failed');
      }
    }
  }, [runState, runId, runStatus]);

  // Update elapsed time
  useEffect(() => {
    if (startTime && runState === 'running') {
      const interval = setInterval(() => {
        const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [startTime, runState]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRunState('config');
      setRunId(null);
      setRunStatus(null);
      setRunSteps([]);
      setPreviousStepCount(0);
      setRunMetrics(null);
      setElapsedTime(0);
      setStartTime(null);
      setAnnouncement("");
      setRunName("");
      setMethod("TabDDPM");
      setPrivacyLevel("Medium");
      setUseAgentic(false);
      setDescription("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!runName.trim()) {
      setShowNameConfirm(true);
      return;
    }
    
    await startRun(runName.trim());
  };

  const startRun = async (name: string) => {
    setLoading(true);
    // Optimistically switch to started state so config UI is hidden immediately
    setRunState('started');
    setStartTime(new Date());
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      
      const { createSupabaseBrowserClient } = await import('@/lib/supabase/browserClient');
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      if (!dataset?.id) {
        throw new Error('No dataset selected');
      }

      const methodMapping: { [key: string]: string } = {
        'TabDDPM': 'tvae',
        'CTGAN': 'ctgan', 
        'DP-GAN': 'gc',
        'PATE-GAN': 'gc',
        'Auto': 'auto'
      };

      const backendMethod = methodMapping[method] || 'tvae';
      const mode = useAgentic ? 'agent' : 'custom';

      const requestBody = {
        dataset_id: dataset.id,
        method: backendMethod,
        mode: mode,
        name: name,
        config_json: {
          sample_multiplier: 1.0,
          max_synth_rows: 2000,
          privacy_level: privacyLevel.toLowerCase(),
          description: description,
          ...(useAgentic && {
            agent: {
              provider: 'ollama',
              model: 'gpt-oss:20b',
              temperature: 0.7
            }
          })
        }
      };

      const response = await fetch(`${base}/v1/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to start run: ${response.status}`);
      }

      const result = await response.json();
      console.log('Run started successfully:', result);
      
      // Set runId immediately to trigger polling
      if (result.run_id) {
        setRunId(result.run_id);
        
        // Immediately fetch initial data (don't wait for polling interval)
        const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          const headers = {
            'Authorization': `Bearer ${session.access_token}`,
          };
          
          // Initial fetch to get steps and run data immediately
          Promise.all([
            fetch(`${base}/v1/runs/${result.run_id}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`${base}/v1/runs/${result.run_id}/steps`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
          ]).then(([runData, steps]) => {
            if (runData) {
              setRunData(runData);
              setRunStatus({ 
                status: runData.status,
                name: runData.name 
              });
              // Auto-transition if status is already running
              if (runData.status === 'running' || runData.status === 'queued') {
                setRunState('running');
              }
            }
            if (steps && Array.isArray(steps)) {
              setRunSteps(steps);
              setPreviousStepCount(steps.length);
              if (steps.length > 0) {
                const latestStep = steps[steps.length - 1];
                let announcementText = '';
                if (latestStep.title === 'training') {
                  const methodMatch = latestStep.detail?.match(/method=(\w+)/i);
                  const methodName = methodMatch ? methodMatch[1].toUpperCase() : '';
                  announcementText = `Training started for ${methodName || 'model'} at step ${latestStep.step_no}`;
                } else {
                  announcementText = `Step ${latestStep.step_no}: ${latestStep.title}`;
                }
                if (announcementText) {
                  setAnnouncement(announcementText);
                  setTimeout(() => setAnnouncement(""), 100);
                }
              }
            }
          }).catch(err => {
            console.error('Error in initial fetch:', err);
            // Don't block the UI, polling will catch up
          });
        }
      }
      
      // Notify parent
      onSuccess();
    } catch (error: any) {
      console.error('Error starting run:', error);
      // Revert UI to config if starting failed
      setRunState('config');
      setRunId(null);
      alert(`Failed to start run: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProceed = async () => {
    setShowNameConfirm(false);
    const generatedName = `${dataset?.name || 'dataset'}_run_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
    await startRun(generatedName);
  };

  const handleConfirmCancel = () => {
    setShowNameConfirm(false);
  };

  const handleClose = () => {
    if (runState === 'config' || runState === 'completed' || runState === 'failed') {
      setRunName("");
      setMethod("TabDDPM");
      setPrivacyLevel("Medium");
      setUseAgentic(false);
      setDescription("");
      onClose();
    }
  };

  const handleDownloadReport = async () => {
    if (!runId) return;
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch(`${base}/v1/runs/${runId}/download`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (!response.ok) throw new Error('Failed to download report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${runStatus?.name || 'run'}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  const handleDownloadData = async () => {
    if (!runId) return;
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const response = await fetch(`${base}/v1/runs/${runId}/synthetic-data`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (!response.ok) throw new Error('Failed to download synthetic data');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${runStatus?.name || 'run'}-synthetic-data.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading synthetic data:', error);
      alert('Failed to download synthetic data');
    }
  };

  const selectedMethod = methods.find(m => m.value === method);
  const selectedPrivacy = privacyLevels.find(p => p.value === privacyLevel);

  // Render different views based on state
  if (runState === 'started') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose} className="w-[95vw] sm:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogContent className="p-6">
          {/* Aria-live announcement for screen readers */}
          <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
            {announcement || getDynamicStatus()}
          </div>
          
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span>{getDynamicStatus()}</span>
            </DialogTitle>
            <DialogDescription>
              {runSteps.length > 0 
                ? `Processing step ${runSteps.length} of synthesis pipeline...`
                : 'Your synthesis run has been initiated. Preparing to start...'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <Play className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{runName || 'Synthesis Run'}</h3>
              <p className="text-sm text-gray-600">Initializing synthesis process...</p>
            </div>

            {/* Indeterminate progress while preparing */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">Starting…</span>
              </div>
              <Progress indeterminate className="w-full h-2" />
            </div>

            {/* Time and ETA */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Elapsed Time</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatElapsedTime(elapsedTime)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Estimated Time</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{calculateEstimatedTime()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Agent Plan Section - Show when agent plan is available (detected from run data) */}
            {runData?.config_json?.plan && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <h4 className="text-base font-semibold text-gray-900">Agent Planning Decisions</h4>
                  <Badge className="bg-purple-100 text-purple-800">AI Agent</Badge>
                </div>
                <div className="border rounded-lg bg-white p-4 max-h-[35vh] overflow-y-auto">
                  <AgentPlanTab 
                    plan={runData.config_json.plan} 
                    interventions={runData.agent_interventions || null}
                    finalMethod={runData.method}
                  />
                </div>
              </div>
            )}

            {/* Execution Timeline - Always show, will populate as steps arrive */}
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-900">Execution Timeline</h4>
                {runSteps.length > 0 && (
                  <Badge variant="outline" className="text-sm">{runSteps.length} steps</Badge>
                )}
              </div>
              <div 
                ref={timelineRef}
                className="max-h-[40vh] overflow-y-auto border rounded-lg bg-white p-4"
              >
                {runSteps.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="h-8 w-8 mx-auto mb-3 text-gray-400 animate-spin" />
                    <p className="text-sm">Waiting for execution steps...</p>
                    <p className="text-xs mt-1">Steps will appear here as the run progresses</p>
                  </div>
                ) : (
                  <ExecutionLogTab steps={runSteps} />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (runState === 'running') {
    const latestStep = runSteps.length > 0 ? runSteps[runSteps.length - 1] : null;
    // Calculate progress more accurately based on step count and status
    // Each training attempt typically has: training -> metrics (or error)
    // So we estimate progress based on completed cycles
    const estimatedTotalSteps = 12; // Estimate total steps
    const progress = runSteps.length > 0 
      ? Math.min((runSteps.length / estimatedTotalSteps) * 95, 95) // Cap at 95% until complete
      : 5;

    return (
      <Dialog open={isOpen} onOpenChange={() => {}} className="w-[95vw] sm:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogContent className="p-6">
          {/* Aria-live announcement for screen readers */}
          <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
            {announcement || getDynamicStatus()}
          </div>
          
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span>{getDynamicStatus()}</span>
            </DialogTitle>
            <DialogDescription>
              {runStatus?.name || 'Synthetic data generation in progress'}
              {runSteps.length > 0 && ` • ${runSteps.length} step${runSteps.length !== 1 ? 's' : ''} completed`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full h-2 transition-all duration-300 ease-in-out" />
              {runSteps.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {runSteps.length} step{runSteps.length !== 1 ? 's' : ''} executed
                </p>
              )}
            </div>

            {/* Time, Status, Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Elapsed Time</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatElapsedTime(elapsedTime)}</p>
                  <p className="text-xs text-gray-500 mt-1">ETA: {calculateEstimatedTime()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Status</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {runStatus?.status || 'running'}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Quick Metrics</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-600">KS Mean</div>
                      <div className="font-mono text-sm">{runMetrics?.utility?.ks_mean?.toFixed(3) || '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-600">Corr Δ</div>
                      <div className="font-mono text-sm">{runMetrics?.utility?.corr_delta?.toFixed(3) || '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-600">MIA AUC</div>
                      <div className="font-mono text-sm">{runMetrics?.privacy?.mia_auc?.toFixed(3) || '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-600">Dup%</div>
                      <div className="font-mono text-sm">{runMetrics?.privacy?.dup_rate ? `${(runMetrics.privacy.dup_rate*100).toFixed(1)}%` : '—'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agent Plan Section - Show when agent plan is available (detected from run data) */}
            {runData?.config_json?.plan && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <h4 className="text-base font-semibold text-gray-900">Agent Planning Decisions</h4>
                  <Badge className="bg-purple-100 text-purple-800">AI Agent</Badge>
                  {runData?.agent_interventions?.used_backup && (
                    <Badge className="bg-orange-100 text-orange-800">Backup Used</Badge>
                  )}
                  {runData?.agent_interventions?.replanned && (
                    <Badge className="bg-blue-100 text-blue-800">Re-planned</Badge>
                  )}
                </div>
                <div className="border rounded-lg bg-white p-4 max-h-[35vh] overflow-y-auto">
                  <AgentPlanTab 
                    plan={runData.config_json.plan} 
                    interventions={runData.agent_interventions || null}
                    finalMethod={runData.method}
                  />
                </div>
              </div>
            )}

            {/* Detailed Execution Steps - Same as Runs page */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-900">Execution Timeline</h4>
                {runSteps.length > 0 && (
                  <Badge variant="outline" className="text-sm">{runSteps.length} steps</Badge>
                )}
              </div>
              <div 
                ref={timelineRef}
                className="max-h-[50vh] overflow-y-auto border rounded-lg bg-white p-4"
              >
                {runSteps.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="h-8 w-8 mx-auto mb-3 text-gray-400 animate-spin" />
                    <p className="text-sm">Waiting for execution steps...</p>
                    <p className="text-xs mt-1">Steps will appear here as the run progresses</p>
                  </div>
                ) : (
                  <ExecutionLogTab steps={runSteps} />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (runState === 'completed') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose} className="w-[95vw] sm:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Run Completed Successfully</span>
            </DialogTitle>
            <DialogDescription>
              {runStatus?.name || 'Synthesis run has completed'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Method</p>
                    <p className="text-lg font-semibold">{runStatus?.method || method}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Duration</p>
                    <p className="text-lg font-semibold">{formatElapsedTime(elapsedTime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Preview */}
            {runMetrics && (
              <Card>
                <CardContent className="p-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Metrics Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {runMetrics.utility && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Utility</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>KS Mean:</span>
                            <span className="font-mono">{runMetrics.utility.ks_mean?.toFixed(3) || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Corr Δ:</span>
                            <span className="font-mono">{runMetrics.utility.corr_delta?.toFixed(3) || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {runMetrics.privacy && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Privacy</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>MIA AUC:</span>
                            <span className="font-mono">{runMetrics.privacy.mia_auc?.toFixed(3) || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Dup Rate:</span>
                            <span className="font-mono">
                              {runMetrics.privacy.dup_rate 
                                ? `${(runMetrics.privacy.dup_rate * 100).toFixed(1)}%` 
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={handleDownloadReport}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <Button
                onClick={handleDownloadData}
                variant="outline"
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button
                onClick={() => {
                  if (onViewResults && runId) {
                    handleClose();
                    onViewResults(runId, runStatus?.name || runName || 'Run');
                  } else {
                    handleClose();
                  }
                }}
                variant="outline"
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (runState === 'failed') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose} className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span>Run Failed</span>
            </DialogTitle>
            <DialogDescription>
              The synthesis run encountered an error
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            <div className="text-center mb-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Run Failed</h3>
              <p className="text-sm text-gray-600">
                Please check the execution steps or try again with different parameters.
              </p>
            </div>
            {runSteps.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
                {runSteps.map((step: any, index: number) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                    <span className="font-medium">Step {step.step_no}:</span> {step.title}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-6">
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Configuration view (default)
  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose} className="w-[95vw] sm:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Combined Header & Dataset Info */}
          <div className="border border-gray-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Play className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Start New Synthesis Run</h2>
                  <p className="text-sm text-gray-600">Configure and start a new synthetic data generation run</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-right">
                <div className="p-2 bg-white rounded-lg border border-gray-200">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">{dataset?.name}</h3>
                  <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                    <span>{dataset?.rows?.toLocaleString() || 'N/A'} rows</span>
                    <span>{dataset?.columns || 'N/A'} columns</span>
                    <span>{dataset?.size || 'N/A'} size</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Configuration */}
            <div className="xl:col-span-2 space-y-6">
              {/* Run Name - Compact */}
          <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Run Name</Label>
            <Input
              id="name"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
                  placeholder="Enter a descriptive name for this run"
                  className="w-full"
            />
          </div>

              {/* Synthesis Method - 3x2 Grid */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Synthesis Method</span>
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {methods.map((methodOption) => (
                    <button
                      key={methodOption.value}
                      type="button"
                      onClick={() => setMethod(methodOption.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        method === methodOption.value
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{methodOption.label}</span>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          method === methodOption.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {method === methodOption.value && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{methodOption.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{methodOption.category}</Badge>
                        {methodOption.recommended && (
                          <Badge variant="secondary" className="text-xs">★</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
            </div>

              {/* Privacy Level - 4x1 Layout */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Privacy Level</span>
                </Label>
                <div className="grid grid-cols-4 gap-3">
                  {privacyLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setPrivacyLevel(level.value)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        privacyLevel === level.value
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{level.label}</span>
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            privacyLevel === level.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {privacyLevel === level.value && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                        <Badge className={`text-xs ${level.color}`}>{level.epsilon}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>


            </div>

            {/* Right Column - Preview & Info */}
            <div className="xl:col-span-1 space-y-3">
              {/* Run Preview - Even Height */}
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="p-3">
                  <h4 className="font-semibold text-sm mb-3 flex items-center space-x-2 text-blue-900">
                    <div className="p-1 bg-blue-100 rounded-lg">
                      <Info className="h-4 w-4" />
                    </div>
                    <span>Run Preview</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-blue-700 font-medium text-xs">Name:</span>
                      <span className="font-semibold text-blue-900 text-xs truncate max-w-32">
                        {runName.trim() || `${dataset?.name || 'dataset'}_run_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-blue-700 font-medium text-xs">Method:</span>
                      <span className="font-semibold text-blue-900 text-xs">{selectedMethod?.label}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-blue-700 font-medium text-xs">Privacy:</span>
                      <div className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedPrivacy?.color || 'bg-gray-100 text-gray-800'}`}>
                        {selectedPrivacy?.label}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-blue-700 font-medium text-xs">AI Agent:</span>
                      <Badge variant={useAgentic ? "default" : "secondary"} className="text-xs">
                        {useAgentic ? "On" : "Off"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Privacy Guarantees - Even Height */}
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardContent className="p-3">
                  <h4 className="font-semibold text-sm mb-3 flex items-center space-x-2 text-green-900">
                    <div className="p-1 bg-green-100 rounded-lg">
                      <Shield className="h-4 w-4" />
                    </div>
                    <span>Privacy Guarantees</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2 p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-green-800 text-xs">Differential privacy protection</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-green-800 text-xs">No original data exposure</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-green-800 text-xs">Statistical utility preserved</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AI Agent - Full Width */}
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Agent</h3>
                  <p className="text-sm text-gray-600">Intelligent optimization powered by AI</p>
                </div>
              </div>
              
              {/* Working Toggle Switch */}
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
              checked={useAgentic}
                  onChange={(e) => setUseAgentic(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  useAgentic ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  <div className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    useAgentic ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>
            </div>
            
            {/* Features List - Full Width Single Row */}
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>Auto method selection</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>Parameter optimization</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>Privacy tuning</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>Quality assurance</span>
              </div>
            </div>
          </div>

          {/* Description - After AI Agent */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this run..."
              rows={3}
              className="w-full"
            />
          </div>

          <div className="border-t border-gray-200 my-4" />
          
          <div className="flex items-center justify-between">
            {/* Estimated Time - Left */}
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Estimated Time:</span>
              </div>
              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-semibold">
                {calculateEstimatedTime()}
              </div>
            </div>

            {/* Action Buttons - Right */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-8 py-2 font-semibold shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting Run...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Run
                  </>
                )}
              </Button>
            </div>
          </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Name Confirmation Dialog */}
      <Dialog open={showNameConfirm} onOpenChange={setShowNameConfirm} className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <span>No Run Name Provided</span>
            </DialogTitle>
            <DialogDescription>
              You haven't entered a name for this run. Would you like to proceed with an auto-generated name?
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600 mb-2">Generated name will be:</p>
            <p className="font-mono text-sm bg-white p-2 rounded border">
              {dataset?.name || 'dataset'}_run_{new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleConfirmCancel}
              disabled={loading}
            >
              Cancel & Enter Name
            </Button>
            <Button
              onClick={handleConfirmProceed}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Starting...
                </>
              ) : (
                'Proceed with Generated Name'
              )}
            </Button>
          </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
