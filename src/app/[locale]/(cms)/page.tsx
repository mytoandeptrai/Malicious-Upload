'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/libs/utils';
import axios from 'axios';
import { AlertCircle, CheckCircle, FileImage, Loader2, Shield, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  virusScanResult?: string;
  imageUrl?: string;
  error?: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    } else {
      setUploadResult({
        success: false,
        error: 'Please select a valid image file',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const uploadToGoogleDrive = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post('/api/upload-file', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadResult(response.data);
    } catch (error: any) {
      setUploadResult({
        success: false,
        error: error.response.data?.error,
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    if (uploading) return;

    setSelectedFile(null);
    setUploadResult(null);
    setUploading(false);
    setUploadProgress(0);
    setDragActive(false);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <div className='mx-auto max-w-2xl space-y-6'>
        {/* Header */}
        <div className='py-8 text-center'>
          <div className='mb-4 inline-flex items-center gap-2'>
            <Shield className='h-8 w-8 text-blue-600' />
            <h1 className='font-bold text-3xl text-gray-900'>Secure Image Upload</h1>
          </div>
          <p className='mx-auto max-w-md text-gray-600'>
            Upload your images to Google Drive with automatic virus scanning for maximum security
          </p>
        </div>

        {/* Upload Card */}
        <Card className='border-0 bg-white/80 shadow-lg backdrop-blur-sm'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileImage className='h-5 w-5' />
              Upload Image
            </CardTitle>
            <CardDescription>Select an image file to upload to Google Drive with virus scanning</CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            {/* File Drop Zone */}
            <div
              className={cn(
                'rounded-lg border-2 border-dashed p-8 text-center transition-all duration-200',
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
                selectedFile && 'border-green-500 bg-green-50'
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input ref={fileInputRef} type='file' onChange={handleFileChange} className='hidden' />
              {selectedFile ? (
                <div className='relative space-y-2'>
                  <Button
                    onClick={handleClear}
                    size='icon'
                    className='-right-2 -top-2 absolute z-10 h-6 w-6 cursor-pointer rounded-full hover:bg-gray-400'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                  <CheckCircle className='mx-auto h-12 w-12 text-green-500' />
                  <p className='font-medium text-green-700'>{selectedFile.name}</p>
                  <p className='text-gray-500 text-sm'>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className='space-y-2'>
                  <Upload className='mx-auto h-12 w-12 text-gray-400' />
                  <p className='text-gray-600'>
                    Drag and drop your image here, or{' '}
                    <button onClick={openFileDialog} className='font-medium text-blue-600 hover:text-blue-700'>
                      browse files
                    </button>
                  </p>
                  <p className='text-gray-400 text-sm'>Supports JPG, PNG, GIF, WebP (Max 10MB)</p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='font-medium text-gray-700 text-sm'>Uploading...</span>
                  <span className='text-gray-500 text-sm'>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className='h-2' />
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={uploadToGoogleDrive}
              disabled={!selectedFile || uploading}
              className='h-12 w-full font-medium text-base'
              size='lg'
            >
              {uploading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Uploading & Scanning...
                </>
              ) : (
                <>
                  <Shield className='mr-2 h-4 w-4' />
                  Upload to Google Drive
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {uploadResult && (
          <Card className='border-0 bg-white/80 shadow-lg backdrop-blur-sm'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                {uploadResult.success ? (
                  <CheckCircle className='h-5 w-5 text-green-600' />
                ) : (
                  <AlertCircle className='h-5 w-5 text-red-600' />
                )}
                Upload Result
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {uploadResult.success ? (
                <>
                  <Alert className='border-green-200 bg-green-50'>
                    <Shield className='h-4 w-4 text-green-600' />
                    <AlertDescription className='text-green-800'>
                      <strong>Image file scanned OK, no virus detected!</strong>
                      Your file has been safely uploaded to Google Drive.
                    </AlertDescription>
                  </Alert>

                  <div className='space-y-2'>
                    <div className='flex items-center gap-x-2'>
                      <span className='font-medium text-sm'>File Name:</span>
                      <span className='text-gray-600 text-sm'>{uploadResult.fileName}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium text-sm'>Status:</span>
                      <Badge variant='outline' className='border-green-200 bg-green-50 text-green-700'>
                        <CheckCircle className='mr-1 h-3 w-3' />
                        Virus-free
                      </Badge>
                    </div>
                  </div>
                </>
              ) : (
                <Alert variant='destructive'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>
                    <strong>Upload failed:</strong> {uploadResult.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <Card className='border-0 bg-white/60 shadow-lg backdrop-blur-sm'>
          <CardContent className='pt-6'>
            <div className='space-y-2 text-center'>
              <p className='text-gray-600 text-sm'>
                🔒 All uploads are secured with Google Drive's built-in virus scanning
              </p>
              <p className='text-gray-500 text-xs'>
                Files are automatically scanned for malware and viruses before storage
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
