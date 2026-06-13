/**
 * Centralized config for the per-tool "Need Help?" tutorial graphics.
 *
 * This is INTENTIONALLY separate from the first-time tutorial popup
 * (src/components/ui/HelpModal.tsx). It only maps a tool key to the static
 * tutorial image stored in /public/branding plus the modal copy. Adding a new
 * tool is just a new entry here.
 *
 * Image paths are public URLs: a file at public/branding/foo.png is referenced
 * as "/branding/foo.png". Filenames are case-sensitive on production (Linux),
 * so they must match the actual files in public/branding exactly.
 */

export interface ToolHelpEntry {
  /** Header shown in the modal, e.g. "Background Removal Help". */
  title: string;
  /** Short description of what the guide covers. */
  subtitle: string;
  /** Public path to the tutorial graphic in /public/branding. */
  image: string;
  /** Descriptive alt text for the graphic. */
  alt: string;
}

/**
 * Tool key → help content. Keys mirror the tool route slugs so callers can pass
 * an obvious, stable identifier.
 */
export const TOOL_HELP: Record<string, ToolHelpEntry> = {
  'background-removal': {
    title: 'Background Removal Help',
    subtitle:
      'Learn how to remove backgrounds, refine edges with Keep and Remove markers, and download a transparent PNG.',
    image: '/branding/background-removal.png',
    alt: 'Background Removal tutorial graphic for DTF Editor',
  },
  upscale: {
    title: 'Image Upscaling Help',
    subtitle:
      'Learn how to choose print size, review DPI, upscale to 300 DPI, and download your improved artwork.',
    image: '/branding/upscale.png',
    alt: 'Image Upscaling tutorial graphic for DTF Editor',
  },
  vectorize: {
    title: 'Vectorization Help',
    subtitle:
      'Learn how to choose SVG, PDF, or PNG and convert raster artwork into cleaner files.',
    image: '/branding/vectorize.png',
    alt: 'Vectorization tutorial graphic for DTF Editor',
  },
  'color-change': {
    title: 'Color Changing Help',
    subtitle:
      'Learn how to select a target color, choose a replacement color, apply the change, and download updated artwork.',
    image: '/branding/color-change.png',
    alt: 'Color Changing tutorial graphic for DTF Editor',
  },
  'dpi-checker': {
    title: 'DPI Checker Help',
    subtitle:
      'Learn how to check whether your artwork is sharp enough for your chosen DTF print size.',
    image: '/branding/DPI-Checker.png',
    alt: 'DPI Checker tutorial graphic for DTF Editor',
  },
};

/** Returns the help entry for a tool key, or undefined if none exists. */
export function getToolHelp(toolKey: string): ToolHelpEntry | undefined {
  return TOOL_HELP[toolKey];
}
