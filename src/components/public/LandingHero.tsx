'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOOLS } from '@/lib/publicData';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'DPI Checker', href: '/free-dpi-checker' },
  { label: 'Log In', href: '/auth/login' },
];

const TOOL_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  amber: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  purple: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  pink: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
  sky: { bg: 'bg-sky-500/15', text: 'text-sky-400' },
};

export function LandingHero() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* ── Dark Navigation ── */}
      <nav
        className={cn(
          'sticky top-0 z-40 w-full transition-colors duration-300',
          scrolled
            ? 'bg-gray-900/80 backdrop-blur-lg border-b border-white/10'
            : 'bg-gray-950'
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-6 lg:px-8 h-14">
          <Link href="/" className="flex-shrink-0">
            <Image src="/logo-horizontal.png" alt="DTF Editor" width={130} height={28} priority />
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/signup"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors"
            >
              Start Free
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu ── */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-gray-950 transition-transform duration-300 ease-out lg:hidden',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex justify-end px-5 pt-4">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 mt-12">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="py-4 text-lg text-gray-300 hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/auth/signup"
            onClick={() => setMobileOpen(false)}
            className="mt-6 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
          >
            Start Free
          </Link>
        </div>
      </div>

      {/* ── Hero Content ── */}
      <section className="relative bg-gray-950 overflow-hidden">
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Amber glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(232,139,75,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28 text-center">
          {/* Announcement pill */}
          <span className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5 text-xs font-semibold text-amber-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            NEW — Change any color in your designs instantly
          </span>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Stop losing money on
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
              bad prints
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base lg:text-lg text-gray-400 max-w-xl mx-auto mt-4 mb-8 leading-relaxed">
            Upscale, recolor, remove backgrounds, and get print-ready files in seconds. Built for
            DTF transfer shops.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm sm:text-base transition-colors shadow-lg shadow-amber-500/20 text-center"
            >
              Start Free — 2 Credits Included
            </Link>
            <Link
              href="/free-dpi-checker"
              className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-medium rounded-xl text-sm sm:text-base transition-colors text-center"
            >
              Check Your Image DPI
            </Link>
          </div>

          {/* Trust line */}
          <p className="text-xs text-gray-500 mt-4">No credit card required</p>
        </div>
      </section>

      {/* ── Tool Strip (transition zone) ── */}
      <section className="relative pb-16 lg:pb-20 px-5 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-950 via-gray-900 to-white">
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 max-w-4xl mx-auto pt-2">
          {TOOLS.map((tool) => {
            const colors = TOOL_COLOR_MAP[tool.color] ?? TOOL_COLOR_MAP.blue;
            const Icon = tool.icon;
            return (
              <div
                key={tool.slug}
                className="bg-white/10 border border-white/20 hover:bg-white/15 rounded-xl p-3 sm:p-4 text-center transition-colors cursor-default"
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center',
                    colors.bg
                  )}
                >
                  <Icon className={cn('w-4 h-4', colors.text)} />
                </div>
                <span className="text-xs font-semibold text-gray-200">{tool.name}</span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
