-- Create Affiliate Program Tables
-- Version: 1.0
-- Date: January 2025

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- AFFILIATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Referral Codes
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  vanity_url VARCHAR(100) UNIQUE,

  -- Commission Tiers & Rates
  tier VARCHAR(20) DEFAULT 'standard' CHECK (tier IN ('standard', 'silver', 'gold')),
  commission_rate_recurring DECIMAL(4,2) DEFAULT 0.20,
  commission_rate_onetime DECIMAL(4,2) DEFAULT 0.20,
  commission_rate_lifetime DECIMAL(4,2) DEFAULT 0.10, -- after 24 months

  -- Performance Metrics
  mrr_generated DECIMAL(10,2) DEFAULT 0.00, -- Monthly Recurring Revenue generated
  mrr_3month_avg DECIMAL(10,2) DEFAULT 0.00, -- 3-month average for tier calculation
  total_clicks INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,

  -- Status & Approval
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_reason TEXT,

  -- Payment Information
  payment_method VARCHAR(20) CHECK (payment_method IN ('paypal', 'check')),
  paypal_email VARCHAR(255),
  check_payable_to VARCHAR(255),
  mailing_address JSONB,

  -- Tax Information (encrypted)
  tax_form_type VARCHAR(20) CHECK (tax_form_type IN ('W9', 'W8BEN')),
  tax_form_completed BOOLEAN DEFAULT false,
  tax_form_completed_at TIMESTAMP WITH TIME ZONE,
  tax_id_encrypted TEXT, -- SSN/EIN encrypted
  tax_form_data JSONB, -- encrypted form data

  -- Profile & Settings
  display_name VARCHAR(100), -- for leaderboard
  website_url TEXT,
  social_media JSONB, -- {twitter: "", youtube: "", etc}
  promotional_methods TEXT[],
  leaderboard_opt_out BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,

  -- Application Data
  application_reason TEXT,
  audience_size VARCHAR(50),
  content_examples TEXT[],

  -- Metadata
  notes TEXT, -- internal admin notes
  flags TEXT[], -- for flagging suspicious activity
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REFERRALS TABLE (tracks referred users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Tracking Information
  referral_code VARCHAR(50),
  cookie_id VARCHAR(100),
  landing_page TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),

  -- User Information
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(50),
  country VARCHAR(2),

  -- Conversion Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'converted', 'expired', 'invalid')),
  signed_up_at TIMESTAMP WITH TIME ZONE,
  first_payment_at TIMESTAMP WITH TIME ZONE,
  conversion_value DECIMAL(10,2),
  subscription_plan VARCHAR(50),

  -- Attribution
  attribution_window_days INTEGER DEFAULT 30,
  expired_at TIMESTAMP WITH TIME ZONE,

  -- Retroactive Attribution
  retroactive_assignment BOOLEAN DEFAULT false,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REFERRAL VISITS (tracks all clicks)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.referral_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,

  -- Tracking
  referral_code VARCHAR(50),
  cookie_id VARCHAR(100),
  visitor_id VARCHAR(100), -- anonymous visitor tracking
  session_id VARCHAR(100),

  -- Visit Information
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  landing_page TEXT,

  -- UTM Parameters
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),

  -- Device & Location
  device_type VARCHAR(50),
  browser VARCHAR(50),
  os VARCHAR(50),
  country VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),

  -- Engagement
  pages_viewed INTEGER DEFAULT 1,
  time_on_site INTEGER, -- seconds
  bounced BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COMMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Transaction Information
  stripe_payment_id VARCHAR(255),
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('subscription', 'one_time', 'renewal', 'upgrade')),
  transaction_amount DECIMAL(10,2) NOT NULL,

  -- Commission Calculation
  commission_rate DECIMAL(4,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reversed', 'held')),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  reversed_at TIMESTAMP WITH TIME ZONE,

  -- Clawback Information
  reversal_reason VARCHAR(50) CHECK (reversal_reason IN ('refund', 'chargeback', 'fraud', 'violation', 'error')),
  reversal_amount DECIMAL(10,2),
  clawback_fee DECIMAL(10,2),

  -- Payment Information
  payout_id UUID, -- Will add foreign key constraint after payouts table is created

  -- Tracking
  commission_month DATE, -- for monthly calculations
  months_since_signup INTEGER, -- for 24-month cap tracking
  is_lifetime_rate BOOLEAN DEFAULT false, -- true after 24 months

  -- Metadata
  description TEXT,
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PAYOUTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,

  -- Payout Amount
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Payment Method
  payment_method VARCHAR(20) CHECK (payment_method IN ('paypal', 'check')),
  paypal_email VARCHAR(255),
  paypal_transaction_id VARCHAR(255),
  check_number VARCHAR(50),
  check_mailed_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Commission Details
  commission_ids UUID[], -- array of commission IDs included
  commission_count INTEGER,

  -- Tax Reporting
  tax_year INTEGER,
  reported_on_1099 BOOLEAN DEFAULT false,

  -- Admin
  initiated_by UUID REFERENCES auth.users(id),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AFFILIATE EVENTS (audit log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.affiliate_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,

  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINT
-- =====================================================
-- Now that payouts table exists, add the foreign key constraint
ALTER TABLE public.commissions
ADD CONSTRAINT commissions_payout_id_fkey
FOREIGN KEY (payout_id) REFERENCES public.payouts(id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Affiliates indexes
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_status ON public.affiliates(status);
CREATE INDEX idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX idx_affiliates_tier ON public.affiliates(tier);

-- Referrals indexes
CREATE INDEX idx_referrals_affiliate_id ON public.referrals(affiliate_id);
CREATE INDEX idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referrals_cookie_id ON public.referrals(cookie_id);
CREATE INDEX idx_referrals_created_at ON public.referrals(created_at);

-- Visits indexes
CREATE INDEX idx_visits_affiliate_id ON public.referral_visits(affiliate_id);
CREATE INDEX idx_visits_cookie_id ON public.referral_visits(cookie_id);
CREATE INDEX idx_visits_created_at ON public.referral_visits(created_at);

-- Commissions indexes
CREATE INDEX idx_commissions_affiliate_id ON public.commissions(affiliate_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_commissions_payout_id ON public.commissions(payout_id);
CREATE INDEX idx_commissions_commission_month ON public.commissions(commission_month);

-- Payouts indexes
CREATE INDEX idx_payouts_affiliate_id ON public.payouts(affiliate_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);
CREATE INDEX idx_payouts_period ON public.payouts(period_start, period_end);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_events ENABLE ROW LEVEL SECURITY;

-- Affiliates policies
CREATE POLICY "Users can view their own affiliate data"
  ON public.affiliates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate data"
  ON public.affiliates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can insert affiliate application"
  ON public.affiliates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Referrals policies
CREATE POLICY "Affiliates can view their own referrals"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = referrals.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Visits policies
CREATE POLICY "Affiliates can view their own visits"
  ON public.referral_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = referral_visits.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Commissions policies
CREATE POLICY "Affiliates can view their own commissions"
  ON public.commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = commissions.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Payouts policies
CREATE POLICY "Affiliates can view their own payouts"
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = payouts.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Events policies
CREATE POLICY "Affiliates can view their own events"
  ON public.affiliate_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = affiliate_events.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(username TEXT)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base code from username (first 4-6 chars, uppercase)
  base_code := UPPER(SUBSTRING(REGEXP_REPLACE(username, '[^a-zA-Z0-9]', '', 'g'), 1, 6));

  -- If base_code is empty, use random string
  IF base_code = '' OR base_code IS NULL THEN
    base_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
  END IF;

  final_code := base_code;

  -- Check for uniqueness and add number if needed
  WHILE EXISTS (SELECT 1 FROM public.affiliates WHERE referral_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || counter;
  END LOOP;

  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Function to update MRR calculations
CREATE OR REPLACE FUNCTION calculate_affiliate_mrr()
RETURNS TRIGGER AS $$
BEGIN
  -- Update MRR for the affiliate
  UPDATE public.affiliates
  SET
    mrr_generated = (
      SELECT COALESCE(SUM(commission_amount), 0)
      FROM public.commissions
      WHERE affiliate_id = NEW.affiliate_id
      AND status = 'paid'
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    ),
    mrr_3month_avg = (
      SELECT COALESCE(AVG(monthly_total), 0)
      FROM (
        SELECT SUM(commission_amount) as monthly_total
        FROM public.commissions
        WHERE affiliate_id = NEW.affiliate_id
        AND status = 'paid'
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
        GROUP BY DATE_TRUNC('month', created_at)
      ) as monthly_totals
    ),
    updated_at = NOW()
  WHERE id = NEW.affiliate_id;

  -- Update tier based on MRR
  UPDATE public.affiliates
  SET
    tier = CASE
      WHEN mrr_3month_avg >= 1500 THEN 'gold'
      WHEN mrr_3month_avg >= 500 THEN 'silver'
      ELSE 'standard'
    END,
    commission_rate_recurring = CASE
      WHEN mrr_3month_avg >= 1500 THEN 0.25
      WHEN mrr_3month_avg >= 500 THEN 0.22
      ELSE 0.20
    END,
    commission_rate_onetime = CASE
      WHEN mrr_3month_avg >= 1500 THEN 0.25
      WHEN mrr_3month_avg >= 500 THEN 0.22
      ELSE 0.20
    END
  WHERE id = NEW.affiliate_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update MRR on commission changes
CREATE TRIGGER update_affiliate_mrr
  AFTER INSERT OR UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_affiliate_mrr();

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER set_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- INITIAL DATA / SETTINGS
-- =====================================================

-- Create affiliate settings table for global configuration
CREATE TABLE IF NOT EXISTS public.affiliate_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.affiliate_settings (key, value, description) VALUES
  ('commission_rates', '{"standard": 0.20, "silver": 0.22, "gold": 0.25, "lifetime": 0.10}', 'Commission rates by tier'),
  ('tier_thresholds', '{"silver": 500, "gold": 1500}', 'MRR thresholds for tier upgrades'),
  ('cookie_duration_days', '30', 'Cookie attribution window in days'),
  ('minimum_payout', '50', 'Minimum payout amount in USD'),
  ('payout_hold_days', '30', 'Days to hold commissions before payout eligibility'),
  ('auto_approval_enabled', 'true', 'Enable automatic approval of applications'),
  ('max_discount_stack', '0.50', 'Maximum discount when stacking with coupons (50%)'),
  ('clawback_fees', '{"chargeback": 25, "fraud": 50}', 'Fees for clawbacks');

-- Grant permissions for service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;