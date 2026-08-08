import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/admin-auth';
import {
  createEscalationTicket,
  type EscalationChatMsg,
} from '@/lib/hamilton/escalationTicket';

/**
 * One-time (re-runnable) back-fill: create support tickets for Hamilton
 * conversations that were handed to support before auto-ticket creation
 * existed. Idempotent — only processes conversations flagged
 * escalated_to_ticket=true that don't already link to a ticket
 * (support_ticket_id IS NULL), and records the link as it goes, so re-running
 * never produces duplicates.
 *
 * Admin-only. Notifications are suppressed so back-filling a batch of old
 * conversations doesn't flood the admin notification bell.
 */
async function handlePost(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    const { data: convos, error } = await supabase
      .from('hamilton_conversations')
      .select('id, user_id, messages')
      .eq('escalated_to_ticket', true)
      .is('support_ticket_id', null);

    if (error) {
      console.error('[Hamilton] back-fill query failed:', error);
      return NextResponse.json(
        {
          error:
            'Failed to load conversations. Ensure the support_ticket_id migration has been applied.',
        },
        { status: 500 }
      );
    }

    const pending = convos || [];
    let created = 0;
    let failed = 0;

    // Sequential on purpose: a one-time admin action over a modest number of
    // conversations, and it keeps DB load predictable.
    for (const c of pending) {
      const messages: EscalationChatMsg[] = Array.isArray(c.messages)
        ? (c.messages as EscalationChatMsg[])
        : [];

      const ticketId = await createEscalationTicket(
        supabase,
        c.user_id as string,
        messages,
        { notify: false }
      );

      if (!ticketId) {
        failed++;
        continue;
      }

      const { error: linkError } = await supabase
        .from('hamilton_conversations')
        .update({ support_ticket_id: ticketId })
        .eq('id', c.id);
      if (linkError) {
        // The ticket exists but we couldn't record the link — surface it so a
        // re-run doesn't silently duplicate this one.
        console.error('[Hamilton] back-fill link failed for', c.id, linkError);
        failed++;
        continue;
      }

      created++;
    }

    return NextResponse.json({
      success: true,
      total: pending.length,
      created,
      failed,
    });
  } catch (error) {
    console.error('[Hamilton] back-fill error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(handlePost);
