import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * @deprecated Use /api/sam2/segment instead.
 * This endpoint is kept for backwards compatibility but no longer functional.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/sam2/segment instead.' },
    { status: 410 }
  );
}
