import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { emailService } from '@/services/email';
import { withAdminAuth } from '@/lib/admin-auth';
async function handlePost(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { ticketId, message, adminId } = body;

    if (!ticketId || !message || !adminId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Add admin message to the ticket
    const { data: newMessage, error: messageError } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        user_id: adminId,
        message: message,
        is_admin: true,
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error adding admin message:', messageError);
      return NextResponse.json(
        { error: 'Failed to add message' },
        { status: 500 }
      );
    }

    // Get ticket details and user info for email
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('ticket_number, subject, user_id')
      .eq('id', ticketId)
      .single();

    let userNotified = false;

    if (ticket) {
      // Get user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', ticket.user_id)
        .single();

      // Update ticket status to waiting_on_user
      await supabase
        .from('support_tickets')
        .update({
          status: 'waiting_on_user',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      // Send email notification to user
      if (userProfile?.email) {
        try {
          await emailService.sendTicketReplyToUser({
            ticketNumber: ticket.ticket_number,
            userEmail: userProfile.email,
            userName: userProfile.first_name
              ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim()
              : undefined,
            adminMessage: message,
            ticketSubject: ticket.subject,
          });
          userNotified = true;
          console.log('Admin reply notification sent for ticket:', ticket.ticket_number);
        } catch (emailError) {
          console.error('Failed to send admin reply notification:', emailError);
          // Don't fail the request if email fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Admin support message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(handlePost);
