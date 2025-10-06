const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function setupEmailQueue() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Setting up email queue...');

  try {
    // Read the SQL file
    const sql = fs.readFileSync(
      path.join(__dirname, 'create-email-queue.sql'),
      'utf8'
    );

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql,
    });

    if (error) {
      // If the RPC doesn't exist, try a different approach
      console.log(
        'RPC method not available, executing statements individually...'
      );

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log('Executing:', statement.substring(0, 50) + '...');

        // For table creation, we'll need to use the REST API directly
        // Since Supabase JS SDK doesn't support DDL statements
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ sql_query: statement + ';' }),
          }
        );

        if (!response.ok) {
          console.warn(
            'Statement might have failed:',
            statement.substring(0, 50)
          );
          // Continue anyway as some statements might already exist
        }
      }
    }

    console.log('✅ Email queue setup attempted');
    console.log(
      '\nNote: Some statements may have failed if objects already exist.'
    );
    console.log('This is normal if running the script multiple times.');

    // Test if the table was created
    const { data: testData, error: testError } = await supabase
      .from('email_queue')
      .select('count')
      .limit(0);

    if (!testError) {
      console.log('✅ Email queue table confirmed to exist');
    } else {
      console.log(
        '⚠️  Could not confirm email_queue table. You may need to run the SQL manually in Supabase dashboard.'
      );
    }
  } catch (error) {
    console.error('Error setting up email queue:', error);
    console.log(
      '\n⚠️  Automated setup failed. Please run the following SQL in your Supabase dashboard:'
    );
    console.log(
      '\n' +
        fs.readFileSync(path.join(__dirname, 'create-email-queue.sql'), 'utf8')
    );
  }
}

setupEmailQueue();
