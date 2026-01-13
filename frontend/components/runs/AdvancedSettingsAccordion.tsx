"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, Cpu, RefreshCw, BarChart } from "lucide-react";

interface AdvancedSettingsAccordionProps {
  model?: string;
  onModelChange?: (model: string) => void;
  maxIterations?: number;
  onMaxIterationsChange?: (iterations: number) => void;
  autoRetry?: boolean;
  onAutoRetryChange?: (enabled: boolean) => void;
  clinicalPreprocessing?: boolean;
  onClinicalPreprocessingChange?: (enabled: boolean) => void;
}

export function AdvancedSettingsAccordion({
  model: controlledModel,
  onModelChange,
  maxIterations: controlledMaxIterations,
  onMaxIterationsChange,
  autoRetry: controlledAutoRetry,
  onAutoRetryChange,
  clinicalPreprocessing: controlledClinicalPreprocessing,
  onClinicalPreprocessingChange,
}: AdvancedSettingsAccordionProps = {}) {
  const [internalModel, setInternalModel] = useState("auto");
  const [internalMaxIterations, setInternalMaxIterations] = useState(2000);
  const [internalAutoRetry, setInternalAutoRetry] = useState(true);
  const [internalClinicalPreprocessing, setInternalClinicalPreprocessing] = useState(true);

  const model = controlledModel ?? internalModel;
  const maxIterations = controlledMaxIterations ?? internalMaxIterations;
  const autoRetry = controlledAutoRetry ?? internalAutoRetry;
  const clinicalPreprocessing = controlledClinicalPreprocessing ?? internalClinicalPreprocessing;

  const handleModelChange = (value: string) => {
    if (onModelChange) {
      onModelChange(value);
    } else {
      setInternalModel(value);
    }
  };

  const handleMaxIterationsChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      if (onMaxIterationsChange) {
        onMaxIterationsChange(numValue);
      } else {
        setInternalMaxIterations(numValue);
      }
    }
  };

  const handleAutoRetryChange = (checked: boolean) => {
    if (onAutoRetryChange) {
      onAutoRetryChange(checked);
    } else {
      setInternalAutoRetry(checked);
    }
  };

  const handleClinicalPreprocessingChange = (checked: boolean) => {
    if (onClinicalPreprocessingChange) {
      onClinicalPreprocessingChange(checked);
    } else {
      setInternalClinicalPreprocessing(checked);
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="advanced" className="border-none">
        <AccordionTrigger className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors py-2 px-4 hover:no-underline bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center space-x-2">
            <Settings2 className="h-4 w-4" />
            <span className="text-sm font-medium">Advanced Settings (Expert Mode)</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-6 px-4 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Model Selection */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-primary/70" />
                <Label className="text-sm font-semibold">Model Architecture</Label>
              </div>
              <Select value={model} onValueChange={handleModelChange}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select architecture" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Adaptive Selection (Recommended)</SelectItem>
                  <SelectItem value="ddpm">TabDDPM (Diffusion)</SelectItem>
                  <SelectItem value="ctgan">CTGAN (GAN)</SelectItem>
                  <SelectItem value="tvae">TVAE (Autoencoder)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">
                GreenGuard automatically selects the best architecture based on dataset complexity.
              </p>
            </div>

            {/* Performance/Quality */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <BarChart className="h-4 w-4 text-primary/70" />
                <Label className="text-sm font-semibold">Max Training Iterations</Label>
              </div>
              <Input 
                type="number" 
                value={maxIterations}
                onChange={(e) => handleMaxIterationsChange(e.target.value)}
                className="bg-background"
                placeholder="e.g. 2000"
              />
              <p className="text-[10px] text-muted-foreground italic">
                Engine will auto-stop if convergence is achieved sooner.
              </p>
            </div>
          </div>

          {/* Automation Toggles */}
          <div className="pt-4 border-t border-border/50 space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-3.5 w-3.5 text-primary/70" />
                  <Label className="text-sm font-semibold">Autonomous Auto-Retry</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Allow engine to restart with adjusted params if privacy/utility gates fail.
                </p>
              </div>
              <Switch checked={autoRetry} onCheckedChange={handleAutoRetryChange} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Settings2 className="h-3.5 w-3.5 text-primary/70" />
                  <Label className="text-sm font-semibold">Clinical Data Preprocessing</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use domain-specific encoding for clinical datasets (medical codes, ICD-10).
                </p>
              </div>
              <Switch checked={clinicalPreprocessing} onCheckedChange={handleClinicalPreprocessingChange} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
