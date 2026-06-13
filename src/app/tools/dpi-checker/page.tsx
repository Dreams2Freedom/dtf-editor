'use client';

import { DpiCheckerCard } from '@/components/dpi-tool/DpiCheckerCard';
import { ToolHelpButton } from '@/components/help/ToolHelpButton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DPICheckerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            DPI Checker
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            Check whether your artwork is sharp enough for your chosen DTF print
            size.
          </p>
        </div>

        <DpiCheckerCard />

        {/* Tool-specific tutorial graphic (separate from the first-time popup) */}
        <div className="mt-6 flex justify-center">
          <ToolHelpButton toolKey="dpi-checker" />
        </div>
      </div>
    </div>
  );
}
