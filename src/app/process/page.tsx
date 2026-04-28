import { redirect } from 'next/navigation';

/**
 * Phase 2.1: /process is now a redirect-only stub. Studio is the single
 * editing entry point. Map any legacy ?operation=... query to the new
 * ?tool=... and forward any imageId so deep links keep working.
 *
 * The orphaned ./client.tsx file is intentionally left in place — it's
 * dead code after this redirect (no longer imported anywhere) and can
 * be removed in a follow-up once analytics confirm zero traffic.
 */

const OPERATION_TO_TOOL: Record<string, string> = {
  upscale: 'upscale',
  'background-removal': 'bg-removal',
  'color-change': 'color-change',
  vectorization: 'vectorize',
  vectorize: 'vectorize',
};

export default async function ProcessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const op =
    typeof params.operation === 'string' ? params.operation : undefined;
  const tool = op ? OPERATION_TO_TOOL[op] : undefined;
  const imageId =
    typeof params.imageId === 'string' ? params.imageId : undefined;

  const target = new URLSearchParams();
  if (tool) target.set('tool', tool);
  if (imageId) target.set('imageId', imageId);
  const qs = target.toString();
  redirect(qs ? `/studio?${qs}` : '/studio');
}
