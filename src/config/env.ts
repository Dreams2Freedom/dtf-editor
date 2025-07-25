export const env = {
  // Supabase Configuration
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,

  // AI Service APIs (optional in development)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  DEEP_IMAGE_API_KEY: process.env.DEEP_IMAGE_API_KEY || '',
  CLIPPINGMAGIC_API_KEY: process.env.CLIPPINGMAGIC_API_KEY || '',
  VECTORIZER_API_KEY: process.env.VECTORIZER_API_KEY || '',

  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,

  // Email Configuration (optional in development)
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',

  // Marketing Configuration (optional in development)
  GOHIGHLEVEL_API_KEY: process.env.GOHIGHLEVEL_API_KEY || '',
  GOHIGHLEVEL_LOCATION_ID: process.env.GOHIGHLEVEL_LOCATION_ID || '',

  // Application Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET!,
  SESSION_SECRET: process.env.SESSION_SECRET!,
  COOKIE_SECRET: process.env.COOKIE_SECRET!,

  // URLs
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Feature Flags
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
} as const;

// Type for environment variables
export type Env = typeof env;

// Validation function to ensure essential env vars are present
export function validateEnv() {
  // Essential variables required for basic functionality
  const essentialVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'JWT_SECRET',
    'SESSION_SECRET',
    'COOKIE_SECRET',
  ];

  const missingVars = essentialVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    // Don't throw error for now - just warn
    // throw new Error(
    //   `Missing essential environment variables: ${missingVars.join(', ')}`
    // );
  }

  // Optional variables for development (warn if missing)
  const optionalVars = [
    'OPENAI_API_KEY',
    'DEEP_IMAGE_API_KEY',
    'CLIPPINGMAGIC_API_KEY',
    'VECTORIZER_API_KEY',
    'SENDGRID_API_KEY',
  ];

  const missingOptionalVars = optionalVars.filter(varName => !process.env[varName]);

  if (missingOptionalVars.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(`⚠️  Missing optional environment variables (features will be disabled): ${missingOptionalVars.join(', ')}`);
  }
}

// Development-only validation
if (process.env.NODE_ENV === 'development') {
  validateEnv();
}
