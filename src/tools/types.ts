/**
 * Studio Plugin Contract (Phase 2.0)
 *
 * Each tool inside `src/tools/<tool-id>/` exports a `StudioTool` descriptor
 * conforming to this contract. The Studio shell (src/app/studio/client.tsx)
 * mounts the active tool's Panel and hands it the current working image
 * plus an onApply callback. Tools never call save/credit/router APIs
 * directly — they only emit results via onApply, and the Studio decides
 * what to do (chain into the next tool, save, reset, etc.).
 *
 * IMPORTANT: tools MUST NOT import from another tool's folder. Cross-tool
 * sharing is only allowed via top-level dirs (src/components/, src/hooks/,
 * src/services/). Enforced by ESLint no-restricted-paths zones.
 */

import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Stable identifier for a tool. Add new ids to this union when registering a new tool. */
export type StudioToolId =
  | 'bg-removal'
  | 'upscale'
  | 'color-change'
  | 'vectorize'
  | 'halftone';

export interface StudioTool {
  id: StudioToolId;
  /** Short label shown in the Studio tool-picker pill row. */
  label: string;
  /** Icon component (lucide-react) shown next to the label. */
  icon: LucideIcon;
  /** One-sentence description for tooltips / dropdown menus. */
  description: string;
  /**
   * Optional gating: Studio uses this to disable the pill (with explanatory
   * tooltip) when the user can't access the tool. Server endpoints still
   * enforce credits/plans authoritatively — this is UI-side only.
   */
  gate?: {
    credits?: number;
    planSlug?: string;
  };
  /** The React component the Studio mounts when this tool is active. */
  Panel: ComponentType<StudioToolPanelProps>;
}

export interface StudioToolPanelProps {
  /**
   * The current working image. May be the original upload or the result of
   * a previous tool's onApply. Tools should treat this as read-only input.
   */
  image: HTMLImageElement;
  /**
   * Stable ID of the originally uploaded image. Tools that hit server
   * endpoints can pass this for attribution / credit tracking. May be null
   * if the working image came from somewhere other than an upload (e.g.,
   * a previous tool's blob).
   */
  imageId: string | null;
  /**
   * The user clicked Apply / committed the tool's output. The Studio takes
   * the resultCanvas and replaces its working image (chaining into the
   * next tool). Metadata describes what happened for analytics + the
   * processed_images.operation_type column when saved.
   */
  onApply: (resultCanvas: HTMLCanvasElement, meta: ApplyMetadata) => void;
  /**
   * The user backed out (Back button, modal close, etc.). Studio
   * unmounts the panel without changing workingImage. Optional —
   * panels that have no Cancel UX can omit calling it.
   */
  onCancel?: () => void;
  /**
   * Optional: when running inside a standalone /process/{tool} route
   * (instead of inside Studio), the wrapper sets this to true so the
   * panel can hide chaining-only UI (e.g., "Apply" → "Save & Download").
   */
  standalone?: boolean;
}

export interface ApplyMetadata {
  /** Goes into `processed_images.operation_type` when saved. */
  operation: string;
  /** Optional analytics field — actual deduction happens server-side. */
  creditsUsed?: number;
  /** e.g. 'in-house' | 'deepimage' | 'clippingmagic' */
  provider?: string;
  /** e.g. 'bria-rmbg' | 'birefnet-massive' | '4x' */
  modelId?: string;
}
