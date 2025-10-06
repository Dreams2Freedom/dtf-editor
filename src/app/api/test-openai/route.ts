import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  console.log('[Test OpenAI] Starting test...');

  try {
    // Test 1: Check environment variables
    const envCheck = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Missing',
      OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY?.length || 0,
      OPENAI_API_KEY_PREFIX:
        process.env.OPENAI_API_KEY?.substring(0, 10) || 'N/A',
      NODE_ENV: process.env.NODE_ENV,
    };

    console.log('[Test OpenAI] Environment check:', envCheck);

    // Test 2: Check Supabase authentication
    let authStatus = 'Not tested';
    let userId = null;
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (user) {
        authStatus = 'Authenticated';
        userId = user.id;
      } else {
        authStatus = 'Not authenticated';
      }
      if (error) {
        authStatus = `Error: ${error.message}`;
      }
    } catch (e: any) {
      authStatus = `Exception: ${e.message}`;
    }

    console.log('[Test OpenAI] Auth status:', authStatus);

    // Test 3: Try to import OpenAI
    let openAIImportStatus = 'Not tested';
    try {
      const OpenAI = (await import('openai')).default;
      openAIImportStatus = 'Successfully imported';
    } catch (e: any) {
      openAIImportStatus = `Failed: ${e.message}`;
    }

    console.log('[Test OpenAI] OpenAI import status:', openAIImportStatus);

    // Test 4: Try to initialize OpenAI client
    let openAIClientStatus = 'Not tested';
    let apiKeyValid = false;

    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = (await import('openai')).default;
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Try a simple API call to validate the key
        try {
          const models = await client.models.list();
          openAIClientStatus = `Valid - Found ${models.data.length} models`;
          apiKeyValid = true;
        } catch (apiError: any) {
          if (apiError.status === 401) {
            openAIClientStatus = 'Invalid API key';
          } else {
            openAIClientStatus = `API Error: ${apiError.message}`;
          }
        }
      } catch (e: any) {
        openAIClientStatus = `Client Error: ${e.message}`;
      }
    } else {
      openAIClientStatus = 'No API key available';
    }

    console.log('[Test OpenAI] Client status:', openAIClientStatus);

    // Return all test results
    return NextResponse.json({
      success: true,
      tests: {
        environment: envCheck,
        authentication: {
          status: authStatus,
          userId: userId,
        },
        openAI: {
          importStatus: openAIImportStatus,
          clientStatus: openAIClientStatus,
          apiKeyValid: apiKeyValid,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Test OpenAI] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');
