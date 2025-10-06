'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Bell, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useReferralTracking } from '@/hooks/useReferralTracking';

export default function BlogPage() {
  useReferralTracking();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-24">
        <div className="text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-8">
            <BookOpen className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Blog Coming Soon
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            We're working on amazing content to help you master DTF printing,
            design tips, and get the most out of our tools.
          </p>

          {/* What to Expect */}
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-12 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              What to Expect
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">DTF Tutorials</h3>
                <p className="text-sm text-gray-600">
                  Step-by-step guides for creating perfect DTF transfers
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Design Tips</h3>
                <p className="text-sm text-gray-600">
                  Expert advice on creating designs that print beautifully
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Product Updates</h3>
                <p className="text-sm text-gray-600">
                  Latest features and improvements to DTF Editor
                </p>
              </div>
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white max-w-3xl mx-auto">
            <h3 className="text-2xl font-semibold mb-3">
              Be the First to Know
            </h3>
            <p className="mb-6 opacity-90">
              Get notified when we launch our blog and receive exclusive DTF
              tips
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <Button className="bg-white text-purple-600 hover:bg-gray-100">
                Notify Me
              </Button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="mt-12 space-y-4">
            <p className="text-gray-600 mb-4">
              In the meantime, explore our tools:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/process"
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Try Our Tools
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center px-6 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              >
                Read FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
