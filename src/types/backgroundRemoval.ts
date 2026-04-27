export type BgRemovalProvider = 'in-house' | 'clippingmagic';

export type BgRemovalModel =
  | 'white-fill'
  | 'birefnet-general-lite'
  | 'birefnet-dis'
  | 'birefnet-general'
  | 'isnet-general-use'
  | 'u2net'
  | 'u2netp'
  | 'u2net_human_seg'
  | 'isnet-anime'
  | 'sam';

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
  | 'removing'
  | 'embedding'
  | 'predicting'
  | 'done'
  | 'error';

export interface BgRemovalEntry {
  id: string;
  /** Original RGBA pixel data before removal — stored for undo */
  originalImageData: ImageData;
  /** The alpha mask that was applied */
  maskImageData: ImageData;
  timestamp: number;
}
