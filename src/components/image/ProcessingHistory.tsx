'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Download, Clock, AlertCircle, CheckCircle, Coins } from 'lucide-react';
import { ProcessingJob } from '@/services/imageProcessing';
import { cache, cacheKeys } from '@/lib/cache';
import { formatProcessingTime } from '@/lib/utils';

interface ProcessingHistoryProps {
  limit?: number;
}

export function ProcessingHistory({ limit = 20 }: ProcessingHistoryProps) {
  const [history, setHistory] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [limit]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheKey = cacheKeys.processingHistory('current_user', limit);
      const cached = cache.get<ProcessingJob[]>(cacheKey);

      if (cached) {
        setHistory(cached);
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/process?limit=${limit}`, {
        credentials: 'include', // Include cookies for authentication
      });
      const result = await response.json();

      if (result.success) {
        setHistory(result.data);
        // Cache for 2 minutes
        cache.set(cacheKey, result.data, 2 * 60 * 1000);
      } else {
        setError(result.error || 'Failed to fetch processing history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download image');
    }
  };

  const formatOperation = (operation: string) => {
    switch (operation) {
      case 'upscale':
        return 'Image Upscaling';
      case 'background-removal':
        return 'Background Removal';
      case 'vectorization':
        return 'Image Vectorization';
      case 'ai-generation':
        return 'AI Generation';
      default:
        return operation.charAt(0).toUpperCase() + operation.slice(1);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchHistory} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing History</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No processing history yet</p>
            <p className="text-sm text-gray-500">
              Process your first image to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map(job => (
              <div
                key={job.id}
                className="border rounded-lg p-4 flex items-center gap-4"
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">{getStatusIcon(job.status)}</div>

                {/* Image Previews */}
                <div className="flex gap-3">
                  {job.originalImageUrl && (
                    <OptimizedImage
                      src={job.originalImageUrl}
                      alt="Original"
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded border"
                      quality={75}
                    />
                  )}
                  {job.processedImageUrl && job.status === 'completed' && (
                    <OptimizedImage
                      src={job.processedImageUrl}
                      alt="Processed"
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded border border-green-300"
                      quality={75}
                    />
                  )}
                </div>

                {/* Job Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">
                      {formatOperation(job.operation)}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : job.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      {job.creditsUsed} credits
                    </span>
                    <span>
                      {job.createdAt.toLocaleDateString()}{' '}
                      {job.createdAt.toLocaleTimeString()}
                    </span>
                  </div>

                  {job.error && (
                    <p className="text-sm text-red-600 mt-1">{job.error}</p>
                  )}
                </div>

                {/* Actions */}
                {job.processedImageUrl && job.status === 'completed' && (
                  <div className="flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadImage(
                          job.processedImageUrl!,
                          `processed_${job.operation}_${job.id}.jpg`
                        )
                      }
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
