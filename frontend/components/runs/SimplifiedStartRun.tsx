"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, ShieldCheck, Cpu, ChevronDown, ChevronUp, Settings2, Play, Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimplifiedStartRunProps {
  dataset: any;
  onStart: (config: any) => void;
  isStarting?: boolean;
}

export function SimplifiedStartRun({ dataset, onStart, isStarting = false }: SimplifiedStartRunProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Default Config
  const [runName, setRunName] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState("Medium");
  
  // Advanced Config
  const [model, setModel] = useState("auto");
  const [iterations, setIterations] = useState(2000);
  const [clinicalPreprocessing, setClinicalPreprocessing] = useState(true);
  const [autoRetry, setAutoRetry] = useState(true);

  const handleStart = () => {
    // Auto-generate name if empty
    const finalName = runName.trim() || `${dataset?.name?.split('.')[0] || 'Dataset'}_Gen_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`;
    
    onStart({
      name: finalName,
      privacy_level: privacyLevel.toLowerCase(),
      mode: 'agent',
      config: {
        model,
        max_iterations: iterations,
        clinical_preprocessing: clinicalPreprocessing,
        auto_retry: autoRetry
      }
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-2xl border-0 ring-1 ring-border/50 overflow-hidden bg-background/50 backdrop-blur-sm">
      {/* Hero Header */}
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-gray-50/50 to-transparent dark:from-gray-950/10 pt-8 pb-2">
        <CardHeader className="text-center pb-2 relative z-10">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-sm flex items-center justify-center mb-4 ring-1 ring-black/5">
            <Sparkles className="w-8 h-8 text-black fill-gray-300" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Generate Synthetic Data
          </CardTitle>
          <CardDescription className="text-lg">
            Using GreenGuard Clinical Engine v18 for <span className="font-semibold text-foreground">{dataset?.name}</span>
          </CardDescription>
        </CardHeader>
      </div>

      <CardContent className="space-y-8 p-8">
        {/* Dataset Stats & Default Badges */}
        <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="secondary" className="px-3 py-1 text-sm bg-muted/50">
              <Activity className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              {dataset?.rows?.toLocaleString() || "..."} rows
            </Badge>
            <Badge variant="outline" className={cn(
              "px-3 py-1 text-sm transition-colors",
              privacyLevel === 'High' ? "border-green-600 text-green-600 bg-green-50 dark:bg-green-950/30" : 
              privacyLevel === 'Medium' ? "border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-950/30" :
              "border-yellow-600 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30"
            )}>
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              Privacy: {privacyLevel}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 text-sm bg-muted/50">
               <Cpu className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
               Model: {model === 'auto' ? 'Auto (GreenGuard)' : model.toUpperCase()}
            </Badge>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-4 max-w-md mx-auto">
             <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <Button 
                    size="lg" 
                    onClick={handleStart}
                    disabled={isStarting}
                    className="relative w-full h-16 text-lg font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
                >
                    {isStarting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                    ) : (
                        <><Play className="w-5 h-5 mr-2 fill-current" /> Start All-Green Run</>
                    )}
                </Button>
            </div>
            <p className="text-center text-sm font-medium text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Guaranteed Privacy & Utility using GreenGuard Clinical Engine.
                <br /><span className="text-xs opacity-75">Click to auto-generate synthetic data with optimal settings.</span>
            </p>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="w-full max-w-lg mx-auto">
             <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
                <CollapsibleTrigger asChild>
                    <div className="flex justify-center">
                        <Button variant="ghost" size="sm" className="flex items-center gap-2 text-primary hover:text-primary/80">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <span className="text-xs font-semibold uppercase tracking-wide">{isOpen ? "Hide Advanced Settings" : "Customize Settings (Expert Mode)"}</span>
                        </Button>
                    </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-6 pt-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-4">
                         {/* Name Input - Moved Inside */}
                         <div>
                            <Label htmlFor="runName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Run Name (Optional)</Label>
                            <Input
                                id="runName"
                                placeholder={`e.g. ${dataset?.name?.split('.')[0]}_v1`}
                                value={runName}
                                onChange={(e) => setRunName(e.target.value)}
                                className="bg-background"
                            />
                         </div>

                         <div className="grid gap-6 sm:grid-cols-2 p-6 bg-muted/30 rounded-xl border border-border/50">
                        {/* Privacy Control */}
                        <div className="space-y-3">
                             <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Privacy Guardrail</Label>
                             <Tabs value={privacyLevel} onValueChange={setPrivacyLevel} className="w-full">
                                <TabsList className="w-full grid grid-cols-3">
                                    <TabsTrigger value="Low">Low</TabsTrigger>
                                    <TabsTrigger value="Medium">Medium</TabsTrigger>
                                    <TabsTrigger value="High">High</TabsTrigger>
                                </TabsList>
                             </Tabs>
                             <p className="text-[10px] text-muted-foreground">
                                Controls epsilon budget and differential privacy noise levels.
                             </p>
                        </div>

                        {/* Model Selection */}
                        <div className="space-y-3">
                             <div className="flex justify-between items-center">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model Architecture</Label>
                                <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                                    All Green Service Active
                                </Badge>
                             </div>
                             <Select value={model} onValueChange={setModel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Auto (GreenGuard Adaptive)</SelectItem>
                                    <SelectItem value="ddpm">TabDDPM (Diffusion)</SelectItem>
                                    <SelectItem value="tvae">TVAE (Autoencoder)</SelectItem>
                                    <SelectItem value="ctgan">CTGAN (GAN)</SelectItem>
                                </SelectContent>
                             </Select>
                        </div>
                        
                        {/* Toggles */}
                        <div className="col-span-2 grid sm:grid-cols-2 gap-4 pt-2">
                             <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="clinical-mode" className="flex flex-col space-y-1">
                                    <span>Clinical Preprocessing</span>
                                    <span className="font-normal text-xs text-muted-foreground">Handle ICD-10 & medical codes</span>
                                </Label>
                                <Switch id="clinical-mode" checked={clinicalPreprocessing} onCheckedChange={setClinicalPreprocessing} />
                             </div>
                             
                             <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="auto-retry" className="flex flex-col space-y-1">
                                    <span>Auto-Retry</span>
                                    <span className="font-normal text-xs text-muted-foreground">Restart on gate failure</span>
                                </Label>
                                <Switch id="auto-retry" checked={autoRetry} onCheckedChange={setAutoRetry} />
                             </div>
                        </div>
                    </div>
                    </div>
                </CollapsibleContent>
             </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}
