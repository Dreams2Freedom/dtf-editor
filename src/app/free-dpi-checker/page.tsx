'use client';

import { DPIChecker } from '@/components/dpi-tool/DPIChecker';
import { Accordion } from '@/components/public/Accordion';
import {
  CheckCircle,
  AlertTriangle,
  Zap,
  ArrowRight,
  Star,
  Shield,
  Calculator,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function FreeDPICheckerPage() {
  const [hasSignedUp, setHasSignedUp] = useState(false);

  const faqItems = [
    {
      question: 'Why do I need to create an account?',
      answer:
        'Creating a free account gives you access to your DPI results history, 2 free AI tool credits, and the ability to save your calculations for future reference.',
    },
    {
      question: 'Is this really free?',
      answer:
        'Yes! The DPI checker is 100% free forever. We also give you 2 free credits to try our premium AI tools like upscaling and background removal.',
    },
    {
      question: 'What file types are supported?',
      answer:
        'Our DPI checker supports all common image formats including JPG, PNG, GIF, WebP, and BMP files up to 10MB in size.',
    },
    {
      question: 'How accurate is the DPI calculation?',
      answer:
        "Our calculations are 100% accurate based on your image's pixel dimensions and the print size you specify. The math is simple: pixels \u00F7 inches = DPI.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Section 1: Dark Hero ── */}
      <section className="relative bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
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

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            {/* Left column */}
            <div className="flex flex-col justify-center">
              {/* Amber pill */}
              <span className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5 text-xs font-semibold text-amber-400 mb-6 w-fit">
                <Zap className="w-3.5 h-3.5" />
                FREE TOOL — No Credit Card Required
              </span>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
                Is Your Image High Enough Quality
                <span className="block bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent mt-2">
                  for DTF Printing?
                </span>
              </h1>

              <p className="text-base lg:text-lg text-gray-400 mb-8 leading-relaxed max-w-lg">
                Instantly check if your design will print crisp or pixelated.
                Our free DPI calculator tells you exactly what quality to expect
                at any print size.
              </p>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-4 text-gray-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Trusted Tool</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">100% Free</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span className="text-sm">Instant Results</span>
                </div>
              </div>
            </div>

            {/* Right column — DPI Checker in glass card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-1">
              <DPIChecker
                showSignupForm={true}
                onSignupComplete={() => setHasSignedUp(true)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Value Props (white background) ── */}
      <section className="bg-white py-16 px-5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 — Avoid Pixelated */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-center">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Avoid Pixelated Prints
              </h3>
              <p className="text-sm text-gray-600">
                Know before you print if your image will look professional or
                amateur
              </p>
            </div>

            {/* Card 2 — Exact DPI */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Get Exact DPI Numbers
              </h3>
              <p className="text-sm text-gray-600">
                See precise DPI calculations for your specific print dimensions
              </p>
            </div>

            {/* Card 3 — Free Forever */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Free Forever</h3>
              <p className="text-sm text-gray-600">
                No hidden fees, no credit card required. Just create a free
                account
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Educational Content (white background) ── */}
      <section className="bg-white py-16 px-5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 text-center mb-10">
            Understanding DPI for DTF Printing
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* DPI Scale */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                What DPI Do You Need?
              </h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">300+ DPI:</span>{' '}
                    <span className="text-gray-600">
                      Professional quality, crisp details
                    </span>
                  </div>
                </div>
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">
                      150-299 DPI:
                    </span>{' '}
                    <span className="text-gray-600">
                      Acceptable for simple designs
                    </span>
                  </div>
                </div>
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">
                      Below 150 DPI:
                    </span>{' '}
                    <span className="text-gray-600">Will appear pixelated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Common DTF Print Widths
              </h3>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                      <th className="pb-3">Width</th>
                      <th className="pb-3">Shirt Size</th>
                      <th className="pb-3">Min Pixels @ 300 DPI</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900">
                    <tr className="border-t border-gray-200">
                      <td className="py-2.5 font-medium">4&quot; wide</td>
                      <td className="py-2.5">Pocket</td>
                      <td className="py-2.5">1200 px wide</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="py-2.5 font-medium">8&quot; wide</td>
                      <td className="py-2.5">Youth</td>
                      <td className="py-2.5">2400 px wide</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="py-2.5 font-medium">10&quot; wide</td>
                      <td className="py-2.5">S-M Adult</td>
                      <td className="py-2.5">3000 px wide</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="py-2.5 font-medium">11&quot; wide</td>
                      <td className="py-2.5">L-XL Adult</td>
                      <td className="py-2.5">3300 px wide</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="py-2.5 font-medium">12&quot; wide</td>
                      <td className="py-2.5">2XL+</td>
                      <td className="py-2.5">3600 px wide</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Conditional upscaler CTA */}
          {hasSignedUp && (
            <div className="bg-gray-900 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-3">
                Image Resolution Too Low?
              </h3>
              <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                Don&apos;t worry! Our AI upscaler can increase your image
                resolution up to 4x while maintaining quality. You get 2 free
                credits with your new account.
              </p>
              <Link href="/process/upscale">
                <button className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-colors inline-flex items-center shadow-lg shadow-amber-500/20">
                  Try AI Upscaler Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 4: FAQ (white background) ── */}
      <section className="bg-white py-16 px-5 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <Accordion items={faqItems} />
        </div>
      </section>
    </div>
  );
}
