-- NEW-02: Enable Row Level Security on 9 unprotected tables
-- Date: 2026-02-16
-- These tables were created without RLS, making them accessible to any authenticated user via the Supabase client.

-- =================================================================
-- 1. subscription_plans (read-only for all, admin can write)
-- =================================================================
ALTER TABLE IF EXISTS subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify subscription plans"
  ON subscription_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- =================================================================
-- 2. pay_as_you_go_packages (read-only for all, admin can write)
-- =================================================================
ALTER TABLE IF EXISTS pay_as_you_go_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view packages"
  ON pay_as_you_go_packages FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify packages"
  ON pay_as_you_go_packages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- =================================================================
-- 3. subscription_history (users see own, admins see all)
-- =================================================================
ALTER TABLE IF EXISTS subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription history"
  ON subscription_history FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Only service role can insert subscription history"
  ON subscription_history FOR INSERT
  WITH CHECK (false);

-- =================================================================
-- 4. api_costs (admin-only)
-- =================================================================
ALTER TABLE IF EXISTS api_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view api costs"
  ON api_costs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Only admins can modify api costs"
  ON api_costs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- =================================================================
-- 5. admin_logs (admin-only)
-- =================================================================
ALTER TABLE IF EXISTS admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin logs"
  ON admin_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Only admins can insert admin logs"
  ON admin_logs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- =================================================================
-- 6. system_metrics (admin-only)
-- =================================================================
ALTER TABLE IF EXISTS system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view system metrics"
  ON system_metrics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Only admins can insert system metrics"
  ON system_metrics FOR INSERT
  WITH CHECK (false);

-- =================================================================
-- 7. email_templates (admin-only)
-- =================================================================
ALTER TABLE IF EXISTS email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view email templates"
  ON email_templates FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Only admins can modify email templates"
  ON email_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- =================================================================
-- 8. email_campaigns (admin-only)
-- =================================================================
ALTER TABLE IF EXISTS email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view email campaigns"
  ON email_campaigns FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Only admins can modify email campaigns"
  ON email_campaigns FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- =================================================================
-- 9. image_collection_items (users see own, admin sees all)
-- =================================================================
ALTER TABLE IF EXISTS image_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collection items"
  ON image_collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM image_collections ic
      WHERE ic.id = image_collection_items.collection_id
      AND (ic.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
    )
  );

CREATE POLICY "Users can insert to own collections"
  ON image_collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM image_collections ic
      WHERE ic.id = image_collection_items.collection_id
      AND ic.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete from own collections"
  ON image_collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM image_collections ic
      WHERE ic.id = image_collection_items.collection_id
      AND ic.user_id = auth.uid()
    )
  );
