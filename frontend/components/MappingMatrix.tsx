"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

// Constants
const MOCK_DATA: MappingReport = {};

// Types
type MappingStatus = "MATCH" | "UNKNOWN" | "PENDING";

interface MappingItem {
    omop_name?: string;
    omop_id?: number;
    domain?: string;
    confidence?: number;
    status: MappingStatus;
    details?: string;
}

interface MappingReport {
    [columnName: string]: MappingItem;
}

interface MappingMatrixProps {
    report?: MappingReport;
    className?: string;
    onSave?: (newMapping: MappingReport) => Promise<void>;
    isReviewMode?: boolean;
    isLoading?: boolean;
}

export function MappingMatrix({ report, className, isLoading = false, onSave, isReviewMode = false }: MappingMatrixProps) {
    const hasData = report && Object.keys(report).length > 0;
    const [data, setData] = useState<MappingReport>(hasData ? report! : ( isLoading ? {} : MOCK_DATA ));
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sync external report changes if not editing
    React.useEffect(() => {
        if (!isEditing && report) {
            setData(report);
        }
    }, [report, isEditing]);

    const columns = Object.keys(data);
    
    // Metrics
    const matchCount = columns.filter(c => data[c].status === "MATCH").length;
    const totalCount = columns.length;
    const coverage = totalCount > 0 ? (matchCount / totalCount) * 100 : 0;

    const handleFieldChange = (col: string, field: keyof MappingItem, value: any) => {
        setData(prev => ({
            ...prev,
            [col]: {
                ...prev[col],
                [field]: value,
                // If manually editing, force status to MATCH (assuming user knows what they are doing)
                // or keep as is? Let's auto-switch to MATCH if ID is provided.
                status: (field === 'omop_id' && value) ? "MATCH" : prev[col].status
            }
        }));
    };

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
            await onSave(data);
            setIsEditing(false);
        } catch (e) {
            console.error("Failed to save mapping", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className={`w-full ${className} ${isEditing ? 'ring-2 ring-indigo-500' : ''}`}>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCw className={`h-5 w-5 text-indigo-500 ${isLoading ? 'animate-pulse' : ''}`} />
                            OMOP Semantic Mapping
                            {isEditing && <Badge className="bg-yellow-100 text-yellow-800 ml-2">Editing Mode</Badge>}
                        </CardTitle>
                        <CardDescription>
                            Real-time standardization of clinical concepts
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-2xl font-bold text-indigo-600">
                                {matchCount}/{totalCount}
                            </div>
                            <p className="text-xs text-muted-foreground">Columns Mapped</p>
                        </div>
                        {onSave && (
                            <div className="flex gap-2">
                                {!isEditing ? (
                                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                                        Edit Mapping
                                    </Button>
                                ) : (
                                    <>
                                        <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm" disabled={isSaving}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleSave} size="sm" disabled={isSaving}>
                                            {isSaving ? "Saving..." : (isReviewMode ? "Confirm & Finish" : "Save & Approve")}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-2">
                    <Progress value={coverage} className="h-2" />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                        <p>Analysing schema against 6M+ medical concepts...</p>
                    </div>
                ) : (
                    <div className="rounded-md border max-h-[600px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">Raw Column</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>OMOP Concept</TableHead>
                                    <TableHead>Confidence</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {columns.map((col) => {
                                    const item = data[col];
                                    const isMatch = item.status === "MATCH";
                                    
                                    return (
                                        <TableRow key={col}>
                                            <TableCell className="font-medium text-foreground">
                                                {col}
                                            </TableCell>
                                            <TableCell>
                                                {isMatch ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Mapped
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-muted-foreground gap-1">
                                                        <HelpCircle className="h-3 w-3" />
                                                        Unknown
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        <input 
                                                            className="w-full text-sm border rounded px-2 py-1"
                                                            placeholder="Concept Name"
                                                            value={item.omop_name || ''}
                                                            onChange={(e) => handleFieldChange(col, 'omop_name', e.target.value)}
                                                        />
                                                        <div className="flex gap-2">
                                                            <input 
                                                                className="w-24 text-xs border rounded px-2 py-1"
                                                                placeholder="ID"
                                                                type="number"
                                                                value={item.omop_id || ''}
                                                                onChange={(e) => handleFieldChange(col, 'omop_id', parseInt(e.target.value))}
                                                            />
                                                            <input 
                                                                className="w-24 text-xs border rounded px-2 py-1"
                                                                placeholder="Domain"
                                                                value={item.domain || ''}
                                                                onChange={(e) => handleFieldChange(col, 'domain', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    isMatch ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm">{item.omop_name}</span>
                                                            <span className="text-xs text-muted-foreground">ID: {item.omop_id} • {item.domain}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs italic text-muted-foreground">
                                                            {item.details || "No standard concept found"}
                                                        </span>
                                                    )
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${
                                                        (item.confidence || 0) > 0.8 ? "bg-emerald-500" : 
                                                        (item.confidence || 0) > 0.5 ? "bg-yellow-500" : "bg-gray-300"
                                                    }`} />
                                                    <span className="text-xs tabular-nums">
                                                        {Math.round((item.confidence || 0) * 100)}%
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {columns.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No columns analyzed yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
