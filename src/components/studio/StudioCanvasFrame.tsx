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
 * Two modes:
 *   - Controlled (legacy, default): the consuming tool owns `zoom` and the
 *     +/- handlers, and applies its own transform to `children`. Behaviour
 *     is exactly as before this component gained a viewport.
 *   - Interactive (`interactive`): the frame OWNS zoom + pan and wires
 *     wheel-to-zoom (toward the cursor), click-drag pan, and touch pinch.
 *     It applies the transform itself to `children`, so the tool just hands
 *     over its raw image/canvas. Fixed chrome that must NOT pan/zoom with the
 *     content (e.g. a processing spinner) goes in the `overlay` slot.
 *     This is what gives static-image tools real viewport controls inside the
 *     embedded (cross-origin) Studio, where a partner host cannot add them.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.25;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

interface StudioCanvasFrameProps {
  /** Optional toolbar rendered in the top-left of the canvas
   *  (where BG Removal's Cutout/Preview/Original pill sits). */
  topBar?: ReactNode;
  /**
   * Controlled-mode zoom factor (1 = 100%). Ignored when `interactive` is set
   * (the frame owns zoom internally then). Optional so interactive callers can
   * omit it.
   */
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFit?: () => void;
  /**
   * Self-managed viewport: the frame owns zoom + pan and wires wheel / drag /
   * pinch, applying the transform to `children` itself. Use for tools that
   * render a static image/canvas with no pointer interaction of their own.
   */
  interactive?: boolean;
  /**
   * Fixed overlay rendered above the (panned/zoomed) content but NOT
   * transformed with it — e.g. a processing spinner that should stay put.
   * Only meaningful in interactive mode; in controlled mode put overlays in
   * `children` as before.
   */
  overlay?: ReactNode;
  /** Inner canvas content — typically a <canvas> or <img> plus overlays. */
  children: ReactNode;
  /** Optional className applied to the outer scroll container. */
  className?: string;
}

export function StudioCanvasFrame({
  topBar,
  zoom: controlledZoom,
  onZoomIn,
  onZoomOut,
  onFit,
  interactive = false,
  overlay,
  children,
  className,
}: StudioCanvasFrameProps) {
  // ---- Interactive viewport state (only used when `interactive`) ----------
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Mirrors so wheel/pointer handlers read fresh values without stale closures.
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  // Active pointers for drag (1) / pinch (2) gestures.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStartRef = useRef<{
    px: number;
    py: number;
    panX: number;
    panY: number;
  } | null>(null);
  const pinchStartRef = useRef<{
    dist: number;
    zoom: number;
    // gesture midpoint relative to the surface top-left
    midX: number;
    midY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const applyViewport = useCallback(
    (nextZoom: number, nextPan: { x: number; y: number }) => {
      zoomRef.current = nextZoom;
      panRef.current = nextPan;
      setZoom(nextZoom);
      setPan(nextPan);
    },
    []
  );

  // Zoom around a surface-local point (keeps that point visually fixed). With
  // transformOrigin=center and transform=translate(pan) scale(zoom), a point at
  // surface offset S maps such that pan' = pan + d*(1 - ratio), where
  // d = S - center - pan and ratio = zoom'/zoom.
  const zoomAround = useCallback(
    (nextZoomRaw: number, sx: number, sy: number) => {
      const surface = surfaceRef.current;
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const prevZoom = zoomRef.current;
      const nextZoom = clampZoom(nextZoomRaw);
      if (nextZoom === prevZoom) return;
      const ratio = nextZoom / prevZoom;
      const p = panRef.current;
      const dx = sx - cx - p.x;
      const dy = sy - cy - p.y;
      applyViewport(nextZoom, {
        x: p.x + dx * (1 - ratio),
        y: p.y + dy * (1 - ratio),
      });
    },
    [applyViewport]
  );

  // Zoom toward the surface center — used by the +/- buttons.
  const zoomAtCenter = useCallback(
    (factor: number) => {
      const surface = surfaceRef.current;
      if (!surface) {
        applyViewport(clampZoom(zoomRef.current * factor), panRef.current);
        return;
      }
      const rect = surface.getBoundingClientRect();
      zoomAround(zoomRef.current * factor, rect.width / 2, rect.height / 2);
    },
    [applyViewport, zoomAround]
  );

  const resetViewport = useCallback(() => {
    applyViewport(1, { x: 0, y: 0 });
  }, [applyViewport]);

  // Native non-passive wheel listener so we can preventDefault the page scroll
  // (React's onWheel is passive and cannot). Only attached in interactive mode.
  useEffect(() => {
    if (!interactive) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = surface.getBoundingClientRect();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomAround(
        zoomRef.current * factor,
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    };
    surface.addEventListener('wheel', onWheel, { passive: false });
    return () => surface.removeEventListener('wheel', onWheel);
  }, [interactive, zoomAround]);

  const midpointOfPointers = () => {
    const pts = Array.from(pointersRef.current.values());
    return {
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2,
    };
  };
  const distanceOfPointers = () => {
    const pts = Array.from(pointersRef.current.values());
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    pointersRef.current.set(e.pointerId, { x: sx, y: sy });
    surface.setPointerCapture?.(e.pointerId);

    if (pointersRef.current.size === 2) {
      // Begin pinch — freeze drag.
      dragStartRef.current = null;
      setIsDragging(false);
      const mid = midpointOfPointers();
      pinchStartRef.current = {
        dist: distanceOfPointers() || 1,
        zoom: zoomRef.current,
        midX: mid.x,
        midY: mid.y,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    } else if (pointersRef.current.size === 1) {
      dragStartRef.current = {
        px: sx,
        py: sy,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      setIsDragging(true);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const surface = surfaceRef.current;
      if (!surface) return;
      if (!pointersRef.current.has(e.pointerId)) return;
      const rect = surface.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      pointersRef.current.set(e.pointerId, { x: sx, y: sy });

      if (pointersRef.current.size === 2 && pinchStartRef.current) {
        const start = pinchStartRef.current;
        const dist = distanceOfPointers() || 1;
        zoomAround(start.zoom * (dist / start.dist), start.midX, start.midY);
        return;
      }
      if (dragStartRef.current) {
        const d = dragStartRef.current;
        applyViewport(zoomRef.current, {
          x: d.panX + (sx - d.px),
          y: d.panY + (sy - d.py),
        });
      }
    },
    [applyViewport, zoomAround]
  );

  const endPointer = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    surfaceRef.current?.releasePointerCapture?.(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) {
      dragStartRef.current = null;
      setIsDragging(false);
    }
  }, []);

  // ---- Zoom-control wiring: internal in interactive mode, forwarded otherwise.
  const displayZoom = interactive ? zoom : (controlledZoom ?? 1);
  const zoomInHandler = interactive ? () => zoomAtCenter(ZOOM_STEP) : onZoomIn;
  const zoomOutHandler = interactive
    ? () => zoomAtCenter(1 / ZOOM_STEP)
    : onZoomOut;
  const fitHandler = interactive ? resetViewport : onFit;

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
      {interactive ? (
        // Interactive: the surface fills the frame and captures wheel/pointer.
        <div
          ref={surfaceRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onDoubleClick={resetViewport}
          className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ touchAction: 'none' }}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              lineHeight: 0,
              willChange: 'transform',
            }}
          >
            {children}
          </div>

          {topBar && (
            <div className="absolute top-2 left-2 z-10 flex rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200 overflow-hidden text-xs font-medium">
              {topBar}
            </div>
          )}

          <div className="absolute top-2 right-2 z-10 flex items-center rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={zoomOutHandler}
              className="px-2.5 py-1 text-gray-700 hover:bg-gray-50"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-gray-500 tabular-nums select-none">
              {Math.round(displayZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomInHandler}
              className="px-2.5 py-1 text-gray-700 hover:bg-gray-50"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={fitHandler}
              className="flex items-center gap-1 px-2 py-1 text-gray-700 hover:bg-gray-50 border-l border-gray-200"
              title="Fit image"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Fit
            </button>
          </div>

          {/* Fixed overlay — above content, not panned/zoomed. */}
          {overlay}
        </div>
      ) : (
        // Controlled (legacy): unchanged behaviour.
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
              {Math.round((controlledZoom ?? 1) * 100)}%
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
      )}
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
