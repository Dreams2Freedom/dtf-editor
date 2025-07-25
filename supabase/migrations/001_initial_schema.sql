-- DTF Editor - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Creates all core tables, functions, and policies for the DTF Editor application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    company TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'basic', 'starter', 'cancelled')),
    subscription_plan TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    credits_remaining INTEGER DEFAULT 2,
    total_credits_purchased INTEGER DEFAULT 0,
    total_credits_used INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription plans table
CREATE TABLE subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT UNIQUE,
    description TEXT,
    monthly_price DECIMAL(10,2),
    credits_per_month INTEGER,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pay-as-you-go packages table
CREATE TABLE pay_as_you_go_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    stripe_price_id TEXT UNIQUE,
    credits INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions table
CREATE TABLE credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus', 'expiration')),
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    metadata JSONB,
    stripe_payment_intent_id TEXT,
    subscription_plan_id UUID REFERENCES subscription_plans(id),
    pay_as_you_go_package_id UUID REFERENCES pay_as_you_go_packages(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription history table
CREATE TABLE subscription_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_plan_id UUID REFERENCES subscription_plans(id),
    stripe_subscription_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Images table
CREATE TABLE images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    original_file_size INTEGER,
    original_file_type TEXT,
    original_url TEXT,
    processed_url TEXT,
    thumbnail_url TEXT,
    final_url TEXT,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    is_favorite BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    metadata JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Image operations table
CREATE TABLE image_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('upscale', 'background_removal', 'vectorize', 'generate')),
    api_provider TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    processing_time DECIMAL(10,2),
    credits_used INTEGER,
    api_cost DECIMAL(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Image collections table
CREATE TABLE image_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Image collection items table
CREATE TABLE image_collection_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES image_collections(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, image_id)
);

-- API costs table
CREATE TABLE api_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_provider TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    cost_per_operation DECIMAL(10,4) NOT NULL,
    currency TEXT DEFAULT 'USD',
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage logs table
CREATE TABLE api_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    api_provider TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    request_data JSONB,
    response_data JSONB,
    status_code INTEGER,
    response_time DECIMAL(10,2),
    cost DECIMAL(10,4),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin logs table
CREATE TABLE admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System metrics table
CREATE TABLE system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit TEXT,
    tags JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity logs table
CREATE TABLE user_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email templates table
CREATE TABLE email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    sendgrid_template_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email campaigns table
CREATE TABLE email_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    template_id UUID REFERENCES email_templates(id),
    target_audience JSONB,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email logs table
CREATE TABLE email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id),
    campaign_id UUID REFERENCES email_campaigns(id),
    sendgrid_message_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Images indexes
CREATE INDEX idx_images_user_id ON images(user_id);
CREATE INDEX idx_images_processing_status ON images(processing_status);
CREATE INDEX idx_images_created_at ON images(created_at);
CREATE INDEX idx_images_expires_at ON images(expires_at);

-- Credit transactions indexes
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_transaction_type ON credit_transactions(transaction_type);

-- Image operations indexes
CREATE INDEX idx_image_operations_image_id ON image_operations(image_id);
CREATE INDEX idx_image_operations_status ON image_operations(status);
CREATE INDEX idx_image_operations_created_at ON image_operations(created_at);

-- API usage logs indexes
CREATE INDEX idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX idx_api_usage_logs_api_provider ON api_usage_logs(api_provider);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to add credits to user
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT credits_remaining INTO current_balance
    FROM profiles WHERE id = p_user_id;
    
    -- Calculate new balance
    new_balance := current_balance + p_amount;
    
    -- Update user credits
    UPDATE profiles 
    SET credits_remaining = new_balance,
        total_credits_purchased = total_credits_purchased + CASE WHEN p_transaction_type = 'purchase' THEN p_amount ELSE 0 END,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log transaction
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, 
        balance_before, balance_after, description, metadata
    ) VALUES (
        p_user_id, p_transaction_type, p_amount,
        current_balance, new_balance, p_description, p_metadata
    );
    
    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct credits from user
CREATE OR REPLACE FUNCTION deduct_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT credits_remaining INTO current_balance
    FROM profiles WHERE id = p_user_id;
    
    -- Check if user has enough credits
    IF current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', p_amount, current_balance;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - p_amount;
    
    -- Update user credits
    UPDATE profiles 
    SET credits_remaining = new_balance,
        total_credits_used = total_credits_used + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log transaction
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, 
        balance_before, balance_after, description, metadata
    ) VALUES (
        p_user_id, p_transaction_type, p_amount,
        current_balance, new_balance, p_description, p_metadata
    );
    
    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_images_updated_at 
    BEFORE UPDATE ON images 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at 
    BEFORE UPDATE ON subscription_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pay_as_you_go_packages_updated_at 
    BEFORE UPDATE ON pay_as_you_go_packages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Images policies
CREATE POLICY "Users can view own images" ON images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON images
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all images" ON images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Credit transactions policies
CREATE POLICY "Users can view own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" ON credit_transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all transactions" ON credit_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, monthly_price, credits_per_month, features, sort_order) VALUES
('Free Plan', 'Basic features for getting started', 0.00, 2, '{"upscale": true, "background_removal": true, "vectorize": true, "ai_generation": false, "storage": "48_hours", "support": "community"}', 1),
('Basic Plan', 'Perfect for hobbyists and small projects', 9.99, 20, '{"upscale": true, "background_removal": true, "vectorize": true, "ai_generation": true, "storage": "permanent", "support": "email"}', 2),
('Starter Plan', 'Professional features for growing businesses', 24.99, 60, '{"upscale": true, "background_removal": true, "vectorize": true, "ai_generation": true, "storage": "permanent", "support": "priority", "batch_processing": true, "priority_processing": true}', 3);

-- Insert default pay-as-you-go packages
INSERT INTO pay_as_you_go_packages (name, credits, price, description, sort_order) VALUES
('10 Credits', 10, 7.99, 'Perfect for small projects', 1),
('20 Credits', 20, 14.99, 'Great value for regular users', 2),
('50 Credits', 50, 29.99, 'Best value for power users', 3);

-- Insert default API costs
INSERT INTO api_costs (api_provider, operation_type, cost_per_operation, effective_date) VALUES
('deep-image', 'upscale', 0.0500, CURRENT_DATE),
('clippingmagic', 'background_removal', 0.0300, CURRENT_DATE),
('vectorizer', 'vectorize', 0.1000, CURRENT_DATE),
('openai', 'generate', 0.0400, CURRENT_DATE);

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content) VALUES
('Welcome Email', 'Welcome to DTF Editor!', '<h1>Welcome to DTF Editor!</h1><p>Thank you for joining us. You have 2 free credits to get started.</p>', 'Welcome to DTF Editor! Thank you for joining us. You have 2 free credits to get started.'),
('Credit Alert', 'Low Credit Balance', '<h1>Low Credit Balance</h1><p>You are running low on credits. Consider upgrading your plan or purchasing more credits.</p>', 'Low Credit Balance: You are running low on credits. Consider upgrading your plan or purchasing more credits.'),
('Subscription Update', 'Subscription Updated', '<h1>Subscription Updated</h1><p>Your subscription has been successfully updated.</p>', 'Subscription Updated: Your subscription has been successfully updated.'); 