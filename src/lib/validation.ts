import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

// Common validation schemas
export const schemas = {
  // User input schemas
  email: z.string().email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  // ID schemas
  uuid: z.string().uuid('Invalid UUID'),
  userId: z.string().uuid('Invalid user ID'),

  // Pagination schemas
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Search schema
  search: z.object({
    query: z.string().min(1).max(100),
    filters: z.record(z.string()).optional(),
  }),

  // File upload schema
  fileUpload: z.object({
    filename: z.string().max(255),
    mimetype: z.string().regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/i),
    size: z
      .number()
      .positive()
      .max(10 * 1024 * 1024), // 10MB max
  }),

  // Credit operation schemas
  creditOperation: z.object({
    amount: z.number().int().positive().max(1000),
    operation: z.enum(['add', 'deduct', 'refund']),
    reason: z.string().max(500).optional(),
  }),

  // Subscription schemas
  subscription: z.object({
    plan: z.enum(['free', 'starter', 'professional', 'business']),
    interval: z.enum(['monthly', 'yearly']).optional(),
  }),

  // Support ticket schemas
  supportTicket: z.object({
    subject: z.string().min(5).max(200),
    message: z.string().min(10).max(5000),
    category: z.enum([
      'bug',
      'feature_request',
      'billing',
      'technical',
      'other',
    ]),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  }),

  supportMessage: z.object({
    message: z.string().min(1).max(5000),
  }),

  // Admin operation schemas
  adminUserUpdate: z.object({
    is_active: z.boolean().optional(),
    is_admin: z.boolean().optional(),
    credits_remaining: z.number().int().min(0).optional(),
    subscription_plan: z.string().optional(),
  }),

  adminBulkOperation: z.object({
    user_ids: z.array(z.string().uuid()).min(1).max(100),
    operation: z.enum(['activate', 'deactivate', 'delete', 'add_credits']),
    data: z.record(z.any()).optional(),
  }),

  // Payment schemas
  checkoutSession: z.object({
    price_id: z.string(),
    quantity: z.number().int().positive().default(1),
    success_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
  }),

  // Image processing schemas
  imageProcess: z
    .object({
      image_url: z.string().url().optional(),
      image_id: z.string().uuid().optional(),
      operation: z.enum(['upscale', 'remove_background', 'vectorize']),
      options: z.record(z.any()).optional(),
    })
    .refine(data => data.image_url || data.image_id, {
      message: 'Either image_url or image_id must be provided',
    }),

  // AI generation schemas
  imageGeneration: z.object({
    prompt: z.string().min(3).max(1000),
    negative_prompt: z.string().max(500).optional(),
    style: z.string().optional(),
    aspect_ratio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).default('1:1'),
  }),
};

// Validation error response
export function validationError(errors: z.ZodError): NextResponse {
  const formattedErrors = errors.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return NextResponse.json(
    {
      error: 'Validation failed',
      details: formattedErrors,
    },
    { status: 400 }
  );
}

// Generic validation wrapper
export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: validationError(error) };
    }
    return {
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    };
  }
}

// Query parameter validation
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data: T; error?: never } | { data?: never; error: NextResponse } {
  try {
    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const data = schema.parse(params);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: validationError(error) };
    }
    return {
      error: NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      ),
    };
  }
}

// Sanitization helpers
export const sanitize = {
  // Remove HTML tags
  html: (input: string): string => {
    return input.replace(/<[^>]*>/g, '');
  },

  // Escape SQL special characters (use parameterized queries instead!)
  sql: (input: string): string => {
    return input
      .replace(/'/g, "''")
      .replace(/"/g, '""')
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  },

  // Sanitize filename
  filename: (input: string): string => {
    return input
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .slice(0, 255);
  },

  // Sanitize URL
  url: (input: string): string | null => {
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  },
};

// Common validation patterns
export const patterns = {
  // Alphanumeric with underscores and hyphens
  slug: /^[a-zA-Z0-9_-]+$/,

  // Phone number (basic international format)
  phone: /^\+?[1-9]\d{1,14}$/,

  // Credit card (basic validation)
  creditCard: /^[0-9]{13,19}$/,

  // Strong password
  strongPassword:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,

  // URL safe base64
  base64url: /^[A-Za-z0-9_-]+$/,
};
