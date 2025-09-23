const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTable() {
  try {
    console.log('Checking if processing_jobs table exists...\n');

    // Try to query the table
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('❌ Table "processing_jobs" does not exist!');
        console.log('   This is why the async upscaler is failing.\n');
        console.log('Solution: We need to create the processing_jobs table.');
        return false;
      } else {
        console.log('⚠️ Error querying table:', error.message);
        return false;
      }
    }

    console.log('✅ Table "processing_jobs" exists!');

    // Get recent jobs
    const { data: recentJobs, error: jobsError } = await supabase
      .from('processing_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentJobs && recentJobs.length > 0) {
      console.log(`\nFound ${recentJobs.length} recent job(s):`);
      recentJobs.forEach(job => {
        console.log(`  - ${job.job_type} (${job.status}): Created ${new Date(job.created_at).toLocaleString()}`);
      });
    } else {
      console.log('\nNo jobs found in the table.');
    }

    return true;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

checkTable().then(exists => {
  if (!exists) {
    console.log('\n📝 To fix this issue, we need to run a migration to create the processing_jobs table.');
  }
  process.exit(exists ? 0 : 1);
});