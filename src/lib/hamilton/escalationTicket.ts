import type { SupabaseClient } from '@supabase/supabase-js';

export interface EscalationChatMsg {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
}

/**
 * Create a support ticket from a Hamilton hand-off, server-side with the
 * service-role client so it does not depend on the customer clicking the
 * "Start a support ticket" button (and so it bypasses RLS reliably). Mirrors
 * the column shape of the client-side createTicket path (services/support.ts),
 * which is the write path that produces the tickets admins already see.
 *
 * Best-effort: never throws — a failure here must not break the caller (the
 * chat reply, or a bulk back-fill). Returns the new ticket id, or null on
 * failure. Callers should record the id on the conversation
 * (hamilton_conversations.support_ticket_id) to keep creation idempotent.
 */
export async function createEscalationTicket(
  supabase: SupabaseClient,
  userId: string,
  messages: EscalationChatMsg[],
  opts: { notify?: boolean } = {}
): Promise<string | null> {
  const { notify = true } = opts;
  try {
    const firstQuestion =
      messages.find(m => m.role === 'user')?.content?.trim() || '';
    const subject = firstQuestion
      ? firstQuestion.length > 60
        ? `${firstQuestion.slice(0, 57)}…`
        : firstQuestion
      : 'Question from Hamilton';

    const transcript = messages
      .map(m => `${m.role === 'user' ? 'Customer' : 'Hamilton'}: ${m.content}`)
      .join('\n');
    const body = `Hamilton handed this conversation off to support because it couldn't fully answer it. Here's the chat so far:\n\n${transcript}`;

    // Explicit ticket number (the client path does the same because the DB
    // trigger isn't relied upon). Format: TKT-YYYYMM-XXXX.
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const ticketNumber = `TKT-${yearMonth}-${randomNum}`;

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        ticket_number: ticketNumber,
        subject,
        category: 'other',
        priority: 'medium',
      })
      .select('id, ticket_number, subject')
      .single();

    if (ticketError || !ticket) {
      console.error('[Hamilton] escalation ticket insert failed:', ticketError);
      return null;
    }

    const { error: messageError } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        user_id: userId,
        message: body,
        is_admin: false,
      });
    if (messageError) {
      console.error(
        '[Hamilton] escalation ticket message insert failed:',
        messageError
      );
    }

    // Ring the admin bell, same as the guest contact path. Skipped for bulk
    // back-fills so old conversations don't flood the notification list.
    if (notify) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', userId)
          .maybeSingle();
        const senderName =
          `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
          profile?.email ||
          'Customer';
        const { notifyAdminsOfNewTicket } = await import('@/lib/notify-admins');
        await notifyAdminsOfNewTicket({
          ticketId: ticket.id,
          subject: ticket.subject,
          senderName,
          senderEmail: profile?.email || 'unknown',
          priority: 'medium',
        });
      } catch (notifyError) {
        console.error(
          '[Hamilton] escalation ticket notify failed:',
          notifyError
        );
      }
    }

    return ticket.id as string;
  } catch (e) {
    console.error('[Hamilton] escalation ticket error:', e);
    return null;
  }
}
