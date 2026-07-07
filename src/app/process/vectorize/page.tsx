import { redirect } from 'next/navigation';

/**
 * Phase 2.1: redirect stub. Studio's vectorize plugin is the unified
 * entry point. The orphaned ./client.tsx file is dead code after this
 * redirect and can be removed in a follow-up.
 */
export default async function VectorizePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const imageId =
    typeof params.imageId === 'string' ? params.imageId : undefined;
  const target = new URLSearchParams({ tool: 'vectorize' });
  if (imageId) target.set('imageId', imageId);
  redirect(`/studio?${target.toString()}`);
}
