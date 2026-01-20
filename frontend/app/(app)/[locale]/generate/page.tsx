"use client";

import { useState } from "react";
import { generateSyntheticData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default function GeneratePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await generateSyntheticData(file);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsLoading(false);
    }
  };

  const getUrl = (path: string) => {
    if (!path) return "";
    const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || "http://localhost:8000";
    // Remove trailing slash from base if present
    const cleanBase = base.replace(/\/$/, "");
    // Ensure path starts with /
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="container mx-auto py-10 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">One-Click Synthetic Data</h1>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Dataset</CardTitle>
              <CardDescription>Upload a CSV file to generate a HIPAA-compliant synthetic version.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <Input type="file" accept=".csv" onChange={handleFileChange} disabled={isLoading} />
                <Button onClick={handleGenerate} disabled={!file || isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : "Generate"}
                </Button>
              </div>
              {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generation Results</span>
                  {result.all_green ? (
                    <Badge className="bg-green-500 hover:bg-green-600">PASSED</Badge>
                  ) : (
                    <Badge variant="destructive">THRESHOLDS NOT MET</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                 {/* Metrics Grid */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricBox label="KS Mean" value={result.metrics.utility.ks_mean} threshold={0.15} lowerIsBetter />
                    <MetricBox label="Corr Delta" value={result.metrics.utility.corr_delta} threshold={0.10} lowerIsBetter />
                    <MetricBox label="MIA AUC" value={result.metrics.privacy.mia_auc} threshold={0.60} lowerIsBetter />
                    <MetricBox label="Dup Rate" value={result.metrics.privacy.dup_rate} threshold={0.05} lowerIsBetter />
                 </div>

                 <div className="flex gap-4 border-t pt-6">
                    <Button variant="outline" asChild>
                        <a href={getUrl(result.pdf_url)} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" /> Download Report (PDF)
                        </a>
                    </Button>
                    
                    {result.synthetic_url ? (
                        <Button className="bg-green-600 hover:bg-green-700" asChild>
                            <a href={getUrl(result.synthetic_url)} download>
                                <Download className="mr-2 h-4 w-4" /> Download Synthetic Data (CSV)
                            </a>
                        </Button>
                    ) : (
                       <Button variant="secondary" disabled>
                           Synthetic Data Unavailable (Failed Checks)
                       </Button>
                    )}
                 </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, threshold, lowerIsBetter }: { label: string, value: number, threshold: number, lowerIsBetter: boolean }) {
    const isPass = lowerIsBetter ? value <= threshold : value >= threshold;
    return (
        <div className={`p-4 rounded-lg border ${isPass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="text-sm font-medium text-gray-500">{label}</div>
            <div className={`text-2xl font-bold ${isPass ? 'text-green-700' : 'text-red-700'}`}>
                {value.toFixed(4)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
                Target: {lowerIsBetter ? '≤' : '≥'} {threshold}
            </div>
        </div>
    )
}
