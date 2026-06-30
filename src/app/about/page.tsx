import Link from 'next/link';
import { Heart, Target, Zap, Users, ArrowRight } from 'lucide-react';
import { PageHero } from '@/components/public/PageHero';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — DTF Editor',
  description:
    'Built by a DTF printing company to solve the #1 problem in transfers: bad image quality.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        heading="Built by printers, for printers"
        subheading="Empowering creators to transform their ideas into stunning DTF transfers with ease"
      />

      {/* Mission Section */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Our Mission
            </h2>
            <p className="text-lg text-gray-600 mb-4">
              We believe that everyone should be able to create
              professional-quality DTF transfers, regardless of their design
              experience or the quality of their source images.
            </p>
            <p className="text-lg text-gray-600 mb-4">
              Our mission is simple:{' '}
              <strong>
                Make creating or fixing low-quality images effortless, so they
                print amazingly with DTF transfers.
              </strong>
            </p>
            <p className="text-lg text-gray-600">
              We&apos;re eliminating the frustration of poor print results by
              providing AI-powered tools that automatically enhance, optimize,
              and prepare images for perfect DTF printing every time.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-amber-100 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-gray-900">
                  Print-Ready Quality
                </h3>
                <p className="text-gray-500">
                  Every image exported at 300 DPI with transparent backgrounds
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-amber-100 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-gray-900">
                  AI-Powered Enhancement
                </h3>
                <p className="text-gray-500">
                  Advanced algorithms that fix common image problems
                  automatically
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-amber-100 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Heart className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-gray-900">
                  Made for Creators
                </h3>
                <p className="text-gray-500">
                  Designed specifically for hobbyists and small businesses
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why We Created This Section */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-16">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Why We Created DTF Editor
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              The Problem We Saw
            </h3>
            <p className="text-gray-600">
              Too many creators were submitting poor-quality images to print
              shops, resulting in disappointing transfers that didn&apos;t match
              their vision. The tools to fix these images were either too
              expensive, too complex, or simply didn&apos;t understand the specific
              requirements of DTF printing.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Our Solution
            </h3>
            <p className="text-gray-600">
              We built DTF Editor as a bridge between creativity and quality.
              By combining powerful AI tools with DTF-specific optimizations,
              we&apos;ve created a platform where anyone can transform their ideas
              into print-ready files that produce stunning transfers every
              time.
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
          <p className="text-lg text-gray-600">
            The principles that guide everything we do
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Accessibility
            </h3>
            <p className="text-gray-600">
              Making professional tools available to everyone, regardless of
              technical skill or budget
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Innovation
            </h3>
            <p className="text-gray-600">
              Continuously improving our AI technology to deliver better results
              with less effort
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Community
            </h3>
            <p className="text-gray-600">
              Supporting creators and small businesses in bringing their visions
              to life
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-16">
        <div className="bg-gray-900 rounded-2xl py-16 px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Create Amazing DTF Transfers?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are already transforming their
            designs with DTF Editor
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
            >
              Try it free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
