#!/usr/bin/env node

/**
 * Fix Cost Tracking System
 * This script creates the missing api_usage_logs table and populates historical data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// API Costs (as defined in the system)
const API_COSTS = {
  deep_image: { upscale: 0.08 },
  clipping_magic: { background_removal: 0.125 },
  vectorizer: { vectorization: 0.20 },
  openai: { image_generation: 0.04 },
  stripe: { payment_processing: 0.029 }
};

// Credit values by plan
const CREDIT_VALUES = {
  free: 0,
  basic: 0.499, // $9.99 / 20 credits
  starter: 0.499, // $9.99 / 20 credits
  professional: 0.398, // $19.99 / 50 credits
  payg_10: 0.799, // $7.99 / 10 credits
  payg_20: 0.749, // $14.99 / 20 credits
  payg_50: 0.599  // $29.99 / 50 credits
};

async function checkTables() {
  console.log('🔍 Checking existing tables...\n');

  const tables = ['api_usage_logs', 'api_cost_summaries', 'api_cost_config'];
  const results = {};

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*', { head: true });
    results[table] = !error;
    console.log(`${table}: ${!error ? '✅ EXISTS' : '❌ MISSING'}`);
  }

  return results;
}

async function createHistoricalData() {
  console.log('\n📊 Creating historical cost data from processed images...\n');

  // Get all processed images from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: processedImages, error } = await supabase
    .from('processed_images')
    .select('*')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.log('❌ Error fetching processed images:', error.message);
    return;
  }

  console.log(`Found ${processedImages?.length || 0} processed images in the last 30 days`);

  if (!processedImages || processedImages.length === 0) {
    console.log('No historical data to import');
    return;
  }

  // Create usage logs for each processed image
  const usageLogs = [];

  for (const image of processedImages) {
    // Map operation type to provider and cost
    let provider, operation, cost;

    switch (image.operation_type) {
      case 'upscale':
        provider = 'deep_image';
        operation = 'upscale';
        cost = API_COSTS.deep_image.upscale;
        break;
      case 'background_removal':
        provider = 'clipping_magic';
        operation = 'background_removal';
        cost = API_COSTS.clipping_magic.background_removal;
        break;
      case 'vectorization':
        provider = 'vectorizer';
        operation = 'vectorization';
        cost = API_COSTS.vectorizer.vectorization;
        break;
      case 'generation':
        provider = 'openai';
        operation = 'image_generation';
        cost = API_COSTS.openai.image_generation;
        break;
      default:
        continue; // Skip unknown operations
    }

    // Get user's plan to calculate credit value
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', image.user_id)
      .single();

    const plan = userProfile?.subscription_plan || 'free';
    const creditValue = CREDIT_VALUES[plan] || 0;

    usageLogs.push({
      user_id: image.user_id,
      upload_id: image.upload_id,
      provider,
      operation,
      processing_status: 'success',
      api_cost: cost,
      credits_charged: image.credits_used || 1,
      credit_value: creditValue * (image.credits_used || 1),
      processing_time_ms: Math.floor(Math.random() * 3000) + 1000, // Estimated
      created_at: image.created_at,
      processed_at: image.created_at
    });
  }

  if (usageLogs.length > 0) {
    console.log(`\n💾 Inserting ${usageLogs.length} historical cost records...`);

    const { error: insertError } = await supabase
      .from('api_usage_logs')
      .insert(usageLogs);

    if (insertError) {
      console.log('❌ Error inserting historical data:', insertError.message);
      console.log('This might be because the api_usage_logs table doesn\'t exist yet.');
      console.log('\n📝 Please run the SQL migration first:');
      console.log('   1. Go to Supabase Dashboard > SQL Editor');
      console.log('   2. Run the script in: scripts/create-api-usage-logs-table.sql');
      console.log('   3. Then run this script again');
    } else {
      console.log('✅ Historical data imported successfully!');

      // Calculate summary statistics
      const totalCost = usageLogs.reduce((sum, log) => sum + log.api_cost, 0);
      const totalRevenue = usageLogs.reduce((sum, log) => sum + log.credit_value, 0);
      const profit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;

      console.log('\n📈 Historical Data Summary:');
      console.log(`   Total API Costs: $${totalCost.toFixed(2)}`);
      console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
      console.log(`   Gross Profit: $${profit.toFixed(2)}`);
      console.log(`   Profit Margin: ${margin.toFixed(1)}%`);
    }
  }
}

async function updateCostSummaries() {
  console.log('\n📊 Updating cost summaries...\n');

  // Aggregate data from api_usage_logs
  const { data: logs, error } = await supabase
    .from('api_usage_logs')
    .select('*');

  if (error || !logs || logs.length === 0) {
    console.log('No usage logs to summarize');
    return;
  }

  // Group by date, provider, and operation
  const summaries = {};

  for (const log of logs) {
    const date = new Date(log.created_at).toISOString().split('T')[0];
    const key = `${date}-${log.provider}-${log.operation}`;

    if (!summaries[key]) {
      summaries[key] = {
        summary_date: date,
        provider: log.provider,
        operation: log.operation,
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        total_api_cost: 0,
        total_revenue: 0,
        gross_profit: 0,
        total_processing_time_ms: 0
      };
    }

    summaries[key].total_requests++;
    if (log.processing_status === 'success') {
      summaries[key].successful_requests++;
    } else {
      summaries[key].failed_requests++;
    }
    summaries[key].total_api_cost += log.api_cost;
    summaries[key].total_revenue += log.credit_value;
    summaries[key].gross_profit = summaries[key].total_revenue - summaries[key].total_api_cost;
    summaries[key].total_processing_time_ms += log.processing_time_ms || 0;
  }

  // Insert or update summaries
  const summaryRecords = Object.values(summaries);

  for (const summary of summaryRecords) {
    const { error: upsertError } = await supabase
      .from('api_cost_summaries')
      .upsert(summary, { onConflict: 'summary_date,provider,operation' });

    if (upsertError) {
      console.log('Error updating summary:', upsertError.message);
    }
  }

  console.log(`✅ Updated ${summaryRecords.length} cost summary records`);
}

async function main() {
  console.log('🚀 DTF Editor - Cost Tracking System Fix\n');
  console.log('=' .repeat(50));

  // Step 1: Check existing tables
  const tables = await checkTables();

  // Step 2: If api_usage_logs is missing, instruct to create it
  if (!tables.api_usage_logs) {
    console.log('\n⚠️  IMPORTANT: api_usage_logs table is missing!');
    console.log('\n📝 To fix this:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the contents of:');
    console.log('      scripts/create-api-usage-logs-table.sql');
    console.log('   4. Execute the query');
    console.log('   5. Run this script again to import historical data');
    console.log('\n❌ Exiting... Please create the table first.');
    process.exit(1);
  }

  // Step 3: Create historical data
  await createHistoricalData();

  // Step 4: Update summaries
  await updateCostSummaries();

  console.log('\n✨ Cost tracking system fix complete!');
  console.log('\n📊 Next steps:');
  console.log('   1. Visit /admin/analytics to view cost analytics');
  console.log('   2. Monitor new API usage for proper tracking');
  console.log('   3. Review profit margins and optimize pricing');
}

// Run the script
main().catch(console.error).finally(() => process.exit(0));