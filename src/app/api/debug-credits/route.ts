import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function handleGet() {
  try {
    // Get your user ID (replace with actual user ID)
    const userId = 'f689bb22-89dd-4c3c-a941-d77feb84428d'; // snsmarketing@gmail.com
    
    // Check current credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits_remaining, total_credits_purchased')
      .eq('id', userId)
      .single();
    
    // Get recent credit transactions
    const { data: transactions, error: transError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Test the RPC function
    let rpcTestResult = null;
    try {
      const { data, error } = await supabase.rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: 0, // 0 credits just to test
        p_transaction_type: 'test',
        p_description: 'Test RPC function',
        p_metadata: { test: true }
      });
      rpcTestResult = { success: !error, data, error };
    } catch (e: any) {
      rpcTestResult = { success: false, error: e.message };
    }
    
    // Check if webhook secret is configured
    const webhookSecretConfigured = !!env.STRIPE_WEBHOOK_SECRET;
    
    return NextResponse.json({
      profile: profile || 'No profile found',
      profileError,
      recentTransactions: transactions || [],
      transactionsError: transError,
      rpcTest: rpcTestResult,
      webhookSecretConfigured,
      supabaseUrl: env.SUPABASE_URL,
      debug: {
        userId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

async function handlePost(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    // Test adding credits manually
    const { data, error } = await supabase.rpc('add_user_credits', {
      p_user_id: userId,
      p_amount: 5,
      p_transaction_type: 'test',
      p_description: 'Manual test credit addition',
      p_metadata: { 
        test: true,
        timestamp: new Date().toISOString()
      }
    });
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error 
      }, { status: 400 });
    }
    
    // Get updated profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', userId)
      .single();
    
    return NextResponse.json({ 
      success: true,
      creditsAdded: 5,
      newBalance: profile?.credits_remaining,
      rpcResult: data
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'public');