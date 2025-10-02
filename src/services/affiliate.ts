/**
 * Affiliate Service
 * Handles all affiliate program operations
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type {
  Affiliate,
  AffiliateApplicationData,
  AffiliateDashboardStats,
  Referral,
  ReferralVisit,
  Commission,
  Payout,
  AffiliateEvent
} from '@/types/affiliate';

// Create Supabase client for server-side operations
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Cookie name for affiliate tracking
const AFFILIATE_COOKIE_NAME = 'dtf_ref';
const COOKIE_DURATION_DAYS = 30;

/**
 * Affiliate Application & Management
 */

// Apply to become an affiliate
export async function applyToAffiliate(
  userId: string,
  applicationData: AffiliateApplicationData
): Promise<{ success: boolean; affiliate?: Affiliate; error?: string }> {
  try {
    const supabase = createServiceClient();

    // Check if user already has an affiliate account
    const { data: existing } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return { success: false, error: 'You already have an affiliate account' };
    }

    // Get user details for referral code generation
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    // Generate referral code
    const username = profile?.full_name || profile?.email?.split('@')[0] || 'USER';
    const { data: referralCode } = await supabase
      .rpc('generate_referral_code', { username });

    // Determine if auto-approval should apply
    const shouldAutoApprove = await checkAutoApprovalCriteria(applicationData);

    // Create affiliate record
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .insert({
        user_id: userId,
        referral_code: referralCode || username.toUpperCase().slice(0, 6) + Date.now().toString().slice(-4),
        status: shouldAutoApprove ? 'approved' : 'pending',
        approved_at: shouldAutoApprove ? new Date().toISOString() : null,

        // Application data
        website_url: applicationData.website_url,
        social_media: applicationData.social_media,
        promotional_methods: applicationData.promotional_methods,
        audience_size: applicationData.audience_size,
        application_reason: applicationData.application_reason,
        content_examples: applicationData.content_examples,

        // Payment info
        payment_method: applicationData.payment_method,
        paypal_email: applicationData.paypal_email,
        check_payable_to: applicationData.check_payable_to,
        mailing_address: applicationData.mailing_address,

        // Tax info
        tax_form_type: applicationData.tax_form_type,
        tax_form_completed: false, // Will be completed separately

        // Settings
        display_name: profile?.full_name || 'Anonymous',
        email_notifications: true,
        leaderboard_opt_out: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating affiliate:', error);
      return { success: false, error: 'Failed to create affiliate account' };
    }

    // Log event
    await logAffiliateEvent(affiliate.id, 'application_submitted', {
      auto_approved: shouldAutoApprove
    });

    // TODO: Send email notification
    if (shouldAutoApprove) {
      // Send approval email
    } else {
      // Send application received email
    }

    return { success: true, affiliate };
  } catch (error) {
    console.error('Error in applyToAffiliate:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Check if application meets auto-approval criteria
async function checkAutoApprovalCriteria(
  applicationData: AffiliateApplicationData
): Promise<boolean> {
  // Auto-approve if all conditions are met:
  // 1. Has website or social media
  // 2. Has clear promotional methods
  // 3. Has audience size
  // 4. Not flagged domain/country

  if (!applicationData.website_url && !applicationData.social_media) {
    return false;
  }

  if (!applicationData.promotional_methods || applicationData.promotional_methods.length === 0) {
    return false;
  }

  if (!applicationData.audience_size || applicationData.audience_size === 'none') {
    return false;
  }

  // TODO: Check for flagged domains/countries

  return true;
}

// Get affiliate by user ID
export async function getAffiliateByUserId(
  userId: string
): Promise<Affiliate | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching affiliate:', error);
    return null;
  }

  return data;
}

// Get affiliate by referral code
export async function getAffiliateByReferralCode(
  referralCode: string
): Promise<Affiliate | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('referral_code', referralCode.toUpperCase())
    .eq('status', 'approved')
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Referral Tracking
 */

// Track referral visit (click on affiliate link)
export async function trackReferralVisit(
  referralCode: string,
  visitData: {
    landing_page: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    ip_address?: string;
    user_agent?: string;
    referer?: string;
  }
): Promise<{ success: boolean; cookieId?: string }> {
  try {
    const supabase = createServiceClient();

    // Get affiliate by referral code
    const affiliate = await getAffiliateByReferralCode(referralCode);
    if (!affiliate) {
      return { success: false };
    }

    // Generate cookie ID for tracking
    const cookieId = `${referralCode}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create visit record
    const { error } = await supabase
      .from('referral_visits')
      .insert({
        affiliate_id: affiliate.id,
        referral_code,
        cookie_id: cookieId,
        landing_page: visitData.landing_page,
        utm_source: visitData.utm_source,
        utm_medium: visitData.utm_medium,
        utm_campaign: visitData.utm_campaign,
        utm_content: visitData.utm_content,
        utm_term: visitData.utm_term,
        ip_address: visitData.ip_address,
        user_agent: visitData.user_agent,
        referer: visitData.referer
      });

    if (error) {
      console.error('Error tracking visit:', error);
      return { success: false };
    }

    // Update affiliate click count
    await supabase
      .from('affiliates')
      .update({
        total_clicks: affiliate.total_clicks + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliate.id);

    return { success: true, cookieId };
  } catch (error) {
    console.error('Error in trackReferralVisit:', error);
    return { success: false };
  }
}

// Track referral signup (user registration with cookie)
export async function trackReferralSignup(
  userId: string,
  cookieId: string | null,
  referralCode: string | null
): Promise<{ success: boolean; referralId?: string }> {
  try {
    const supabase = createServiceClient();

    // Try to find affiliate by cookie or referral code
    let affiliateId: string | null = null;

    if (cookieId) {
      // Find visit by cookie
      const { data: visit } = await supabase
        .from('referral_visits')
        .select('affiliate_id')
        .eq('cookie_id', cookieId)
        .single();

      if (visit) {
        affiliateId = visit.affiliate_id;
      }
    }

    if (!affiliateId && referralCode) {
      // Try by referral code
      const affiliate = await getAffiliateByReferralCode(referralCode);
      if (affiliate) {
        affiliateId = affiliate.id;
      }
    }

    if (!affiliateId) {
      return { success: false };
    }

    // Check if user is self-referring (not allowed)
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('user_id')
      .eq('id', affiliateId)
      .single();

    if (affiliate?.user_id === userId) {
      console.warn('Self-referral attempt blocked');
      return { success: false };
    }

    // Create referral record
    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        affiliate_id: affiliateId,
        referred_user_id: userId,
        referral_code: referralCode,
        cookie_id: cookieId,
        status: 'signed_up',
        signed_up_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating referral:', error);
      return { success: false };
    }

    // Update affiliate signup count
    await supabase
      .from('affiliates')
      .update({
        total_signups: affiliate.total_signups + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateId);

    // Log event
    await logAffiliateEvent(affiliateId, 'referral_signup', {
      referred_user_id: userId
    });

    return { success: true, referralId: referral.id };
  } catch (error) {
    console.error('Error in trackReferralSignup:', error);
    return { success: false };
  }
}

// Track referral conversion (first payment)
export async function trackReferralConversion(
  userId: string,
  paymentAmount: number,
  stripePaymentId: string,
  subscriptionPlan?: string
): Promise<{ success: boolean; commissionId?: string }> {
  try {
    const supabase = createServiceClient();

    // Find referral for this user
    const { data: referral } = await supabase
      .from('referrals')
      .select('*, affiliates(*)')
      .eq('referred_user_id', userId)
      .eq('status', 'signed_up')
      .single();

    if (!referral || !referral.affiliates) {
      return { success: false };
    }

    const affiliate = referral.affiliates as Affiliate;

    // Update referral to converted
    await supabase
      .from('referrals')
      .update({
        status: 'converted',
        first_payment_at: new Date().toISOString(),
        conversion_value: paymentAmount,
        subscription_plan: subscriptionPlan
      })
      .eq('id', referral.id);

    // Calculate commission
    const commissionRate = subscriptionPlan
      ? affiliate.commission_rate_recurring
      : affiliate.commission_rate_onetime;
    const commissionAmount = paymentAmount * commissionRate;

    // Create commission record
    const { data: commission, error } = await supabase
      .from('commissions')
      .insert({
        affiliate_id: affiliate.id,
        referral_id: referral.id,
        referred_user_id: userId,
        stripe_payment_id: stripePaymentId,
        transaction_type: subscriptionPlan ? 'subscription' : 'one_time',
        transaction_amount: paymentAmount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending', // Will be approved after hold period
        commission_month: new Date().toISOString().slice(0, 7) + '-01'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating commission:', error);
      return { success: false };
    }

    // Update affiliate conversion count
    await supabase
      .from('affiliates')
      .update({
        total_conversions: affiliate.total_conversions + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliate.id);

    // Log event
    await logAffiliateEvent(affiliate.id, 'referral_conversion', {
      referred_user_id: userId,
      commission_amount: commissionAmount
    });

    // TODO: Send email notification

    return { success: true, commissionId: commission.id };
  } catch (error) {
    console.error('Error in trackReferralConversion:', error);
    return { success: false };
  }
}

/**
 * Dashboard & Analytics
 */

// Get affiliate dashboard stats
export async function getAffiliateDashboardStats(
  affiliateId: string
): Promise<AffiliateDashboardStats | null> {
  try {
    const supabase = createServiceClient();

    // Get affiliate data
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();

    if (!affiliate) {
      return null;
    }

    // Get commission stats
    const { data: commissions } = await supabase
      .from('commissions')
      .select('*')
      .eq('affiliate_id', affiliateId);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthEarnings = commissions
      ?.filter(c => c.commission_month?.startsWith(currentMonth))
      .reduce((sum, c) => sum + c.commission_amount, 0) || 0;

    const lifetimeEarnings = commissions
      ?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;

    const pendingCommissions = commissions
      ?.filter(c => c.status === 'pending' || c.status === 'approved')
      .reduce((sum, c) => sum + c.commission_amount, 0) || 0;

    const paidCommissions = commissions
      ?.filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commission_amount, 0) || 0;

    // Calculate conversion rate
    const conversionRate = affiliate.total_signups > 0
      ? (affiliate.total_conversions / affiliate.total_signups) * 100
      : 0;

    // Calculate next tier progress
    let nextTierProgress = undefined;
    if (affiliate.tier === 'standard' && affiliate.mrr_3month_avg < 500) {
      nextTierProgress = {
        next_tier: 'silver' as const,
        current_mrr: affiliate.mrr_3month_avg,
        required_mrr: 500,
        percentage: (affiliate.mrr_3month_avg / 500) * 100
      };
    } else if (affiliate.tier === 'silver' && affiliate.mrr_3month_avg < 1500) {
      nextTierProgress = {
        next_tier: 'gold' as const,
        current_mrr: affiliate.mrr_3month_avg,
        required_mrr: 1500,
        percentage: (affiliate.mrr_3month_avg / 1500) * 100
      };
    }

    return {
      total_clicks: affiliate.total_clicks,
      total_signups: affiliate.total_signups,
      total_conversions: affiliate.total_conversions,
      conversion_rate: conversionRate,
      current_month_earnings: currentMonthEarnings,
      lifetime_earnings: lifetimeEarnings,
      pending_commissions: pendingCommissions,
      paid_commissions: paidCommissions,
      current_tier: affiliate.tier,
      mrr_generated: affiliate.mrr_generated,
      mrr_3month_avg: affiliate.mrr_3month_avg,
      next_tier_progress: nextTierProgress
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
}

/**
 * Helper Functions
 */

// Log affiliate event
async function logAffiliateEvent(
  affiliateId: string,
  eventType: string,
  eventData?: any
): Promise<void> {
  try {
    const supabase = createServiceClient();

    await supabase
      .from('affiliate_events')
      .insert({
        affiliate_id: affiliateId,
        event_type: eventType,
        event_data: eventData
      });
  } catch (error) {
    console.error('Error logging affiliate event:', error);
  }
}

// Set affiliate cookie
export function setAffiliateCookie(cookieId: string): void {
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_DURATION_DAYS);

  document.cookie = `${AFFILIATE_COOKIE_NAME}=${cookieId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

// Get affiliate cookie
export function getAffiliateCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === AFFILIATE_COOKIE_NAME) {
      return value;
    }
  }
  return null;
}

// Clear affiliate cookie
export function clearAffiliateCookie(): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${AFFILIATE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}