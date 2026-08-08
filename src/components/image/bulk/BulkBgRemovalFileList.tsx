'use client';

import React from 'react';
import { X } from 'lucide-react';
import { BulkBgRemovalItem } from '@/types/bulkBgRemoval';
import { formatFileSize } from '@/lib/utils';

interface BulkBgRemovalFileListProps {
  items: BulkBgRemovalItem[];
  onRemoveItem: (id: string) => void;
}

export function BulkBgRemovalFileList({
  items,
  onRemoveItem,
}: BulkBgRemovalFileListProps) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-600">
            <th className="py-3 px-2 w-16">Preview</th>
            <th className="py-3 px-2">Filename</th>
            <th className="py-3 px-2">Size</th>
            <th className="py-3 px-2">Dimensions</th>
            <th className="py-3 px-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2 px-2">
                <img
                  src={item.previewUrl}
                  alt={item.filename}
                  className="w-12 h-12 object-cover rounded"
                />
              </td>
              <td className="py-2 px-2 text-gray-900">
                <span className="truncate block max-w-[200px]">
                  {item.filename}
                </span>
              </td>
              <td className="py-2 px-2 text-gray-600 text-xs">
                {formatFileSize(item.fileSizeBytes)}
              </td>
              <td className="py-2 px-2 text-gray-600 text-xs">
                {item.originalWidth} x {item.originalHeight} px
              </td>
              <td className="py-2 px-2">
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
