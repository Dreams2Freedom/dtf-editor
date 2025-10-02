import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptSensitiveData, encryptTaxFormData, sanitizeTaxId, isValidSSN, isValidEIN } from '@/lib/encryption';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    const { affiliateId, taxFormData } = body;

    if (!affiliateId || !taxFormData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the affiliate belongs to the user
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, user_id')
      .eq('id', affiliateId)
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    // Validate and sanitize the tax ID
    const sanitizedTaxId = sanitizeTaxId(taxFormData.tax_id);

    if (taxFormData.form_type === 'W9') {
      // Validate US SSN or EIN
      if (!isValidSSN(sanitizedTaxId) && !isValidEIN(sanitizedTaxId)) {
        return NextResponse.json({
          error: 'Invalid SSN or EIN format. Please use XXX-XX-XXXX for SSN or XX-XXXXXXX for EIN.'
        }, { status: 400 });
      }
    }

    // CRITICAL: Encrypt sensitive data before storage
    const encryptedTaxId = encryptSensitiveData(sanitizedTaxId);
    const encryptedFormData = encryptTaxFormData(taxFormData);

    if (!encryptedTaxId || !encryptedFormData) {
      console.error('Encryption failed for tax form data');
      return NextResponse.json({
        error: 'Failed to securely process tax information. Please try again.'
      }, { status: 500 });
    }

    // Update the affiliate record with encrypted data
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        tax_form_type: taxFormData.form_type,
        tax_form_completed: true,
        tax_form_completed_at: new Date().toISOString(),
        tax_id_encrypted: encryptedTaxId,
        tax_form_data: { encrypted: encryptedFormData },
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({
        error: 'Failed to save tax form. Please try again.'
      }, { status: 500 });
    }

    // Log the event for audit trail (without sensitive data)
    await supabase
      .from('affiliate_events')
      .insert({
        affiliate_id: affiliateId,
        event_type: 'tax_form_submitted',
        event_data: {
          form_type: taxFormData.form_type,
          timestamp: new Date().toISOString()
        },
        created_by: user.id
      });

    return NextResponse.json({
      success: true,
      message: 'Tax form submitted successfully'
    });

  } catch (error) {
    console.error('Tax form submission error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// GET endpoint to check tax form status (no sensitive data returned)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get affiliate record
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('id, tax_form_type, tax_form_completed, tax_form_completed_at')
      .eq('user_id', user.id)
      .single();

    if (error || !affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    return NextResponse.json({
      hasSubmittedTaxForm: affiliate.tax_form_completed,
      formType: affiliate.tax_form_type,
      submittedAt: affiliate.tax_form_completed_at
    });

  } catch (error) {
    console.error('Tax form status error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}