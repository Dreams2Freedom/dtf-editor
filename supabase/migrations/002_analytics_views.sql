-- DTF Editor - Analytics Views and Optimizations
-- Migration: 002_analytics_views.sql
-- Description: Creates analytics views and additional database optimizations

-- =============================================================================
-- ANALYTICS VIEWS
-- =============================================================================

-- User Analytics View
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

-- Revenue Analytics View
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

-- API Usage Analytics View
CREATE VIEW api_usage_analytics AS
SELECT 
    DATE_TRUNC('day', aul.created_at) as date,
    aul.api_provider,
    aul.operation_type,
    COUNT(*) as request_count,
    AVG(aul.response_time) as avg_response_time,
    SUM(aul.cost) as total_cost,
    COUNT(CASE WHEN aul.status_code >= 400 THEN 1 END) as error_count
FROM api_usage_logs aul
GROUP BY DATE_TRUNC('day', aul.created_at), aul.api_provider, aul.operation_type
ORDER BY date DESC;

-- Image Processing Analytics View
CREATE VIEW image_processing_analytics AS
SELECT 
    DATE_TRUNC('day', i.created_at) as date,
    i.processing_status,
    io.operation_type,
    COUNT(*) as operation_count,
    AVG(io.processing_time) as avg_processing_time,
    SUM(io.credits_used) as total_credits_used,
    SUM(io.api_cost) as total_api_cost
FROM images i
LEFT JOIN image_operations io ON i.id = io.image_id
GROUP BY DATE_TRUNC('day', i.created_at), i.processing_status, io.operation_type
ORDER BY date DESC;

-- =============================================================================
-- ADDITIONAL INDEXES FOR ANALYTICS
-- =============================================================================

-- Indexes for analytics queries
CREATE INDEX idx_credit_transactions_created_at_month ON credit_transactions(DATE_TRUNC('month', created_at));
CREATE INDEX idx_api_usage_logs_created_at_day ON api_usage_logs(DATE_TRUNC('day', created_at));
CREATE INDEX idx_images_created_at_day ON images(DATE_TRUNC('day', created_at));
CREATE INDEX idx_image_operations_processing_time ON image_operations(processing_time);

-- Composite indexes for common query patterns
CREATE INDEX idx_images_user_status_created ON images(user_id, processing_status, created_at DESC);
CREATE INDEX idx_credit_transactions_user_type_created ON credit_transactions(user_id, transaction_type, created_at DESC);
CREATE INDEX idx_api_usage_logs_provider_type_created ON api_usage_logs(api_provider, operation_type, created_at DESC);

-- =============================================================================
-- ADDITIONAL FUNCTIONS
-- =============================================================================

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(p_user_id UUID)
RETURNS TABLE(
    total_images BIGINT,
    completed_images BIGINT,
    failed_images BIGINT,
    total_credits_used BIGINT,
    avg_processing_time DECIMAL,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(i.id)::BIGINT as total_images,
        COUNT(CASE WHEN i.processing_status = 'completed' THEN 1 END)::BIGINT as completed_images,
        COUNT(CASE WHEN i.processing_status = 'failed' THEN 1 END)::BIGINT as failed_images,
        COALESCE(SUM(io.credits_used), 0)::BIGINT as total_credits_used,
        AVG(io.processing_time) as avg_processing_time,
        MAX(i.created_at) as last_activity
    FROM profiles p
    LEFT JOIN images i ON p.id = i.user_id
    LEFT JOIN image_operations io ON i.id = io.image_id
    WHERE p.id = p_user_id
    GROUP BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Function to get revenue statistics for a date range
CREATE OR REPLACE FUNCTION get_revenue_statistics(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_revenue DECIMAL,
    total_transactions BIGINT,
    avg_transaction_value DECIMAL,
    unique_customers BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(ct.amount * ac.cost_per_operation), 0) as total_revenue,
        COUNT(*)::BIGINT as total_transactions,
        COALESCE(AVG(ct.amount * ac.cost_per_operation), 0) as avg_transaction_value,
        COUNT(DISTINCT ct.user_id)::BIGINT as unique_customers
    FROM credit_transactions ct
    LEFT JOIN api_costs ac ON ct.metadata->>'operation_type' = ac.operation_type
    WHERE ct.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND ct.transaction_type = 'usage';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- REAL-TIME SUBSCRIPTIONS
-- =============================================================================

-- Enable real-time for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE images;
ALTER PUBLICATION supabase_realtime ADD TABLE image_operations;
ALTER PUBLICATION supabase_realtime ADD TABLE credit_transactions;

-- =============================================================================
-- ADDITIONAL RLS POLICIES
-- =============================================================================

-- Image operations policies
CREATE POLICY "Users can view own image operations" ON image_operations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM images 
            WHERE id = image_operations.image_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert image operations" ON image_operations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update image operations" ON image_operations
    FOR UPDATE USING (true);

-- Image collections policies
CREATE POLICY "Users can view own collections" ON image_collections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections" ON image_collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections" ON image_collections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections" ON image_collections
    FOR DELETE USING (auth.uid() = user_id);

-- Image collection items policies
CREATE POLICY "Users can view own collection items" ON image_collection_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM image_collections 
            WHERE id = image_collection_items.collection_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own collection items" ON image_collection_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM image_collections 
            WHERE id = image_collection_items.collection_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own collection items" ON image_collection_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM image_collections 
            WHERE id = image_collection_items.collection_id AND user_id = auth.uid()
        )
    );

-- API usage logs policies (read-only for users, full access for admins)
CREATE POLICY "Users can view own API usage" ON api_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert API usage logs" ON api_usage_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all API usage" ON api_usage_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- User activity logs policies
CREATE POLICY "Users can view own activity" ON user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" ON user_activity_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all activity" ON user_activity_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Email logs policies
CREATE POLICY "Users can view own email logs" ON email_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert email logs" ON email_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all email logs" ON email_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- =============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE images;
ANALYZE image_operations;
ANALYZE credit_transactions;
ANALYZE api_usage_logs;

-- Set appropriate autovacuum settings for high-traffic tables
ALTER TABLE images SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE image_operations SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE api_usage_logs SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE credit_transactions SET (autovacuum_vacuum_scale_factor = 0.1); 