export type BgRemovalProvider = 'in-house' | 'clippingmagic';

export type BgRemovalModel =
  | 'white-fill'
  | 'bria-rmbg'
  | 'birefnet-general-lite'
  | 'birefnet-dis'
  | 'birefnet-general'
  | 'birefnet-massive'
  | 'isnet-general-use'
  | 'u2net'
  | 'u2netp'
  | 'u2net_human_seg'
  | 'isnet-anime'
  | 'sam';

/** What the panel sends to the server. */
export type RemovalMode =
  | 'color-fill'
  | 'click-fill'
  | 'ml-only'
  | 'ml+color';

/** Top-of-panel UX mode (separate from server modes). */
export type PanelMode = 'ai-brush' | 'color-pick' | 'ai-only';

export type RGB = [number, number, number];

export interface BgDetectionResult {
  dominant: RGB;
  secondary: RGB | null;
  intra_variance: number;
  centroid_distance: number;
  confidence: 'uniform' | 'two-color' | 'gradient' | 'complex' | 'transparent';
  recommended_mode:
    | 'color-fill'
    | 'two-color-fill'
    | 'ml+color'
    | 'ml-only'
    | 'noop';
}

export interface RemovalOptions {
  mode: RemovalMode;
  model?: BgRemovalModel;
  targetColor?: RGB;
  /** Multi-color remove palette (Phase 1.14). Server falls back to targetColor if empty. */
  removeColors?: RGB[];
  /** Multi-color keep palette (Phase 1.14). Acts as a barrier in BFS flood-fill. */
  keepColors?: RGB[];
  tolerance?: number;
  seedPoints?: Array<[number, number]>;
}

export interface SamPoint {
  x: number;
  y: number;
  /** 1 = foreground (keep), 0 = background (remove) */
  label: 0 | 1;
}

export interface SamSession {
  embeddingId: string;
  width: number;
  height: number;
}

export type BgRemovalStatus =
  | 'idle'
  | 'authorizing'
  | 'detecting'
  | 'removing'
  | 'embedding'
  | 'predicting'
  | 'done'
  | 'error';

export interface BgRemovalEntry {
  id: string;
  originalImageData: ImageData;
  maskImageData: ImageData;
  timestamp: number;
}
