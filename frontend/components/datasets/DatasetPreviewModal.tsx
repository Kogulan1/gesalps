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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">{dataset.name}</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">{dataset.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {dataset.rows} rows × {dataset.columns} cols
              </Badge>
              <Badge variant="outline" className="text-xs">
                {dataset.size}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-white p-0">
            <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-gray-500 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data Preview
              </div>
            </TabsTrigger>
            <TabsTrigger value="omop" className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-gray-500 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Global DNA Map
                {dataset.omop_mapping?.error === "" ? (
                   <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">Failed</span>
                ) : dataset.omop_mapping ? (
                   <span className="text-[10px] bg-green-100 text-green-600 px-1 rounded">Mapped</span> 
                ) : null}
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-0 h-[60vh] overflow-auto border-t">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2 text-gray-600">Loading preview...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-500 mb-2">⚠️</div>
                <p className="text-red-600">{error}</p>
                <Button onClick={loadPreviewData} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : previewData.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">📊</div>
                <p className="text-gray-600">No preview data available</p>
              </div>
            ) : (
              <div className="relative">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/95 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                      {headers.map((header, index) => (
                        <th key={index} className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap border-r last:border-r-0">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b hover:bg-blue-50/50 transition-colors bg-white">
                        {headers.map((header, colIndex) => (
                          <td key={colIndex} className="px-4 py-2 text-gray-600 font-mono whitespace-nowrap border-r last:border-r-0">
                            {row[header] || <span className="text-gray-300">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dataset.rows > 5 && (
                  <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t py-2 text-center text-xs text-muted-foreground w-full">
                    Showing first 5 rows of {dataset.rows} total rows
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="omop" className="mt-0 h-[60vh] overflow-auto border-t bg-slate-50/50 p-6">
             {dataset.omop_mapping && !dataset.omop_mapping.error ? (
                  <MappingMatrix report={dataset.omop_mapping} onSave={handleSaveMapping} />
             ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                      <Brain className="h-12 w-12 opacity-20" />
                      <p>No Semantic DNA Mapping available for this dataset.</p>
                      {dataset.omop_mapping?.error === "" && <p className="text-xs text-red-400">Mapping failed during upload.</p>}
                  </div>
             )}
          </TabsContent>
        </Tabs>
        
        <div className="flex items-center justify-between pt-4 border-t bg-white">
          <div className="text-sm text-gray-500">
            {previewData.length > 0 && `Preview: ${previewData.length} of ${dataset.rows} rows`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Full Dataset
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
