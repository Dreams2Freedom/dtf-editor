'use client';

/**
 * ToolHelpMenu — a Hamilton-style "Need help?" popover for a specific tool.
 *
 * Offers the same help model as the Hamilton widget, scoped to one tool:
 *   • Ask a question   → opens the Hamilton chat (via a `hamilton:open` event)
 *   • FAQs             → the FAQ page
 *   • Owner's manual   → jumps to this tool's manual section
 *   • Video help       → this tool's tutorial video (or the playlist fallback)
 *
 * `ToolHelpButton` is the drop-in trigger (button + its own open/close state);
 * most callers want that. `ToolHelpMenu` is the controlled popover if you need
 * to own the state yourself.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  HelpCircle,
  MessageCircle,
  BookOpen,
  PlayCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { TOOL_ANCHORS } from '@/config/toolManualContent';
import { getToolVideoUrl } from '@/config/toolHelpVideos';

interface ToolHelpMenuProps {
  /** Shared help key, e.g. 'background-removal' | 'upscale' | 'vectorize'. */
  helpKey: string;
  /** Human label for the header, e.g. 'Background Removal'. */
  toolLabel?: string;
  open: boolean;
  onClose: () => void;
  /** Positioning classes for the popover (defaults to bottom-right anchored). */
  className?: string;
}

/**
 * Ask Hamilton to open on its chat tab. HamiltonWidget listens for this event
 * so any tool's "Ask a question" reuses the one support bot instead of
 * duplicating the chat UI.
 */
export function openHamiltonAsk(prefill?: string) {
  window.dispatchEvent(
    new CustomEvent('hamilton:open', { detail: { tab: 'ask', prefill } })
  );
}

export function ToolHelpMenu({
  helpKey,
  toolLabel,
  open,
  onClose,
  className,
}: ToolHelpMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const anchor = TOOL_ANCHORS[helpKey];
  const videoUrl = getToolVideoUrl(helpKey);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Help for ${toolLabel || 'this tool'}`}
      className={`absolute z-50 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ${
        className ?? 'bottom-full right-0 mb-2'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-blue-600" />
          <p className="text-sm font-semibold text-gray-900">
            {toolLabel ? `${toolLabel} help` : 'Need help?'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close help"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1 p-2">
        <button
          onClick={() => {
            openHamiltonAsk();
            onClose();
          }}
          className="group flex w-full items-center justify-between rounded-lg bg-sky-50 px-3 py-2.5 text-sm font-medium text-sky-800 transition-colors hover:bg-sky-100"
        >
          <span className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-sky-500" />
            Ask a question
          </span>
          <ChevronRight className="h-4 w-4 text-sky-400" />
        </button>

        <Link
          href="/faq"
          onClick={onClose}
          className="group flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
            FAQs
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
        </Link>

        <Link
          href={
            anchor
              ? `/dashboard/owner-manual#${anchor}`
              : '/dashboard/owner-manual'
          }
          onClick={onClose}
          className="group flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
            Owner&apos;s manual
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
        </Link>

        {videoUrl ? (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="group flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <span className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
              Video help
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
          </a>
        ) : (
          <div className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-gray-300" />
              Video help
            </span>
            <span className="text-xs">Coming soon</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ToolHelpButtonProps {
  helpKey: string;
  toolLabel?: string;
  /** Layout classes for the wrapping element. */
  className?: string;
  /** Popover position classes (passed through to ToolHelpMenu). */
  menuClassName?: string;
  /** Visual style of the trigger. 'chip' (default) or 'ghost'. */
  variant?: 'chip' | 'ghost';
}

/** Trigger button that owns its own open/close state for the help popover. */
export function ToolHelpButton({
  helpKey,
  toolLabel,
  className,
  menuClassName,
  variant = 'chip',
}: ToolHelpButtonProps) {
  const [open, setOpen] = useState(false);

  const triggerCls =
    variant === 'ghost'
      ? 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100'
      : 'inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50';

  return (
    <div className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={triggerCls}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        Need help?
      </button>
      <ToolHelpMenu
        helpKey={helpKey}
        toolLabel={toolLabel}
        open={open}
        onClose={() => setOpen(false)}
        className={menuClassName}
      />
    </div>
  );
}
