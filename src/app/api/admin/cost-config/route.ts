import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import { AdminAuditService } from '@/services/adminAudit';

// GET - Fetch current cost configurations
async function handleGet(request: NextRequest) {
  try {
    // Authenticate user with anon client
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for admin operations (bypasses RLS)
    const serviceClient = createServiceRoleClient();

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all cost configurations
    const { data: configs, error } = await serviceClient
      .from('api_cost_config')
      .select('*')
      .order('provider')
      .order('operation');

    if (error) {
      console.error('Error fetching cost configs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch configurations' },
        { status: 500 }
      );
    }

    // If no configs exist, return default values
    if (!configs || configs.length === 0) {
      const defaultConfigs = [
        {
          provider: 'deep_image',
          operation: 'upscale',
          cost_per_unit: 0.08,
          unit_description: 'per image',
        },
        {
          provider: 'clipping_magic',
          operation: 'background_removal',
          cost_per_unit: 0.125,
          unit_description: 'per image',
        },
        {
          provider: 'vectorizer',
          operation: 'vectorization',
          cost_per_unit: 0.2,
          unit_description: 'per image',
        },
        {
          provider: 'openai',
          operation: 'image_generation',
          cost_per_unit: 0.17,
          unit_description: 'per image (1024x1024)',
        },
        {
          provider: 'stripe',
          operation: 'payment_processing',
          cost_per_unit: 0.029,
          unit_description: 'per transaction (+ $0.30 fixed)',
        },
      ];

      return NextResponse.json({
        configs: defaultConfigs,
        isDefault: true,
      });
    }

    return NextResponse.json({
      configs,
      isDefault: false,
    });
  } catch (error) {
    console.error('Cost config fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update cost configuration
async function handlePost(request: NextRequest) {
  try {
    // Authenticate user with anon client
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for admin operations (bypasses RLS)
    const serviceClient = createServiceRoleClient();

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { provider, operation, cost_per_unit, unit_description, notes } =
      body;

    // Validate inputs
    if (
      !provider ||
      !operation ||
      cost_per_unit === undefined ||
      cost_per_unit === null
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (cost_per_unit < 0) {
      return NextResponse.json(
        { error: 'Cost cannot be negative' },
        { status: 400 }
      );
    }

    // Check if configuration exists
    const { data: existingConfig } = await serviceClient
      .from('api_cost_config')
      .select('*')
      .eq('provider', provider)
      .eq('operation', operation)
      .single();

    let result;
    let action;

    if (existingConfig) {
      // Update existing configuration
      const { data, error } = await serviceClient
        .from('api_cost_config')
        .update({
          cost_per_unit,
          unit_description: unit_description || existingConfig.unit_description,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating cost config:', error);
        return NextResponse.json(
          { error: 'Failed to update configuration' },
          { status: 500 }
        );
      }

      result = data;
      action = 'updated';
    } else {
      // Insert new configuration
      const { data, error } = await serviceClient
        .from('api_cost_config')
        .insert({
          provider,
          operation,
          cost_per_unit,
          unit_description: unit_description || 'per unit',
          notes,
          effective_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting cost config:', error);
        return NextResponse.json(
          { error: 'Failed to create configuration' },
          { status: 500 }
        );
      }

      result = data;
      action = 'created';
    }

    // Log audit entry
    const auditService = AdminAuditService.getInstance();
    await auditService.logAction(
      {
        user: {
          id: user.id,
          email: user.email || '',
        },
        role: 'admin',
        createdAt: new Date(),
      },
      {
        action: 'settings.update',
        resource_type: 'system',
        resource_id: result.id,
        details: {
          type: 'api_cost_config',
          provider,
          operation,
          old_cost: existingConfig?.cost_per_unit,
          new_cost: cost_per_unit,
          action,
        },
      },
      request
    );

    return NextResponse.json({
      success: true,
      config: result,
      action,
    });
  } catch (error) {
    console.error('Cost config update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Bulk update configurations
async function handlePut(request: NextRequest) {
  try {
    // Authenticate user with anon client
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for admin operations (bypasses RLS)
    const serviceClient = createServiceRoleClient();

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { configs } = body;

    if (!Array.isArray(configs)) {
      return NextResponse.json(
        { error: 'Configs must be an array' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const config of configs) {
      const { provider, operation, cost_per_unit, unit_description, notes } =
        config;

      if (!provider || !operation || cost_per_unit === undefined) {
        errors.push(`Invalid config for ${provider}/${operation}`);
        continue;
      }

      // Check if exists
      const { data: existing } = await serviceClient
        .from('api_cost_config')
        .select('*')
        .eq('provider', provider)
        .eq('operation', operation)
        .single();

      if (existing) {
        // Update
        const { data, error } = await serviceClient
          .from('api_cost_config')
          .update({
            cost_per_unit,
            unit_description: unit_description || existing.unit_description,
            notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          errors.push(`Failed to update ${provider}/${operation}`);
        } else {
          results.push(data);
        }
      } else {
        // Insert
        const { data, error } = await serviceClient
          .from('api_cost_config')
          .insert({
            provider,
            operation,
            cost_per_unit,
            unit_description: unit_description || 'per unit',
            notes,
            effective_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          errors.push(`Failed to create ${provider}/${operation}`);
        } else {
          results.push(data);
        }
      }
    }

    // Log audit entry
    const auditService = AdminAuditService.getInstance();
    await auditService.logAction(
      {
        user: {
          id: user.id,
          email: user.email || '',
        },
        role: 'admin',
        createdAt: new Date(),
      },
      {
        action: 'settings.update',
        resource_type: 'system',
        details: {
          type: 'api_cost_config_bulk',
          updated_count: results.length,
          error_count: errors.length,
          configs: results,
        },
      },
      request
    );

    return NextResponse.json({
      success: true,
      updated: results.length,
      errors: errors.length > 0 ? errors : undefined,
      configs: results,
    });
  } catch (error) {
    console.error('Bulk cost config update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleGet, 'admin');
export const POST = withRateLimit(handlePost, 'admin');
export const PUT = withRateLimit(handlePut, 'admin');
