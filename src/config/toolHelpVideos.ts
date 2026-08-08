/**
 * Help video links for the in-app "Video help" buttons (tool Help menus, the
 * Owner's Manual sections, and Hamilton) — AND the source of truth Hamilton
 * uses to know which tools have a tutorial video.
 *
 * HOW TO ADD A VIDEO (no code changes elsewhere, no re-prompting Hamilton):
 *   1. Put the YouTube URL on the tool's key in TOOL_HELP_VIDEOS below.
 *   2. Deploy. That's it — the tool's "Video help" button lights up, the
 *      Owner's Manual section shows a "Watch the video" link, and Hamilton
 *      automatically starts pointing people to it (his knowledge base is built
 *      from this file at deploy time).
 *
 * Keys are the shared "help keys" (same keys the Owner's Manual anchors use in
 * TOOL_ANCHORS), NOT the Studio tool ids — use STUDIO_TOOL_HELP_KEY to map a
 * Studio tool id, or helpKeyForManualSection() to map an Owner's Manual anchor.
 */

/** YouTube playlist of all tutorials. Fallback for UI buttons + Hamilton's
 *  general "video help" link. Leave '' until a playlist exists. */
export const HELP_VIDEO_PLAYLIST_URL = '';

/**
 * Per-tool tutorial video (the authoritative "does this tool have a video?"
 * list). Empty string = no video yet.
 */
export const TOOL_HELP_VIDEOS: Record<string, string> = {
  'background-removal': 'https://www.youtube.com/shorts/ZqXBhPPlpT4',
  upscale: '',
  vectorize: '',
  'color-change': '',
  halftone: '',
  'dpi-checker': '',
};

/** Friendly tool names for menus, manual links, and Hamilton's answers. */
export const TOOL_VIDEO_LABELS: Record<string, string> = {
  'background-removal': 'Background Removal',
  upscale: 'Upscaling',
  vectorize: 'Vectorization',
  'color-change': 'Color Change',
  halftone: 'Halftone',
  'dpi-checker': 'DPI Checker',
};

/** Studio tool id → shared help key (Owner's Manual anchor + video map key). */
export const STUDIO_TOOL_HELP_KEY: Record<string, string> = {
  'bg-removal': 'background-removal',
  upscale: 'upscale',
  vectorize: 'vectorize',
  'color-change': 'color-change',
  halftone: 'halftone',
};

/**
 * Owner's Manual section id (the TOOL_ANCHORS *value*, e.g. 'upscaling') →
 * help key (e.g. 'upscale'). Lets the manual look up a section's video.
 */
const MANUAL_SECTION_HELP_KEY: Record<string, string> = {
  'background-removal': 'background-removal',
  upscaling: 'upscale',
  vectorization: 'vectorize',
  'color-changing': 'color-change',
  'dpi-checker': 'dpi-checker',
};

export function helpKeyForManualSection(sectionId: string): string | undefined {
  return MANUAL_SECTION_HELP_KEY[sectionId];
}

/**
 * The tool's OWN video, exactly — no playlist fallback. Use this to decide
 * whether a specific tool actually has a video (Owner's Manual, Hamilton).
 */
export function getExactToolVideo(helpKey: string | undefined): string {
  return (helpKey && TOOL_HELP_VIDEOS[helpKey]) || '';
}

/**
 * Best video URL for a UI "Video help" button: the tool's own video if set,
 * otherwise the playlist. Returns '' when nothing is configured (callers treat
 * '' as "no video available" rather than linking to a dead URL).
 */
export function getToolVideoUrl(helpKey: string | undefined): string {
  return getExactToolVideo(helpKey) || HELP_VIDEO_PLAYLIST_URL || '';
}

export interface ToolVideoEntry {
  key: string;
  label: string;
  /** Exact per-tool URL, or null when there's no video yet. */
  url: string | null;
}

/**
 * Every known tool with its video availability — the list Hamilton reads to
 * answer "is there a video for X?". Rebuilt from this file at deploy time, so
 * adding a URL above is all it takes for Hamilton to start referring to it.
 */
export function listToolVideos(): ToolVideoEntry[] {
  return Object.keys(TOOL_VIDEO_LABELS).map(key => ({
    key,
    label: TOOL_VIDEO_LABELS[key],
    url: TOOL_HELP_VIDEOS[key] || null,
  }));
}
