/**
 * SEC-030: Server-only environment variables.
 *
 * This module MUST only be imported from server-side code (API routes, server
 * components, middleware). Importing from a client component will throw at
 * build time thanks to the 'server-only' guard below.
 *
 * For client-safe variables (NEXT_PUBLIC_*), import from '@/config/env' instead.
 */
import 'server-only';

export const serverEnv = {
  // Supabase service role — full DB access, NEVER expose to client
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // AI Service API keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  DEEP_IMAGE_API_KEY: process.env.DEEP_IMAGE_API_KEY || '',
  CLIPPINGMAGIC_API_KEY: process.env.CLIPPINGMAGIC_API_KEY || '',
  CLIPPINGMAGIC_API_SECRET: process.env.CLIPPINGMAGIC_API_SECRET || '',
  VECTORIZER_API_KEY: process.env.VECTORIZER_API_KEY || '',
  VECTORIZER_API_SECRET: process.env.VECTORIZER_API_SECRET || '',

  // Stripe secret keys
  STRIPE_SECRET_KEY:
    process.env.NODE_ENV === 'production' && process.env.STRIPE_LIVE_SECRET_KEY
      ? process.env.STRIPE_LIVE_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET:
    process.env.NODE_ENV === 'production' &&
    process.env.STRIPE_LIVE_WEBHOOK_SECRET
      ? process.env.STRIPE_LIVE_WEBHOOK_SECRET
      : process.env.STRIPE_WEBHOOK_SECRET || '',

  // Email service keys
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  SENDGRID_WEBHOOK_PUBLIC_KEY: process.env.SENDGRID_WEBHOOK_PUBLIC_KEY || '',
  MAILGUN_API_KEY: (process.env.MAILGUN_API_KEY || '').trim(),
  MAILGUN_WEBHOOK_SIGNING_KEY: (
    process.env.MAILGUN_WEBHOOK_SIGNING_KEY || ''
  ).trim(),

  // Admin/Cron secrets
  CRON_SECRET: process.env.CRON_SECRET || '',

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

  // Cookie signing
  COOKIE_SIGNING_SECRET: process.env.COOKIE_SIGNING_SECRET || '',
} as const;

export type ServerEnv = typeof serverEnv;
