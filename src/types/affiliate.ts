/**
 * Affiliate Program Types
 */

export type AffiliateTier = 'standard' | 'silver' | 'gold';
export type AffiliateStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type PaymentMethod = 'paypal' | 'check';
export type TaxFormType = 'W9' | 'W8BEN';
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'reversed' | 'held';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ReferralStatus = 'pending' | 'signed_up' | 'converted' | 'expired' | 'invalid';
export type TransactionType = 'subscription' | 'one_time' | 'renewal' | 'upgrade';
export type ReversalReason = 'refund' | 'chargeback' | 'fraud' | 'violation' | 'error';

export interface Affiliate {
  id: string;
  user_id: string;

  // Referral Codes
  referral_code: string;
  vanity_url?: string;

  // Commission Tiers & Rates
  tier: AffiliateTier;
  commission_rate_recurring: number;
  commission_rate_onetime: number;
  commission_rate_lifetime: number;

  // Performance Metrics
  mrr_generated: number;
  mrr_3month_avg: number;
  total_clicks: number;
  total_signups: number;
  total_conversions: number;

  // Status & Approval
  status: AffiliateStatus;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  suspended_at?: string;
  suspended_reason?: string;

  // Payment Information
  payment_method?: PaymentMethod;
  paypal_email?: string;
  check_payable_to?: string;
  mailing_address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };

  // Tax Information
  tax_form_type?: TaxFormType;
  tax_form_completed: boolean;
  tax_form_completed_at?: string;
  tax_id_encrypted?: string;
  tax_form_data?: Record<string, any>;

  // Profile & Settings
  display_name?: string;
  website_url?: string;
  social_media?: {
    twitter?: string;
    youtube?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
  };
  promotional_methods?: string[];
  leaderboard_opt_out: boolean;
  email_notifications: boolean;

  // Application Data
  application_reason?: string;
  audience_size?: string;
  content_examples?: string[];

  // Metadata
  notes?: string;
  flags?: string[];
  metadata?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  affiliate_id: string;
  referred_user_id?: string;

  // Tracking Information
  referral_code: string;
  cookie_id?: string;
  landing_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;

  // User Information
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  country?: string;

  // Conversion Status
  status: ReferralStatus;
  signed_up_at?: string;
  first_payment_at?: string;
  conversion_value?: number;
  subscription_plan?: string;

  // Attribution
  attribution_window_days: number;
  expired_at?: string;

  // Retroactive Attribution
  retroactive_assignment: boolean;
  assigned_by?: string;
  assigned_at?: string;

  created_at: string;
  updated_at: string;
}

export interface ReferralVisit {
  id: string;
  affiliate_id: string;

  // Tracking
  referral_code: string;
  cookie_id?: string;
  visitor_id?: string;
  session_id?: string;

  // Visit Information
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  landing_page?: string;

  // UTM Parameters
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;

  // Device & Location
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  city?: string;

  // Engagement
  pages_viewed: number;
  time_on_site?: number;
  bounced: boolean;

  created_at: string;
}

export interface Commission {
  id: string;
  affiliate_id: string;
  referral_id?: string;
  referred_user_id?: string;

  // Transaction Information
  stripe_payment_id?: string;
  transaction_type: TransactionType;
  transaction_amount: number;

  // Commission Calculation
  commission_rate: number;
  commission_amount: number;
  currency: string;

  // Status
  status: CommissionStatus;
  approved_at?: string;
  paid_at?: string;
  reversed_at?: string;

  // Clawback Information
  reversal_reason?: ReversalReason;
  reversal_amount?: number;
  clawback_fee?: number;

  // Payment Information
  payout_id?: string;

  // Tracking
  commission_month?: string;
  months_since_signup?: number;
  is_lifetime_rate: boolean;

  // Metadata
  description?: string;
  metadata?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  affiliate_id: string;

  // Payout Amount
  amount: number;
  currency: string;

  // Payment Method
  payment_method: PaymentMethod;
  paypal_email?: string;
  paypal_transaction_id?: string;
  check_number?: string;
  check_mailed_date?: string;

  // Status
  status: PayoutStatus;
  processed_at?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;

  // Period
  period_start: string;
  period_end: string;

  // Commission Details
  commission_ids: string[];
  commission_count: number;

  // Tax Reporting
  tax_year?: number;
  reported_on_1099: boolean;

  // Admin
  initiated_by?: string;
  notes?: string;

  created_at: string;
  updated_at: string;
}

export interface AffiliateEvent {
  id: string;
  affiliate_id: string;
  event_type: string;
  event_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_by?: string;
  created_at: string;
}

export interface AffiliateSettings {
  id: string;
  key: string;
  value: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Application Form Data
export interface AffiliateApplicationData {
  website_url?: string;
  social_media?: {
    twitter?: string;
    youtube?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
  };
  promotional_methods: string[];
  audience_size: string;
  application_reason: string;
  content_examples?: string[];
  payment_method: PaymentMethod;
  paypal_email?: string;
  check_payable_to?: string;
  mailing_address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  tax_form_type: TaxFormType;
  tax_id?: string;
  agree_to_terms: boolean;
}

// Dashboard Stats
export interface AffiliateDashboardStats {
  total_clicks: number;
  total_signups: number;
  total_conversions: number;
  conversion_rate: number;
  current_month_earnings: number;
  lifetime_earnings: number;
  pending_commissions: number;
  paid_commissions: number;
  current_tier: AffiliateTier;
  mrr_generated: number;
  mrr_3month_avg: number;
  next_tier_progress?: {
    next_tier: AffiliateTier;
    current_mrr: number;
    required_mrr: number;
    percentage: number;
  };
}

// Leaderboard Entry
export interface LeaderboardEntry {
  rank: number;
  affiliate_id: string;
  display_name: string;
  earnings: number;
  referrals: number;
  conversion_rate: number;
  tier: AffiliateTier;
  badge?: string;
}

// Admin Dashboard Types
export interface AffiliateAdminStats {
  total_affiliates: number;
  active_affiliates: number;
  pending_applications: number;
  total_commissions_paid: number;
  total_commissions_pending: number;
  average_conversion_rate: number;
  top_affiliates: LeaderboardEntry[];
  recent_applications: Affiliate[];
  recent_payouts: Payout[];
}