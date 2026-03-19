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
  return (
    <div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
        History ({changes.length})
      </div>
      <div className="flex flex-col gap-1">
        {changes.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 p-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg group transition-colors"
          >
            <div
              className="w-5 h-5 rounded shadow-inner border border-white/10 flex-shrink-0"
              style={{ backgroundColor: rgbToHex(entry.sourceColor) }}
            />
            <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <div
              className="w-5 h-5 rounded shadow-inner border border-white/10 flex-shrink-0"
              style={{ backgroundColor: rgbToHex(entry.targetColor) }}
            />
            <span className="text-[10px] text-gray-500 flex-1 font-mono">
              #{index + 1}
            </span>
            <button
              onClick={() => onRemoveChange(entry.id)}
              className="p-0.5 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              title="Remove this change"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
