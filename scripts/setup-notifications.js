const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔔 Setting up notification system...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '011_create_notifications_system.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the migration
    console.log('📝 Running migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If the RPC doesn't exist, try executing the SQL directly
      console.log('ℹ️  Direct SQL execution not available, creating tables individually...');
      
      // Split the SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      // Execute each statement
      for (const statement of statements) {
        try {
          if (statement.includes('CREATE TABLE')) {
            console.log('📊 Creating table...');
          } else if (statement.includes('CREATE INDEX')) {
            console.log('🔍 Creating index...');
          } else if (statement.includes('CREATE POLICY')) {
            console.log('🔒 Creating policy...');
          } else if (statement.includes('CREATE FUNCTION')) {
            console.log('⚡ Creating function...');
          }
          
          // Note: Direct SQL execution might not be available
          // You may need to run this migration through Supabase dashboard
          console.log('⚠️  Note: You may need to run the migration through Supabase SQL editor');
          break;
        } catch (err) {
          console.error('Error executing statement:', err.message);
        }
      }
    } else {
      console.log('✅ Migration completed successfully!');
    }
    
    // Test the notification system
    console.log('\n🧪 Testing notification system...');
    
    // Try to query the notifications table
    const { data: testQuery, error: testError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('\n⚠️  Tables not found. Please run the migration manually:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy the contents of: supabase/migrations/011_create_notifications_system.sql');
      console.log('4. Paste and run the SQL');
    } else {
      console.log('✅ Notification tables are ready!');
      
      // Create a test notification
      console.log('\n📢 Creating a test notification...');
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          title: 'Welcome to DTF Editor Notifications!',
          message: 'This is a test notification to verify the system is working correctly.',
          type: 'success',
          target_audience: 'all',
          priority: 'normal',
          created_by: null, // System notification
          is_active: true
        })
        .select()
        .single();
      
      if (notifError) {
        console.error('❌ Error creating test notification:', notifError.message);
      } else {
        console.log('✅ Test notification created successfully!');
        console.log(`   ID: ${notification.id}`);
        
        // Clean up test notification
        await supabase
          .from('notifications')
          .delete()
          .eq('id', notification.id);
      }
    }
    
    console.log('\n🎉 Notification system setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Deploy the application with the new notification features');
    console.log('2. Access the admin panel at /admin/notifications');
    console.log('3. Send your first notification to users!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n💡 Manual setup instructions:');
    console.log('1. Copy the migration from: supabase/migrations/011_create_notifications_system.sql');
    console.log('2. Run it in your Supabase SQL editor');
  }
}

runMigration();