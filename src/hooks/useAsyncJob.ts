import { useState, useEffect, useCallback, useRef } from 'react';

interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
  result?: any;
  createdAt?: string;
  completedAt?: string;
}

interface UseAsyncJobOptions {
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
  pollInterval?: number;
  maxRetries?: number;
}

export function useAsyncJob(options: UseAsyncJobOptions = {}) {
  const {
    onComplete,
    onError,
    onProgress,
    pollInterval = 2000, // Poll every 2 seconds by default
    maxRetries = 3,
  } = options;

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Check job status
  const checkJobStatus = useCallback(
    async (id: string): Promise<JobStatus | null> => {
      try {
        const response = await fetch(`/api/jobs/${id}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to get job status');
        }

        const data = await response.json();
        return data.job;
      } catch (error) {
        console.error('Failed to check job status:', error);

        // Retry logic with exponential backoff
        if (retryCount < maxRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setRetryCount(prev => prev + 1);

          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return checkJobStatus(id);
        }

        return null;
      }
    },
    [retryCount, maxRetries]
  );

  // Start polling for a job
  const startPolling = useCallback((id: string) => {
    setJobId(id);
    setIsPolling(true);
    setRetryCount(0);
    isPollingRef.current = true;
  }, []);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    isPollingRef.current = false;

    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  // Cancel job
  const cancelJob = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        stopPolling();
        setJobStatus(prev => (prev ? { ...prev, status: 'cancelled' } : null));
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  }, [jobId, stopPolling]);

  // Polling effect
  useEffect(() => {
    if (!jobId || !isPolling) return;

    const poll = async () => {
      const status = await checkJobStatus(jobId);

      if (!status || !isPollingRef.current) return;

      setJobStatus(status);

      // Call progress callback
      if (onProgress && status.progress !== undefined) {
        onProgress(status.progress);
      }

      // Check if job is complete
      if (status.status === 'completed') {
        stopPolling();
        if (onComplete && status.result) {
          onComplete(status.result);
        }
      } else if (status.status === 'failed') {
        stopPolling();
        if (onError) {
          onError(status.error || 'Processing failed');
        }
      } else if (status.status === 'cancelled') {
        stopPolling();
      } else {
        // Continue polling with adaptive interval
        let nextPollInterval = pollInterval;

        // Slow down polling after a while to reduce server load
        const jobAge = status.createdAt
          ? Date.now() - new Date(status.createdAt).getTime()
          : 0;

        if (jobAge > 30000) {
          // After 30 seconds
          nextPollInterval = 5000; // Poll every 5 seconds
        }
        if (jobAge > 60000) {
          // After 1 minute
          nextPollInterval = 10000; // Poll every 10 seconds
        }

        pollTimeoutRef.current = setTimeout(poll, nextPollInterval);
      }
    };

    poll();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [
    jobId,
    isPolling,
    pollInterval,
    checkJobStatus,
    onComplete,
    onError,
    onProgress,
    stopPolling,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    jobId,
    jobStatus,
    isPolling,
    startPolling,
    stopPolling,
    cancelJob,
  };
}
