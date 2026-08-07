/**
 * Help video links for the in-app "Video help" buttons (tool Help menus +
 * Hamilton).
 *
 * HOW TO POPULATE:
 *   - Set HELP_VIDEO_PLAYLIST_URL to your YouTube playlist of all tool tutorials.
 *     This is the fallback used by any tool that doesn't have its own video yet,
 *     and by Hamilton (which isn't tied to a single tool).
 *   - Fill TOOL_HELP_VIDEOS with a per-tool video URL where you have one. Leave
 *     an entry as '' to fall back to the playlist.
 *
 * Keys are the shared "help keys" (same ones the Owner's Manual anchors use),
 * NOT the Studio tool ids — see STUDIO_TOOL_HELP_KEY to map a Studio tool id.
 */

/** YouTube playlist of all tutorials. Fallback + Hamilton's video link. */
export const HELP_VIDEO_PLAYLIST_URL = '';

/** Per-tool tutorial video. Empty string → use the playlist instead. */
export const TOOL_HELP_VIDEOS: Record<string, string> = {
  'background-removal': '',
  upscale: '',
  vectorize: '',
  'color-change': '',
  halftone: '',
  'dpi-checker': '',
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
 * Resolve the best video URL for a help key: the tool's own video if set,
 * otherwise the playlist. Returns '' when nothing is configured yet (callers
 * should treat '' as "no video available" rather than linking to a dead URL).
 */
export function getToolVideoUrl(helpKey: string | undefined): string {
  if (helpKey && TOOL_HELP_VIDEOS[helpKey]) return TOOL_HELP_VIDEOS[helpKey];
  return HELP_VIDEO_PLAYLIST_URL || '';
}
