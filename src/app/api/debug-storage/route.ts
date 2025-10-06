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

    // List all files in user's folder
    const { data: files, error } = await supabase.storage
      .from('user-uploads')
      .list(`users/${user.id}`, {
        limit: 100,
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

    // Get sample URL if files exist
    let sampleUrl = null;
    if (files && files.length > 0) {
      sampleUrl = supabase.storage
        .from('user-uploads')
        .getPublicUrl(`users/${user.id}/${files[0].name}`).data.publicUrl;
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      fileCount: files?.length || 0,
      files:
        files?.map(f => ({
          name: f.name,
          id: f.id,
          created_at: f.created_at,
          updated_at: f.updated_at,
          metadata: f.metadata,
        })) || [],
      sampleUrl,
      debug: {
        bucketName: 'user-uploads',
        userPath: `users/${user.id}`,
      },
    });
  } catch (error) {
    console.error('Debug storage error:', error);
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
