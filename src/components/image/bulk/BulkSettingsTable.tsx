// src/components/image/bulk/BulkSettingsTable.tsx
'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ProcessingMode } from '@/services/deepImage';
import {
  BulkImageItem,
  PRINT_SIZE_PRESETS,
  computeTargetPixels,
  MIN_CUSTOM_INCHES,
  MAX_CUSTOM_INCHES,
} from '@/types/bulkUpscale';

interface BulkSettingsTableProps {
  items: BulkImageItem[];
  onUpdateItem: (id: string, updates: Partial<BulkImageItem>) => void;
  onRemoveItem: (id: string) => void;
}

const PROCESSING_MODES: { value: ProcessingMode; label: string }[] = [
  { value: 'auto_enhance', label: 'Auto Enhance' },
  { value: 'generative_upscale', label: 'Generative Upscale' },
  { value: 'basic_upscale', label: 'Basic Upscale' },
];

export function BulkSettingsTable({
  items,
  onUpdateItem,
  onRemoveItem,
}: BulkSettingsTableProps) {
  // "Apply to All" state
  const [applyAllPresetIndex, setApplyAllPresetIndex] = useState(0);
  const [applyAllMode, setApplyAllMode] =
    useState<ProcessingMode>('auto_enhance');
  const [applyAllCustomW, setApplyAllCustomW] = useState(0);
  const [applyAllCustomH, setApplyAllCustomH] = useState(0);
  // Which dimension the user is driving: 'width' or 'height'
  const [applyAllDrivenBy, setApplyAllDrivenBy] = useState<'width' | 'height'>(
    'width'
  );

  const handlePresetChange = (item: BulkImageItem, presetIndex: number) => {
    const preset = PRINT_SIZE_PRESETS[presetIndex];
    if (presetIndex === 0) {
      // Custom — clear dimensions, user will enter manually
      onUpdateItem(item.id, {
        presetIndex,
        customWidthInches: 0,
        customHeightInches: 0,
        targetWidthPx: 0,
        targetHeightPx: 0,
      });
    } else {
      const target = computeTargetPixels(
        preset.widthInches,
        preset.heightInches
      );
      onUpdateItem(item.id, {
        presetIndex,
        customWidthInches: preset.widthInches,
        customHeightInches: preset.heightInches,
        targetWidthPx: target.width,
        targetHeightPx: target.height,
      });
    }
  };

  const handleCustomDimension = (
    item: BulkImageItem,
    field: 'customWidthInches' | 'customHeightInches',
    value: number
  ) => {
    const clamped = Math.min(MAX_CUSTOM_INCHES, Math.max(0, value));
    const aspectRatio = item.originalWidth / item.originalHeight;
    const updates: Partial<BulkImageItem> = {};

    if (field === 'customWidthInches') {
      // User entered width — auto-calculate height from aspect ratio
      const autoHeight =
        clamped > 0 ? parseFloat((clamped / aspectRatio).toFixed(2)) : 0;
      updates.customWidthInches = clamped;
      updates.customHeightInches = autoHeight;

      if (clamped >= MIN_CUSTOM_INCHES) {
        const target = computeTargetPixels(clamped, autoHeight);
        updates.targetWidthPx = target.width;
        updates.targetHeightPx = target.height;
      }
    } else {
      // User entered height — auto-calculate width from aspect ratio
      const autoWidth =
        clamped > 0 ? parseFloat((clamped * aspectRatio).toFixed(2)) : 0;
      updates.customHeightInches = clamped;
      updates.customWidthInches = autoWidth;

      if (clamped >= MIN_CUSTOM_INCHES) {
        const target = computeTargetPixels(autoWidth, clamped);
        updates.targetWidthPx = target.width;
        updates.targetHeightPx = target.height;
      }
    }

    onUpdateItem(item.id, updates);
  };

  const applyToAll = () => {
    for (const item of items) {
      const aspectRatio = item.originalWidth / item.originalHeight;
      const updates: Partial<BulkImageItem> = {
        presetIndex: applyAllPresetIndex,
        processingMode: applyAllMode,
      };

      if (applyAllPresetIndex === 0) {
        // Custom — use the driven dimension and auto-calculate the other per image
        const drivenValue =
          applyAllDrivenBy === 'width' ? applyAllCustomW : applyAllCustomH;

        if (applyAllDrivenBy === 'width' && drivenValue >= MIN_CUSTOM_INCHES) {
          const autoH = parseFloat((drivenValue / aspectRatio).toFixed(2));
          updates.customWidthInches = drivenValue;
          updates.customHeightInches = autoH;
          const target = computeTargetPixels(drivenValue, autoH);
          updates.targetWidthPx = target.width;
          updates.targetHeightPx = target.height;
        } else if (
          applyAllDrivenBy === 'height' &&
          drivenValue >= MIN_CUSTOM_INCHES
        ) {
          const autoW = parseFloat((drivenValue * aspectRatio).toFixed(2));
          updates.customWidthInches = autoW;
          updates.customHeightInches = drivenValue;
          const target = computeTargetPixels(autoW, drivenValue);
          updates.targetWidthPx = target.width;
          updates.targetHeightPx = target.height;
        }
      } else {
        const preset = PRINT_SIZE_PRESETS[applyAllPresetIndex];
        updates.customWidthInches = preset.widthInches;
        updates.customHeightInches = preset.heightInches;
        const target = computeTargetPixels(
          preset.widthInches,
          preset.heightInches
        );
        updates.targetWidthPx = target.width;
        updates.targetHeightPx = target.height;
      }

      onUpdateItem(item.id, updates);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-600">
            <th className="py-3 px-2 w-16">Preview</th>
            <th className="py-3 px-2">Filename</th>
            <th className="py-3 px-2">Original Size</th>
            <th className="py-3 px-2">Print Size</th>
            <th className="py-3 px-2">Target Pixels</th>
            <th className="py-3 px-2">Mode</th>
            <th className="py-3 px-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {/* Apply to All row */}
          <tr className="border-b border-blue-100 bg-blue-50">
            <td
              className="py-2 px-2 text-xs font-medium text-blue-700"
              colSpan={2}
            >
              Apply to All
            </td>
            <td className="py-2 px-2"></td>
            <td className="py-2 px-2">
              <select
                value={applyAllPresetIndex}
                onChange={e => setApplyAllPresetIndex(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-xs"
              >
                {PRINT_SIZE_PRESETS.map((preset, i) => (
                  <option key={i} value={i}>
                    {preset.label}
                  </option>
                ))}
              </select>
              {applyAllPresetIndex === 0 && (
                <div className="mt-1 space-y-1">
                  <div className="flex gap-1 items-center">
                    <select
                      value={applyAllDrivenBy}
                      onChange={e =>
                        setApplyAllDrivenBy(
                          e.target.value as 'width' | 'height'
                        )
                      }
                      className="border rounded px-1 py-0.5 text-xs"
                    >
                      <option value="width">Width</option>
                      <option value="height">Height</option>
                    </select>
                    <input
                      type="number"
                      placeholder={
                        applyAllDrivenBy === 'width' ? 'W (in)' : 'H (in)'
                      }
                      min={MIN_CUSTOM_INCHES}
                      max={MAX_CUSTOM_INCHES}
                      value={
                        applyAllDrivenBy === 'width'
                          ? applyAllCustomW || ''
                          : applyAllCustomH || ''
                      }
                      onChange={e => {
                        if (applyAllDrivenBy === 'width') {
                          setApplyAllCustomW(Number(e.target.value));
                        } else {
                          setApplyAllCustomH(Number(e.target.value));
                        }
                      }}
                      className="w-20 border rounded px-1 py-0.5 text-xs"
                    />
                    <span className="text-xs text-gray-400">in</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Height auto-calculated per image aspect ratio
                  </p>
                </div>
              )}
            </td>
            <td className="py-2 px-2"></td>
            <td className="py-2 px-2">
              <select
                value={applyAllMode}
                onChange={e =>
                  setApplyAllMode(e.target.value as ProcessingMode)
                }
                className="w-full border rounded px-2 py-1 text-xs"
              >
                {PROCESSING_MODES.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </td>
            <td className="py-2 px-2">
              <button
                onClick={applyToAll}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </td>
          </tr>

          {/* Image rows */}
          {items.map(item => (
            <tr
              key={item.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-2 px-2">
                <img
                  src={item.previewUrl}
                  alt={item.filename}
                  className="w-12 h-12 object-cover rounded"
                />
              </td>
              <td className="py-2 px-2">
                <span className="text-gray-900 truncate block max-w-[150px]">
                  {item.filename}
                </span>
                <span className="text-xs text-gray-400">
                  {(item.fileSizeBytes / 1024 / 1024).toFixed(1)} MB
                </span>
              </td>
              <td className="py-2 px-2 text-gray-600">
                {item.originalWidth} x {item.originalHeight}
              </td>
              <td className="py-2 px-2">
                <select
                  value={item.presetIndex}
                  onChange={e =>
                    handlePresetChange(item, Number(e.target.value))
                  }
                  className="w-full border rounded px-2 py-1 text-xs"
                >
                  {PRINT_SIZE_PRESETS.map((preset, i) => (
                    <option key={i} value={i}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                {item.presetIndex === 0 && (
                  <div className="mt-1 space-y-1">
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-gray-500 w-5">W</span>
                      <input
                        type="number"
                        placeholder="Width"
                        min={MIN_CUSTOM_INCHES}
                        max={MAX_CUSTOM_INCHES}
                        step="0.1"
                        value={item.customWidthInches || ''}
                        onChange={e =>
                          handleCustomDimension(
                            item,
                            'customWidthInches',
                            Number(e.target.value)
                          )
                        }
                        className="w-20 border rounded px-1 py-0.5 text-xs"
                      />
                      <span className="text-xs text-gray-400">in</span>
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-gray-500 w-5">H</span>
                      <input
                        type="number"
                        placeholder="Height"
                        min={MIN_CUSTOM_INCHES}
                        max={MAX_CUSTOM_INCHES}
                        step="0.1"
                        value={item.customHeightInches || ''}
                        onChange={e =>
                          handleCustomDimension(
                            item,
                            'customHeightInches',
                            Number(e.target.value)
                          )
                        }
                        className="w-20 border rounded px-1 py-0.5 text-xs"
                      />
                      <span className="text-xs text-gray-400">in</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Enter one — the other auto-scales
                    </p>
                  </div>
                )}
              </td>
              <td className="py-2 px-2 text-gray-600 text-xs">
                {item.targetWidthPx > 0
                  ? `${item.targetWidthPx} x ${item.targetHeightPx}`
                  : '—'}
              </td>
              <td className="py-2 px-2">
                <select
                  value={item.processingMode}
                  onChange={e =>
                    onUpdateItem(item.id, {
                      processingMode: e.target.value as ProcessingMode,
                    })
                  }
                  className="w-full border rounded px-2 py-1 text-xs"
                >
                  {PROCESSING_MODES.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-2">
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
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
