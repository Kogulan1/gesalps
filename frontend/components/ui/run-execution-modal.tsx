"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Play, 
  X, 
  Database, 
  AlertCircle, 
  Loader2,
  Brain,
  Settings,
  Shield,
  Zap
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

interface RunExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  datasetId?: string;
  datasets: Array<{ id: string; name: string; project_id: string; project_name: string }>;
}

interface AgentPlan {
  choice: {
    method: string;
  };
  hyperparams: {
    sample_multiplier: number;
    max_synth_rows: number;
    [key: string]: any;
  };
  dp: {
    enabled: boolean;
    epsilon?: number;
    delta?: number;
  };
  backup: Array<{
    method: string;
    hyperparams: any;
  }>;
  rationale: string;
}

export function RunExecutionModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  datasetId,
  datasets 
}: RunExecutionModalProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState(datasetId || "");
  const [runName, setRunName] = useState("");
  const [mode, setMode] = useState<'agent' | 'custom'>('agent');
  const [customMethod, setCustomMethod] = useState('ddpm');
  const [customConfig, setCustomConfig] = useState({
    sample_multiplier: 1.0,
    max_synth_rows: 2000,
    epochs: 300,
    batch_size: 128
  });
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedDatasetId(datasetId || "");
      setRunName("");
      setMode('agent');
      setCustomMethod('ddpm');
      setCustomConfig({
        sample_multiplier: 1.0,
        max_synth_rows: 2000,
        epochs: 300,
        batch_size: 128
      });
      setAgentPrompt("");
      setAgentPlan(null);
      setError(null);
    }
  }, [isOpen, datasetId]);

  const handleGetAgentPlan = async () => {
    if (!selectedDatasetId || !agentPrompt.trim()) {
      setError("Please select a dataset and enter a prompt");
      return;
    }

    setLoadingPlan(true);
    setError(null);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${base}/v1/agent/plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dataset_id: selectedDatasetId,
          prompt: agentPrompt,
          goal: "Generate high-quality synthetic data with optimal privacy-utility tradeoff"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to get agent plan: ${response.statusText}`);
      }

      const result = await response.json();
      setAgentPlan(result.plan);
    } catch (err) {
      console.error('Error getting agent plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to get agent plan');
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleStartRun = async () => {
    if (!selectedDatasetId || !runName.trim()) {
      setError("Please select a dataset and enter a run name");
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      let configJson = {};
      
      if (mode === 'agent') {
        if (agentPlan) {
          configJson = {
            plan: agentPlan,
            prompt: agentPrompt
          };
        } else {
          configJson = {
            prompt: agentPrompt
          };
        }
      } else {
        configJson = {
          method: customMethod,
          hyperparams: customConfig
        };
      }

      const response = await fetch(`${base}/v1/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dataset_id: selectedDatasetId,
          method: mode === 'agent' ? (agentPlan?.choice?.method || 'gc') : customMethod,
          mode: mode,
          name: runName,
          config_json: configJson
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to start run: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Run started successfully:', result);
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error starting run:', err);
      setError(err instanceof Error ? err.message : 'Failed to start run');
    } finally {
      setStarting(false);
    }
  };

  const handleClose = () => {
    if (!starting && !loadingPlan) {
      onClose();
    }
  };

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5 text-red-600" />
            <span>Start New Synthesis Run</span>
          </DialogTitle>
          <DialogDescription>
            Configure and start a new synthetic data generation run using AI-powered optimization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dataset Selection */}
          <div className="space-y-2">
            <Label htmlFor="dataset">Dataset</Label>
            <select
              id="dataset"
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={starting || loadingPlan}
            >
              <option value="">Select a dataset</option>
              {datasets.map(dataset => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name} ({dataset.project_name})
                </option>
              ))}
            </select>
            {selectedDataset && (
              <p className="text-xs text-gray-500">
                Selected: {selectedDataset.name} from {selectedDataset.project_name}
              </p>
            )}
          </div>

          {/* Run Name */}
          <div className="space-y-2">
            <Label htmlFor="runName">Run Name</Label>
            <Input
              id="runName"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              placeholder="Enter a name for this run"
              disabled={starting || loadingPlan}
            />
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <Label>Execution Mode</Label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="agent"
                  checked={mode === 'agent'}
                  onChange={(e) => setMode(e.target.value as 'agent' | 'custom')}
                  disabled={starting || loadingPlan}
                  className="text-red-600 focus:ring-red-500"
                />
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">AI Agent (Recommended)</span>
                </div>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="custom"
                  checked={mode === 'custom'}
                  onChange={(e) => setMode(e.target.value as 'agent' | 'custom')}
                  disabled={starting || loadingPlan}
                  className="text-red-600 focus:ring-red-500"
                />
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Custom Configuration</span>
                </div>
              </label>
            </div>
          </div>

          {/* Agent Mode */}
          {mode === 'agent' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 text-blue-800">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">AI Agent Configuration</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agentPrompt">Goal & Requirements</Label>
                <Textarea
                  id="agentPrompt"
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="Describe your goals for this synthesis run. For example: 'Generate synthetic data that preserves statistical properties while ensuring strong privacy protection for healthcare data.'"
                  rows={3}
                  disabled={starting || loadingPlan}
                />
              </div>

              {agentPrompt && (
                <Button
                  onClick={handleGetAgentPlan}
                  disabled={loadingPlan || starting || !selectedDatasetId}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {loadingPlan ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Getting AI Plan...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Get AI-Optimized Plan
                    </>
                  )}
                </Button>
              )}

              {agentPlan && (
                <div className="space-y-3 p-3 bg-white rounded border">
                  <div className="flex items-center space-x-2 text-green-800">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">AI Recommended Plan</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Method:</strong> {agentPlan.choice.method.toUpperCase()}</p>
                    <p><strong>Sample Multiplier:</strong> {agentPlan.hyperparams.sample_multiplier}x</p>
                    <p><strong>Max Rows:</strong> {agentPlan.hyperparams.max_synth_rows.toLocaleString()}</p>
                    <p><strong>Privacy:</strong> {agentPlan.dp.enabled ? 'Enabled' : 'Disabled'}</p>
                    <p><strong>Rationale:</strong> {agentPlan.rationale}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Mode */}
          {mode === 'custom' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2 text-gray-800">
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">Custom Configuration</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="method">Synthesis Method</Label>
                  <select
                    id="method"
                    value={customMethod}
                    onChange={(e) => setCustomMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={starting || loadingPlan}
                    title="TabDDPM = 2025 SOTA diffusion model for clinical data"
                  >
                    <option value="ddpm">TabDDPM (Diffusion - Highest Fidelity) ⭐ SOTA</option>
                    <option value="gc">Gaussian Copula (GC)</option>
                    <option value="ctgan">CTGAN</option>
                    <option value="tvae">TVAE</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sampleMultiplier">Sample Multiplier</Label>
                  <Input
                    id="sampleMultiplier"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="3.0"
                    value={customConfig.sample_multiplier}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, sample_multiplier: parseFloat(e.target.value) || 1.0 }))}
                    disabled={starting || loadingPlan}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxRows">Max Synthetic Rows</Label>
                  <Input
                    id="maxRows"
                    type="number"
                    min="100"
                    max="50000"
                    value={customConfig.max_synth_rows}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, max_synth_rows: parseInt(e.target.value) || 2000 }))}
                    disabled={starting || loadingPlan}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="epochs">Epochs</Label>
                  <Input
                    id="epochs"
                    type="number"
                    min="50"
                    max="1000"
                    value={customConfig.epochs}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, epochs: parseInt(e.target.value) || 300 }))}
                    disabled={starting || loadingPlan}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-sm p-3 bg-red-50 rounded border border-red-200">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={starting || loadingPlan}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartRun}
            disabled={!selectedDatasetId || !runName.trim() || starting || loadingPlan}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting Run...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Run
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
