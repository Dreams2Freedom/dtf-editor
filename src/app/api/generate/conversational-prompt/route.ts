import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { withRateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;
export const runtime = 'nodejs';

// Zod schema for structured AI conversation responses
const ConversationResponse = z.object({
  message: z.string(), // AI's response message
  quickReplies: z.array(z.string()).optional(), // Suggested quick reply options
  isComplete: z.boolean(), // True when ready to generate image
  finalPrompt: z.string().optional(), // Only provided when isComplete=true
  nextQuestionType: z
    .enum(['style', 'typography', 'color', 'detail', 'mood', 'confirmation'])
    .optional(),
  progress: z.object({
    current: z.number(),
    total: z.number(),
  }),
});

type ConversationResponseType = z.infer<typeof ConversationResponse>;

// System prompt for intelligent conversation flow
const CONVERSATION_SYSTEM_PROMPT = `You are an expert DTF (Direct to Film) design assistant helping users create perfect AI image prompts for DALL-E.

Your role: Ask strategic follow-up questions to build a detailed, optimized prompt for image generation.

CONVERSATION STRATEGY:
1. Analyze the user's initial description carefully
2. Ask 3-5 targeted questions based on what information is missing
3. Adapt questions intelligently to the type of design they're requesting
4. Build toward a complete, vivid 50-100 word DALL-E prompt
5. After 3-5 questions OR when user indicates they're done, mark isComplete: true

QUESTION CATEGORIES (ask only relevant ones):
- **Style**: Artistic style (realistic, cartoon, vintage, modern, minimalist, abstract, etc.)
- **Typography**: Font style IF text is involved (bold block letters, script, handwritten, athletic, geometric, etc.)
- **Color**: Color palette, dominant colors, mood (vibrant, pastel, monochrome, team colors, etc.)
- **Detail**: Complexity level (simple/clean vs intricate/ornate/detailed)
- **Mood**: Emotional tone (energetic, playful, fierce, professional, elegant, fun, etc.)
- **Elements**: Specific objects, decorations, symbols, or embellishments to include

INTELLIGENT QUESTION LOGIC:
- IF description contains text/words → Ask typography questions (font style, layout, text treatment)
- IF description mentions characters/objects → Ask style and detail questions
- IF description is abstract/vague → Ask about colors, mood, and intended use
- SKIP irrelevant questions (e.g., don't ask about fonts if there's no text)

QUICK REPLIES:
- Provide 4-5 specific, relevant quick reply options for each question
- Make options diverse and cover different aesthetics
- Include an "Other" or "Custom" option when appropriate
- Keep each option short (2-5 words max)

COMPLETION RULES:
- Mark isComplete: true after 3-5 exchanges OR when user says "done", "skip", "that's enough", etc.
- When complete, provide a rich, detailed 50-100 word DALL-E prompt in finalPrompt
- ALWAYS include "transparent background" or "isolated on transparent backdrop" in final prompt
- Focus ONLY on the subject/design - NO backgrounds, scenery, or environmental elements
- The image will be used for DTF fabric printing, so ensure subject is clear and isolated

TONE:
- Friendly, encouraging, and concise
- Keep questions short (1-2 sentences max)
- Build on previous answers naturally
- Show enthusiasm about their design

OUTPUT FORMAT:
Return ONLY valid JSON matching the ConversationResponse schema. Do not include any other text.`;

/**
 * POST /api/generate/conversational-prompt
 *
 * Manages conversational flow for building optimized AI image prompts.
 * Uses GPT-4o-mini with structured output for intelligent question generation.
 *
 * This is FREE for authenticated users - does not deduct credits.
 * Only actual image generation in Step 3 costs credits.
 */
async function handlePost(request: NextRequest) {
  try {
    // Authenticate user
    console.log('[Conversational Prompt API] Authenticating user...');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Conversational Prompt API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    console.log('[Conversational Prompt API] User authenticated:', user.id);

    // Parse request body
    const body = await request.json();
    const { conversationHistory = [], userMessage } = body;

    console.log('[Conversational Prompt API] Request:', {
      userId: user.id,
      historyLength: conversationHistory.length,
      hasNewMessage: !!userMessage,
    });

    // Validate conversation history
    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'Invalid conversation history format' },
        { status: 400 }
      );
    }

    // Prevent abuse - limit conversation length
    if (conversationHistory.length >= 40) {
      // 20 exchanges max
      console.warn(
        '[Conversational Prompt API] Conversation too long, forcing completion'
      );
      return NextResponse.json({
        message:
          "I have enough information! Let's create your image with what we discussed.",
        isComplete: true,
        finalPrompt: buildFallbackPrompt(conversationHistory),
        progress: { current: 5, total: 5 },
      });
    }

    // Build OpenAI messages array
    const messages = [
      { role: 'system' as const, content: CONVERSATION_SYSTEM_PROMPT },
      ...conversationHistory,
    ];

    // Add new user message if provided
    if (userMessage && typeof userMessage === 'string') {
      messages.push({ role: 'user' as const, content: userMessage.trim() });
    }

    console.log('[Conversational Prompt API] Calling OpenAI with', {
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 50),
    });

    // Dynamically import OpenAI (server-side only)
    const OpenAI = (await import('openai')).default;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error(
        '[Conversational Prompt API] OpenAI API key not configured'
      );
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Call GPT-4o-mini with structured output (using Zod schema)
    const completion = await openai.chat.completions.parse({
      model: 'gpt-4o-mini', // Fast and cost-effective for conversations
      messages,
      temperature: 0.8, // Creative but focused
      max_tokens: 1000,
      response_format: zodResponseFormat(
        ConversationResponse,
        'conversation_response'
      ),
    });

    const parsed = completion.choices[0]?.message?.parsed;

    if (!parsed) {
      console.error(
        '[Conversational Prompt API] No parsed response from OpenAI'
      );
      throw new Error('Failed to get AI response');
    }

    console.log('[Conversational Prompt API] AI response:', {
      isComplete: parsed.isComplete,
      hasQuickReplies: !!parsed.quickReplies,
      messageLength: parsed.message?.length,
      progress: parsed.progress,
    });

    // Log usage for monitoring
    console.log('[Conversational Prompt API] Token usage:', {
      prompt: completion.usage?.prompt_tokens,
      completion: completion.usage?.completion_tokens,
      total: completion.usage?.total_tokens,
    });

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('[Conversational Prompt API] Error:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'AI service quota exceeded. Please try again later.' },
        { status: 503 }
      );
    }

    if (error.code === 'rate_limit_exceeded') {
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait a moment and try again.',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to process conversation',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Build a fallback prompt from conversation history when AI service fails
 * or conversation gets too long
 */
function buildFallbackPrompt(conversationHistory: any[]): string {
  // Extract user messages
  const userMessages = conversationHistory
    .filter((msg: any) => msg.role === 'user')
    .map((msg: any) => msg.content)
    .join(' ');

  // Create a basic prompt with transparent background
  return `${userMessages}, professional design with clean details, isolated on transparent background for DTF printing`;
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'processing');
