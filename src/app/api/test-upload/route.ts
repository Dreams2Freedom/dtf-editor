import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // List user's uploaded files
    const { data: files, error } = await supabase.storage
      .from('user-uploads')
      .list(`users/${user.id}`, {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      return NextResponse.json(
        {
          error: 'Failed to list files',
          details: error,
        },
        { status: 500 }
      );
    }

    // Get public URLs for each file
    const filesWithUrls =
      files?.map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        createdAt: file.created_at,
        url: supabase.storage
          .from('user-uploads')
          .getPublicUrl(`users/${user.id}/${file.name}`).data.publicUrl,
      })) || [];

    return NextResponse.json({
      success: true,
      userId: user.id,
      files: filesWithUrls,
      count: filesWithUrls.length,
    });
  } catch (error) {
    console.error('Test upload error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');
