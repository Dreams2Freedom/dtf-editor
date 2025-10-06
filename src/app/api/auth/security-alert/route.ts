import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { emailService } from '@/services/email';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const body = await request.json();
    const { alertType, deviceInfo } = body;

    // Get device info from request headers if not provided
    const userAgent = request.headers.get('user-agent') || '';
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'Unknown';

    // Parse user agent for browser and OS
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    if (userAgent) {
      // Simple browser detection
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';

      // Simple OS detection
      if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Mac')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iOS')) os = 'iOS';
    }

    const finalDeviceInfo = deviceInfo || {
      browser,
      os,
      ip: ip.split(',')[0].trim(), // Get first IP if multiple
    };

    // Send security alert email
    const emailSent = await emailService.sendSecurityAlert({
      email: user.email!,
      userName: profile?.first_name || undefined,
      alertType: alertType || 'new_login',
      deviceInfo: finalDeviceInfo,
      timestamp: new Date(),
    });

    if (!emailSent) {
      console.error('Failed to send security alert email');
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (error) {
    console.error('Security alert error:', error);
    return NextResponse.json(
      { error: 'Failed to send security alert' },
      { status: 500 }
    );
  }
}
