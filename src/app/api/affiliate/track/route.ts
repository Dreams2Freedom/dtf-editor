/**
 * API Route: Track Affiliate Referral
 * GET /api/affiliate/track?ref=CODE
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackReferralVisit, setAffiliateCookie } from '@/services/affiliate';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const referralCode = searchParams.get('ref');
    const redirectTo = searchParams.get('redirect') || '/';

    if (!referralCode) {
      // No referral code, just redirect
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // Get visit data
    const visitData = {
      landing_page: redirectTo,
      utm_source: searchParams.get('utm_source') || undefined,
      utm_medium: searchParams.get('utm_medium') || undefined,
      utm_campaign: searchParams.get('utm_campaign') || undefined,
      utm_content: searchParams.get('utm_content') || undefined,
      utm_term: searchParams.get('utm_term') || undefined,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      referer: request.headers.get('referer') || undefined
    };

    // Track the visit
    const result = await trackReferralVisit(referralCode, visitData);

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    if (result.success && result.cookieId) {
      // Set cookie for tracking
      response.cookies.set({
        name: 'dtf_ref',
        value: result.cookieId,
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });

      // Also set the referral code for easy access
      response.cookies.set({
        name: 'dtf_ref_code',
        value: referralCode,
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }

    return response;

  } catch (error) {
    console.error('Error tracking affiliate:', error);
    // Still redirect even if tracking fails
    return NextResponse.redirect(new URL('/', request.url));
  }
}