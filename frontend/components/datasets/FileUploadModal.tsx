"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileDropzone from "@/components/files/FileDropzone";
import { MappingMatrix } from "@/components/MappingMatrix";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Brain, CheckCircle, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects: Project[];
}

export function FileUploadModal({ isOpen, onClose, onSuccess, projects }: FileUploadModalProps) {
  const [step, setStep] = useState<"upload" | "processing" | "review">("upload");
  const [selectedProject, setSelectedProject] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Mapping Review State
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [mappingReport, setMappingReport] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !datasetName || !file) return;

    setLoading(true);
    setStep("processing");

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const formData = new FormData();
      formData.append('project_id', selectedProject);
      formData.append('file', file);

      // Minimum visual delay for the "processing" animation
      const minDelay = new Promise(resolve => setTimeout(resolve, 2000));
      
      const uploadPromise = fetch(`${base}/v1/datasets/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData
      });

      // Wait for both upload and min delay
      const [response] = await Promise.all([uploadPromise, minDelay]);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Store result and transition to Review Step
      setDatasetId(result.dataset_id);
      setMappingReport(result.omop_mapping); 
      setStep("review");
      
    } catch (error: any) {
      console.error('Error uploading dataset:', error);
      alert(`Upload failed: ${error.message}`);
      setStep("upload"); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMapping = async (newMapping: any) => {
      if (!datasetId) return;
      try {
          const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
          const supabase = createSupabaseBrowserClient();
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
    
          const response = await fetch(`${base}/v1/datasets/${datasetId}/mapping`, {
              method: 'PUT',
              headers: {
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ mapping: newMapping })
          });
    
          if (!response.ok) throw new Error('Failed to save mapping');
          
          // Final Success
          onSuccess();
          handleClose();
          
      } catch (err) {
          console.error("Failed to confirm mapping:", err);
          alert("Failed to confirm mapping. Please try again.");
      }
  };

  const handleClose = () => {
    // Reset state
    setSelectedProject("");
    setDatasetName("");
    setDescription("");
    setFile(null);
    setDatasetId(null);
    setMappingReport(null);
    setStep("upload");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={step === "review" ? "max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>
             {step === "upload" ? "Upload Dataset" : 
              step === "processing" ? "Processing Dataset" : 
              "Review Global DNA Map"}
          </DialogTitle>
          <DialogDescription>
             {step === "upload" && "Upload a new dataset to your project."}
             {step === "processing" && "Analyzing structure and mapping clinical concepts..."}
             {step === "review" && "Verify the semantic OMOP mapping before finishing."}
          </DialogDescription>
        </DialogHeader>
        
        {step === "upload" && (
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Dataset Name</Label>
                <Input
                  id="name"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="Enter dataset name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter dataset description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>File</Label>
                <FileDropzone
                  onSelect={setFile}
                  label="Choose CSV file"
                />
                {file && (
                  <p className="text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
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
                  disabled={loading || !selectedProject || !datasetName || !file}
                >
                  Next: Process
                </Button>
              </div>
            </form>
        )}

        {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="relative">
                    <Brain className="h-16 w-16 text-indigo-500 animate-pulse" />
                    <div className="absolute -bottom-2 -right-2">
                        <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Generating Semantic DNA Map</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto">
                        We are analyzing your columns and mapping them to standardized OMOP concepts...
                    </p>
                </div>
                <div className="w-full max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-progress origin-left w-full" style={{ animationDuration: '2s' }}></div>
                </div>
            </div>
        )}

        {step === "review" && (
            <div className="flex-1 flex flex-col min-h-0">
                 {/* Review Step Content */}
                 <div className="flex-1 overflow-auto bg-slate-50 p-4 border rounded-md mb-4">
                      {mappingReport && (!mappingReport.error) ? (
                          <MappingMatrix 
                              report={mappingReport} 
                              onSave={handleSaveMapping}
                              isReviewMode={true} // Add this prop to prompt "Confirm & Finish"
                          />
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400">
                              <AlertCircle className="h-12 w-12 text-red-400 mb-2" />
                              <p className="font-semibold text-gray-900">Mapping Generation Failed</p>
                              <p className="text-sm max-w-md text-center mt-1">
                                  {mappingReport?.error ? `Error: ${mappingReport.error}` : "The advanced AI mapping engine is currently unavailable."}
                              </p>
                              <Button variant="outline" className="mt-4" onClick={() => { onSuccess(); handleClose(); }}>
                                  Skip & Finish
                              </Button>
                          </div>
                      )}
                 </div>
                 
                 <div className="flex items-center justify-between border-t pt-4">
                     <div className="text-sm text-gray-500">
                         {mappingReport && !mappingReport.error 
                            ? "Please verify that columns are mapped to the correct Standard Concepts."
                            : "You can try re-mapping later from the dataset preview."}
                     </div>
                 </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
