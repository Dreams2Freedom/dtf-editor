/**
 * API Route: Apply to Affiliate Program
 * POST /api/affiliate/apply
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { applyToAffiliate } from '@/services/affiliate';
import type { AffiliateApplicationData } from '@/types/affiliate';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse application data
    const body = await request.json();
    const applicationData: AffiliateApplicationData = {
      website_url: body.website_url,
      social_media: body.social_media,
      promotional_methods: body.promotional_methods || [],
      audience_size: body.audience_size,
      application_reason: body.application_reason,
      content_examples: body.content_examples,
      payment_method: body.payment_method,
      paypal_email: body.paypal_email,
      check_payable_to: body.check_payable_to,
      mailing_address: body.mailing_address,
      tax_form_type: body.tax_form_type,
      agree_to_terms: body.agree_to_terms
    };

    // Validate required fields
    if (!applicationData.agree_to_terms) {
      return NextResponse.json(
        { error: 'You must agree to the terms and conditions' },
        { status: 400 }
      );
    }

    if (!applicationData.promotional_methods || applicationData.promotional_methods.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one promotional method' },
        { status: 400 }
      );
    }

    if (!applicationData.audience_size) {
      return NextResponse.json(
        { error: 'Please select your audience size' },
        { status: 400 }
      );
    }

    if (!applicationData.application_reason) {
      return NextResponse.json(
        { error: 'Please provide a reason for your application' },
        { status: 400 }
      );
    }

    if (!applicationData.payment_method) {
      return NextResponse.json(
        { error: 'Please select a payment method' },
        { status: 400 }
      );
    }

    if (applicationData.payment_method === 'paypal' && !applicationData.paypal_email) {
      return NextResponse.json(
        { error: 'PayPal email is required for PayPal payments' },
        { status: 400 }
      );
    }

    if (applicationData.payment_method === 'check' && (!applicationData.check_payable_to || !applicationData.mailing_address)) {
      return NextResponse.json(
        { error: 'Check payable name and mailing address are required for check payments' },
        { status: 400 }
      );
    }

    if (!applicationData.tax_form_type) {
      return NextResponse.json(
        { error: 'Please select your tax form type' },
        { status: 400 }
      );
    }

    // Apply to affiliate program
    const result = await applyToAffiliate(user.id, applicationData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to submit application' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      affiliate: result.affiliate,
      message: result.affiliate?.status === 'approved'
        ? 'Your application has been approved! You can now start earning commissions.'
        : 'Your application has been submitted and is under review. We\'ll notify you within 24-48 hours.'
    });

  } catch (error) {
    console.error('Error in affiliate apply API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}