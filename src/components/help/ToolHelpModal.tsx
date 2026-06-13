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
      <div className="flex flex-col items-center gap-5">
        {imgError ? (
          <p className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
            The tutorial graphic could not be loaded right now. {help.subtitle}
          </p>
        ) : (
          // Cap by both width and height so the full graphic fits inside the
          // modal viewport without scrolling, scaling down while preserving its
          // aspect ratio (never cropped or stretched).
          <img
            src={help.image}
            alt={help.alt}
            onError={() => setImgError(true)}
            className="block max-h-[55vh] w-auto max-w-full rounded-lg border border-gray-200 object-contain sm:max-h-[68vh]"
          />
        )}

        <div className="flex w-full justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </div>
      </div>
    </Modal>
  );
}
