import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('\n🔍 DEBUG WEBHOOK CALLED');
  
  try {
    const body = await request.text();
    const event = JSON.parse(body);
    
    console.log('Event type:', event.type);
    console.log('Event ID:', event.id);
    
    if (event.type === 'payment_intent.succeeded') {
      console.log('Payment Intent Metadata:', event.data.object.metadata);
    }
    
    // Try to call add_user_credits directly
    if (event.data.object.metadata?.userId) {
      console.log('Attempting to add credits...');
      
      // Import dynamically to avoid initialization issues
      const { createClient } = await import('@supabase/supabase-js');
      const { env } = await import('@/config/env');
      
      const supabase = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { error } = await supabase.rpc('add_user_credits', {
        p_user_id: event.data.object.metadata.userId,
        p_amount: parseInt(event.data.object.metadata.credits || '0'),
        p_transaction_type: 'purchase',
        p_description: 'Debug webhook test'
      });
      
      if (error) {
        console.error('❌ RPC Error:', error);
      } else {
        console.log('✅ Credits added successfully!');
      }
    }
    
    return NextResponse.json({ received: true, debug: true });
  } catch (error: any) {
    console.error('❌ Debug webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}