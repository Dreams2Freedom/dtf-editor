const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCreditsColumn() {
  try {
    // Fetch a few user profiles to see which columns exist
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    if (profiles && profiles.length > 0) {
      console.log('Profile columns:', Object.keys(profiles[0]));
      console.log('\nCredit-related columns:');
      
      const creditColumns = Object.keys(profiles[0]).filter(col => 
        col.toLowerCase().includes('credit')
      );
      
      creditColumns.forEach(col => {
        console.log(`- ${col}: ${profiles[0][col]}`);
      });

      // Show sample data
      console.log('\nSample user credits:');
      profiles.forEach(profile => {
        console.log(`User ${profile.email}:`);
        creditColumns.forEach(col => {
          console.log(`  ${col}: ${profile[col]}`);
        });
      });
    } else {
      console.log('No profiles found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCreditsColumn();