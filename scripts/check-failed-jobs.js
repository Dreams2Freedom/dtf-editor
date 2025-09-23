const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFailedJobs() {
  try {
    console.log('Checking failed processing jobs...\n');

    // Get recent failed jobs
    const { data: failedJobs, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error querying jobs:', error);
      return;
    }

    if (!failedJobs || failedJobs.length === 0) {
      console.log('No failed jobs found.');
      return;
    }

    console.log(`Found ${failedJobs.length} failed job(s):\n`);

    failedJobs.forEach((job, index) => {
      console.log(`Job ${index + 1}:`);
      console.log(`  ID: ${job.id}`);
      console.log(`  Type: ${job.job_type}`);
      console.log(`  Created: ${new Date(job.created_at).toLocaleString()}`);
      console.log(`  Error: ${job.error_message || 'No error message recorded'}`);

      if (job.input_data) {
        console.log(`  Input data:`, {
          processingMode: job.input_data.processingMode,
          targetWidth: job.input_data.targetWidth,
          targetHeight: job.input_data.targetHeight,
          scale: job.input_data.scale,
          originalFileName: job.input_data.originalFileName
        });
      }
      console.log('');
    });

    // Check processing jobs
    const { data: processingJobs } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('status', 'processing')
      .order('created_at', { ascending: false });

    if (processingJobs && processingJobs.length > 0) {
      console.log(`\n⏳ ${processingJobs.length} job(s) currently processing:`);
      processingJobs.forEach(job => {
        const duration = Date.now() - new Date(job.started_at || job.created_at).getTime();
        console.log(`  - ${job.job_type} (running for ${Math.round(duration / 1000)}s)`);
      });
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkFailedJobs();