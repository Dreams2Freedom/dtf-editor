'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getToolHelp } from './toolHelpConfig';
import { ToolHelpModal } from './ToolHelpModal';

interface ToolHelpButtonProps {
  /** Tool key, e.g. 'background-removal' (see toolHelpConfig). */
  toolKey: string;
  /** Optional extra classes for layout/positioning. */
  className?: string;
}

/**
 * Always-visible secondary "Need Help?" button placed under a tool's main area.
 * Opens the tool-specific tutorial graphic in ToolHelpModal. Independent of any
 * first-time / localStorage state — it shows on every visit.
 *
 * If the tool has no matching tutorial graphic configured, the button hides
 * itself (renders nothing) so the page never breaks.
 */
export function ToolHelpButton({ toolKey, className }: ToolHelpButtonProps) {
  const [open, setOpen] = useState(false);
  const help = getToolHelp(toolKey);

  // No tutorial graphic for this tool — hide the button entirely.
  if (!help) return null;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        leftIcon={<HelpCircle className="h-4 w-4" aria-hidden="true" />}
        aria-haspopup="dialog"
        className={className}
      >
        Need Help?
      </Button>
      <ToolHelpModal toolKey={toolKey} open={open} onOpenChange={setOpen} />
    </>
  );
}
