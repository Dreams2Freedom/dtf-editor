/**
 * API Route: View Affiliate Tax Form (Admin Only)
 * GET /api/admin/affiliates/tax-form?affiliate_id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { decryptSensitiveData, decryptTaxFormData } from '@/lib/encryption';
import { createAdminAuditLog } from '@/services/adminAudit';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
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

    // Get affiliate ID from query
    const { searchParams } = new URL(request.url);
    const affiliateId = searchParams.get('affiliate_id');

    if (!affiliateId) {
      return NextResponse.json(
        { error: 'affiliate_id is required' },
        { status: 400 }
      );
    }

    // Fetch affiliate tax form data using service role to bypass RLS
    const serviceClient = createServiceRoleClient();
    const { data: affiliate, error: affiliateError } = await serviceClient
      .from('affiliates')
      .select(
        'id, user_id, tax_form_type, tax_id_encrypted, tax_form_data, tax_form_completed_at'
      )
      .eq('id', affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    if (!affiliate.tax_form_completed_at) {
      return NextResponse.json(
        { error: 'No tax form on file' },
        { status: 404 }
      );
    }

    // Decrypt tax data
    let decryptedData: any = null;
    let decryptedTaxId: string | null = null;

    try {
      console.log('[TAX FORM] Starting decryption');
      console.log(
        '[TAX FORM] ENCRYPTION_KEY available:',
        !!(process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY)
      );
      console.log('[TAX FORM] Has tax_form_data:', !!affiliate.tax_form_data);
      console.log(
        '[TAX FORM] Has tax_id_encrypted:',
        !!affiliate.tax_id_encrypted
      );

      if (affiliate.tax_form_data?.encrypted) {
        console.log('[TAX FORM] Decrypting form data...');
        console.log(
          '[TAX FORM] Encrypted data length:',
          affiliate.tax_form_data.encrypted.length
        );
        decryptedData = decryptTaxFormData(affiliate.tax_form_data.encrypted);

        if (!decryptedData) {
          throw new Error(
            'Form data decryption returned null - check encryption key and data format'
          );
        }

        console.log('[TAX FORM] Form data decrypted successfully');
      }

      if (affiliate.tax_id_encrypted) {
        console.log('[TAX FORM] Decrypting tax ID...');
        console.log(
          '[TAX FORM] Encrypted tax ID length:',
          affiliate.tax_id_encrypted.length
        );
        decryptedTaxId = decryptSensitiveData(affiliate.tax_id_encrypted);

        if (!decryptedTaxId) {
          throw new Error(
            'Tax ID decryption returned null - check encryption key and data format'
          );
        }

        console.log('[TAX FORM] Tax ID decrypted successfully');
      }
    } catch (decryptError: any) {
      console.error('[TAX FORM] Decryption error:', decryptError);
      console.error('[TAX FORM] Error message:', decryptError.message);
      console.error('[TAX FORM] Error stack:', decryptError.stack);
      return NextResponse.json(
        { error: 'Failed to decrypt tax form data: ' + decryptError.message },
        { status: 500 }
      );
    }

    // Log tax form access for audit trail
    await createAdminAuditLog({
      admin_id: user.id,
      action: 'view_tax_form',
      resource_type: 'affiliate',
      resource_id: affiliateId,
      details: {
        affiliate_id: affiliateId,
        tax_form_type: affiliate.tax_form_type,
      },
    });

    return NextResponse.json({
      affiliate_id: affiliate.id,
      user_id: affiliate.user_id,
      tax_form_type: affiliate.tax_form_type,
      tax_id: decryptedTaxId,
      form_data: decryptedData,
      completed_at: affiliate.tax_form_completed_at,
    });
  } catch (error) {
    console.error('[TAX FORM] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
