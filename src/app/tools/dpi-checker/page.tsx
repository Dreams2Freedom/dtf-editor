'use client';

import { DPIChecker } from '@/components/dpi-tool/DPIChecker';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DPICheckerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Compact Header - Above the fold */}
        <div className="pt-4 pb-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">DPI Checker Tool</h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1">
            Check if your image has the right resolution for professional DTF printing
          </p>
        </div>

        {/* Tool Component - Primary focus above the fold */}
        <DPIChecker showSignupForm={false} />

        {/* Educational Content - Below the tool */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 pb-12">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">What is DPI?</h3>
            <p className="text-sm text-gray-600">
              DPI (Dots Per Inch) measures the resolution of your image when printed. Higher DPI means sharper, more detailed prints.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">DTF Printing Standards</h3>
            <p className="text-sm text-gray-600">
              For professional DTF transfers, aim for 300 DPI. This ensures crisp details and vibrant colors on your final product.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Need Higher Resolution?</h3>
            <p className="text-sm text-gray-600">
              Use our AI upscaler to increase your image resolution up to 4x while maintaining quality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}