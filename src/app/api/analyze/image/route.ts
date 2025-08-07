import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  console.log('[Analyze Image API] Request received');

  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { imageUrl, analysisType = 'describe_for_recreation', customInstructions } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Import OpenAI dynamically (server-side only)
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Different analysis prompts based on the type
    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'describe_for_recreation':
        systemPrompt = `You are an expert at analyzing images for recreation in AI image generation. 
          Your task is to provide a detailed description that can be used to recreate a similar image.
          Focus on:
          1. The main subject and composition
          2. Text content (exact wording, fonts, styles)
          3. Colors and color schemes
          4. Art style and visual effects
          5. Layout and positioning
          
          IMPORTANT: For DTF printing, note if the image has a transparent background or if the subject is isolated.
          Format your response as a clear, detailed prompt that can be used with DALL-E 3.`;
        
        userPrompt = `Analyze this image and provide a detailed description that can be used to recreate it with AI image generation. 
          ${customInstructions ? `Additional instructions: ${customInstructions}` : ''}
          Be specific about any text in the image, including exact wording, positioning, and style.`;
        break;

      case 'extract_text':
        systemPrompt = `You are an expert at identifying and extracting text from images.
          List all text found in the image, including its position, style, and any decorative elements.`;
        userPrompt = 'Extract all text from this image and describe how it is styled and positioned.';
        break;

      case 'suggest_variations':
        systemPrompt = `You are an expert at suggesting creative variations of existing designs.
          Based on the image, suggest 3-5 variations that would work well for DTF printing.
          Focus on text replacements, color variations, and style modifications.`;
        userPrompt = `Analyze this image and suggest variations that would be popular for DTF printing.
          ${customInstructions ? `Context: ${customInstructions}` : ''}`;
        break;

      default:
        systemPrompt = 'You are an expert image analyst.';
        userPrompt = customInstructions || 'Describe this image in detail.';
    }

    console.log('[Analyze Image API] Calling GPT-4 Vision...');

    // Call GPT-4 Vision API (using gpt-4o which has vision capabilities)
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // GPT-4 Omni model with vision capabilities
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { 
              type: "image_url", 
              image_url: { 
                url: imageUrl,
                detail: "high" // High detail for better analysis
              } 
            }
          ]
        }
      ],
      max_tokens: 1000,
    });

    const analysis = response.choices[0]?.message?.content || '';

    console.log('[Analyze Image API] Analysis complete');

    // If it's a recreation request, also generate a ready-to-use prompt
    let recreationPrompt = '';
    if (analysisType === 'describe_for_recreation') {
      // Clean up the analysis to create a more direct prompt
      recreationPrompt = analysis
        .replace(/^.*?(?=(?:Create|Design|Generate|An?|The))/i, '') // Remove any preamble
        .replace(/\. For DTF printing.*$/i, '') // Remove DTF-specific notes (we add those automatically)
        .trim();
    }

    return NextResponse.json({
      success: true,
      analysis,
      recreationPrompt,
      analysisType,
    });

  } catch (error: unknown) {
    console.error('[Analyze Image API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}