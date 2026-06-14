/**
 * Windsor.ai REST API client for server-side analytics pulls.
 *
 * The agent (Claude) reads GA4 through the Windsor MCP, but the deployed app
 * cannot use MCP at runtime — so scheduled jobs fetch the same GA4 data through
 * Windsor's REST API (https://windsor.ai/api-documentation/). Reuses the
 * existing GA4 <-> Windsor connection; only a WINDSOR_API_KEY is required.
 *
 * Server-only. Never import from client code.
 */
import 'server-only';
import { serverEnv } from '@/config/server-env';

const WINDSOR_BASE = 'https://connectors.windsor.ai';

export type GA4Row = Record<string, string | number>;

export interface FetchGA4Params {
  fields: string[];
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  connector?: string;
}

export async function fetchGA4({
  fields,
  dateFrom,
  dateTo,
  connector = 'googleanalytics4',
}: FetchGA4Params): Promise<GA4Row[]> {
  const apiKey = serverEnv.WINDSOR_API_KEY;
  if (!apiKey) {
    throw new Error('WINDSOR_API_KEY is not configured');
  }

  const url = new URL(`${WINDSOR_BASE}/${connector}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('fields', fields.join(','));
  url.searchParams.set('date_from', dateFrom);
  url.searchParams.set('date_to', dateTo);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Windsor ${connector} failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  // Windsor REST returns { data: [...] }; the MCP wraps as { result: [...] }.
  return (json?.data ?? json?.result ?? []) as GA4Row[];
}

/** Coerces a Windsor numeric field (sometimes returned as a string) to a number. */
export const num = (v: string | number | undefined): number => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n as number) ? (n as number) : 0;
};
