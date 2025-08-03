// Debug environment loading
if (process.env.NODE_ENV === 'development') {
  console.log('Loading env.ts - ClippingMagic vars:', {
    CLIPPINGMAGIC_API_KEY: process.env.CLIPPINGMAGIC_API_KEY ? 'SET' : 'NOT SET',
    CLIPPINGMAGIC_API_SECRET: process.env.CLIPPINGMAGIC_API_SECRET ? 'SET' : 'NOT SET',
  });
  console.log('Loading env.ts - Deep-Image vars:', {
    DEEP_IMAGE_API_KEY: process.env.DEEP_IMAGE_API_KEY ? 'SET' : 'NOT SET',
  });
}

export const env = {
  // Supabase Configuration (required)
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // AI Service APIs (server-side only for security)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  DEEP_IMAGE_API_KEY: process.env.DEEP_IMAGE_API_KEY || '',
  CLIPPINGMAGIC_API_KEY: process.env.CLIPPINGMAGIC_API_KEY || '',
  CLIPPINGMAGIC_API_SECRET: process.env.CLIPPINGMAGIC_API_SECRET || '',
  VECTORIZER_API_KEY: process.env.VECTORIZER_API_KEY || '',
  VECTORIZER_API_SECRET: process.env.VECTORIZER_API_SECRET || '',

  // Stripe Configuration (required for payments)
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // Stripe Product IDs (required for payment plans)
  STRIPE_BASIC_PLAN_PRICE_ID: process.env.STRIPE_BASIC_PLAN_PRICE_ID || '',
  STRIPE_STARTER_PLAN_PRICE_ID: process.env.STRIPE_STARTER_PLAN_PRICE_ID || '',
  STRIPE_PAYG_10_CREDITS_PRICE_ID: process.env.STRIPE_PAYG_10_CREDITS_PRICE_ID || '',
  STRIPE_PAYG_20_CREDITS_PRICE_ID: process.env.STRIPE_PAYG_20_CREDITS_PRICE_ID || '',
  STRIPE_PAYG_50_CREDITS_PRICE_ID: process.env.STRIPE_PAYG_50_CREDITS_PRICE_ID || '',

  // Email Configuration (optional)
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@dtfeditor.com',
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || 'DTF Editor',
  SENDGRID_WEBHOOK_PUBLIC_KEY: process.env.SENDGRID_WEBHOOK_PUBLIC_KEY || '',
  
  // SendGrid Template IDs
  SENDGRID_WELCOME_TEMPLATE_ID: process.env.SENDGRID_WELCOME_TEMPLATE_ID || '',
  SENDGRID_PURCHASE_TEMPLATE_ID: process.env.SENDGRID_PURCHASE_TEMPLATE_ID || '',
  SENDGRID_CREDIT_WARNING_TEMPLATE_ID: process.env.SENDGRID_CREDIT_WARNING_TEMPLATE_ID || '',
  SENDGRID_SUBSCRIPTION_TEMPLATE_ID: process.env.SENDGRID_SUBSCRIPTION_TEMPLATE_ID || '',
  
  // Mailgun Configuration
  MAILGUN_API_KEY: (process.env.MAILGUN_API_KEY || '').trim(),
  MAILGUN_DOMAIN: (process.env.MAILGUN_DOMAIN || '').trim(),
  MAILGUN_FROM_EMAIL: (process.env.MAILGUN_FROM_EMAIL || 'noreply@mg.dtfeditor.com').trim(),
  MAILGUN_FROM_NAME: (process.env.MAILGUN_FROM_NAME || 'DTF Editor').trim(),
  MAILGUN_WEBHOOK_SIGNING_KEY: (process.env.MAILGUN_WEBHOOK_SIGNING_KEY || '').trim(),

  // URLs
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000',
  
  // Admin/Cron
  CRON_SECRET: process.env.CRON_SECRET || '',

  // Feature Flags
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG: process.env.NODE_ENV === 'development',
} as const;

// Type for environment variables
export type Env = typeof env;

// Validation function to ensure essential env vars are present
export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Essential variables required for basic functionality
  const essentialVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: env.SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: env.SUPABASE_ANON_KEY },
  ];

  // Check essential variables
  const missingEssential = essentialVars.filter(varItem => !varItem.value);
  if (missingEssential.length > 0) {
    errors.push(
      `Missing essential environment variables: ${missingEssential.map(v => v.name).join(', ')}`
    );
  }

  // Check Stripe configuration (required for payments)
  if (!env.STRIPE_PUBLISHABLE_KEY) {
    warnings.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing - payment features will not work');
  }
  if (!env.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY is missing - payment processing will not work');
  }

  // Check AI service keys (optional but important for core features)
  if (!env.DEEP_IMAGE_API_KEY) {
    warnings.push('DEEP_IMAGE_API_KEY is missing - image upscaling will not work');
  }
  if (!env.CLIPPINGMAGIC_API_KEY || !env.CLIPPINGMAGIC_API_SECRET) {
    warnings.push('CLIPPINGMAGIC_API_KEY or CLIPPINGMAGIC_API_SECRET is missing - background removal will not work');
  }
  if (!env.VECTORIZER_API_KEY || !env.VECTORIZER_API_SECRET) {
    warnings.push('VECTORIZER_API_KEY or VECTORIZER_API_SECRET is missing - vectorization will not work');
  }
  if (!env.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY is missing - AI image generation will not work');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper function to check if a specific feature is available
export function isFeatureAvailable(feature: 'upscaling' | 'background-removal' | 'vectorization' | 'ai-generation' | 'payments' | 'email' | 'mailgun'): boolean {
  switch (feature) {
    case 'upscaling':
      return !!env.DEEP_IMAGE_API_KEY;
    case 'background-removal':
      return !!env.CLIPPINGMAGIC_API_KEY && !!env.CLIPPINGMAGIC_API_SECRET;
    case 'vectorization':
      return !!env.VECTORIZER_API_KEY && !!env.VECTORIZER_API_SECRET;
    case 'ai-generation':
      return !!env.OPENAI_API_KEY;
    case 'payments':
      return !!(env.STRIPE_PUBLISHABLE_KEY && env.STRIPE_SECRET_KEY);
    case 'email':
      return !!env.SENDGRID_API_KEY;
    case 'mailgun':
      return !!env.MAILGUN_API_KEY && !!env.MAILGUN_DOMAIN;
    default:
      return false;
  }
}
