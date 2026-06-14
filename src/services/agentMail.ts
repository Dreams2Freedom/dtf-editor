/**
 * AgentMail integration — lets the app/agent send email through AgentMail's
 * REST API (https://docs.agentmail.to). Used for automated analytics reports.
 *
 * Server-only: relies on AGENTMAIL_API_KEY. Never import from client code.
 */
import 'server-only';
import { serverEnv } from '@/config/server-env';

const AGENTMAIL_BASE = 'https://api.agentmail.to/v0';

// Stable client_id so repeated inbox creation returns the same inbox rather
// than spawning a new one on every run.
const REPORTS_INBOX_CLIENT_ID = 'dtf-editor-reports';

export interface SendAgentMailParams {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  cc?: string | string[];
  replyTo?: string;
}

export interface SendAgentMailResult {
  inboxId: string;
  messageId?: string;
}

async function agentMailFetch(
  path: string,
  init: RequestInit
): Promise<any> {
  const apiKey = serverEnv.AGENTMAIL_API_KEY;
  if (!apiKey) {
    throw new Error('AGENTMAIL_API_KEY is not configured');
  }

  const res = await fetch(`${AGENTMAIL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AgentMail ${path} failed: ${res.status} ${body}`);
  }

  return res.json();
}

/**
 * Returns the inbox id to send from. Prefers an explicitly configured inbox
 * (AGENTMAIL_INBOX_ID); otherwise creates/reuses one keyed by a stable
 * client_id.
 */
async function ensureInbox(): Promise<string> {
  if (serverEnv.AGENTMAIL_INBOX_ID) {
    return serverEnv.AGENTMAIL_INBOX_ID;
  }

  const inbox = await agentMailFetch('/inboxes', {
    method: 'POST',
    body: JSON.stringify({ client_id: REPORTS_INBOX_CLIENT_ID }),
  });

  const inboxId = inbox.inbox_id || inbox.inboxId || inbox.id;
  if (!inboxId) {
    throw new Error('AgentMail inbox creation did not return an inbox id');
  }
  return inboxId;
}

/**
 * Sends an email via AgentMail. Resolves the sending inbox automatically.
 */
export async function sendAgentMail(
  params: SendAgentMailParams
): Promise<SendAgentMailResult> {
  const inboxId = await ensureInbox();

  const result = await agentMailFetch(
    `/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
    {
      method: 'POST',
      body: JSON.stringify({
        to: params.to,
        cc: params.cc,
        reply_to: params.replyTo,
        subject: params.subject,
        text: params.text,
        html: params.html,
      }),
    }
  );

  return {
    inboxId,
    messageId: result?.message_id || result?.messageId,
  };
}

export const isAgentMailConfigured = (): boolean =>
  Boolean(serverEnv.AGENTMAIL_API_KEY);
