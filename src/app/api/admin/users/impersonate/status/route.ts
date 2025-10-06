import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get('impersonation_session');

    if (!impersonationCookie) {
      return NextResponse.json({
        isImpersonating: false,
      });
    }

    try {
      const impersonationData = JSON.parse(impersonationCookie.value);

      // Check if expired
      const startedAt = new Date(impersonationData.startedAt);
      const now = new Date();
      const hoursSinceStart =
        (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceStart > 2) {
        // Expired
        return NextResponse.json({
          isImpersonating: false,
          expired: true,
        });
      }

      return NextResponse.json({
        isImpersonating: true,
        impersonatedUserId: impersonationData.impersonatedUserId,
        impersonatedUserEmail: impersonationData.impersonatedUserEmail,
        originalAdminEmail: impersonationData.originalAdminEmail,
        startedAt: impersonationData.startedAt,
        remainingMinutes: Math.floor(2 * 60 - hoursSinceStart * 60),
      });
    } catch (error) {
      console.error('Error parsing impersonation session:', error);
      return NextResponse.json({
        isImpersonating: false,
      });
    }
  } catch (error) {
    console.error('Error checking impersonation status:', error);
    return NextResponse.json(
      { error: 'Failed to check impersonation status' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');
