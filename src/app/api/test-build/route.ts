import { NextResponse } from 'next/server';

export async function GET() {
  // Simple test to verify deployment
  return NextResponse.json({
    message: 'Build test v3',
    timestamp: new Date().toISOString(),
    hasUpscaleSave: true,
    env: process.env.NODE_ENV
  });
}