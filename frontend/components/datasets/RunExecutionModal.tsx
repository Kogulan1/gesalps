"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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

  const methods = [
    { value: "TabDDPM", label: "TabDDPM" },
    { value: "CTGAN", label: "CTGAN" },
    { value: "DP-GAN", label: "DP-GAN" },
    { value: "PATE-GAN", label: "PATE-GAN" },
    { value: "WGAN-GP", label: "WGAN-GP" }
  ];

  const privacyLevels = [
    { value: "Low", label: "Low (ε = 10.0)" },
    { value: "Medium", label: "Medium (ε = 1.0)" },
    { value: "High", label: "High (ε = 0.1)" },
    { value: "Very High", label: "Very High (ε = 0.01)" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runName) return;

    setLoading(true);
    try {
      // TODO: Implement run execution logic
      console.log('Starting run:', { 
        runName, 
        method, 
        privacyLevel, 
        useAgentic, 
        description,
        datasetId: dataset?.id 
      });
      
      // Simulate run start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error starting run:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRunName("");
    setMethod("TabDDPM");
    setPrivacyLevel("Medium");
    setUseAgentic(false);
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start New Run</DialogTitle>
          <DialogDescription>
            Configure and start a new synthesis run for {dataset?.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Run Name</Label>
            <Input
              id="name"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              placeholder="Enter run name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="method">Synthesis Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="privacy">Privacy Level</Label>
              <Select value={privacyLevel} onValueChange={setPrivacyLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {privacyLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="agentic"
              checked={useAgentic}
              onCheckedChange={setUseAgentic}
            />
            <Label htmlFor="agentic">Use Agentic AI for method selection</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter run description"
              rows={3}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Run Configuration</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Dataset:</strong> {dataset?.name}</p>
              <p><strong>Method:</strong> {method}</p>
              <p><strong>Privacy Level:</strong> {privacyLevel}</p>
              <p><strong>Agentic AI:</strong> {useAgentic ? "Enabled" : "Disabled"}</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !runName}
            >
              {loading ? "Starting..." : "Start Run"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
