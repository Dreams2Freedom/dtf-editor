/**
 * Fetch every row matching a query, transparently paginating past
 * Supabase/PostgREST's default 1000-row response cap.
 *
 * A single `.select()` returns at most `max-rows` (1000 by default) rows,
 * which silently truncates admin views like the user stats and CSV export.
 * This helper re-issues the query in batches via `.range()` until a short
 * (or empty) page signals the end.
 *
 * Pass a factory that builds the query for a given inclusive [from, to]
 * range — Supabase query builders are single-use, so a fresh one is needed
 * per batch:
 *
 *   const all = await fetchAllRows((from, to) =>
 *     client.from('profiles').select('id, email').range(from, to)
 *   );
 */
type RangeQuery<T> = (
  from: number,
  to: number
) => PromiseLike<{ data: T[] | null; error: unknown }>;

export async function fetchAllRows<T>(
  buildQuery: RangeQuery<T>,
  batchSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // Safety ceiling so a misbehaving query can never loop forever.
  const MAX_BATCHES = 10_000; // up to 10M rows at the default batch size

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const to = from + batchSize - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < batchSize) break; // last (partial) page
    from += batchSize;
  }

  return all;
}
