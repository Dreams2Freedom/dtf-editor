import { NextRequest, NextResponse } from 'next/server';
import { imageProcessingService, ProcessingOptions, ProcessingOperation } from '@/services/imageProcessing';
import { storageService } from '@/services/storage';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Debug: Check if middleware set the session header
    const hasSessionHeader = request.headers.get('x-has-session');
    console.log('Middleware session header:', hasSessionHeader);
    
    // 1. Get authenticated user
    const supabase = await createServerSupabaseClient();
    
    // First try to get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session check:', { hasSession: !!session, sessionError });
    
    // Then get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User check:', { hasUser: !!user, userId: user?.id, authError });
    
    if (authError || !user) {
      console.error('Auth error details:', { 
        authError, 
        sessionError, 
        hasSession: !!session,
        sessionUser: session?.user?.email 
      });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const operation = formData.get('operation') as string;

    // 3. Validate required fields
    if (!imageFile || !operation) {
      return NextResponse.json(
        { error: 'Missing required fields: image file and operation' },
        { status: 400 }
      );
    }

    // 4. Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.' },
        { status: 400 }
      );
    }

    // 5. Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // 6. Upload image to storage
    const uploadResult = await storageService.uploadImage(imageFile, user.id);
    if (!uploadResult.success || !uploadResult.url) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload image' },
        { status: 500 }
      );
    }

    // 7. Build processing options
    const processingOptions: ProcessingOptions = {
      operation: operation as ProcessingOperation,
      scale: formData.get('scale') ? parseInt(formData.get('scale') as string) as 2 | 4 : undefined,
      processingMode: formData.get('processingMode') as 'auto_enhance' | 'generative_upscale' | 'basic_upscale' | undefined,
      faceEnhance: formData.get('faceEnhance') === 'true',
      backgroundColor: formData.get('backgroundColor') as string | undefined,
      vectorFormat: formData.get('vectorFormat') as 'svg' | 'pdf' | undefined,
    };

    // 8. Validate operation-specific options
    console.log('Processing options:', processingOptions);
    const validationError = validateProcessingOptions(processingOptions);
    if (validationError) {
      console.error('Validation error:', validationError);
      // Clean up uploaded file on validation error
      await storageService.deleteImage(uploadResult.path!);
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // 9. Process the image
    const result = await imageProcessingService.processImage(
      user.id,
      uploadResult.url,
      processingOptions
    );

    // 10. Clean up original upload if processing succeeded
    if (result.success && uploadResult.path) {
      // Don't await cleanup to speed up response
      storageService.deleteImage(uploadResult.path).catch(console.error);
    }

    // 11. Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        processedUrl: result.processedUrl,
        metadata: result.metadata
      });
    } else {
      // Clean up uploaded file on processing error
      if (uploadResult.path) {
        await storageService.deleteImage(uploadResult.path);
      }
      return NextResponse.json(
        { error: result.error || 'Processing failed' },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('Process API Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate processing options based on operation type
 */
function validateProcessingOptions(options: ProcessingOptions): string | null {
  switch (options.operation) {
    case 'upscale':
      if (!options.scale) {
        return 'Scale (2 or 4) is required for upscaling';
      }
      if (![2, 4].includes(options.scale)) {
        return 'Scale must be 2 or 4';
      }
      if (!options.processingMode) {
        return 'Processing mode is required for upscaling';
      }
      if (!['auto_enhance', 'generative_upscale', 'basic_upscale'].includes(options.processingMode)) {
        return 'Invalid processing mode';
      }
      break;

    case 'background-removal':
      // No specific validation needed yet
      break;

    case 'vectorization':
      if (options.vectorFormat && !['svg', 'pdf'].includes(options.vectorFormat)) {
        return 'Vector format must be svg or pdf';
      }
      break;

    case 'ai-generation':
      if (!options.prompt) {
        return 'Prompt is required for AI image generation';
      }
      if (options.prompt.length < 3) {
        return 'Prompt must be at least 3 characters long';
      }
      if (options.prompt.length > 1000) {
        return 'Prompt must be less than 1000 characters';
      }
      break;

    default:
      return `Unsupported operation: ${options.operation}`;
  }

  return null;
}

// GET endpoint to retrieve user's processing history
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get processing history
    const history = await imageProcessingService.getProcessingHistory(user.id, limit);

    return NextResponse.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Process API GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}