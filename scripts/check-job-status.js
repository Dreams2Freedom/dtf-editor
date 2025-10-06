const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkJobs() {
  const jobIds = [
    'ffb5b002-b926-44f7-9055-b5264c8b39f3',
    '42e5d265-3ec6-425b-a2cd-babca255d98d',
  ];

  console.log('Checking status of recent async jobs...\n');

  for (const jobId of jobIds) {
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.log(`Job ${jobId}: Not found or error`);
      continue;
    }

    console.log(`Job ${jobId}:`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Progress: ${job.progress}%`);
    console.log(`  Created: ${new Date(job.created_at).toLocaleString()}`);

    if (job.started_at) {
      console.log(`  Started: ${new Date(job.started_at).toLocaleString()}`);
    }

    if (job.completed_at) {
      console.log(
        `  Completed: ${new Date(job.completed_at).toLocaleString()}`
      );
    }

    if (job.error_message) {
      console.log(`  Error: ${job.error_message}`);
    }

    if (job.output_data?.url) {
      console.log(`  Output URL: ${job.output_data.url.substring(0, 50)}...`);
    }

    console.log('');
  }

  // Also check for any recent jobs
  const { data: recentJobs } = await supabase
    .from('processing_jobs')
    .select('id, status, job_type, created_at, error_message')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentJobs && recentJobs.length > 0) {
    console.log('\nAll recent jobs:');
    recentJobs.forEach(job => {
      const age = Math.round(
        (Date.now() - new Date(job.created_at).getTime()) / 1000
      );
      console.log(
        `  ${job.id.substring(0, 8)}... - ${job.status} - ${job.job_type} - ${age}s ago`
      );
    });
  }
}

checkJobs();
