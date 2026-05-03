/**
 * Vectorizer.ai provider (Phase 2.1).
 *
 * Wraps the existing /api/process endpoint with operation=vectorization.
 * The endpoint already handles auth, credit deduction, and saving the
 * resulting SVG/PDF to the user's gallery. The provider just marshals
 * FormData and parses the response.
 */

import type {
  VectorizeOptions,
  VectorizeProvider,
  VectorizeResult,
} from './types';

export const vectorizerAiProvider: VectorizeProvider = {
  id: 'vectorizer.ai',
  label: 'Vectorizer.ai',
  async run(blob: Blob, options: VectorizeOptions): Promise<VectorizeResult> {
    const fd = new FormData();
    fd.append('image', blob, 'input.png');
    fd.append('operation', 'vectorization');
    fd.append('vectorFormat', options.format);
    if (typeof options.maxColors === 'number') {
      fd.append('maxColors', String(options.maxColors));
    }

    const start = Date.now();
    const res = await fetch('/api/process', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });

    if (!res.ok) {
      let detail = `Vectorize failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) detail = body.error;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }

    const json = await res.json();
    const url: string | undefined = json?.processedUrl ?? json?.url;
    if (!url) {
      throw new Error('Vectorize response missing image URL');
    }

    return {
      url,
      processingTimeMs: Date.now() - start,
    };
  },
};
