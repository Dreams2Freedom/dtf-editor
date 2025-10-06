const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminUser(email) {
  try {
    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    if (!profile) {
      console.log('No profile found for email:', email);
      return;
    }

    console.log('Profile found:');
    console.log('- ID:', profile.id);
    console.log('- Email:', profile.email);
    console.log('- Full Name:', profile.full_name);
    console.log('- Is Admin:', profile.is_admin);
    console.log('- Plan:', profile.subscription_plan);
    console.log('- Credits:', profile.credits_remaining || profile.credits);

    // If not admin, make them admin
    if (!profile.is_admin) {
      console.log('\nUser is not an admin. Making them admin...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Error updating admin status:', updateError);
      } else {
        console.log('✅ User is now an admin!');
      }
    } else {
      console.log('✅ User is already an admin');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'shannon@s2transfers.com';
console.log('Checking admin status for:', email);
checkAdminUser(email);
