import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: 'Not authenticated',
        userError: userError?.message,
        hasUser: false,
      },
      { status: 401 }
    );
  }

  // Check profiles.is_admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin, email, id')
    .eq('id', user.id)
    .single();

  // Check admin_users
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Test is_admin function
  const { data: isAdminResult, error: isAdminError } = await supabase.rpc(
    'is_admin',
    { check_user_id: user.id }
  );

  // Try to query affiliates
  const { data: affiliates, error: affiliatesError } = await supabase
    .from('affiliates')
    .select('*')
    .limit(1);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      data: profile,
      error: profileError?.message,
    },
    adminUser: {
      data: adminUser,
      error: adminError?.message,
    },
    isAdminFunction: {
      result: isAdminResult,
      error: isAdminError?.message,
    },
    affiliatesQuery: {
      count: affiliates?.length || 0,
      error: affiliatesError?.message,
    },
    diagnosis: {
      hasSession: !!user,
      profileIsAdmin: profile?.is_admin,
      inAdminUsersTable: !!adminUser,
      isAdminFunctionWorks: isAdminResult === true,
      canQueryAffiliates: !affiliatesError,
    },
  });
}
