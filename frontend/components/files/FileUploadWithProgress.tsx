"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadWithProgressProps {
  onUpload: (file: File) => Promise<void>;
  accept?: Record<string, string[]>;
  maxSize?: number;
  className?: string;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function FileUploadWithProgress({ 
  onUpload, 
  accept = { 'text/csv': ['.csv'] },
  maxSize = 10 * 1024 * 1024, // 10MB
  className = ''
}: FileUploadWithProgressProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    
    setUploadFiles(prev => [...prev, ...newFiles]);
    
    // Start uploading each file
    newFiles.forEach(uploadFile => {
      uploadFileWithProgress(uploadFile);
    });
  }, []);

  const uploadFileWithProgress = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => 
        prev.map(f => 
          f.file === uploadFile.file 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => 
          prev.map(f => 
            f.file === uploadFile.file && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + Math.random() * 20, 90) }
              : f
          )
        );
      }, 200);

      await onUpload(uploadFile.file);

      clearInterval(progressInterval);
      
      setUploadFiles(prev => 
        prev.map(f => 
          f.file === uploadFile.file 
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      );

      // Remove success files after 3 seconds
      setTimeout(() => {
        setUploadFiles(prev => 
          prev.filter(f => f.file !== uploadFile.file)
        );
      }, 3000);

    } catch (error) {
      setUploadFiles(prev => 
        prev.map(f => 
          f.file === uploadFile.file 
            ? { 
                ...f, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : f
        )
      );
    }
  };

  const removeFile = (file: File) => {
    setUploadFiles(prev => prev.filter(f => f.file !== file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: true
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Upload className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to select files
            </p>
            <p className="text-xs text-gray-400">
              CSV files up to {formatFileSize(maxSize)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          {uploadFiles.map((uploadFile, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(uploadFile.status)}
                    <span className="text-sm font-medium truncate">
                      {uploadFile.file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({formatFileSize(uploadFile.file.size)})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {uploadFile.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.file)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {uploadFile.status === 'success' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.file)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {uploadFile.status === 'uploading' && (
                  <div className="space-y-2">
                    <Progress value={uploadFile.progress} className="w-full" />
                    <p className="text-xs text-gray-500 text-center">
                      {Math.round(uploadFile.progress)}% uploaded
                      {uploadFile.progress > 80 && " - Mapping OMOP Concepts..."}
                    </p>
                  </div>
                )}

                {uploadFile.status === 'error' && (
                  <p className="text-xs text-red-600 mt-2">
                    Error: {uploadFile.error}
                  </p>
                )}

                {uploadFile.status === 'success' && (
                  <p className="text-xs text-green-600 mt-2">
                    Upload completed successfully!
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
