/**
 * Deep-Image.ai upscale provider (Phase 2.0).
 *
 * Wraps the existing /api/upscale Next.js endpoint, which proxies to
 * DeepImageService server-side and saves the result to the user's
 * gallery automatically. The provider just handles the FormData
 * marshaling + response parsing.
 */

import type { UpscaleOptions, UpscaleProvider, UpscaleResult } from './types';

export const deepImageProvider: UpscaleProvider = {
  id: 'deepimage',
  label: 'Deep-Image.ai',
  async run(blob: Blob, options: UpscaleOptions): Promise<UpscaleResult> {
    const fd = new FormData();
    fd.append('image', blob, 'input.png');
    fd.append('processingMode', options.processingMode);
    if (typeof options.scale === 'number') {
      fd.append('scale', String(options.scale));
    }
    if (typeof options.targetWidth === 'number') {
      fd.append('targetWidth', String(options.targetWidth));
    }
    if (typeof options.targetHeight === 'number') {
      fd.append('targetHeight', String(options.targetHeight));
    }

    const start = Date.now();
    const res = await fetch('/api/upscale', {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      let detail = `Upscale failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) detail = body.error;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }

    const json = await res.json();
    const url: string | undefined = json?.url ?? json?.processedUrl;
    if (!url) {
      throw new Error('Upscale response missing image URL');
    }

    return {
      url,
      processingTimeMs: Date.now() - start,
    };
  },
};
