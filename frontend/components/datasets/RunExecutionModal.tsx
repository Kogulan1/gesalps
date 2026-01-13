"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
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
  TrendingUp,
  StopCircle,
  AlertTriangle
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { ExecutionLogTab } from "@/components/runs/ExecutionLogTab";
import { AgentPlanTab } from "@/components/runs/AgentPlanTab";
import { useToast } from "@/components/toast/Toaster";
import { QuickConfigCard } from "@/components/runs/QuickConfigCard";
import { AdvancedSettingsAccordion } from "@/components/runs/AdvancedSettingsAccordion";

interface RunExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dataset: any;
  onViewResults?: (runId: string, runName: string) => void;
}

type RunState = 'config' | 'started' | 'running' | 'completed' | 'failed';

export function RunExecutionModal({ isOpen, onClose, onSuccess, dataset, onViewResults }: RunExecutionModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const { toast } = useToast();
  const [runName, setRunName] = useState("");
  const [method, setMethod] = useState("ddpm");
  const [privacyLevel, setPrivacyLevel] = useState("Medium");
  const [useAgentic, setUseAgentic] = useState(true); // Default to agent mode (GreenGuard)
  const [useAllGreen, setUseAllGreen] = useState(false); // All Green Service mode
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNameConfirm, setShowNameConfirm] = useState(false);
  // Advanced settings state
  const [advancedModel, setAdvancedModel] = useState("auto");
  const [maxIterations, setMaxIterations] = useState(2000);
  const [autoRetry, setAutoRetry] = useState(true);
  const [clinicalPreprocessing, setClinicalPreprocessing] = useState(true);
  
  // Run tracking state
  const [runState, setRunState] = useState<RunState>('config');
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<any>(null);
  const [runSteps, setRunSteps] = useState<any[]>([]);
  const runStepsRef = useRef<any[]>([]); // Ref to track current steps for comparison (avoids stale closures)
  const [renderKey, setRenderKey] = useState(0); // Force re-render when steps change
  const [previousStepCount, setPreviousStepCount] = useState(0); // Track previous step count for announcements
  const previousStepCountRef = useRef(0); // Ref to track step count without causing re-renders
  const [runMetrics, setRunMetrics] = useState<any>(null);
  const [runData, setRunData] = useState<any>(null); // Full run data including agent plan
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [announcement, setAnnouncement] = useState<string>(""); // For aria-live announcements
  const timelineRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling timeline
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const hasNavigatedRef = useRef(false); // Track if we've already navigated to prevent multiple navigations

  const methods = [
    { 
      value: "ddpm", 
      label: "TabDDPM (Diffusion - Highest Fidelity)", 
      description: "2025 state-of-the-art diffusion model — best clinical data fidelity",
      category: "Diffusion",
      recommended: true,
      baseTime: 20, // minutes
      badge: "SOTA" // Special badge for TabDDPM
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

  // Poll for run status and steps - START IMMEDIATELY when runId is set
  // Continue polling even when failed to ensure all steps are fetched
  useEffect(() => {
    if (runId && (runState === 'running' || runState === 'started' || runState === 'failed')) {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      
      const fetchStatus = async () => {
        try {
          const supabase = createSupabaseBrowserClient();
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('[RunExecutionModal] Session error:', sessionError);
            return;
          }
          
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
            
            // Update state based on status
            if (fullRunData.status === 'succeeded') {
              setRunState('completed');
              // Fetch final metrics
              const metricsResponse = await fetch(`${base}/v1/runs/${runId}/metrics`, { headers });
              if (metricsResponse.ok) {
                const metrics = await metricsResponse.json();
                setRunMetrics(metrics);
              }
            } else if (fullRunData.status === 'failed' || fullRunData.status === 'cancelled') {
              setRunState('failed');
              // Continue polling for a bit to ensure all steps are fetched
              // The polling will stop after a few seconds when we detect no new steps
            } else if (fullRunData.status === 'running' && runState === 'started') {
              // Transition from 'started' to 'running' when status becomes 'running'
              setRunState('running');
            }
          } else {
            // Fallback to status endpoint if full run endpoint fails
            const statusResponse = await fetch(`${base}/v1/runs/${runId}/status`, { headers });
            if (statusResponse.ok) {
              const status = await statusResponse.json();
              setRunStatus(status);
              
              if (status.status === 'succeeded') {
                setRunState('completed');
              } else if (status.status === 'failed' || status.status === 'cancelled') {
                setRunState('failed');
              } else if (status.status === 'running' && runState === 'started') {
                setRunState('running');
              }
            }
          }

          // Fetch steps - CRITICAL: This must run to show steps immediately
          const stepsResponse = await fetch(`${base}/v1/runs/${runId}/steps`, { headers });
          if (stepsResponse.ok) {
            const steps = await stepsResponse.json();
            const newSteps = Array.isArray(steps) ? steps : [];
            
            // Sort steps by step_no to ensure correct order
            const sortedSteps = [...newSteps].sort((a, b) => (a.step_no || 0) - (b.step_no || 0));
            
            // CRITICAL: Use ref to get current steps (avoids stale closure issue)
            const currentSteps = runStepsRef.current;
            const stepsChanged = 
              sortedSteps.length !== currentSteps.length ||
              sortedSteps.some((step, idx) => {
                const currentStep = currentSteps[idx];
                return !currentStep || 
                       step.step_no !== currentStep.step_no || 
                       step.title !== currentStep.title ||
                       step.detail !== currentStep.detail;
              });
            
            // Simple state update - create a NEW array reference (like RunDetailsExpansion does)
            // This is the key: always create a new array so React detects the change
            const newStepsArray = [...sortedSteps];
            
            // Update ref for comparison logic
            runStepsRef.current = newStepsArray;
            
            // CRITICAL: Update both state and ref synchronously
            // Update ref first for comparison logic
            runStepsRef.current = newStepsArray;
            
            // Update state - use direct assignment, not callback, to ensure immediate update
            setRunSteps(newStepsArray);
            
            // Force a re-render by updating render key - this ensures React re-renders
            setRenderKey(prev => prev + 1);
            
            // Detect new steps and announce them
            if (newSteps.length > currentCount) {
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
              } else if (latestStep.title === 'planned') {
                announcementText = `Agent plan created at step ${latestStep.step_no}`;
              } else {
                announcementText = `Step ${latestStep.step_no}: ${latestStep.title}`;
              }
              
              if (announcementText) {
                setAnnouncement(announcementText);
                setTimeout(() => setAnnouncement(""), 100);
              }
              
              // Update both state and ref
              previousStepCountRef.current = newSteps.length;
              setPreviousStepCount(newSteps.length);
              
              // Auto-scroll timeline to bottom when new steps arrive
              requestAnimationFrame(() => {
                if (timelineRef.current) {
                  timelineRef.current.scrollTo({
                    top: timelineRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                }
              });
            } else {
              // Even if no new steps, update the ref to current count
              previousStepCountRef.current = newSteps.length;
            }
          } else {
            console.warn(`[RunExecutionModal] Steps fetch failed: ${stepsResponse.status} ${stepsResponse.statusText}`);
          }
        } catch (error) {
          console.error('[RunExecutionModal] Error fetching run status:', error);
        }
      };

      // Immediate fetch - don't wait for interval
      fetchStatus();
      
      // Poll every 500ms for real-time updates (faster polling for better UX)
      // For failed runs, continue polling for a few more cycles to ensure all steps are fetched
      // For completed runs, poll a few more times to ensure metrics are fetched
      let pollCount = 0;
      const maxPollCount = runState === 'failed' ? 10 : (runState === 'completed' ? 5 : Infinity); // Poll 5 more times (2.5 seconds) after completion
      
      const interval = setInterval(() => {
        // Stop polling after maxPollCount for failed/completed runs
        if ((runState === 'failed' || runState === 'completed') && pollCount >= maxPollCount) {
          clearInterval(interval);
          return;
        }
        pollCount++;
        fetchStatus();
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [runState, runId]); // Don't include previousStepCount - use ref instead

  // Force re-render when runSteps changes - this ensures ExecutionLogTab gets updated
  useEffect(() => {
    // The renderKey is already being updated in the polling function, but this ensures we log the change
  }, [runSteps]);

  // Auto-transition from started to running immediately when we get status
  useEffect(() => {
    if (runState === 'started' && runId && runStatus?.status) {
      // Immediately transition to running if status indicates it
      if (runStatus.status === 'running') {
        setRunState('running');
      } else if (runStatus.status === 'succeeded') {
        setRunState('completed');
      } else if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
        setRunState('failed');
      }
      // Note: 'queued' status stays in 'started' state until it becomes 'running'
    }
  }, [runState, runId, runStatus]);

  // Auto-navigate to runs page when run completes
  useEffect(() => {
    if (runState === 'completed' && runId && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      // Small delay to let user see the completion message and metrics
      const timer = setTimeout(() => {
        handleClose();
        // Navigate with runId parameter to auto-expand the run
        router.push(`/${locale}/runs?runId=${runId}`);
      }, 3000); // 3 second delay to show completion and allow user to see results
      
      return () => clearTimeout(timer);
    }
    // Reset navigation flag when runId changes (new run started)
    if (runId && runState === 'config') {
      hasNavigatedRef.current = false;
    }
  }, [runState, runId, router, locale]);

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
      runStepsRef.current = [];
      previousStepCountRef.current = 0;
      setPreviousStepCount(0);
      setRunMetrics(null);
      setElapsedTime(0);
      setStartTime(null);
      setAnnouncement("");
      setRunName("");
      setMethod("ddpm");
      setPrivacyLevel("Medium");
      setUseAgentic(false);
      setDescription("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate name if not provided (no confirmation dialog needed)
    const finalRunName = runName.trim() || `${dataset?.name || 'dataset'}_run_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
    
    await startRun(finalRunName);
  };

  // Handle QuickConfigCard start
  const handleQuickStart = async (config: any) => {
    // Update state from QuickConfigCard
    if (config.name) {
      setRunName(config.name);
    }
    if (config.privacy_level) {
      const privacyLevelCapitalized = config.privacy_level.charAt(0).toUpperCase() + config.privacy_level.slice(1);
      setPrivacyLevel(privacyLevelCapitalized);
    }
    // Use agent mode by default (GreenGuard) - always true for QuickConfigCard
    setUseAgentic(true);
    
    // Use advanced model if set, otherwise let agent decide (undefined/null)
    const methodToUse = advancedModel !== 'auto' ? advancedModel : undefined;
    if (methodToUse) {
      setMethod(methodToUse);
    } else {
      // Reset to undefined so agent can choose
      setMethod(undefined as any);
    }
    
    // Start the run
    const finalRunName = config.name || runName.trim() || `${dataset?.name || 'dataset'}_run_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
    await startRun(finalRunName);
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
        'ddpm': 'ddpm',
        'TabDDPM': 'ddpm', // Legacy support
        'CTGAN': 'ctgan', 
        'ctgan': 'ctgan', // Lowercase support
        'TVAE': 'tvae',
        'tvae': 'tvae', // Lowercase support
        'VAE': 'tvae', // VAE maps to TVAE
        'DP-GAN': 'dpctgan', // DP-GAN maps to dpctgan
        'PATE-GAN': 'pategan', // PATE-GAN maps to pategan
        'WGAN-GP': 'wgan', // WGAN-GP maps to wgan
        'Auto': 'auto'
      };

      // Use method if explicitly set in advanced settings, otherwise let agent decide (null)
      const methodToUse = advancedModel !== 'auto' ? advancedModel : (method && method !== 'ddpm' ? method : null);
      const backendMethod = methodToUse ? (methodMapping[methodToUse] || methodToUse) : null;
      // All Green mode takes precedence
      const mode = useAllGreen ? 'allgreen' : (useAgentic ? 'agent' : 'custom');

      const requestBody: any = {
        dataset_id: dataset.id,
        mode: mode,
        name: name,
        config_json: {
          sample_multiplier: 1.0,
          max_synth_rows: maxIterations || 2000,
          privacy_level: privacyLevel.toLowerCase(),
          description: description,
          auto_retry: autoRetry,
          clinical_preprocessing: clinicalPreprocessing,
          ...(useAgentic && {
            agent: {
              provider: 'ollama',
              model: 'gpt-oss:20b',
              temperature: 0.7
            }
          })
        }
      };
      
      // Only include method if explicitly set (null/undefined means agent chooses)
      if (backendMethod) {
        requestBody.method = backendMethod;
      }
      
      // Retry logic for network errors
      let response: Response;
      const maxRetries = 3;
      let lastError: any = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Add timeout to fetch (30 seconds)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          response = await fetch(`${base}/v1/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          // If we got a response (even if not ok), break retry loop
          break;
        } catch (fetchError: any) {
          lastError = fetchError;
          
          // Don't retry on abort (timeout) or if it's not a network error
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection and try again.');
          }
          
          // Only retry on network errors (TypeError), not on HTTP errors
          if (!(fetchError instanceof TypeError) || attempt === maxRetries - 1) {
            // Handle network errors (CORS, connection refused, etc.)
            if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
              throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
            }
            throw fetchError;
          }
          
          // Wait before retrying (exponential backoff: 500ms, 1000ms, 2000ms)
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
          console.log(`[RunExecutionModal] Retry attempt ${attempt + 1}/${maxRetries}...`);
        }
      }
      
      // If we exhausted retries, throw the last error
      if (!response && lastError) {
        if (lastError instanceof TypeError && lastError.message.includes('fetch')) {
          throw new Error('Unable to connect to the server after multiple attempts. Please check your internet connection and try again.');
        }
        throw lastError;
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If response is not JSON, use status text
          throw new Error(`Failed to start run: ${response.status} ${response.statusText}`);
        }
        throw new Error(errorData.detail || `Failed to start run: ${response.status}`);
      }

      const result = await response.json();
      
      // Set runId immediately to trigger polling
      if (result.run_id) {
        setRunId(result.run_id);
        setRunStatus({ status: 'queued', name: name });
        setStartTime(new Date()); // Start the timer
        hasNavigatedRef.current = false; // Reset navigation flag for new run
        
        // Immediately fetch initial data (don't wait for polling interval)
        // This ensures steps appear as soon as they're created
        try {
          const headers = {
            'Authorization': `Bearer ${session.access_token}`,
          };
          
          // Fetch run data and steps in parallel for faster loading
          const [runDataRes, stepsRes] = await Promise.all([
            fetch(`${base}/v1/runs/${result.run_id}`, { headers }),
            fetch(`${base}/v1/runs/${result.run_id}/steps`, { headers })
          ]);
          
          if (runDataRes.ok) {
            const runData = await runDataRes.json();
            setRunData(runData);
            setRunStatus({ 
              status: runData.status || 'queued',
              name: runData.name || name 
            });
            // Auto-transition if status is already running
            if (runData.status === 'running') {
              setRunState('running');
            }
          }
          
          if (stepsRes.ok) {
            const steps = await stepsRes.json();
            if (Array.isArray(steps)) {
              // Sort steps by step_no to ensure correct order
              const sortedSteps = [...steps].sort((a, b) => (a.step_no || 0) - (b.step_no || 0));
              const newStepsArray = [...sortedSteps];
              
              // Simple state update - create new array reference
              runStepsRef.current = newStepsArray; // Update ref for comparison
              setRunSteps(newStepsArray); // Simple state update like RunDetailsExpansion
              setRenderKey(prev => prev + 1); // Force re-render
              previousStepCountRef.current = sortedSteps.length;
              setPreviousStepCount(sortedSteps.length);
              if (steps.length > 0) {
                const latestStep = steps[steps.length - 1];
                let announcementText = '';
                if (latestStep.title === 'training') {
                  const methodMatch = latestStep.detail?.match(/method=(\w+)/i);
                  const methodName = methodMatch ? methodMatch[1].toUpperCase() : '';
                  announcementText = `Training started for ${methodName || 'model'} at step ${latestStep.step_no}`;
                } else if (latestStep.title === 'planned') {
                  announcementText = `Agent plan created at step ${latestStep.step_no}`;
                } else {
                  announcementText = `Step ${latestStep.step_no}: ${latestStep.title}`;
                }
                if (announcementText) {
                  setAnnouncement(announcementText);
                  setTimeout(() => setAnnouncement(""), 100);
                }
              }
            }
          }
        } catch (err) {
          console.warn('[RunExecutionModal] Error in initial fetch (polling will catch up):', err);
          // Don't block the UI, polling will catch up
        }
      }
      
      // Notify parent (but don't close modal - keep it open to show progress)
      onSuccess();
      // Modal stays open to show run progress
    } catch (error: any) {
      console.error('Error starting run:', error);
      // Revert UI to config if starting failed
      setRunState('config');
      setRunId(null);
      const { getUserFriendlyErrorMessage } = await import('@/lib/errorMessages');
      const friendlyMessage = getUserFriendlyErrorMessage(error);
      // Use toast instead of alert for better UX
      toast({
        title: "Failed to start run",
        description: friendlyMessage,
        variant: "destructive"
      });
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

  const handleCancelRun = async () => {
    if (!runId) return;
    
    setIsCancelling(true);
    setShowCancelConfirm(false);
    
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication failed. Please sign in again.');
      }

      const response = await fetch(`${base}/v1/runs/${runId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to cancel run: ${response.status} - ${errorText}`);
      }

      // Update state to reflect cancellation
      setRunState('failed');
      setRunStatus(prev => prev ? { ...prev, status: 'cancelled' } : { status: 'cancelled', name: runName });
      
      // Add a cancellation step to the steps list
      setRunSteps(prev => {
        const newSteps = [...prev, {
          step_no: prev.length + 1,
          title: 'cancelled',
          detail: 'Run cancelled by user',
          created_at: new Date().toISOString()
        }];
        runStepsRef.current = newSteps; // Update ref
        return newSteps;
      });
      
    } catch (error: any) {
      console.error('Error cancelling run:', error);
      alert(`Failed to cancel run: ${error.message || 'Unknown error'}`);
      setShowCancelConfirm(true); // Re-show confirmation dialog on error
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClose = () => {
    // Only allow closing if run is not in progress
    if (runState === 'config' || runState === 'completed' || runState === 'failed') {
    setRunName("");
    setMethod("ddpm");
    setPrivacyLevel("Medium");
    setUseAgentic(false);
    setDescription("");
    onClose();
    }
    // If run is in progress, show a warning or prevent closing
    // For now, we'll just prevent closing during active runs
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
    // Calculate progress based on steps even in 'started' state
    const progress = runSteps.length > 0 
      ? Math.min((runSteps.length / 12) * 50, 50) // Cap at 50% in started state
      : 5;

  return (
      <Dialog open={isOpen} onOpenChange={() => {}} className="w-[95vw] sm:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogContent className="p-6">
          {/* Aria-live announcement for screen readers */}
          <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
            {announcement || getDynamicStatus()}
          </div>
          
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <span>{getDynamicStatus()}</span>
                  <Badge className="bg-green-100 text-green-800 border-green-300 ml-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1.5"></div>
                    LIVE
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {runStatus?.name || runName || 'Synthetic data generation in progress'}
                  {runSteps.length > 0 && ` • ${runSteps.length} step${runSteps.length !== 1 ? 's' : ''} completed`}
                </DialogDescription>
              </div>
              {(runStatus?.status === 'running' || runStatus?.status === 'queued') && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={isCancelling}
                  className="ml-4 bg-red-500 hover:bg-red-600 text-white"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  {isCancelling ? 'Cancelling...' : 'Cancel'}
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {/* Cancel Confirmation Dialog */}
          {showCancelConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md mx-4 bg-white shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Cancel Run?</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to cancel this run? This action cannot be undone. Any progress made so far will be lost.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={isCancelling}
                    >
                      Keep Running
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCancelRun}
                      disabled={isCancelling}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {isCancelling ? 'Cancelling...' : 'Yes, Cancel Run'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
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
                    {runStatus?.status || 'starting'}
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

            {/* Agent Plan Section - Show when agent plan is available */}
            {runData?.config_json?.plan && (
              <div className="space-y-4 mt-6">
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
                {(() => {
                  if (runSteps.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Loader2 className="h-8 w-8 mx-auto mb-3 text-gray-400 animate-spin" />
                        <p className="text-sm">Waiting for execution steps...</p>
                        <p className="text-xs mt-1">Steps will appear here as the run progresses</p>
                      </div>
                    );
                  }
                  
                  // Use renderKey to force re-render when steps change
                  const stepKey = `steps-${runSteps.length}-${runSteps.map(s => s.step_no).join('-')}-${renderKey}`;
                  return (
                    <ExecutionLogTab 
                      key={stepKey} 
                      steps={[...runSteps]} // Pass a new array reference to ensure React detects change
                    />
                  );
                })()}
              </div>
            </div>

            {/* Action Buttons */}
            {runId && (
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    handleClose();
                    router.push(`/${locale}/runs?runId=${runId}`);
                  }}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>View in Runs Page</span>
                </Button>
              </div>
            )}
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
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <span>{getDynamicStatus()}</span>
                  {runStatus?.status === 'running' && (
                    <Badge className="bg-green-100 text-green-800 border-green-300 ml-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1.5"></div>
                      LIVE
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {runStatus?.name || 'Synthetic data generation in progress'}
                  {runSteps.length > 0 && ` • ${runSteps.length} step${runSteps.length !== 1 ? 's' : ''} completed`}
                </DialogDescription>
              </div>
              {(runStatus?.status === 'running' || runStatus?.status === 'queued') && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={isCancelling}
                  className="ml-4 bg-red-500 hover:bg-red-600 text-white"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  {isCancelling ? 'Cancelling...' : 'Cancel'}
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {/* Cancel Confirmation Dialog */}
          {showCancelConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md mx-4 bg-white shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Cancel Run?</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to cancel this run? This action cannot be undone. Any progress made so far will be lost.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={isCancelling}
                    >
                      Keep Running
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCancelRun}
                      disabled={isCancelling}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {isCancelling ? 'Cancelling...' : 'Yes, Cancel Run'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                {(() => {
                  if (runSteps.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Loader2 className="h-8 w-8 mx-auto mb-3 text-gray-400 animate-spin" />
                        <p className="text-sm">Waiting for execution steps...</p>
                        <p className="text-xs mt-1">Steps will appear here as the run progresses</p>
                      </div>
                    );
                  }
                  
                  // Use renderKey to force re-render when steps change
                  const stepKey = `steps-${runSteps.length}-${runSteps.map(s => s.step_no).join('-')}-${renderKey}`;
                  return (
                    <ExecutionLogTab 
                      key={stepKey} 
                      steps={[...runSteps]} // Pass a new array reference to ensure React detects change
                    />
                  );
                })()}
              </div>
            </div>

            {/* Action Buttons */}
            {runId && (
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    handleClose();
                    router.push(`/${locale}/runs?runId=${runId}`);
                  }}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>View in Runs Page</span>
                </Button>
              </div>
            )}
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
                  if (runId) {
                    handleClose();
                    // Navigate to runs page with runId parameter to auto-expand
                    router.push(`/${locale}/runs?runId=${runId}`);
                  } else {
                    handleClose();
                  }
                }}
                variant="outline"
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                View on Runs Page
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
      <Dialog open={isOpen} onOpenChange={handleClose} className="w-[95vw] sm:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span>Run Failed</span>
            </DialogTitle>
            <DialogDescription>
              The synthesis run encountered an error. Review the execution steps below to see what happened.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Execution Timeline - Show all steps even on failure */}
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
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No execution steps available</p>
                    <p className="text-xs mt-1">Steps may still be loading...</p>
                  </div>
                ) : (
                  <>
                    <ExecutionLogTab 
                      key={`steps-${runSteps.length}-${runSteps.map(s => s.step_no).join('-')}`} 
                      steps={[...runSteps]} 
                    />
                  </>
                )}
              </div>
            </div>

            {/* Agent Plan if available */}
            {runData?.config_json?.plan && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <h4 className="text-base font-semibold text-gray-900">Agent Planning Decisions</h4>
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
      <Dialog open={isOpen} onOpenChange={handleClose} className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogContent className="p-6">
          <div className="space-y-6">
            {/* QuickConfigCard - Simplified One-Click UI */}
            <QuickConfigCard 
              dataset={dataset}
              onStart={handleQuickStart}
              disabled={loading}
            />

            {/* Advanced Settings Accordion */}
            <div className="w-full">
              <AdvancedSettingsAccordion 
                model={advancedModel}
                onModelChange={setAdvancedModel}
                maxIterations={maxIterations}
                onMaxIterationsChange={setMaxIterations}
                autoRetry={autoRetry}
                onAutoRetryChange={setAutoRetry}
                clinicalPreprocessing={clinicalPreprocessing}
                onClinicalPreprocessingChange={setClinicalPreprocessing}
                useAllGreen={useAllGreen}
                onUseAllGreenChange={setUseAllGreen}
              />
            </div>
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
