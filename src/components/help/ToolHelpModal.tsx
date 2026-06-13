'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getToolHelp } from './toolHelpConfig';

interface ToolHelpModalProps {
  /** Tool key, e.g. 'background-removal' (see toolHelpConfig). */
  toolKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Tool-specific tutorial graphic modal. Built on the shared Radix-based Modal,
 * which already provides focus trapping, Escape-to-close, an X button, and an
 * accessible labelled dialog. The image scales to the modal width (never
 * cropped/stretched), and the modal body scrolls when the graphic is tall.
 *
 * This is NOT the first-time tutorial popup — it only ever opens on demand.
 */
export function ToolHelpModal({
  toolKey,
  open,
  onOpenChange,
}: ToolHelpModalProps) {
  const help = getToolHelp(toolKey);
  // Fall back gracefully if the image can't be loaded at runtime.
  const [imgError, setImgError] = useState(false);

  // No matching tutorial content — render nothing.
  if (!help) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={help.title}
      description={help.subtitle}
      size="xl"
    >
      <div className="space-y-5">
        {imgError ? (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
            The tutorial graphic could not be loaded right now. {help.subtitle}
          </p>
        ) : (
          <img
            src={help.image}
            alt={help.alt}
            onError={() => setImgError(true)}
            className="mx-auto h-auto w-full rounded-lg border border-gray-200"
          />
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </div>
      </div>
    </Modal>
  );
}
