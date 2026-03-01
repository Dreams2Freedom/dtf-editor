import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { notifyAdminsOfNewTicket } from '@/lib/notify-admins';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Create service role client for guest ticket creation
    const supabase = createServiceRoleClient();

    // Check if a user exists with this email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    let userId = null;

    if (existingProfile) {
      // User exists, link ticket to their account
      userId = existingProfile.id;
    }

    // Create the support ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        subject,
        priority: 'medium',
        status: 'open',
        guest_email: !userId ? email : null,
        guest_name: !userId ? name : null,
        metadata: {
          source: 'contact_form',
          guest: !userId,
        },
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating ticket:', ticketError);
      return NextResponse.json(
        { error: 'Failed to create support ticket' },
        { status: 500 }
      );
    }

    // Add the initial message
    const { error: messageError } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'user',
        content: message,
        metadata: {
          sender_name: name,
          sender_email: email,
        },
      });

    if (messageError) {
      console.error('Error creating message:', messageError);
      // Don't fail completely if message creation fails
    }

    // Send in-app notification to admin bell icon
    await notifyAdminsOfNewTicket({
      ticketId: ticket.id,
      subject,
      senderName: name,
      senderEmail: email,
      priority: 'medium',
    });

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: "Your message has been received. We'll respond within 24 hours.",
    });
  } catch (error) {
    console.error('Guest support error:', error);
    return NextResponse.json(
      { error: 'Failed to submit message' },
      { status: 500 }
    );
  }
}
