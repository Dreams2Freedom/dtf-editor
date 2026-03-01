import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notifyAdminsOfNewTicket, notifyAdminsOfTicketReply } from '@/lib/notify-admins';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, ticketId, subject, ticketNumber, priority } = body;

    if (!ticketId || !type) {
      return NextResponse.json(
        { error: 'ticketId and type are required' },
        { status: 400 }
      );
    }

    // Get user profile for sender info
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .single();

    const senderName = profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'
      : 'User';
    const senderEmail = profile?.email || user.email || 'unknown';

    if (type === 'new_ticket') {
      await notifyAdminsOfNewTicket({
        ticketId,
        subject: subject || 'Support Ticket',
        senderName,
        senderEmail,
        priority,
      });
    } else if (type === 'reply') {
      await notifyAdminsOfTicketReply({
        ticketId,
        ticketNumber: ticketNumber || '',
        subject: subject || 'Support Ticket',
        senderName,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Support notify-admin error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePost, 'api');
