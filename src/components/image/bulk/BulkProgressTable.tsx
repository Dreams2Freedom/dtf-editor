// src/components/image/bulk/BulkProgressTable.tsx
'use client';

import React from 'react';
import {
  Clock,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Ban,
  X,
} from 'lucide-react';
import {
  BulkImageItem,
  BulkImageStatus,
  PRINT_SIZE_PRESETS,
} from '@/types/bulkUpscale';

interface BulkProgressTableProps {
  items: BulkImageItem[];
  onCancelItem: (id: string) => void;
  onCancelAll: () => void;
  isProcessing: boolean;
}

const STATUS_CONFIG: Record<
  BulkImageStatus,
  { icon: React.ReactNode; label: string; color: string }
> = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    label: 'Pending',
    color: 'text-gray-400',
  },
  queued: {
    icon: <Clock className="w-4 h-4" />,
    label: 'Queued',
    color: 'text-gray-500',
  },
  uploading: {
    icon: <Upload className="w-4 h-4 animate-pulse" />,
    label: 'Uploading',
    color: 'text-blue-500',
  },
  processing: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: 'Processing',
    color: 'text-blue-600',
  },
  complete: {
    icon: <CheckCircle className="w-4 h-4" />,
    label: 'Complete',
    color: 'text-green-600',
  },
  failed: {
    icon: <XCircle className="w-4 h-4" />,
    label: 'Failed',
    color: 'text-red-600',
  },
  retrying: {
    icon: <RefreshCw className="w-4 h-4 animate-spin" />,
    label: 'Retrying',
    color: 'text-orange-500',
  },
  cancelled: {
    icon: <Ban className="w-4 h-4" />,
    label: 'Cancelled',
    color: 'text-gray-400',
  },
};

export function BulkProgressTable({
  items,
  onCancelItem,
  onCancelAll,
  isProcessing,
}: BulkProgressTableProps) {
  const completedCount = items.filter(i => i.status === 'complete').length;
  const totalCount = items.length;

  return (
    <div className="space-y-3">
      {/* Overall progress bar */}
      {/* [FIX I3] aria-live on summary, not individual bars */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700" aria-live="polite">
          {completedCount} of {totalCount} complete
        </span>
        {isProcessing && (
          <button
            onClick={onCancelAll}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Cancel Remaining
          </button>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Progress table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="py-3 px-2 w-16">Preview</th>
              <th className="py-3 px-2">Filename</th>
              <th className="py-3 px-2">Print Size</th>
              <th className="py-3 px-2">Mode</th>
              <th className="py-3 px-2">Status</th>
              <th className="py-3 px-2">Progress</th>
              <th className="py-3 px-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const statusCfg = STATUS_CONFIG[item.status];
              const preset = PRINT_SIZE_PRESETS[item.presetIndex];

              return (
                <tr
                  key={item.id}
                  className="border-b border-gray-100"
                  aria-label={`${item.filename}: ${statusCfg.label}`}
                >
                  <td className="py-2 px-2">
                    <img
                      src={item.previewUrl}
                      alt={item.filename}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </td>
                  <td className="py-2 px-2 text-gray-900">
                    <span className="truncate block max-w-[150px]">
                      {item.filename}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-600 text-xs">
                    {item.customWidthInches}" x {item.customHeightInches}"
                    <br />
                    {item.targetWidthPx} x {item.targetHeightPx} px
                  </td>
                  <td className="py-2 px-2 text-gray-600 text-xs capitalize">
                    {item.processingMode.replace('_', ' ')}
                  </td>
                  <td className="py-2 px-2">
                    <div
                      className={`flex items-center gap-1.5 ${statusCfg.color}`}
                    >
                      {statusCfg.icon}
                      <span className="text-xs font-medium">
                        {statusCfg.label}
                      </span>
                    </div>
                    {item.error && (
                      <p className="text-xs text-red-500 mt-1">{item.error}</p>
                    )}
                  </td>
                  <td className="py-2 px-2 w-32">
                    <div
                      className="w-full bg-gray-200 rounded-full h-1.5"
                      role="progressbar"
                      aria-valuenow={item.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-live="polite"
                    >
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          item.status === 'complete'
                            ? 'bg-green-500'
                            : item.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    {item.status === 'queued' && (
                      <button
                        onClick={() => onCancelItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
