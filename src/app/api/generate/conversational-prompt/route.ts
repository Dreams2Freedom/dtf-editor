import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { withRateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;
export const runtime = 'nodejs';

// Zod schema for structured AI conversation responses
// NOTE: OpenAI structured output requires optional fields to use .nullable() or .default()
const ConversationResponse = z.object({
  message: z.string(), // AI's response message
  quickReplies: z.array(z.string()).default([]), // Suggested quick reply options (default to empty array)
  isComplete: z.boolean(), // True when ready to generate image
  finalPrompt: z.string().nullable().default(null), // Only provided when isComplete=true
  nextQuestionType: z
    .enum(['style', 'typography', 'color', 'detail', 'mood', 'confirmation'])
    .nullable()
    .default(null),
  progress: z.object({
    current: z.number(),
    total: z.number(),
  }),
});

type ConversationResponseType = z.infer<typeof ConversationResponse>;

// System prompt for intelligent conversation flow (optimized for token efficiency)
const CONVERSATION_SYSTEM_PROMPT = `You are a DTF design assistant helping create AI image prompts.

TASK: Ask 3-5 targeted questions to build a detailed GPT-Image-1 image prompt.

QUESTION TYPES (ask only relevant):
- Style: realistic, cartoon, vintage, modern, minimalist, etc.
- Typography (if text): bold, script, handwritten, athletic, etc.
- Color: vibrant, pastel, monochrome, specific colors
- Detail: simple/clean vs intricate/ornate
- Mood: energetic, playful, fierce, elegant, etc.

SMART QUESTIONING:
- Text mentioned? → Ask typography
- Characters/objects? → Ask style & detail
- Vague/abstract? → Ask colors & mood

CONTEXTUAL EXAMPLES:
- When asking about details/objects, provide 2-3 relevant examples based on the theme
- Detect theme from user's description (sports, holidays, seasons, activities, etc.)
- Common themes and their detail examples:
  * Baseball → "like a baseball bat or glove"
  * Football → "like a helmet or football"
  * Basketball → "like a basketball or hoop"
  * Soccer → "like a soccer ball or cleats"
  * Cheerleading → "like pom-poms or megaphone"
  * Beach/Summer → "like an umbrella or sun"
  * Halloween → "like pumpkins or treat bag"
  * Christmas → "like ornaments or snowflakes"
  * Birthday → "like balloons or cake"
  * Graduation → "like a cap or diploma"
  * Fishing → "like a fishing rod or tackle box"
  * Camping → "like a tent or campfire"
  * Music → "like instruments or musical notes"
- Phrase as: "Would you like to add any details like [example1] or [example2]?"
- Keep examples SHORT (2-5 words each) and RELEVANT to the theme

MESSAGE RULES:
- Each message MUST be complete and self-contained
- NEVER say "Here's a summary" or "I'll ask about" without immediately providing the content
- Ask ONE clear, specific question per message
- Be direct - no filler or promises about what you'll do

CLARIFICATION RULES:
- If user gives an AMBIGUOUS answer, ask ONE simple follow-up BEFORE continuing
- Common ambiguous answers that NEED clarification:
  * "Team colors" → "Which team? (e.g., Lakers, Yankees, Chiefs)"
  * "School colors" → "Which school?"
  * "Brand colors" → "Which brand?"
  * "My favorite colors" → "What are your favorite colors?"
  * "Something bright" → "Like bright red, bright blue, or bright yellow?"
- Use the team/brand NAME to infer colors (e.g., Warriors = blue and gold)
- Accept simple color descriptions: "bright red", "dark blue", "forest green"
- NEVER ask for hex codes, RGB values, or technical color info
- After getting clarification, move to the next question naturally

CONVERSATION SCOPE:
- ONLY discuss: style, typography, colors, mood, composition, details for the IMAGE
- If user asks OFF-TOPIC questions, gently redirect in ONE sentence:
  * Pricing → "For pricing info, check the Pricing page. Now, what style works best for your design?"
  * Account/tech support → "For account help, contact support. Let's focus on your design - what mood are you going for?"
  * Random topics → "I'm here to help design your image! What colors would you like to use?"
- Keep redirects FRIENDLY and BRIEF
- Immediately ask the next design question after redirecting

QUICK REPLIES: Provide 4-5 diverse options (2-5 words each)

COMPLETION: After 3-5 questions OR user says done/skip/enough:
- Set isComplete: true
- Write 50-100 word GPT-Image-1 prompt in finalPrompt
- ALWAYS include "transparent background" or "isolated on transparent backdrop"
- Focus ONLY on subject - NO backgrounds or scenery (for DTF printing)

TONE: Friendly, concise (1-2 sentences max per question)

OUTPUT: Valid JSON only. No other text.`;

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
      max_tokens: 2000, // Increased to ensure structured output isn't truncated
      response_format: zodResponseFormat(
        ConversationResponse,
        'conversation_response'
      ),
    });

    const parsed = completion.choices[0]?.message?.parsed;

    if (!parsed) {
      console.error(
        '[Conversational Prompt API] No parsed response from OpenAI',
        {
          refusal: completion.choices[0]?.message?.refusal,
          finishReason: completion.choices[0]?.finish_reason,
        }
      );

      // Check if response was truncated
      if (completion.choices[0]?.finish_reason === 'length') {
        return NextResponse.json(
          { error: 'Response was too long. Please try a shorter message.' },
          { status: 400 }
        );
      }

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
