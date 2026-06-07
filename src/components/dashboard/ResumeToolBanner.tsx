'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, X, CheckCircle2 } from 'lucide-react';
import {
  getIntendedTool,
  clearIntendedTool,
  type IntendedTool,
} from '@/lib/intendedTool';

/**
 * After a user hits an out-of-credit prompt and goes off to buy credits / start
 * a trial / pick a plan (which routes through Stripe back to the dashboard), we
 * remembered the tool they were trying to use. This banner offers a one-click
 * way back into that tool instead of making them start over.
 */
export function ResumeToolBanner() {
  const router = useRouter();
  const [tool, setTool] = useState<IntendedTool | null>(null);

  useEffect(() => {
    setTool(getIntendedTool());
  }, []);

  if (!tool) return null;

  const dismiss = () => {
    clearIntendedTool();
    setTool(null);
  };

  const resume = () => {
    const route = tool.route;
    clearIntendedTool();
    setTool(null);
    router.push(route);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-green-800">
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" aria-hidden="true" />
        <span>
          You&apos;re all set — pick up where you left off with{' '}
          <span className="font-semibold">{tool.toolName}</span>.
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={resume}
          className="inline-flex min-h-[40px] items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
        >
          Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-lg p-2 text-green-700 transition-colors hover:bg-green-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
