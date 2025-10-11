"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Settings, 
  Shield, 
  Brain, 
  Clock, 
  Database, 
  Info,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface RunExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dataset: any;
}

export function RunExecutionModal({ isOpen, onClose, onSuccess, dataset }: RunExecutionModalProps) {
  const [runName, setRunName] = useState("");
  const [method, setMethod] = useState("TabDDPM");
  const [privacyLevel, setPrivacyLevel] = useState("Medium");
  const [useAgentic, setUseAgentic] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNameConfirm, setShowNameConfirm] = useState(false);

  const methods = [
    { 
      value: "TabDDPM", 
      label: "TabDDPM", 
      description: "Denoising Diffusion Probabilistic Models for tabular data",
      category: "Diffusion",
      recommended: true
    },
    { 
      value: "CTGAN", 
      label: "CTGAN", 
      description: "Conditional Tabular GAN with training by sampling",
      category: "GAN",
      recommended: false
    },
    { 
      value: "DP-GAN", 
      label: "DP-GAN", 
      description: "Differentially Private GAN with privacy guarantees",
      category: "Privacy-Preserving",
      recommended: true
    },
    { 
      value: "PATE-GAN", 
      label: "PATE-GAN", 
      description: "Private Aggregation of Teacher Ensembles GAN",
      category: "Privacy-Preserving",
      recommended: false
    },
    { 
      value: "WGAN-GP", 
      label: "WGAN-GP", 
      description: "Wasserstein GAN with Gradient Penalty",
      category: "GAN",
      recommended: false
    },
    { 
      value: "VAE", 
      label: "VAE", 
      description: "Variational Autoencoder for tabular data",
      category: "Autoencoder",
      recommended: false
    }
  ];

  const privacyLevels = [
    { 
      value: "Low", 
      label: "Low Privacy", 
      epsilon: "ε = 10.0",
      description: "Fast generation, lower privacy protection",
      color: "bg-red-100 text-red-800"
    },
    { 
      value: "Medium", 
      label: "Medium Privacy", 
      epsilon: "ε = 1.0",
      description: "Balanced privacy and utility",
      color: "bg-yellow-100 text-yellow-800"
    },
    { 
      value: "High", 
      label: "High Privacy", 
      epsilon: "ε = 0.1",
      description: "Strong privacy protection, slower generation",
      color: "bg-orange-100 text-orange-800"
    },
    { 
      value: "Very High", 
      label: "Very High Privacy", 
      epsilon: "ε = 0.01",
      description: "Maximum privacy, slowest generation",
      color: "bg-green-100 text-green-800"
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if name is empty and show confirmation
    if (!runName.trim()) {
      setShowNameConfirm(true);
      return;
    }
    
    // Proceed with the run
    await startRun(runName.trim());
  };

  const startRun = async (name: string) => {
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      
      // Get authentication token
      const { createSupabaseBrowserClient } = await import('@/lib/supabase/browserClient');
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      if (!dataset?.id) {
        throw new Error('No dataset selected');
      }

      // Map frontend method names to backend method names
      const methodMapping: { [key: string]: string } = {
        'TabDDPM': 'tvae',
        'CTGAN': 'ctgan', 
        'DP-GAN': 'gc',
        'PATE-GAN': 'gc',
        'Auto': 'auto'
      };

      const backendMethod = methodMapping[method] || 'tvae';
      const mode = useAgentic ? 'agent' : 'custom';

      // Prepare the request body
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

      console.log('Starting run with payload:', requestBody);
      
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
      
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error starting run:', error);
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
    setRunName("");
    setMethod("TabDDPM");
    setPrivacyLevel("Medium");
    setUseAgentic(false);
    setDescription("");
    onClose();
  };

  const selectedMethod = methods.find(m => m.value === method);
  const selectedPrivacy = privacyLevels.find(p => p.value === privacyLevel);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose} className="sm:max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogContent>
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
                {selectedMethod?.category === 'Diffusion' ? '15-30 min' :
                 selectedMethod?.category === 'Privacy-Preserving' ? '20-45 min' :
                 '10-25 min'}
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
      <Dialog open={showNameConfirm} onOpenChange={setShowNameConfirm}>
        <DialogContent className="sm:max-w-md">
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
