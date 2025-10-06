import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

async function handleGetHealth(request: NextRequest) {
  // Verify admin authentication
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {
      database: { status: 'unknown', latency: 0 },
      storage: { status: 'unknown', message: '' },
      redis: { status: 'unknown', message: '' },
      stripe: { status: 'unknown', message: '' },
      email: { status: 'unknown', provider: '' },
      ai_services: {
        openai: { status: 'unknown', message: '' },
        deepImage: { status: 'unknown', message: '' },
        clippingMagic: { status: 'unknown', message: '' },
        vectorizer: { status: 'unknown', message: '' },
      },
    },
    environment: {
      node_version: process.version,
      deployment: process.env.VERCEL_ENV || 'development',
      region: process.env.VERCEL_REGION || 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    },
    configuration: {
      supabase: false,
      stripe: false,
      redis: false,
      email: false,
      ai_services: {
        openai: false,
        deepImage: false,
        clippingMagic: false,
        vectorizer: false,
      },
    },
  };

  try {
    // Check Database (Supabase)
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const startTime = Date.now();
      const supabase = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      health.services.database.latency = Date.now() - startTime;

      if (!error) {
        health.services.database.status = 'healthy';
        health.configuration.supabase = true;
      } else {
        health.services.database.status = 'error';
      }
    }

    // Check Storage (Supabase Storage)
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data, error } = await supabase.storage.listBuckets();

      if (!error && data) {
        health.services.storage.status = 'healthy';
        health.services.storage.message = `${data.length} buckets available`;
      } else {
        health.services.storage.status = 'error';
        health.services.storage.message = error?.message || 'Unknown error';
      }
    }

    // Check Redis
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      health.services.redis.status = 'healthy';
      health.services.redis.message = 'Redis configured';
      health.configuration.redis = true;
    } else {
      health.services.redis.status = 'warning';
      health.services.redis.message = 'Using in-memory fallback';
    }

    // Check Stripe
    if (env.STRIPE_SECRET_KEY) {
      health.services.stripe.status = 'healthy';
      health.services.stripe.message = env.STRIPE_SECRET_KEY.startsWith(
        'sk_live'
      )
        ? 'Live mode'
        : 'Test mode';
      health.configuration.stripe = true;
    } else {
      health.services.stripe.status = 'error';
      health.services.stripe.message = 'Not configured';
    }

    // Check Email
    if (env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN) {
      health.services.email.status = 'healthy';
      health.services.email.provider = 'Mailgun';
      health.configuration.email = true;
    } else if (env.SENDGRID_API_KEY) {
      health.services.email.status = 'healthy';
      health.services.email.provider = 'SendGrid';
      health.configuration.email = true;
    } else {
      health.services.email.status = 'warning';
      health.services.email.provider = 'Not configured';
    }

    // Check AI Services
    if (env.OPENAI_API_KEY) {
      health.services.ai_services.openai.status = 'configured';
      health.services.ai_services.openai.message = 'API key present';
      health.configuration.ai_services.openai = true;
    }

    if (env.DEEP_IMAGE_API_KEY) {
      health.services.ai_services.deepImage.status = 'configured';
      health.services.ai_services.deepImage.message = 'API key present';
      health.configuration.ai_services.deepImage = true;
    }

    if (env.CLIPPINGMAGIC_API_KEY && env.CLIPPINGMAGIC_API_SECRET) {
      health.services.ai_services.clippingMagic.status = 'configured';
      health.services.ai_services.clippingMagic.message = 'Credentials present';
      health.configuration.ai_services.clippingMagic = true;
    }

    if (env.VECTORIZER_API_KEY && env.VECTORIZER_API_SECRET) {
      health.services.ai_services.vectorizer.status = 'configured';
      health.services.ai_services.vectorizer.message = 'Credentials present';
      health.configuration.ai_services.vectorizer = true;
    }

    // Determine overall status
    const hasErrors = Object.values(health.services).some(
      service =>
        typeof service === 'object' &&
        'status' in service &&
        service.status === 'error'
    );

    health.status = hasErrors ? 'degraded' : 'healthy';

    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        ...health,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGetHealth, 'admin');
