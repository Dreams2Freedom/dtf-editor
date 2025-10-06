import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import {
  encryptSensitiveData,
  encryptTaxFormData,
  sanitizeTaxId,
  isValidSSN,
  isValidEIN,
} from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    // Validate session server-side (uses httpOnly cookies)
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for database operations
    const serviceClient = createServiceRoleClient();

    // Get the request body
    const body = await request.json();
    const { affiliateId, taxFormData } = body;

    if (!affiliateId || !taxFormData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the affiliate belongs to the user
    const { data: affiliate, error: affiliateError } = await serviceClient
      .from('affiliates')
      .select('id, user_id')
      .eq('id', affiliateId)
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    // Validate and sanitize the tax ID
    const sanitizedTaxId = sanitizeTaxId(taxFormData.tax_id);

    if (taxFormData.form_type === 'W9') {
      // Validate US SSN or EIN
      if (!isValidSSN(sanitizedTaxId) && !isValidEIN(sanitizedTaxId)) {
        return NextResponse.json(
          {
            error:
              'Invalid SSN or EIN format. Please use XXX-XX-XXXX for SSN or XX-XXXXXXX for EIN.',
          },
          { status: 400 }
        );
      }
    }

    // CRITICAL: Encrypt sensitive data before storage
    const encryptedTaxId = encryptSensitiveData(sanitizedTaxId);
    const encryptedFormData = encryptTaxFormData(taxFormData);

    if (!encryptedTaxId || !encryptedFormData) {
      console.error('Encryption failed for tax form data');
      return NextResponse.json(
        {
          error:
            'Failed to securely process tax information. Please try again.',
        },
        { status: 500 }
      );
    }

    // Update the affiliate record with encrypted data
    const { error: updateError } = await serviceClient
      .from('affiliates')
      .update({
        tax_form_type: taxFormData.form_type,
        tax_form_completed: true,
        tax_form_completed_at: new Date().toISOString(),
        tax_id_encrypted: encryptedTaxId,
        tax_form_data: { encrypted: encryptedFormData },
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliateId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to save tax form. Please try again.',
        },
        { status: 500 }
      );
    }

    // Log the event for audit trail (without sensitive data)
    await serviceClient.from('affiliate_events').insert({
      affiliate_id: affiliateId,
      event_type: 'tax_form_submitted',
      event_data: {
        form_type: taxFormData.form_type,
        timestamp: new Date().toISOString(),
      },
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Tax form submitted successfully',
    });
  } catch (error) {
    console.error('Tax form submission error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check tax form status (no sensitive data returned)
export async function GET(request: NextRequest) {
  try {
    // Validate session server-side
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for database operations
    const serviceClient = createServiceRoleClient();

    // Get affiliate record
    const { data: affiliate, error } = await serviceClient
      .from('affiliates')
      .select('id, tax_form_type, tax_form_completed, tax_form_completed_at')
      .eq('user_id', user.id)
      .single();

    if (error || !affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      hasSubmittedTaxForm: affiliate.tax_form_completed,
      formType: affiliate.tax_form_type,
      submittedAt: affiliate.tax_form_completed_at,
    });
  } catch (error) {
    console.error('Tax form status error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
