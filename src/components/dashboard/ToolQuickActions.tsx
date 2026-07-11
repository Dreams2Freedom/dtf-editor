'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Ruler,
  ArrowUpCircle,
  Scissors,
  Pen,
  Palette,
  Sparkles,
  ArrowRight,
  Grip,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { OutOfCreditsModal } from '@/components/credits/OutOfCreditsModal';

/**
 * ToolQuickActions — prominent, always-visible tool shortcuts for the
 * logged-in app. Each card links directly to the tool's start route so users
 * never have to hunt through dropdowns or pick the tool twice. Reuses existing
 * routes and tool icons; no processing/auth/payment logic lives here.
 */

type BadgeTone = 'credit' | 'free' | 'paid' | 'alpha';

interface Tool {
  name: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  badge: { label: string; tone: BadgeTone };
  /** Credits needed to start this tool (omit for free tools). */
  requiredCredits?: number;
  /** Tool requires an active paid plan (e.g. AI generation). */
  requiresPaidPlan?: boolean;
}

const TOOLS: Tool[] = [
  {
    name: 'Free DPI Checker',
    description: 'Check whether your artwork is sharp enough to print.',
    href: '/tools/dpi-checker',
    cta: 'Check DPI',
    icon: Ruler,
    badge: { label: 'Always free', tone: 'free' },
  },
  {
    name: 'Image Upscaling',
    description: 'Make blurry or low-resolution artwork cleaner and sharper.',
    href: '/process?operation=upscale',
    cta: 'Upscale Image',
    icon: ArrowUpCircle,
    badge: { label: '1 credit', tone: 'credit' },
    requiredCredits: 1,
  },
  {
    name: 'Background Removal',
    description: 'Remove backgrounds and create transparent PNG artwork.',
    href: '/process?operation=background-removal',
    cta: 'Remove Background',
    icon: Scissors,
    badge: { label: '1 credit', tone: 'credit' },
    requiredCredits: 1,
  },
  {
    name: 'Vectorization',
    description: 'Convert logos and graphics into cleaner scalable artwork.',
    href: '/process?operation=vectorize',
    cta: 'Vectorize Artwork',
    icon: Pen,
    badge: { label: '2 credits', tone: 'credit' },
    requiredCredits: 2,
  },
  {
    name: 'Change Colors',
    description: 'Swap the colors in a design without redrawing it.',
    href: '/process/color-change',
    cta: 'Change Colors',
    icon: Palette,
    badge: { label: '1 credit', tone: 'credit' },
  },
  {
    name: 'Halftone',
    description: 'Turn artwork into print-ready halftone dots.',
    href: '/studio?tool=halftone',
    cta: 'Try Halftone',
    icon: Grip,
    badge: { label: 'Alpha', tone: 'alpha' },
  },
  {
    name: 'AI Image Generation',
    description: 'Create new artwork ideas from a simple prompt.',
    href: '/generate',
    cta: 'Generate Artwork',
    icon: Sparkles,
    badge: { label: 'Paid plans', tone: 'paid' },
    requiredCredits: 2,
    requiresPaidPlan: true,
  },
];

const BADGE_TONE: Record<BadgeTone, string> = {
  credit: 'bg-blue-50 text-blue-700',
  free: 'bg-green-50 text-green-700',
  paid: 'bg-amber-50 text-amber-700',
  alpha: 'bg-violet-50 text-violet-700',
};

interface ToolQuickActionsProps {
  heading?: string;
  subheading?: string;
  className?: string;
}

export function ToolQuickActions({
  heading = 'What do you want to fix?',
  subheading = 'Choose the tool you need. DTF Editor will guide you through the next step.',
  className = '',
}: ToolQuickActionsProps) {
  const { profile, isAdmin } = useAuthStore();
  const [blocked, setBlocked] = useState<{ name: string; route: string } | null>(
    null
  );

  // UX gate: stop a paid tool launch up front when the user can't afford it
  // (server-side credit checks still apply). Admins bypass.
  const shouldBlock = (tool: Tool): boolean => {
    if (isAdmin) return false;
    const credits = profile?.credits_remaining ?? 0;
    const plan = (profile?.subscription_plan || 'free').toLowerCase();
    if (tool.requiresPaidPlan && (plan === 'free' || plan === '')) return true;
    if (tool.requiredCredits && credits < tool.requiredCredits) return true;
    return false;
  };

  return (
    <section className={className} aria-labelledby="tool-quick-actions-heading">
      <div className="mb-3">
        <h2
          id="tool-quick-actions-heading"
          className="text-base sm:text-lg font-bold text-gray-900"
        >
          {heading}
        </h2>
        <p className="mt-0.5 text-xs sm:text-sm text-gray-500">{subheading}</p>
      </div>

      {/* Compact tool cards: kept dense so the image gallery below rises into
          view on the dashboard without scrolling. */}
      {/* 4 columns on wide screens so all 7 tools fit in 2 rows (not 3),
          keeping the toolkit short enough that the recent-images gallery
          below stays visible without scrolling. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {TOOLS.map(tool => (
          <Link
            key={tool.name}
            href={tool.href}
            onClick={e => {
              if (shouldBlock(tool)) {
                e.preventDefault();
                setBlocked({ name: tool.name, route: tool.href });
              }
            }}
            aria-label={`${tool.cta}: ${tool.description}`}
            className="group flex min-h-[44px] flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 transition-transform group-hover:scale-105">
                <tool.icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE_TONE[tool.badge.tone]}`}
              >
                {tool.badge.label}
              </span>
            </div>

            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              {tool.name}
            </h3>
            <p className="mt-0.5 flex-1 text-xs text-gray-500 line-clamp-1 sm:line-clamp-2">
              {tool.description}
            </p>

            <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-all group-hover:gap-1.5">
              {tool.cta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-gray-500">
        Not sure where to start? The{' '}
        <span className="font-medium text-gray-700">Free DPI Checker</span> never
        uses credits. Each paid tool uses 1 credit, and failed jobs are
        automatically refunded.
      </p>

      <OutOfCreditsModal
        open={!!blocked}
        onClose={() => setBlocked(null)}
        toolName={blocked?.name}
        toolRoute={blocked?.route}
      />
    </section>
  );
}
