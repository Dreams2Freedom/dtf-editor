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
    const isPaidUser =
      profile?.subscription_tier && profile.subscription_tier !== 'free';

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
          content: `Transform this user description into ${promptCount} professional DALL-E 3 prompts for DTF printing:

"${sanitizedDescription}"

Create ${promptCount} distinct variations using your VARIATION STRATEGY:
1. Style-Focused (change artistic style: vintage, modern, realistic, cartoon, etc.)
2. Color-Focused (different color palettes and moods)
3. Detail-Focused (vary complexity: simple/clean vs intricate/ornate)
4. Mood-Focused (different emotional tones or themes)

REQUIREMENTS:
- Each prompt must be 50-100 words of rich, vivid detail
- Include specific colors, artistic styles, and visual details
- ALWAYS mention "transparent background" or "isolated on transparent backdrop"
- NO backgrounds, scenery, or environmental elements
- Focus only on the subject that will be isolated on fabric
- Make each variation distinctly different from the others

Return ONLY valid JSON with this exact structure:
{
  "prompts": [
    {"text": "detailed 50-100 word prompt here...", "focus": "Vintage Style"},
    {"text": "another detailed prompt...", "focus": "Vibrant Colors"},
    {"text": "another detailed prompt...", "focus": "Minimalist Clean"},
    {"text": "another detailed prompt...", "focus": "Detailed Ornate"}
  ]
}

Remember: Be specific, vivid, and detailed. The better the prompt, the better the image!`,
        },
      ],
      temperature: 0.8, // Balanced creativity and consistency
      max_tokens: 2000, // Allow for more detailed prompts
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;

    console.log('[Optimize Prompt API] Raw AI response:', {
      contentLength: responseContent?.length,
      preview: responseContent?.substring(0, 200),
    });

    if (!responseContent) {
      console.error('[Optimize Prompt API] No response content from OpenAI');
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
      console.log('[Optimize Prompt API] Parsed response structure:', {
        keys: Object.keys(parsedResponse),
        hasPrompts: !!parsedResponse.prompts,
        isArray: Array.isArray(parsedResponse),
      });
    } catch (parseError) {
      console.error('[Optimize Prompt API] Failed to parse AI response:', {
        error: parseError,
        rawContent: responseContent,
      });
      throw new Error('Invalid AI response format');
    }

    // Extract prompts array (handle various possible response formats)
    let prompts =
      parsedResponse.prompts || parsedResponse.variations || parsedResponse;

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

    console.log('[Optimize Prompt API] Validation results:', {
      totalPrompts: prompts.length,
      validPrompts: validPrompts.length,
      invalidCount: prompts.length - validPrompts.length,
    });

    if (validPrompts.length === 0) {
      // This should rarely happen with the new system prompt
      console.error('[Optimize Prompt API] No valid prompts extracted!', {
        rawPrompts: prompts,
        parsedResponse,
      });

      // Return original with a note that optimization failed
      return NextResponse.json({
        prompts: [
          {
            text: description,
            focus: 'Original (optimization failed)',
          },
        ],
        warning: 'AI optimization unavailable, returning original description',
      });
    }

    console.log('[Optimize Prompt API] Successfully generated prompts:', {
      count: validPrompts.length,
      avgLength: Math.round(
        validPrompts.reduce((sum, p) => sum + p.text.length, 0) /
          validPrompts.length
      ),
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
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting (using 'processing' type - ai_optimization type doesn't exist in rate-limit config)
export const POST = withRateLimit(handlePost, 'processing');
