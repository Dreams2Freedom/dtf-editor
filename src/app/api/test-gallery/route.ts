import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Test each table
    const results: any = {
      user: user.email,
      tests: {}
    };
    
    // Test processed_images
    const { data: images, error: imagesError } = await supabase
      .from('processed_images')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    results.tests.processed_images = {
      success: !imagesError,
      error: imagesError?.message,
      hasData: !!images?.length
    };
    
    // Test image_collections
    const { data: collections, error: collectionsError } = await supabase
      .from('image_collections')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    results.tests.image_collections = {
      success: !collectionsError,
      error: collectionsError?.message,
      hasData: !!collections?.length
    };
    
    // Test credit_transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    results.tests.credit_transactions = {
      success: !transactionsError,
      error: transactionsError?.message,
      hasData: !!transactions?.length
    };
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');