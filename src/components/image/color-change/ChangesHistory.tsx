'use client';

import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { ColorChangeEntry } from '@/types/colorChange';
import { rgbToHex } from '@/lib/color-utils';

interface ChangesHistoryProps {
  changes: ColorChangeEntry[];
  onRemoveChange: (id: string) => void;
}

export function ChangesHistory({
  changes,
  onRemoveChange,
}: ChangesHistoryProps) {
  if (changes.length === 0) {
    return (
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
          Changes
        </div>
        <p className="text-sm text-gray-400">No changes yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
        Changes ({changes.length})
      </div>
      <div className="flex flex-col gap-1.5">
        {changes.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200"
          >
            <div
              className="w-5 h-5 rounded flex-shrink-0"
              style={{ backgroundColor: rgbToHex(entry.sourceColor) }}
            />
            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <div
              className="w-5 h-5 rounded flex-shrink-0"
              style={{ backgroundColor: rgbToHex(entry.targetColor) }}
            />
            <span className="text-xs text-gray-500 flex-1">
              Change {index + 1}
            </span>
            <button
              onClick={() => onRemoveChange(entry.id)}
              className="p-0.5 text-gray-400 hover:text-red-500"
              title="Remove this change"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
