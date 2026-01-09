"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, X, Eye } from "lucide-react";

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
      const isInvestorMode = localStorage.getItem('isInvestorMode') === 'true' || 
                            document.cookie.includes('isInvestorMode=true');
      
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
        const response = await fetch(`${base}/v1/datasets/${dataset.id}/preview`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load preview data');
        }
        
        const data = await response.json();
        setPreviewData(data.rows || []);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
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

        <div className="flex-1 overflow-auto">
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    {headers.map((header, index) => (
                      <th key={index} className="text-left p-3 font-medium text-gray-700">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b hover:bg-gray-50">
                      {headers.map((header, colIndex) => (
                        <td key={colIndex} className="p-3 text-sm text-gray-600">
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {dataset.rows > 5 && (
                <div className="text-center py-2 text-sm text-gray-500">
                  Showing first 5 rows of {dataset.rows} total rows
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
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
