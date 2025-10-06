'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  X,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { cn } from '@/utils/cn';

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  uploadProgress?: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface ImageUploadProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
}

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Vercel Pro)
const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];

export function ImageUpload({
  onImagesUploaded,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  className,
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      return `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${(maxFileSize / 1024 / 1024).toFixed(2)}MB`;
    }

    return null;
  };

  const getImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const processFiles = useCallback(
    async (files: File[]) => {
      const newImages: UploadedImage[] = [];

      for (const file of files) {
        const error = validateFile(file);
        if (error) {
          newImages.push({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'error',
            error,
          });
          continue;
        }

        try {
          const dimensions = await getImageDimensions(file);
          newImages.push({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            type: file.type,
            width: dimensions.width,
            height: dimensions.height,
            status: 'pending',
          });
        } catch (error) {
          newImages.push({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'error',
            error: 'Failed to process image',
          });
        }
      }

      setUploadedImages(prev => [...prev, ...newImages]);
      return newImages;
    },
    [acceptedTypes, maxFileSize]
  );

  // Notify parent when uploadedImages changes
  useEffect(() => {
    if (uploadedImages.length > 0) {
      onImagesUploaded(uploadedImages);
    }
  }, [uploadedImages, onImagesUploaded]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (uploadedImages.length + acceptedFiles.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      processFiles(acceptedFiles);
    },
    [uploadedImages.length, maxFiles, processFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    multiple: true,
  });

  const removeImage = (id: string) => {
    setUploadedImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadedImage['status']) => {
    switch (status) {
      case 'pending':
        return <ImageIcon className="w-4 h-4 text-gray-400" />;
      case 'uploading':
        return <Loading size="sm" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: UploadedImage['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'uploading':
        return <Badge variant="info">Uploading</Badge>;
      case 'success':
        return <Badge variant="success">Success</Badge>;
      case 'error':
        return <Badge variant="error">Error</Badge>;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop images here' : 'Upload Images'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Drag & drop images here, or click to select files
            </p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Supported formats: {acceptedTypes.join(', ')}</p>
              <p>Max file size: {formatFileSize(maxFileSize)}</p>
              <p>Max files: {maxFiles}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Uploaded Images ({uploadedImages.length}/{maxFiles})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedImages.map(image => (
                <div key={image.id} className="border rounded-lg p-4 space-y-3">
                  {/* Image Preview */}
                  <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Image Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {image.name}
                      </span>
                      {getStatusIcon(image.status)}
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Size: {formatFileSize(image.size)}</p>
                      {image.width && image.height && (
                        <p>
                          Dimensions: {image.width} × {image.height}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {getStatusBadge(image.status)}
                      {image.error && (
                        <p className="text-xs text-red-500">{image.error}</p>
                      )}
                    </div>

                    {/* Upload Progress */}
                    {image.status === 'uploading' &&
                      image.uploadProgress !== undefined && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${image.uploadProgress}%` }}
                          />
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
