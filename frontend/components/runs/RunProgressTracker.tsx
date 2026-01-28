"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Database, 
  BrainCircuit, 
  Activity, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Sword,
  SearchCheck
} from "lucide-react";
import { GLASS_PANEL, FADE_IN, STAGGER_CONTAINER } from "@/components/animations/animation_presets";

// Step ID constants
const STEP_CLEANER = 1;
const STEP_ARCHITECT = 2;
const STEP_GENERATOR = 3;
const STEP_RED_TEAM = 4;
const STEP_SENTINEL = 5;

interface RunProgressTrackerProps {
  status: string;
  steps: any[]; // Using any[] for now, should match RunStep interface
  metrics?: any;
  variant?: 'default' | 'minimal' | 'micro';
}

export function RunProgressTracker({ status, steps, metrics, variant = 'default' }: RunProgressTrackerProps) {
  const isMinimal = variant === 'minimal';
  const isMicro = variant === 'micro';
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Analyze steps to determine current progress
  useEffect(() => {
    // Logic to parse backend logs and map to visual steps
    let maxStep = 1;
    const completed = new Set<number>();

    // Mapping log keywords to steps
    steps.forEach(s => {
      const detail = s.detail?.toLowerCase() || "";
      const title = s.title?.toLowerCase() || "";
      
      if (title.includes("cleaner") || detail.includes("sanitization")) {
        completed.add(STEP_CLEANER);
        maxStep = Math.max(maxStep, STEP_ARCHITECT);
      }
      if (title.includes("architect") || title.includes("preprocessing") || detail.includes("selecting model") || detail.includes("hyperparameter")) {
        completed.add(STEP_CLEANER);
        maxStep = Math.max(maxStep, STEP_ARCHITECT); // Architect is Active
      }
      if (title.includes("training") || detail.includes("epoch") || detail.includes("generating")) {
        completed.add(STEP_CLEANER);
        completed.add(STEP_ARCHITECT);
        maxStep = Math.max(maxStep, STEP_GENERATOR); // Engine is Active
      }
      if (title.includes("red team") || detail.includes("attack") || detail.includes("linkage")) {
        completed.add(STEP_CLEANER);
        completed.add(STEP_ARCHITECT);
        completed.add(STEP_GENERATOR);
        maxStep = Math.max(maxStep, STEP_RED_TEAM); // Auditor is Active
      }
      if (title.includes("privacy") || detail.includes("mia") || detail.includes("audit")) {
         completed.add(STEP_CLEANER);
         completed.add(STEP_ARCHITECT);
         completed.add(STEP_GENERATOR);
         maxStep = Math.max(maxStep, STEP_RED_TEAM); // Auditor is Active
      }
    });

    if (status === "Succeeded" || status === "Completed") {
      [1, 2, 3, 4, 5].forEach(s => completed.add(s));
      maxStep = 6; // All done
    }

    setCompletedSteps(Array.from(completed));
    setCurrentStep(maxStep);
  }, [steps, status]);

  const progressItems = [
    { id: STEP_CLEANER, label: "Cleaner", icon: Database, desc: "Sanitizing" },
    { id: STEP_ARCHITECT, label: "Architect", icon: BrainCircuit, desc: "Designing" },
    { id: STEP_GENERATOR, label: "Engine", icon: Activity, desc: "Sampling" },
    { id: STEP_RED_TEAM, label: "Auditor", icon: Sword, desc: "Testing" },
    { id: STEP_SENTINEL, label: "Sentinel", icon: ShieldCheck, desc: "Verified" },
  ];

  if (isMicro) {
    return (
      <div className="flex items-center gap-1.5 h-4">
        {progressItems.map((item) => {
          const isCompleted = completedSteps.includes(item.id);
          const isActive = currentStep === item.id && (status === "Running" || status === "running" || status === "queued");
          return (
            <div 
              key={item.id}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                isCompleted ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 
                isActive ? 'bg-blue-500 animate-pulse' : 
                'bg-slate-200'
              }`}
              title={item.label}
            />
          );
        })}
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={FADE_IN}
      className={`w-full ${isMinimal ? 'p-0 shadow-none border-none mb-0 bg-transparent' : `p-6 mb-6 ${GLASS_PANEL} border-blue-500/20`}`}
    >
      {!isMinimal && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Live Engine Status
          </h3>
        </div>
      )}

      <motion.div 
        variants={STAGGER_CONTAINER}
        className={`grid grid-cols-5 ${isMinimal ? 'gap-2' : 'gap-4'} relative`}
      >
        {/* Connecting Line */}
        <div className={`absolute ${isMinimal ? 'top-3.5' : 'top-5'} left-0 w-full h-0.5 bg-gray-200 -z-10`} />
        <div 
            className={`absolute ${isMinimal ? 'top-3.5' : 'top-5'} left-0 h-0.5 bg-blue-500 -z-10 transition-all duration-1000`}
            style={{ width: `${(Math.max(0, currentStep - 1) / 4) * 100}%` }} 
        />

        {progressItems.map((item) => {
          const isCompleted = completedSteps.includes(item.id);
          const isActive = currentStep === item.id && (status === "Running" || status === "running" || status === "queued");
          
          return (
            <motion.div 
              key={item.id}
              variants={FADE_IN}
              className="flex flex-col items-center text-center space-y-1"
            >
              <div 
                className={`
                  ${isMinimal ? 'w-7 h-7' : 'w-10 h-10'} rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 bg-white
                  ${isCompleted ? 'border-green-500 text-green-500' : 
                    isActive ? 'border-blue-500 text-blue-500 scale-110 shadow-lg shadow-blue-500/30' : 
                    'border-gray-200 text-gray-300'}
                `}
              >
                <item.icon className={isMinimal ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
              </div>
              
              <div className="flex flex-col min-w-0 w-full overflow-hidden">
                <span className={`${isMinimal ? 'text-[8px]' : 'text-xs'} font-bold truncate ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                  {item.label}
                </span>
                {!isMinimal && (
                  <span className="text-[10px] text-gray-500 truncate">
                    {isActive ? (
                      <span className="flex items-center justify-center">
                         {item.desc} <span className="animate-pulse ml-1">...</span>
                      </span>
                    ) : item.desc}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
