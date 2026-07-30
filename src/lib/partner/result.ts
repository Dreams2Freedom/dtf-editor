import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Re-host a tool result (a data: URL or an http(s) URL) into our storage and
 * return a stable public URL. Keeps the partner API returning durable URLs even
 * when the underlying provider hands back a data URL or a short-lived link.
 */
export async function persistPartnerResult(
  source: string,
  opts: { partnerId: string; shop: string; tool: string }
): Promise<string | null> {
  let buffer: Buffer;
  let contentType: string;

  if (source.startsWith('data:')) {
    const comma = source.indexOf(',');
    const meta = source.slice(5, comma); // e.g. "image/png;base64"
    contentType = meta.split(';')[0] || 'application/octet-stream';
    buffer = Buffer.from(source.slice(comma + 1), 'base64');
  } else {
    const res = await fetch(source).catch(() => null);
    if (!res || !res.ok) return null;
    contentType = res.headers.get('content-type') || 'image/png';
    buffer = Buffer.from(await res.arrayBuffer());
  }

  const ext = contentType.includes('svg')
    ? 'svg'
    : contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'jpg'
      : contentType.includes('webp')
        ? 'webp'
        : 'png';

  const safeShop = opts.shop.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `partners/${opts.partnerId}/${safeShop}/${Date.now()}-${opts.tool}.${ext}`;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.storage
    .from('images')
    .upload(path, buffer, { contentType, upsert: true });
  if (error) {
    console.error('[Partner API] result persist failed:', error);
    return null;
  }
  const { data } = supabase.storage.from('images').getPublicUrl(path);
  return data?.publicUrl || null;
}
