#!/usr/bin/env node

/**
 * Check if a specific user exists in the database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email) {
  console.log(`\nChecking for user: ${email}\n`);
  console.log('========================================\n');

  try {
    // Check in auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(email).catch(() => ({ data: null, error: null }));
    
    // Try different approach - list users and filter
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
    } else {
      const user = users?.find(u => u.email === email);
      
      if (user) {
        console.log('✅ User found in auth.users:');
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`  - Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
        console.log(`  - Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        
        // Check profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          console.log('\n✅ Profile found:');
          console.log(`  - Full Name: ${profile.full_name || 'Not set'}`);
          console.log(`  - Credits: ${profile.credits_remaining}`);
          console.log(`  - Subscription: ${profile.subscription_status || 'free'}`);
          console.log(`  - Admin: ${profile.is_admin ? 'Yes' : 'No'}`);
          console.log(`  - Created: ${new Date(profile.created_at).toLocaleString()}`);
          console.log(`  - Updated: ${new Date(profile.updated_at).toLocaleString()}`);
        } else {
          console.log('\n❌ No profile found for this user');
        }
        
        // Check for any uploads
        const { data: uploads, error: uploadsError } = await supabase
          .from('uploads')
          .select('id, filename, created_at, file_size')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (uploads && uploads.length > 0) {
          console.log(`\n📁 Recent uploads (${uploads.length} shown):`);
          uploads.forEach(upload => {
            console.log(`  - ${upload.filename} (${(upload.file_size / 1024).toFixed(2)} KB) - ${new Date(upload.created_at).toLocaleString()}`);
          });
        } else {
          console.log('\n📁 No uploads found');
        }
        
        // Check for any payments
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('id, amount, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (payments && payments.length > 0) {
          console.log(`\n💳 Recent payments (${payments.length} shown):`);
          payments.forEach(payment => {
            console.log(`  - $${(payment.amount / 100).toFixed(2)} - ${payment.status} - ${new Date(payment.created_at).toLocaleString()}`);
          });
        } else {
          console.log('\n💳 No payments found');
        }
        
      } else {
        console.log('❌ User not found in database');
      }
    }
    
  } catch (error) {
    console.error('Error checking user:', error);
  }
  
  console.log('\n========================================\n');
}

// Check for the specific email
checkUser('snsmarketing@gmail.com');