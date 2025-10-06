const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Starting collections migration...\n');

    // Check if tables already exist
    const { data: existingTables } = await supabase
      .from('image_collections')
      .select('id')
      .limit(1);

    if (existingTables) {
      console.log('⚠️  Tables already exist. Migration may have been applied.');
      const { count } = await supabase
        .from('image_collections')
        .select('*', { count: 'exact', head: true });
      console.log(`   Found ${count} collections`);
      return;
    }

    console.log('❌ Migration not yet applied.');
    console.log('\n📋 Please apply the migration manually:');
    console.log('\n1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy the contents of:');
    console.log('   supabase/migrations/011_create_image_collections.sql');
    console.log('5. Paste and run the query');
    console.log('\n✨ This will:');
    console.log('   - Create image_collections table');
    console.log('   - Create collection_items table');
    console.log('   - Add primary_collection_id to processed_images');
    console.log('   - Set up RLS policies');
    console.log('   - Create default collections for all users');
  } catch (error) {
    if (error.code === 'PGRST204') {
      console.log('❌ Tables do not exist yet.');
      console.log(
        '\n📋 Please apply the migration manually (see instructions above)'
      );
    } else {
      console.error('Error checking migration status:', error);
    }
  }
}

applyMigration();
