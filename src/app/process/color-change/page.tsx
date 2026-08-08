import { redirect } from 'next/navigation';

/**
 * Phase 2.1: redirect stub. Studio's color-change plugin is the unified
 * entry point. The orphaned ./client.tsx file is dead code after this
 * redirect and can be removed in a follow-up.
 */
export default async function ColorChangePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const imageId =
    typeof params.imageId === 'string' ? params.imageId : undefined;
  const target = new URLSearchParams({ tool: 'color-change' });
  if (imageId) target.set('imageId', imageId);
  redirect(`/studio?${target.toString()}`);
}
