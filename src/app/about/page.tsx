'use client';

import Link from 'next/link';
import { ArrowRight, Heart, Target, Zap, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              About DTF Editor
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Empowering creators to transform their ideas into stunning DTF transfers with ease
            </p>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-lg text-gray-600 mb-4">
              We believe that everyone should be able to create professional-quality DTF transfers, 
              regardless of their design experience or the quality of their source images.
            </p>
            <p className="text-lg text-gray-600 mb-4">
              Our mission is simple: <strong>Make creating or fixing low-quality images effortless, 
              so they print amazingly with DTF transfers.</strong>
            </p>
            <p className="text-lg text-gray-600">
              We're eliminating the frustration of poor print results by providing AI-powered tools 
              that automatically enhance, optimize, and prepare images for perfect DTF printing every time.
            </p>
          </div>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <Target className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Print-Ready Quality</h3>
                  <p className="opacity-90">Every image exported at 300 DPI with transparent backgrounds</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <Zap className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">AI-Powered Enhancement</h3>
                  <p className="opacity-90">Advanced algorithms that fix common image problems automatically</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <Heart className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Made for Creators</h3>
                  <p className="opacity-90">Designed specifically for hobbyists and small businesses</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why We Created This Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Why We Created DTF Editor</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">The Problem We Saw</h3>
              <p className="text-gray-600">
                Too many creators were submitting poor-quality images to print shops, resulting in 
                disappointing transfers that didn't match their vision. The tools to fix these images 
                were either too expensive, too complex, or simply didn't understand the specific 
                requirements of DTF printing.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Our Solution</h3>
              <p className="text-gray-600">
                We built DTF Editor as a bridge between creativity and quality. By combining powerful 
                AI tools with DTF-specific optimizations, we've created a platform where anyone can 
                transform their ideas into print-ready files that produce stunning transfers every time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
          <p className="text-lg text-gray-600">The principles that guide everything we do</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Accessibility</h3>
            <p className="text-gray-600">
              Making professional tools available to everyone, regardless of technical skill or budget
            </p>
          </div>
          <div className="text-center">
            <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-pink-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Innovation</h3>
            <p className="text-gray-600">
              Continuously improving our AI technology to deliver better results with less effort
            </p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Community</h3>
            <p className="text-gray-600">
              Supporting creators and small businesses in bringing their visions to life
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Create Amazing DTF Transfers?
          </h2>
          <p className="text-xl text-white opacity-90 mb-8">
            Join thousands of creators who are already transforming their designs with DTF Editor
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/process"
              className="inline-flex items-center px-6 py-3 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 transition-colors"
            >
              Try Our Tools
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}