import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { env } from '@/config/env';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * ClippingMagic upload BY URL.
 *
 * The regular /api/clippingmagic/upload route buffers the image through the
 * serverless function, so it's capped by Vercel's ~4.5MB request-body limit.
 * This route instead receives only a URL (a tiny JSON body): the browser has
 * already uploaded the full-resolution image straight to Supabase Storage,
 * and we hand ClippingMagic that public URL. ClippingMagic fetches the image
 * itself, so there's no size bottleneck. The temp object is deleted once
 * ClippingMagic has ingested it.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const url: string | undefined = body?.url;
    // Storage path to clean up afterwards. Must live under the caller's own
    // folder so a client can't ask us to delete someone else's object.
    const path: string | undefined = body?.path;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing image url' },
        { status: 400 }
      );
    }

    // Credit precheck (deduction still happens on result-generated, mirroring
    // the file-upload route).
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();

    if (!profile || profile.credits_remaining < 1) {
      return NextResponse.json(
        {
          error:
            'Insufficient credits. Please purchase more credits to continue.',
        },
        { status: 402 }
      );
    }

    const authHeader =
      'Basic ' +
      Buffer.from(
        env.CLIPPINGMAGIC_API_KEY + ':' + env.CLIPPINGMAGIC_API_SECRET
      ).toString('base64');

    // Same processing options as the direct-upload route, but by URL.
    const cmFormData = new FormData();
    cmFormData.append('image.url', url);
    cmFormData.append('format', 'json');
    cmFormData.append('maxPixels', '26214400'); // CM max: 26.2 megapixels
    cmFormData.append('fit.toResult', 'true');
    cmFormData.append('fit.margin', '0.5');
    cmFormData.append('result.allowEnlarging', 'true');
    cmFormData.append('processing.mode', 'graphics');

    const response = await fetch('https://clippingmagic.com/api/v1/images', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: cmFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '[ClippingMagic upload-url] CM API error:',
        response.status,
        errorText
      );
      return NextResponse.json(
        { error: `ClippingMagic error: ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    // ClippingMagic has now ingested the image (it downloads during the POST),
    // so remove the temp object. Best-effort; scoped to the caller's folder.
    if (path && typeof path === 'string' && path.startsWith(`${user.id}/`)) {
      try {
        const serviceClient = createServiceRoleClient();
        await serviceClient.storage.from('images').remove([path]);
      } catch (cleanupErr) {
        console.error(
          '[ClippingMagic upload-url] temp cleanup failed (non-fatal):',
          cleanupErr
        );
      }
    }

    return NextResponse.json({
      success: true,
      image: { id: result.image.id, secret: result.image.secret },
    });
  } catch (error) {
    console.error('[ClippingMagic upload-url] error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to upload image',
      },
      { status: 500 }
    );
  }
}
