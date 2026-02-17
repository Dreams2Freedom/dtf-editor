import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StorageService } from '@/services/storage';
import { withRateLimit } from '@/lib/rate-limit';

// NEW-25: Aligned size limit — use 10MB consistently across upload and storage
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';

// NEW-23: Magic byte signatures for image file types
const IMAGE_SIGNATURES: { type: string; bytes: number[] }[] = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  // WebP: starts with RIFF....WEBP
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function validateMagicBytes(buffer: ArrayBuffer, claimedType: string): boolean {
  const view = new Uint8Array(buffer);
  for (const sig of IMAGE_SIGNATURES) {
    if (sig.type === claimedType) {
      if (view.length < sig.bytes.length) return false;
      return sig.bytes.every((b, i) => view[i] === b);
    }
  }
  return false;
}

async function handlePost(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your session has expired. Please sign in again to continue.',
          code: 'SESSION_EXPIRED',
        },
        { status: 401 }
      );
    }

    // Get the file from form data
    const formData = await request.formData();
    const file = (formData.get('file') || formData.get('image')) as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (MIME)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Supported: JPEG, PNG, WebP.' },
        { status: 400 }
      );
    }

    // NEW-25: Consistent 10MB upload limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // NEW-23: Validate magic bytes match the claimed MIME type
    const headerSlice = await file.slice(0, 12).arrayBuffer();
    if (!validateMagicBytes(headerSlice, file.type)) {
      return NextResponse.json(
        { success: false, error: 'File content does not match the declared type.' },
        { status: 400 }
      );
    }

    // Initialize storage service
    let storage;
    try {
      storage = new StorageService();
    } catch (error) {
      console.error('Failed to initialize storage service');
      return NextResponse.json(
        { success: false, error: 'Storage service configuration error' },
        { status: 500 }
      );
    }

    // Upload to Supabase storage
    const uploadResult = await storage.uploadImage(file, user.id);

    if (!uploadResult.success || !uploadResult.url || !uploadResult.path) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Upload failed' },
        { status: 500 }
      );
    }

    const imageId = Buffer.from(uploadResult.path).toString('base64url');

    return NextResponse.json({
      success: true,
      imageId: imageId,
      publicUrl: uploadResult.url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'upload');
