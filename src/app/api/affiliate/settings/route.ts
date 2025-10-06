/**
 * API Route: Update Affiliate Settings
 * PUT /api/affiliate/settings
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { getAffiliateByUserId } from '@/services/affiliate';

export async function PUT(request: NextRequest) {
  try {
    // Validate session
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get affiliate account
    const affiliate = await getAffiliateByUserId(user.id);

    if (!affiliate) {
      return NextResponse.json(
        { error: 'No affiliate account found' },
        { status: 404 }
      );
    }

    if (affiliate.status !== 'approved') {
      return NextResponse.json(
        { error: 'Affiliate account not approved' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      payment_method,
      paypal_email,
      check_payable_to,
      mailing_address,
      display_name,
      website_url,
      social_media,
      email_notifications,
    } = body;

    // Validate payment method
    if (payment_method && !['paypal', 'check'].includes(payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Validate PayPal email if PayPal is selected
    if (payment_method === 'paypal' && !paypal_email) {
      return NextResponse.json(
        { error: 'PayPal email is required when using PayPal payment method' },
        { status: 400 }
      );
    }

    // Validate check details if check is selected
    if (payment_method === 'check') {
      if (!check_payable_to || !mailing_address) {
        return NextResponse.json(
          {
            error:
              'Check payable to and mailing address are required for check payments',
          },
          { status: 400 }
        );
      }
    }

    // Update affiliate settings using service role
    const serviceClient = createServiceRoleClient();
    const { data: updatedAffiliate, error: updateError } = await serviceClient
      .from('affiliates')
      .update({
        payment_method,
        paypal_email: payment_method === 'paypal' ? paypal_email : null,
        check_payable_to: payment_method === 'check' ? check_payable_to : null,
        mailing_address: payment_method === 'check' ? mailing_address : null,
        display_name,
        website_url,
        social_media,
        email_notifications,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliate.id)
      .select()
      .single();

    if (updateError) {
      console.error(
        '[AFFILIATE SETTINGS] Error updating affiliate:',
        updateError
      );
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      affiliate: updatedAffiliate,
    });
  } catch (error) {
    console.error('Error updating affiliate settings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
