import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';

export async function GET(request: NextRequest) {
  try {
    const apiKey = env.DEEP_IMAGE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Deep-Image API key not configured'
      });
    }
    
    // Test the API key with a simple request
    const testUrl = 'https://deep-image.ai/rest_api';
    
    console.log('[Test Deep-Image] Testing API with key:', apiKey.substring(0, 8) + '...');
    
    // Just test if we can make a request - we'll send an invalid request to test auth
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        // Intentionally incomplete request to test auth
        test: true
      }),
    });
    
    const responseText = await response.text();
    
    console.log('[Test Deep-Image] Response:', {
      status: response.status,
      statusText: response.statusText,
      responseText: responseText.substring(0, 200)
    });
    
    // 401 means API key is invalid
    // 400 means API key is valid but request is bad (expected for our test)
    if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'API key is invalid or unauthorized',
        status: response.status,
        response: responseText
      });
    }
    
    return NextResponse.json({
      success: response.status !== 401,
      status: response.status,
      statusText: response.statusText,
      response: responseText.substring(0, 500),
      apiKeyValid: response.status !== 401,
      message: response.status === 400 ? 'API key is valid (bad request is expected for test)' : 'Check response for details'
    });
    
  } catch (error) {
    console.error('[Test Deep-Image] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    });
  }
}