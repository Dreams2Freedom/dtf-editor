import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Test with anon key (what the frontend uses)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  try {
    console.log('Testing authentication with:');
    console.log('URL:', supabaseUrl);
    console.log('Using anon key');
    console.log('---');
    
    // Test sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'shannonherod@gmail.com',
      password: 'TestPassword123!'
    });
    
    if (error) {
      console.error('Sign in failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error status:', error.status);
      console.error('Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('Sign in successful!');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      console.log('Session:', !!data.session);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAuth();