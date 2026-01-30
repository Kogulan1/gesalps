"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, X, Eye, Database, Brain } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MappingMatrix } from "@/components/MappingMatrix";

interface DatasetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: {
    id: string;
    name: string;
    description: string;
    file_path: string;
    size: string;
    rows: number;
    columns: number;
    omop_mapping?: Record<string, any>;
  } | null;
}

export function DatasetPreviewModal({ isOpen, onClose, dataset }: DatasetPreviewModalProps) {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for active tab to ensure default is respected
  const [activeTab, setActiveTab] = useState("preview");

  useEffect(() => {
    if (isOpen && dataset) {
      loadPreviewData();
    }
  }, [isOpen, dataset]);

  const loadPreviewData = async () => {
    if (!dataset) return;

    setLoading(true);
    setError(null);

    try {
      // Check if we're in investor demo mode
      const isInvestorMode = typeof window !== 'undefined' && (
        localStorage.getItem('isInvestorMode') === 'true' || 
        document.cookie.includes('isInvestorMode=true')
      );
      
      if (isInvestorMode) {
        // Load demo CSV data
        const response = await fetch(dataset.file_path);
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',');
        const data = lines.slice(1, 6).map(line => {
          const values = line.split(',');
          const row: any = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
          });
          return row;
        });
        setPreviewData(data);
      } else {
        // Load from backend API
        const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
        
        // Get valid session token
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(`${base}/v1/datasets/${dataset.id}/preview`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load preview data');
        }
        
        // Backend returns CSV text, not JSON
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length > 0) {
            // Robust CSV split (handles quoted commas)
            const splitCSV = (str: string) => {
                const matches = str.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                return matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : str.split(',');
            };
            
            // Allow simple split if regex fails or for header
            // Actually, the backend uses standard CSV writer. 
            // Simple regex for splitting by comma outside quotes:
            const parseLine = (text: string) => {
                const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
                return text.split(re).map(v => v.replace(/^"|"$/g, '').trim());
            };

            const headers = parseLine(lines[0]);
            const rows = lines.slice(1).map(line => {
                const values = parseLine(line);
                const row: any = {};
                headers.forEach((header, index) => {
                    const cleanHeader = header.replace(/^"|"$/g, '');
                    row[cleanHeader] = values[index] || '';
                });
                return row;
            });
            setPreviewData(rows);
        } else {
            setPreviewData([]);
        }

      }
    } catch (err) {
      console.error('Error loading preview data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preview data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!dataset) return;
    
    const isInvestorMode = localStorage.getItem('isInvestorMode') === 'true';
    
    if (isInvestorMode) {
      // Download demo file
      const link = document.createElement('a');
      link.href = dataset.file_path;
      link.download = `${dataset.name}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Download from backend
      const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
      const link = document.createElement('a');
      link.href = `${base}/v1/datasets/${dataset.id}/download`;
      link.download = `${dataset.name}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!dataset) return null;

  const headers = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  const handleSaveMapping = async (newMapping: any) => {
    if (!dataset) return;
    
    try {
        const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE || 'http://localhost:8000';
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
  
        const response = await fetch(`${base}/v1/datasets/${dataset.id}/mapping`, {
            method: 'PUT',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mapping: newMapping })
        });
  
        if (!response.ok) {
            throw new Error('Failed to save mapping');
        }
        
        // Success feedback could be added here
        
    } catch (err) {
        console.error("Failed to save mapping:", err);
        throw err;
    }
  };

  // State for active tab to ensure default is respected


  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={onClose}
    >
      <DialogContent className="max-w-[85vw] w-full h-[85vh] flex flex-col p-0 overflow-hidden rounded-xl">
      {/* Custom Header - Replaces DialogHeader which swallows styles */}
      <div className="flex-none px-8 py-6 border-b bg-white z-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{dataset.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{dataset.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs px-2 py-1">
                {dataset.rows.toLocaleString()} rows × {dataset.columns} cols
              </Badge>
              <Badge variant="outline" className="text-xs px-2 py-1">
                {dataset.size}
              </Badge>
            </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        {/* Helper to visually debug if content is missing */}
        <div className="bg-gray-50/50 border-b px-8">
            <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto gap-6">
                <TabsTrigger 
                value="preview" 
                className="rounded-none border-b-2 border-transparent px-2 py-4 text-sm font-medium text-gray-500 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent transition-none"
                >
                <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Data Preview
                </div>
                </TabsTrigger>
                <TabsTrigger 
                value="omop" 
                className="rounded-none border-b-2 border-transparent px-2 py-4 text-sm font-medium text-gray-500 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 data-[state=active]:bg-transparent transition-none"
                >
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Global DNA Map
                    {dataset.omop_mapping?.error === "" ? (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-1 font-bold">Failed</span>
                    ) : dataset.omop_mapping ? (
                    <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded ml-1 font-bold">Mapped</span> 
                    ) : null}
                </div>
                </TabsTrigger>
            </TabsList>
        </div>

          <TabsContent value="preview" className="flex-1 overflow-auto m-0 relative focus-visible:ring-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2 text-gray-600">Loading preview...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-red-500 mb-2 text-2xl">⚠️</div>
                <p className="text-red-600 font-medium">{error}</p>
                <Button onClick={loadPreviewData} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : previewData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-gray-300 mb-2">
                    <Database className="h-12 w-12 opacity-20" />
                </div>
                <p className="text-gray-500">No preview data available</p>
              </div>
            ) : (
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                    <tr>
                      {headers.map((header, index) => (
                        <th key={index} className="text-left px-6 py-3 font-semibold text-gray-700 whitespace-nowrap border-b border-gray-200 bg-gray-50">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors bg-white group">
                        {headers.map((header, colIndex) => (
                          <td key={colIndex} className="px-6 py-3 text-gray-600 font-mono whitespace-nowrap group-hover:text-gray-900">
                            {row[header] || <span className="text-gray-300">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
            )}
          </TabsContent>

          <TabsContent value="omop" className="flex-1 overflow-auto m-0 p-0 bg-slate-50/50 focus-visible:ring-0">
             {dataset.omop_mapping && !dataset.omop_mapping.error ? (
                  <div className="h-full p-8 container max-w-5xl mx-auto">
                    <MappingMatrix report={dataset.omop_mapping} onSave={handleSaveMapping} />
                  </div>
             ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                      <Brain className="h-16 w-16 opacity-10" />
                      <p>No Semantic DNA Mapping available for this dataset.</p>
                      {dataset.omop_mapping?.error === "" && <p className="text-xs text-red-400">Mapping failed during upload.</p>}
                  </div>
             )}
          </TabsContent>
        </Tabs>
        
        <div className="flex-none px-8 py-5 border-t bg-white flex items-center justify-between">
          <div className="text-sm text-gray-500 font-medium">
            {previewData.length > 0 ? (
                <span>Showing first <span className="font-bold text-gray-900">{previewData.length}</span> records</span>
            ) : (
                <span>No data</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
            <Button onClick={onClose} className="px-8 bg-gray-900 hover:bg-gray-800 text-white">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
