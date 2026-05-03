'use client';

/**
 * Shared Studio canvas frame (Phase 2.2).
 *
 * Visual chrome reused by every tool whose Panel doesn't own its own
 * canvas (Upscale, Vectorize, Color Change). Provides:
 *
 *   - Checkered transparent background.
 *   - Top-left slot for tool-specific toolbars (view-mode pill,
 *     Select/Lasso/Pan toggle, etc.).
 *   - Top-right zoom controls pill (always visible).
 *   - Inner content area where the tool puts its <canvas>/<img>/overlays.
 *
 * Pulled from the BG Removal Panel's canvas wrapper so all tools render
 * identical chrome — the user perceives the canvas as sticky across
 * tool switches (Photoshop / Canva metaphor).
 *
 * NOTE: Zoom + pan state still lives in the consuming tool because each
 * tool may need to know zoom for cursor sizing or pointer math. Frame
 * just renders the controls and forwards click handlers.
 */

import type { ReactNode } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface StudioCanvasFrameProps {
  /** Optional toolbar rendered in the top-left of the canvas
   *  (where BG Removal's Cutout/Preview/Original pill sits). */
  topBar?: ReactNode;
  /** Current zoom factor (1 = 100%). */
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  /** Inner canvas content — typically a <canvas> or <img> plus overlays. */
  children: ReactNode;
  /** Optional className applied to the outer scroll container. */
  className?: string;
}

export function StudioCanvasFrame({
  topBar,
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  children,
  className,
}: StudioCanvasFrameProps) {
  return (
    <div
      className={`flex-1 flex items-center justify-center min-h-[300px] overflow-hidden p-4 ${className ?? ''}`}
      style={{
        backgroundColor: '#ffffff',
        backgroundImage:
          'repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="relative">
        {children}

        {topBar && (
          <div className="absolute top-2 left-2 z-10 flex rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200 overflow-hidden text-xs font-medium">
            {topBar}
          </div>
        )}

        <div className="absolute top-2 right-2 z-10 flex items-center rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200 overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={onZoomOut}
            className="px-2.5 py-1 text-gray-700 hover:bg-gray-50"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-gray-500 tabular-nums select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="px-2.5 py-1 text-gray-700 hover:bg-gray-50"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onFit}
            className="flex items-center gap-1 px-2 py-1 text-gray-700 hover:bg-gray-50 border-l border-gray-200"
            title="Fit image"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Fit
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Pulsing "processing" overlay for tools that hit an external API
 * (Upscale, Vectorize). Renders a translucent gradient + spinner over
 * the canvas image while a request is in flight.
 */
export function CanvasProcessingOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm bg-white/40 rounded animate-pulse">
      <div className="bg-white/90 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-gray-800">
        <span className="inline-block w-3 h-3 rounded-full bg-blue-500 animate-ping" />
        {label}
      </div>
    </div>
  );
}
