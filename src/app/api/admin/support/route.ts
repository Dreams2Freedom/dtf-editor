import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/admin-auth';

/**
 * Admin support ticket list. Fetched server-side with the service-role client
 * so it bypasses RLS — the previous client-side read went through the
 * "Admins can view all tickets" policy, which subqueries the profiles table
 * whose admin SELECT policy is self-referential (BUG-062), so cross-user reads
 * could fail and leave the admin support queue empty. This mirrors the pattern
 * already used by /api/admin/support/message and /api/admin/users/profiles.
 *
 * Returns tickets enriched with the same fields the admin support page expects
 * (user_email, message_count, has_user_reply, last_reply_from_user,
 * waiting_for_admin, last_message_at).
 */
async function handleGet(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin tickets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    const ticketData = tickets || [];
    if (ticketData.length === 0) {
      return NextResponse.json({ tickets: [] });
    }

    const ticketIds = ticketData.map((t: { id: string }) => t.id);

    // Batch-load message metadata for all tickets in one query, then group by
    // ticket (avoids an N+1 round trip per ticket).
    const { data: allMessages } = await supabase
      .from('support_messages')
      .select('id, ticket_id, is_admin, created_at')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: false });

    const messagesByTicket: Record<
      string,
      { id: string; is_admin: boolean; created_at: string }[]
    > = {};
    for (const m of allMessages || []) {
      const key = (m as { ticket_id: string }).ticket_id;
      (messagesByTicket[key] ||= []).push(
        m as { id: string; is_admin: boolean; created_at: string }
      );
    }

    // Resolve user emails via the service-role client (bypasses RLS).
    const userIds = [
      ...new Set(
        ticketData
          .map((t: { user_id: string | null }) => t.user_id)
          .filter(Boolean)
      ),
    ] as string[];
    const userEmailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      for (const p of profiles || []) {
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        if (p.email) {
          userEmailMap[p.id] = name ? `${name} (${p.email})` : p.email;
        }
      }
    }

    const enriched = ticketData.map(
      (ticket: {
        id: string;
        user_id: string;
        status: string;
        [key: string]: unknown;
      }) => {
        // Messages are already sorted newest-first from the query above.
        const messages = messagesByTicket[ticket.id] || [];
        const messageCount = messages.length;
        const lastMessage = messages[0];
        const hasUserReply = messages.some(msg => !msg.is_admin);
        const lastReplyIsFromUser = !!lastMessage && !lastMessage.is_admin;
        const waitingForAdmin =
          lastReplyIsFromUser &&
          (ticket.status === 'open' || ticket.status === 'in_progress');

        return {
          ...ticket,
          user_email: userEmailMap[ticket.user_id] || ticket.user_id,
          message_count: messageCount,
          has_user_reply: hasUserReply,
          last_reply_from_user: lastReplyIsFromUser,
          waiting_for_admin: waitingForAdmin,
          last_message_at: lastMessage?.created_at,
        };
      }
    );

    return NextResponse.json({ tickets: enriched });
  } catch (error) {
    console.error('Admin support list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handleGet);
