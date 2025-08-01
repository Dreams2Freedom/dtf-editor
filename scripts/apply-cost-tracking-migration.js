const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  try {
    console.log('🚀 Applying API cost tracking migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/011_create_api_cost_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try running it directly
      console.log('Note: exec_sql function not found, migration needs to be run manually in Supabase dashboard');
      console.log('\nTo apply the migration:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to the SQL Editor');
      console.log('3. Copy and paste the contents of:');
      console.log('   supabase/migrations/011_create_api_cost_tracking.sql');
      console.log('4. Run the query');
      return;
    }

    console.log('✅ Migration applied successfully!');
    
    // Verify the tables were created
    console.log('\n📊 Verifying tables...');
    
    const tables = ['api_cost_config', 'api_usage_logs', 'api_cost_summaries'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table} not found or has errors:`, error.message);
      } else {
        console.log(`✅ Table ${table} exists`);
      }
    }

    // Check if cost configs were inserted
    const { data: configs } = await supabase
      .from('api_cost_config')
      .select('*');

    if (configs && configs.length > 0) {
      console.log(`\n💰 API Cost Configuration:`);
      configs.forEach(config => {
        console.log(`   - ${config.provider} (${config.operation}): $${config.cost_per_unit} ${config.unit_description}`);
      });
    }

    console.log('\n✨ Cost tracking system is ready!');
    console.log('\n📈 Next steps:');
    console.log('1. Visit /admin/analytics to view cost analytics');
    console.log('2. Process some images to start tracking costs');
    console.log('3. Monitor profitability in real-time');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
  }
}

// Run the migration
applyMigration();