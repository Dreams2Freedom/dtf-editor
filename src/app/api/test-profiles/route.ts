import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  const serviceClient = createServiceRoleClient();

  // Test 1: Can we fetch referrals?
  const { data: referrals, error: refError } = await serviceClient
    .from('referrals')
    .select('*')
    .limit(5);

  // Test 2: Can we fetch profiles?
  const userIds = referrals?.map(r => r.referred_user_id).filter(Boolean) || [];

  const { data: profiles, error: profileError } = await serviceClient
    .from('profiles')
    .select('id, email, subscription_plan, subscription_status')
    .in('id', userIds);

  return NextResponse.json({
    referrals: {
      count: referrals?.length || 0,
      data: referrals,
      error: refError
    },
    userIds,
    profiles: {
      count: profiles?.length || 0,
      data: profiles,
      error: profileError
    }
  });
}
