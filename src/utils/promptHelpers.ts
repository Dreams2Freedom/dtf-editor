/**
 * Client-safe prompt helper functions
 * These don't require OpenAI API and can be used in client components
 */

// ============================================================================
// CRITICAL: Transparent Background Enforcement
// ============================================================================

/**
 * Enforces transparent background requirement on any prompt
 * This is the FINAL gate before GPT-Image-1 - called in API routes
 *
 * CRITICAL FOR DTF PRINTING: Every image MUST have transparent background
 * This function ensures 100% compliance regardless of user input
 */
export function enforceTransparentBackground(prompt: string): string {
  const transparentBgInstructions = [
    'on a transparent background',
    'isolated subject with no background',
    'clean PNG with alpha channel',
    'no background elements or scenery',
    'subject only, transparent backdrop',
    'remove all backgrounds, keep subject isolated',
  ].join(', ');

  return `${prompt.trim()}, ${transparentBgInstructions}`;
}

/**
 * System prompt for GPT-4 when generating optimized prompts
 * Expert-level prompt engineering for DALL-E 3 image generation
 * Optimized for DTF printing with transparent backgrounds
 */
export const PROMPT_OPTIMIZATION_SYSTEM_PROMPT = `
You are an expert prompt engineer specializing in DALL-E 3 image generation for DTF (Direct-to-Film) printing.

YOUR MISSION: Transform simple user descriptions into professional, detailed prompts that produce stunning images perfect for fabric printing.

## PROMPT ENHANCEMENT FRAMEWORK

Every enhanced prompt must include these elements:

1. **SUBJECT & COMPOSITION**
   - What is the main subject (object, character, text, design)
   - How is it positioned and composed
   - Subject isolation (no backgrounds)

2. **ARTISTIC STYLE**
   - Visual style (photorealistic, vector art, cartoon, vintage, watercolor, etc.)
   - Art movement or reference (retro 80s, minimalist, grunge, kawaii, etc.)
   - Level of detail (simple/clean vs intricate/detailed)

3. **COLOR PALETTE**
   - Specific colors with descriptive adjectives
   - Color harmony and contrast
   - Vibrant, saturated colors for fabric printing

4. **VISUAL DETAILS**
   - Textures, patterns, materials
   - Lighting and atmosphere (if applicable to subject)
   - Fine details that make the design pop

5. **TYPOGRAPHY (if text is involved)**
   - Font style (bold, script, vintage, modern, hand-drawn)
   - Text integration with design elements
   - Legibility and visual impact

6. **DTF PRINTING REQUIREMENTS** (CRITICAL)
   - Always mention "transparent background" or "isolated on transparent backdrop"
   - "No background elements"
   - High contrast for fabric printing
   - Clean, sharp edges

## FEW-SHOT EXAMPLES

**Example 1:**
Input: "dog with sunglasses"
Output: "A photorealistic golden retriever wearing trendy aviator sunglasses with mirrored lenses reflecting blue sky. The dog's fur is beautifully detailed with warm honey-gold tones, friendly expression with tongue out. Cool, confident pose. Vibrant warm colors with high contrast. Clean, professional pet portrait style. Isolated subject on transparent background with no scenery, perfect for DTF printing."

**Example 2:**
Input: "birthday cake"
Output: "An elegant three-tier birthday cake with pastel pink frosting, decorated with delicate buttercream roses in cream and blush tones. Gold fondant accents and edible pearls create a luxurious look. Realistic cake texture with visible frosting swirls. Soft, dreamy color palette of pink, cream, white, and gold. Professional bakery photography style. Isolated on transparent background, no table or backdrop, ideal for DTF transfer printing."

**Example 3:**
Input: "skull with flowers"
Output: "A stylized sugar skull (calavera) adorned with vibrant marigolds and roses. Intricate decorative patterns cover the skull with swirls, dots, and geometric designs in electric pink, turquoise, orange, and purple. Realistic flowers intertwined with ornamental skull details. Day of the Dead inspired art style with bold outlines and saturated colors. High contrast design perfect for fabric. Isolated subject on transparent background, no scenery elements."

**Example 4:**
Input: "motivational quote"
Output: "Bold motivational text 'NEVER GIVE UP' in strong sans-serif typography with distressed, weathered texture. Industrial grunge aesthetic with concrete texture overlay. Dark charcoal gray lettering with subtle orange and teal accent elements. Powerful, masculine design style. High contrast black and dark gray with strategic pops of color. Professional graphic design for apparel. Text isolated on transparent background, no decorative elements outside the letters."

## VARIATION STRATEGY

Create 4 distinct variations:
1. **Style-Focused**: Change the artistic style (vintage → modern, realistic → cartoon, etc.)
2. **Color-Focused**: Different color palettes and moods
3. **Detail-Focused**: Vary complexity (simple/clean vs intricate/ornate)
4. **Mood-Focused**: Different emotional tones or themes

## OUTPUT FORMAT

Return ONLY valid JSON with this structure:
{
  "prompts": [
    {
      "text": "Detailed 50-100 word enhanced prompt here...",
      "focus": "Vintage Style"
    },
    {
      "text": "Another detailed prompt with different approach...",
      "focus": "Modern Minimalist"
    }
  ]
}

## CRITICAL RULES

1. ✅ ALWAYS include "transparent background" or "isolated on transparent backdrop"
2. ✅ NO backgrounds, scenery, environmental elements, or settings
3. ✅ Focus on the subject only - what would look great isolated on a shirt
4. ✅ Use vivid, descriptive language with specific colors and styles
5. ✅ Each prompt should be 50-100 words of rich detail
6. ✅ Make prompts distinct from each other
7. ✅ Emphasize high contrast and vibrant colors for fabric
8. ❌ NEVER include backgrounds, rooms, outdoor settings, or context
9. ❌ NEVER use vague descriptions like "nice" or "cool"
10. ❌ NEVER return prompts under 40 words

Remember: You're creating prompts for DALL-E 3, so be specific, vivid, and detailed. The better the prompt, the better the image!
`;

/**
 * System prompt for GPT-4 Vision when analyzing images
 * This instructs Vision API to focus only on subjects, ignoring backgrounds
 */
export const IMAGE_ANALYSIS_SYSTEM_PROMPT = `
Analyze this image and describe ONLY the main subject, completely ignoring the background.

Focus on:
- The primary subject (person, object, design element, text, logo)
- Colors, style, and visual characteristics of the subject
- Details, patterns, textures on the subject itself
- The subject's composition and visual appeal

Completely ignore:
- Background elements
- Environmental context
- Setting, location, or scenery
- Any background colors or patterns

Describe the subject as if it will be isolated on a transparent background for DTF (Direct-to-Film) printing on fabric. Focus on what makes the subject visually interesting and print-worthy.

Your description should be detailed enough to recreate the subject, but should not mention anything about the background or setting.
`;

// ============================================================================
// DTF Enhancement Functions
// ============================================================================

/**
 * Get suggested prompt enhancements for DTF printing
 * CRITICAL: Always adds transparent background requirement for DTF
 */
export function enhancePromptForDTF(basePrompt: string): string {
  // CRITICAL DTF Requirements - ALWAYS ADDED
  const criticalDTFRequirements = [
    'transparent background',
    'isolated subject on transparent background',
    'no background elements',
    'PNG format with transparency',
    'clean edges for printing',
  ];

  // Additional quality enhancements
  const dtfEnhancements = [
    'high resolution',
    'detailed',
    'sharp edges',
    'suitable for DTF transfer printing',
    'vibrant colors optimized for fabric',
    'professional design',
  ];

  // Start with the base prompt
  let enhancedPrompt = basePrompt;

  // ALWAYS add transparent background requirement - this is critical for DTF
  if (!/transparent|no background|isolated/i.test(basePrompt)) {
    enhancedPrompt +=
      ', on a completely transparent background with no background elements';
  }

  // Check if the prompt already mentions printing/DTF
  const hasPrintingContext =
    /print|dtf|transfer|shirt|apparel|fabric|garment/i.test(basePrompt);

  if (!hasPrintingContext) {
    enhancedPrompt +=
      ', optimized for DTF (Direct to Film) transfer printing on fabric';
  }

  // Add quality modifiers if not present
  const hasQualityModifiers =
    /high resolution|detailed|quality|professional|sharp|clear/i.test(
      basePrompt
    );

  if (!hasQualityModifiers) {
    enhancedPrompt +=
      ', ultra high resolution, sharp details, professional quality';
  }

  // Always end with explicit transparency instruction
  enhancedPrompt +=
    '. IMPORTANT: Generate with completely transparent background (no background color or elements), isolated subject only, PNG format with full transparency support for DTF printing.';

  return enhancedPrompt;
}

/**
 * Get prompt suggestions based on category
 */
export function getPromptSuggestions(
  category: 'general' | 'fashion' | 'sports' | 'nature' | 'abstract' | 'vintage'
): string[] {
  const suggestions = {
    general: [
      'A cute cartoon cat wearing sunglasses, vibrant colors, sticker style, isolated on transparent background',
      'Retro 80s neon geometric pattern, synthwave aesthetic, no background',
      'Minimalist mountain landscape silhouette, clean vector style, transparent background',
      'Graffiti art style text saying "DREAMS", urban street art, isolated design',
      'Cute kawaii food characters having a party, pastel colors, transparent PNG',
    ],
    fashion: [
      'Elegant floral pattern with roses and gold accents, vintage botanical',
      'Modern streetwear graphic with bold typography, urban style',
      'Boho mandala design with intricate patterns, earth tones',
      'Glamorous lips with dripping gold, luxury fashion',
      'Abstract fashion illustration, watercolor style, haute couture',
    ],
    sports: [
      'Dynamic basketball player silhouette dunking, action pose',
      'Vintage baseball team logo, retro americana style',
      'Mountain bike jumping over terrain, extreme sports style',
      'Motivational fitness quote with weights, gym aesthetic',
      'Soccer ball with fire effects, intense sports graphic',
    ],
    nature: [
      'Majestic wolf howling at the moon, forest silhouette',
      'Tropical paradise with palm trees and sunset, beach vibes',
      'Detailed butterfly with galaxy wings, cosmic nature fusion',
      'Forest camping scene with tent and campfire, adventure style',
      'Ocean waves with dolphins jumping, marine life illustration',
    ],
    abstract: [
      'Liquid metal flowing shapes, chrome effect, futuristic',
      'Psychedelic spiral patterns, rainbow colors, trippy art',
      'Sacred geometry with golden ratio, mystical symbols',
      'Glitch art with digital distortion, cyberpunk aesthetic',
      'Abstract paint splatter explosion, vibrant color burst',
    ],
    vintage: [
      'Classic pin-up girl illustration, 1950s retro style',
      'Vintage motorcycle with wings, traditional tattoo style',
      'Old school boombox with cassette tapes, 90s nostalgia',
      'Retro diner sign with neon lights, americana',
      'Victorian ornamental frame with flourishes, antique design',
    ],
  };

  return suggestions[category] || suggestions.general;
}

/**
 * Validate if a prompt is appropriate before sending to API
 * This is a basic check - OpenAI has its own content filters
 */
export function validatePrompt(prompt: string): {
  valid: boolean;
  reason?: string;
} {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, reason: 'Prompt cannot be empty' };
  }

  if (prompt.length > 4000) {
    return { valid: false, reason: 'Prompt is too long (max 4000 characters)' };
  }

  // Basic content checks (OpenAI will do more thorough checking)
  const bannedWords: string[] = [
    // Add any words you want to pre-filter
    // OpenAI has its own content policy enforcement
  ];

  const lowerPrompt = prompt.toLowerCase();
  for (const word of bannedWords) {
    if (lowerPrompt.includes(word.toLowerCase())) {
      return {
        valid: false,
        reason: 'Prompt contains inappropriate content',
      };
    }
  }

  return { valid: true };
}
