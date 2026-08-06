import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * In-house tool analytics logger.
 *
 * Records a success/error/usage event for one of our own (free, in-house) tools
 * into `inhouse_tool_events`, so the admin "In-House Tools" dashboard can report
 * how the in-house engine is performing. Kept intentionally separate from the
 * billing-oriented `api_usage_logs` (third-party providers only).
 *
 * Design rules:
 *   - FIRE-AND-FORGET. This is telemetry, not part of the tool's contract.
 *     Callers should NOT await it in a way that can delay or fail the user's
 *     result. It never throws — any DB error is swallowed and logged.
 *   - Uses the service-role client (the table is RLS-locked away from the
 *     browser), so it only runs server-side.
 *   - If the table doesn't exist yet (migration not applied), the insert just
 *     errors and is logged; the tool itself is unaffected.
 */

export type InhouseToolStatus = 'success' | 'error';

export interface InhouseToolEvent {
  /** The end user who ran the tool (null if unknown/unauthenticated). */
  userId?: string | null;
  /** Tool family, e.g. 'background-removal'. */
  tool: string;
  /** Specific engine/mode, e.g. 'sam-auto' | 'ml-color'. */
  operation: string;
  status: InhouseToolStatus;
  /** End-to-end processing time in ms (optional). */
  processingTimeMs?: number | null;
  /** Short error reason when status = 'error'. */
  errorMessage?: string | null;
  /** Any extra structured context (kept small). */
  metadata?: Record<string, unknown>;
}

/**
 * Insert one in-house tool event. Resolves once the write is attempted; never
 * rejects. Safe to call with or without `await` — `await`ing only waits for the
 * insert, it can never surface an error to the caller.
 */
export async function logInhouseToolEvent(
  event: InhouseToolEvent
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('inhouse_tool_events').insert({
      user_id: event.userId ?? null,
      tool: event.tool,
      operation: event.operation,
      status: event.status,
      processing_time_ms:
        typeof event.processingTimeMs === 'number'
          ? Math.round(event.processingTimeMs)
          : null,
      error_message: event.errorMessage
        ? String(event.errorMessage).slice(0, 500)
        : null,
      metadata: event.metadata ?? {},
    });
    if (error) {
      console.error('[inhouseToolEvents] insert failed:', error.message);
    }
  } catch (err) {
    console.error('[inhouseToolEvents] logging error:', err);
  }
}
