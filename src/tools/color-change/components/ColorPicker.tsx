'use client';

import React from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { RGBColor } from '../types';
import { rgbToHex } from '../color-utils';

interface ColorPickerProps {
  sourceColor: RGBColor | null;
  targetColor: string;
  onTargetColorChange: (hex: string) => void;
}

export function ColorPicker({
  sourceColor,
  targetColor,
  onTargetColorChange,
}: ColorPickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
          Selected Color
        </div>
        {sourceColor ? (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div
              className="w-9 h-9 rounded-md border-2 border-white shadow-sm"
              style={{ backgroundColor: rgbToHex(sourceColor) }}
            />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {rgbToHex(sourceColor).toUpperCase()}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 p-3 bg-gray-50 rounded-lg border border-gray-200">
            Click on the image to select a color
          </p>
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
          Replace With
        </div>
        <div className="space-y-3">
          <HexColorPicker
            color={targetColor}
            onChange={onTargetColorChange}
            style={{ width: '100%' }}
          />
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-md border-2 border-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: targetColor }}
            />
            <div className="flex-1 flex items-center border border-gray-200 rounded-md px-3 py-1.5">
              <span className="text-gray-400 text-sm mr-1">#</span>
              <HexColorInput
                color={targetColor}
                onChange={onTargetColorChange}
                className="w-full text-sm text-gray-900 font-medium bg-transparent outline-none"
                prefixed={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
