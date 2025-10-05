/**
 * API Route: View Affiliate Tax Form (Admin Only)
 * GET /api/admin/affiliates/tax-form?affiliate_id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { createAdminAuditLog } from '@/services/adminAudit';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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

    // Fetch affiliate tax form data
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, user_id, tax_form_type, tax_id_encrypted, tax_form_data, tax_form_completed_at')
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
      if (affiliate.tax_form_data?.encrypted) {
        decryptedData = JSON.parse(decrypt(affiliate.tax_form_data.encrypted));
      }

      if (affiliate.tax_id_encrypted) {
        decryptedTaxId = decrypt(affiliate.tax_id_encrypted);
      }
    } catch (decryptError) {
      console.error('[TAX FORM] Decryption error:', decryptError);
      return NextResponse.json(
        { error: 'Failed to decrypt tax form data' },
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
        tax_form_type: affiliate.tax_form_type
      }
    });

    return NextResponse.json({
      affiliate_id: affiliate.id,
      user_id: affiliate.user_id,
      tax_form_type: affiliate.tax_form_type,
      tax_id: decryptedTaxId,
      form_data: decryptedData,
      completed_at: affiliate.tax_form_completed_at
    });

  } catch (error) {
    console.error('[TAX FORM] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
