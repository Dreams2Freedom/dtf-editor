import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    const supabase = await createServerSupabaseClient();
    const serviceClient = createServiceRoleClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get images using RPC
    console.log('[Debug] Calling get_user_images for user:', user.id);
    const { data: images, error: rpcError } = await serviceClient.rpc(
      'get_user_images',
      {
        p_user_id: user.id,
      }
    );

    if (rpcError) {
      console.error('[Debug] RPC Error:', rpcError);
      return NextResponse.json(
        {
          error: 'RPC failed',
          details: rpcError.message,
          code: rpcError.code,
        },
        { status: 500 }
      );
    }

    // Check if images have valid URLs
    const imageChecks = [];
    if (images && Array.isArray(images)) {
      for (const img of images.slice(0, 3)) {
        // Check first 3 images
        const urlCheck = {
          id: img.id,
          filename: img.processed_filename,
          storage_url: img.storage_url,
          url_length: img.storage_url?.length,
          url_type: img.storage_url?.startsWith('https://')
            ? 'https'
            : img.storage_url?.startsWith('data:')
              ? 'data'
              : 'unknown',
          has_signature: img.storage_url?.includes('token='),
          created_at: img.created_at,
        };

        // Try to parse the URL
        try {
          const url = new URL(img.storage_url);
          urlCheck.hostname = url.hostname;
          urlCheck.pathname = url.pathname;
          urlCheck.has_token = url.searchParams.has('token');
        } catch (e) {
          urlCheck.parse_error = 'Invalid URL format';
        }

        imageChecks.push(urlCheck);
      }
    }

    return NextResponse.json({
      user_id: user.id,
      total_images: images?.length || 0,
      rpc_response_type: Array.isArray(images) ? 'array' : typeof images,
      sample_checks: imageChecks,
      message: 'Debug info for image loading issues',
    });
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');
