"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, FileText, ShieldCheck } from "lucide-react";

interface QuickConfigCardProps {
  dataset: any;
  onStart: (config: any) => void;
  disabled?: boolean;
}

export function QuickConfigCard({ dataset, onStart, disabled = false }: QuickConfigCardProps) {
  const [runName, setRunName] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState("Medium");

  const handleStart = () => {
    onStart({
      name: runName || `${dataset?.name || 'Dataset'}_Gen_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`,
      privacy_level: privacyLevel.toLowerCase(),
      mode: 'agent' // Default to agentic/GreenGuard mode
    });
  };

  return (
    <Card className="w-full border-2 border-primary/10 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Zap className="h-24 w-24 text-primary" />
      </div>
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="mb-2 bg-primary/5 text-primary border-primary/20">
            GreenGuard Clinical Engine v18
          </Badge>
          <div className="flex items-center space-x-1 text-xs text-green-600 font-medium">
            <ShieldCheck className="h-3 w-3" />
            <span>Clinical Grade Safety</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Ready to Generate</CardTitle>
        <CardDescription>
          One-click clinical-grade synthetic data generation with adaptive preprocessing.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Dataset Preview */}
        <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-xl border border-border/50">
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{dataset?.name || "Target Dataset"}</h4>
            <p className="text-xs text-muted-foreground">
              {dataset?.rows?.toLocaleString() || "..."} rows • {dataset?.columns || "..."} columns
            </p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            Auto-Detected
          </Badge>
        </div>
        
        {/* Basic Inputs */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="run-name">Run Name</Label>
            <Input 
              id="run-name"
              placeholder="e.g. Clinical Study v2" 
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label>Privacy Guardrail</Label>
            <Tabs 
              defaultValue="Medium" 
              onValueChange={setPrivacyLevel}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="Low">Low</TabsTrigger>
                <TabsTrigger value="Medium">Medium</TabsTrigger>
                <TabsTrigger value="High">High</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-primary/5 border-t border-primary/10 p-6">
        <Button 
          onClick={handleStart}
          disabled={disabled}
          size="lg" 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 text-lg shadow-lg group transition-all duration-300 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="mr-2 h-5 w-5 fill-current group-hover:animate-pulse" />
          Generate Synthetic Data
        </Button>
      </CardFooter>
    </Card>
  );
}
