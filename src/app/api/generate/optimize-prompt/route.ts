import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PROMPT_OPTIMIZATION_SYSTEM_PROMPT } from '@/utils/promptHelpers';
import { withRateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;
export const runtime = 'nodejs';

/**
 * POST /api/generate/optimize-prompt
 *
 * Takes a user description and generates 3-5 optimized prompt variations
 * using GPT-4. All variations are designed to work with transparent backgrounds
 * for DTF printing.
 *
 * This is FREE - does not deduct credits (optimization only, no image generation)
 */
async function handlePost(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    // Check user profile for access to AI features (paid users only)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = Boolean(profile?.is_admin);
    const isPaidUser = profile?.subscription_tier && profile.subscription_tier !== 'free';

    if (!isPaidUser && !isAdmin) {
      return NextResponse.json(
        {
          error: 'AI image generation is only available for paid subscribers',
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { description, count = 4 } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    if (description.length > 4000) {
      return NextResponse.json(
        { error: 'Description is too long (max 4000 characters)' },
        { status: 400 }
      );
    }

    const promptCount = Math.min(Math.max(count, 1), 5); // Between 1-5

    // SECURITY: Sanitize user input to prevent prompt injection attacks
    // Remove newlines and escape quotes to prevent breaking out of the prompt structure
    const sanitizedDescription = description
      .replace(/\r?\n/g, ' ') // Replace newlines with spaces
      .replace(/"/g, '\\"') // Escape double quotes
      .trim();

    console.log('[Optimize Prompt API] Generating optimized prompts:', {
      userId: user.id,
      descriptionLength: description.length,
      count: promptCount,
    });

    // Dynamically import OpenAI (server-side only)
    const OpenAI = (await import('openai')).default;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('[Optimize Prompt API] OpenAI API key not configured');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Call GPT-4 to generate optimized prompts
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective for prompt generation
      messages: [
        {
          role: 'system',
          content: PROMPT_OPTIMIZATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `User's description: "${sanitizedDescription}"\n\nGenerate ${promptCount} optimized variations of this description. Each variation should focus on a different aspect (e.g., style, color emphasis, composition, detail level). Return ONLY a JSON array with this exact structure:\n\n[\n  {"text": "optimized prompt 1", "focus": "what this variation emphasizes"},\n  {"text": "optimized prompt 2", "focus": "what this variation emphasizes"},\n  ...\n]\n\nIMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.`,
        },
      ],
      temperature: 0.9, // Higher temperature for creative variations
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('[Optimize Prompt API] Failed to parse AI response:', parseError);
      throw new Error('Invalid AI response format');
    }

    // Extract prompts array (handle various possible response formats)
    let prompts = parsedResponse.prompts || parsedResponse.variations || parsedResponse;

    if (!Array.isArray(prompts)) {
      // If we got an object with numbered keys, convert to array
      if (typeof prompts === 'object') {
        prompts = Object.values(prompts);
      } else {
        throw new Error('AI response is not an array');
      }
    }

    // Validate and clean up the prompts
    const validPrompts = prompts
      .filter((p: any) => p && typeof p === 'object' && p.text)
      .map((p: any) => ({
        text: String(p.text).trim(),
        focus: p.focus ? String(p.focus).trim() : 'General optimization',
      }))
      .slice(0, promptCount); // Ensure we don't exceed requested count

    if (validPrompts.length === 0) {
      // Fallback: return original description
      return NextResponse.json({
        prompts: [
          {
            text: description,
            focus: 'Original description',
          },
        ],
      });
    }

    console.log('[Optimize Prompt API] Successfully generated prompts:', {
      count: validPrompts.length,
    });

    return NextResponse.json({
      prompts: validPrompts,
    });
  } catch (error: any) {
    console.error('[Optimize Prompt API] Error:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'AI service quota exceeded. Please try again later.' },
        { status: 503 }
      );
    }

    if (error.code === 'rate_limit_exceeded') {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to optimize prompts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting (using 'processing' type - ai_optimization type doesn't exist in rate-limit config)
export const POST = withRateLimit(handlePost, 'processing');
