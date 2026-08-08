'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { TOOL_ANCHORS } from '@/config/toolManualContent';

interface NeedHelpButtonProps {
  /**
   * Tool route key, e.g. 'background-removal' | 'upscale' | 'vectorize' |
   * 'color-change' | 'dpi-checker'. Resolves to the matching Owner's Manual
   * anchor.
   */
  toolKey: keyof typeof TOOL_ANCHORS | string;
  /** Show the subtle helper line under the button. Default true. */
  showHelperText?: boolean;
  /** Optional extra classes for layout/positioning. */
  className?: string;
}

/**
 * Always-visible secondary "Need Help?" button placed under a tool's main area.
 * It LINKS (does not open a modal) to the in-app Owner's Manual, jumping
 * directly to that tool's section. Independent of any first-time / localStorage
 * state — it shows on every visit.
 */
export function NeedHelpButton({
  toolKey,
  showHelperText = true,
  className,
}: NeedHelpButtonProps) {
  const anchor = TOOL_ANCHORS[toolKey];
  // No mapped manual section — render nothing rather than a broken link.
  if (!anchor) return null;

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className ?? ''}`}>
      <Link
        href={`/dashboard/owner-manual#${anchor}`}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        Need Help?
      </Link>
      {showHelperText && (
        <span className="text-xs text-gray-500">
          Open the full owner manual for this tool.
        </span>
      )}
    </div>
  );
}
