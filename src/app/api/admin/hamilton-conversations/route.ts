import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

/**
 * Admin-only: read Hamilton support-bot conversations + summary stats.
 *
 * Lets an admin see whether users are chatting with Hamilton and exactly what's
 * being said, so we can spot gaps in the knowledge base and questions that
 * repeatedly route to support. Read-only.
 */

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const service = createServiceRoleClient();
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return {
      error: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }
  return { service };
}

interface StoredMsg {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
}

async function handleGet(_request: NextRequest) {
  try {
    const { error, service } = await requireAdmin();
    if (error) return error;

    const { data: rows, error: dbError } = await service!
      .from('hamilton_conversations')
      .select(
        'id, user_id, messages, escalated_to_ticket, created_at, updated_at'
      )
      .order('updated_at', { ascending: false })
      .limit(200);
    if (dbError) {
      // Degrade gracefully rather than 500 the whole page — surface the real
      // reason to the admin instead of a blank "internal server error".
      console.error('[Hamilton admin] conversations query failed:', dbError);
      return NextResponse.json(
        {
          error: `Could not read conversations: ${dbError.message}`,
          stats: {
            totalConversations: 0,
            uniqueUsers: 0,
            totalMessages: 0,
            totalUserQuestions: 0,
            escalatedToTicket: 0,
            activeLast24h: 0,
            activeLast7d: 0,
          },
          conversations: [],
        },
        { status: 200 }
      );
    }

    const convos = rows ?? [];

    // Resolve user emails for display.
    const userIds = [...new Set(convos.map(c => c.user_id).filter(Boolean))];
    const emailById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await service!
        .from('profiles')
        .select('id, email')
        .in('id', userIds as string[]);
      (profiles ?? []).forEach(p =>
        emailById.set(p.id as string, (p.email as string) ?? '')
      );
    }

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    let totalMessages = 0;
    let totalUserQuestions = 0;
    let escalated = 0;
    let last24h = 0;
    let last7d = 0;

    const conversations = convos.map(c => {
      const messages: StoredMsg[] = Array.isArray(c.messages)
        ? (c.messages as StoredMsg[])
        : [];
      const userMsgs = messages.filter(m => m.role === 'user').length;
      totalMessages += messages.length;
      totalUserQuestions += userMsgs;
      if (c.escalated_to_ticket) escalated += 1;
      const updated = c.updated_at ? new Date(c.updated_at).getTime() : 0;
      if (updated && now - updated <= DAY) last24h += 1;
      if (updated && now - updated <= 7 * DAY) last7d += 1;
      return {
        id: c.id as string,
        email: emailById.get(c.user_id as string) || '—',
        messageCount: messages.length,
        userQuestions: userMsgs,
        escalatedToTicket: !!c.escalated_to_ticket,
        createdAt: c.created_at as string,
        updatedAt: c.updated_at as string,
        // First user question as a quick preview.
        preview:
          messages.find(m => m.role === 'user')?.content?.slice(0, 140) || '',
        messages,
      };
    });

    return NextResponse.json({
      stats: {
        totalConversations: convos.length,
        uniqueUsers: userIds.length,
        totalMessages,
        totalUserQuestions,
        escalatedToTicket: escalated,
        activeLast24h: last24h,
        activeLast7d: last7d,
      },
      conversations,
    });
  } catch (e) {
    console.error('[Hamilton admin] unexpected error:', e);
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const GET = withRateLimit(handleGet, 'admin');
