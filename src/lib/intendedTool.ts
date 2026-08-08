/**
 * Remembers which paid tool a user was trying to launch when they hit an
 * out-of-credit prompt, so after they purchase credits / start a trial / pick a
 * plan (which routes through Stripe Checkout back to the dashboard) we can offer
 * to send them straight back into that tool instead of making them start over.
 *
 * Uses sessionStorage (same-tab, cleared when the tab closes) — no DB change.
 */

const KEY = 'dtf_intended_tool';

export interface IntendedTool {
  route: string;
  toolName: string;
}

export function setIntendedTool(route: string, toolName: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ route, toolName }));
  } catch {
    /* ignore storage failures */
  }
}

export function getIntendedTool(): IntendedTool | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.route === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function clearIntendedTool(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
