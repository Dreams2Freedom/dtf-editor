'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Undo2, Redo2, RotateCcw } from 'lucide-react';
import type { ToolMode } from '@/lib/sam2/types';

interface EditorToolbarProps {
  toolMode: ToolMode;
  onToolModeChange: (mode: ToolMode) => void;
  featherRadius: number;
  onFeatherChange: (radius: number) => void;
  onUndo: () => void;
  canUndo: boolean;
  onReset: () => void;
  disabled?: boolean;
}

export function EditorToolbar({
  toolMode,
  onToolModeChange,
  featherRadius,
  onFeatherChange,
  onUndo,
  canUndo,
  onReset,
  disabled = false,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3">
      {/* Tool Mode Buttons */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onToolModeChange('keep')}
          disabled={disabled}
          className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            toolMode === 'keep'
              ? 'bg-green-500 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-green-50 border border-gray-200'
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              toolMode === 'keep' ? 'bg-white' : 'bg-green-500'
            }`}
          />
          Keep
        </button>

        <button
          type="button"
          onClick={() => onToolModeChange('remove')}
          disabled={disabled}
          className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            toolMode === 'remove'
              ? 'bg-red-500 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-red-50 border border-gray-200'
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              toolMode === 'remove' ? 'bg-white' : 'bg-red-500'
            }`}
          />
          Remove
        </button>
      </div>

      {/* Separator */}
      <div className="mx-1 h-8 w-px bg-gray-200" />

      {/* Undo / Reset */}
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo || disabled}
          title="Undo last mark"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          title="Reset all marks"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Separator */}
      <div className="mx-1 h-8 w-px bg-gray-200" />

      {/* Feather Slider */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">
          Edge softness
        </label>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={featherRadius}
          onChange={e => onFeatherChange(Number(e.target.value))}
          disabled={disabled}
          className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary-500 disabled:cursor-default"
        />
        <span className="text-xs text-gray-400 w-4 text-center">
          {featherRadius}
        </span>
      </div>
    </div>
  );
}
