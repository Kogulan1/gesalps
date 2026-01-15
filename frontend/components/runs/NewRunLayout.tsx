"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SimplifiedStartRun } from "./SimplifiedStartRun";
import { RealTimeProgressDashboard } from "./RealTimeProgressDashboard";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useToast } from "@/components/toast/Toaster";
import { getUserFriendlyErrorMessage } from "@/lib/errorMessages";

interface NewRunLayoutProps {
  projectId: string;
  initialDatasetId?: string;
}

export type RunStep = 'config' | 'running' | 'completed' | 'failed';

export function NewRunLayout({ projectId, initialDatasetId }: NewRunLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState<RunStep>('config');
  const [dataset, setDataset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);

  // Check for existing run in URL to restore state
  useEffect(() => {
    const existingRunId = searchParams.get('runId');
    if (existingRunId) {
      setRunId(existingRunId);
      setStep('running');
    }
  }, [searchParams]);

  useEffect(() => {
    if (initialDatasetId) {
      fetchDataset(initialDatasetId);
    } else {
      setLoading(false);
    }
  }, [initialDatasetId]);

  const fetchDataset = async (id: string) => {
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`${base}/v1/datasets/${id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error("Failed to fetch dataset");
      const data = await response.json();
      setDataset(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to load dataset details",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartRun = async (config: any) => {
    try {
      setIsStarting(true);
      // setStep('running'); // Removed: Don't show dashboard until we have runId 
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error("Not authenticated");

      // Extract config params to top-level if needed by backend, or keep in config_json
      // Backend expects: dataset_id, method (optional), mode, config_json, name
      const payload = {
        project_id: projectId,
        dataset_id: dataset.id,
        name: config.name,
        mode: config.mode,
        // Map advanced config keys
        config_json: {
           ...config.config,
           privacy_level: config.privacy_level
        }
      };

      const response = await fetch(`${base}/v1/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to start run");
      }

      const result = await response.json();
      
      // Update URL with runId so refresh/navigation works
      const params = new URLSearchParams(searchParams.toString());
      params.set('runId', result.run_id);
      router.replace(`?${params.toString()}`, { scroll: false });

      setRunId(result.run_id);
      setStep('running');
    } catch (err) {
      // Stay on config step if failed, just show error
      // setStep('failed'); 
      console.error(err);
      toast({
        title: "Failed to start run",
        description: getUserFriendlyErrorMessage(err as any),
        variant: "error"
      });
    } finally {
      setIsStarting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {step === 'config' ? (
        <SimplifiedStartRun 
            dataset={dataset} 
            onStart={handleStartRun} 
            isStarting={isStarting} 
        />
      ) : (
        <RealTimeProgressDashboard 
          runId={runId} 
          status={step} 
          onComplete={() => setStep('completed')}
          onFail={() => setStep('failed')}
        />
      )}
    </div>
  );
}
