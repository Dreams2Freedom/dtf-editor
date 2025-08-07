/**
 * Client-safe prompt helper functions
 * These don't require OpenAI API and can be used in client components
 */

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
    enhancedPrompt += ', on a completely transparent background with no background elements';
  }
  
  // Check if the prompt already mentions printing/DTF
  const hasPrintingContext = /print|dtf|transfer|shirt|apparel|fabric|garment/i.test(basePrompt);
  
  if (!hasPrintingContext) {
    enhancedPrompt += ', optimized for DTF (Direct to Film) transfer printing on fabric';
  }

  // Add quality modifiers if not present
  const hasQualityModifiers = /high resolution|detailed|quality|professional|sharp|clear/i.test(basePrompt);
  
  if (!hasQualityModifiers) {
    enhancedPrompt += ', ultra high resolution, sharp details, professional quality';
  }

  // Always end with explicit transparency instruction
  enhancedPrompt += '. IMPORTANT: Generate with completely transparent background (no background color or elements), isolated subject only, PNG format with full transparency support for DTF printing.';

  return enhancedPrompt;
}

/**
 * Get prompt suggestions based on category
 */
export function getPromptSuggestions(category: 'general' | 'fashion' | 'sports' | 'nature' | 'abstract' | 'vintage'): string[] {
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
export function validatePrompt(prompt: string): { valid: boolean; reason?: string } {
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
        reason: 'Prompt contains inappropriate content' 
      };
    }
  }

  return { valid: true };
}