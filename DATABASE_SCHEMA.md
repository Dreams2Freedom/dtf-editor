# DTF Editor - Database Schema Design

## 🗄️ **Database Overview**

**Platform:** Supabase (PostgreSQL)
**Authentication:** Supabase Auth with custom profiles
**Storage:** Supabase Storage for images
**Real-time:** Supabase real-time subscriptions

## 📋 **Core Tables**

### **1. Users & Authentication**

#### **auth.users (Supabase Built-in)**

```sql
-- Managed by Supabase Auth
-- Contains: id, email, encrypted_password, email_confirmed_at,
--          invited_at, confirmation_token, confirmation_sent_at,
--          recovery_token, recovery_sent_at, email_change_token_new,
--          email_change, email_change_sent_at, last_sign_in_at,
--          raw_app_meta_data, raw_user_meta_data, is_super_admin,
--          created_at, updated_at, phone, phone_confirmed_at,
--          phone_change, phone_change_token, phone_change_sent_at,
--          email_change_token_current, email_change_confirm_status,
--          banned_until, reauthentication_token, reauthentication_sent_at
```

#### **profiles**

```sql
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
```

### **2. Subscription & Payment Management**

#### **subscription_plans**

```sql
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
```

#### **pay_as_you_go_packages**

```sql
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
```

#### **credit_transactions**

```sql
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
```

#### **subscription_history**

```sql
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
```

### **3. Image Management**

#### **images**

```sql
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
```

#### **image_operations**

```sql
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
```

#### **image_collections**

```sql
CREATE TABLE image_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **image_collection_items**

```sql
CREATE TABLE image_collection_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES image_collections(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, image_id)
);
```

### **4. API Cost Tracking**

#### **api_costs**

```sql
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
```

#### **api_usage_logs**

```sql
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
```

### **5. Admin & Analytics**

#### **admin_logs**

```sql
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
```

#### **system_metrics**

```sql
CREATE TABLE system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit TEXT,
    tags JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **user_activity_logs**

```sql
CREATE TABLE user_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **6. Marketing & Communication**

#### **email_templates**

```sql
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
```

#### **email_campaigns**

```sql
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
```

#### **email_logs**

```sql
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
```

## 🔐 **Row Level Security (RLS) Policies**

### **profiles**

```sql
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );
```

### **images**

```sql
-- Users can only see their own images
CREATE POLICY "Users can view own images" ON images
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own images
CREATE POLICY "Users can insert own images" ON images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own images
CREATE POLICY "Users can update own images" ON images
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete own images" ON images
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all images
CREATE POLICY "Admins can view all images" ON images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );
```

### **credit_transactions**

```sql
-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert transactions
CREATE POLICY "System can insert transactions" ON credit_transactions
    FOR INSERT WITH CHECK (true);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions" ON credit_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );
```

## 📊 **Indexes for Performance**

```sql
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
```

## 🔄 **Database Functions**

### **Update Updated At Timestamp**

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### **Credit Management Functions**

```sql
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
```

## 🔧 **Triggers**

```sql
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
```

## 📈 **Views for Analytics**

### **User Analytics View**

```sql
CREATE VIEW user_analytics AS
SELECT
    p.id,
    p.email,
    p.subscription_status,
    p.credits_remaining,
    p.total_credits_purchased,
    p.total_credits_used,
    COUNT(i.id) as total_images,
    COUNT(CASE WHEN i.processing_status = 'completed' THEN 1 END) as completed_images,
    COUNT(CASE WHEN i.processing_status = 'failed' THEN 1 END) as failed_images,
    MAX(i.created_at) as last_image_created,
    p.created_at as user_created_at
FROM profiles p
LEFT JOIN images i ON p.id = i.user_id
GROUP BY p.id, p.email, p.subscription_status, p.credits_remaining,
         p.total_credits_purchased, p.total_credits_used, p.created_at;
```

### **Revenue Analytics View**

```sql
CREATE VIEW revenue_analytics AS
SELECT
    DATE_TRUNC('month', ct.created_at) as month,
    ct.transaction_type,
    COUNT(*) as transaction_count,
    SUM(ct.amount) as total_credits,
    SUM(CASE WHEN ct.stripe_payment_intent_id IS NOT NULL THEN 1 ELSE 0 END) as paid_transactions
FROM credit_transactions ct
WHERE ct.transaction_type = 'purchase'
GROUP BY DATE_TRUNC('month', ct.created_at), ct.transaction_type
ORDER BY month DESC;
```

---

**Schema Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Ready for Implementation
