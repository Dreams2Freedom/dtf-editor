'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Link href="/" className="inline-block">
              <Image
                src="/logo-horizontal.png"
                alt="DTF Editor"
                width={200}
                height={60}
                className="h-16 w-auto mx-auto"
                priority
              />
            </Link>
          </div>

          {/* Auth content */}
          {children}
        </div>
      </div>

      {/* Right side - Dark branded panel */}
      <div className="hidden lg:flex relative w-0 flex-1 items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Amber glow */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at center, rgba(232,139,75,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-8 max-w-md">
          {/* Brand mark */}
          <div className="mx-auto mb-8 h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-2xl font-extrabold text-white">D</span>
          </div>

          <h2 className="text-3xl font-extrabold text-white">
            Transform your images with AI
          </h2>

          <p className="text-base text-gray-400 mt-3 max-w-sm mx-auto">
            Upscale, recolor, remove backgrounds, and get print-ready files in
            seconds.
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
              AI Upscaling
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
              Color Change
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
              Background Removal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
