'use client';

import { DPIChecker } from '@/components/dpi-tool/DPIChecker';
import { 
  CheckCircle, 
  AlertTriangle, 
  Zap, 
  ArrowRight,
  Star,
  Users,
  Shield,
  Calculator
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function FreeDPICheckerPage() {
  const [hasSignedUp, setHasSignedUp] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="pt-12 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-bold text-[#366494]">DTF Editor</h1>
            </Link>
          </div>

          {/* Hero Grid */}
          <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
            {/* Left Column - Headlines and Subhead */}
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-6">
                <Zap className="w-4 h-4 mr-2" />
                FREE TOOL - No Credit Card Required
              </div>

              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Is Your Image High Enough Quality
                <span className="block text-[#366494] mt-2">for DTF Printing?</span>
              </h2>

              <p className="text-xl text-gray-600 mb-8">
                Instantly check if your design will print crisp or pixelated.
                Our free DPI calculator tells you exactly what quality to expect at any print size.
              </p>

              {/* Trust Indicators */}
              <div className="flex items-center gap-6 text-gray-500">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm">Trusted Tool</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm">100% Free</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  <span className="text-sm">Instant Results</span>
                </div>
              </div>
            </div>

            {/* Right Column - Upload Box (DPI Checker) */}
            <div>
              <DPIChecker
                showSignupForm={true}
                onSignupComplete={() => setHasSignedUp(true)}
              />
            </div>
          </div>

          {/* Value Props - Now below the hero grid */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Avoid Pixelated Prints</h3>
              <p className="text-sm text-gray-600">
                Know before you print if your image will look professional or amateur
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Get Exact DPI Numbers</h3>
              <p className="text-sm text-gray-600">
                See precise DPI calculations for your specific print dimensions
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calculator className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Free Forever</h3>
              <p className="text-sm text-gray-600">
                No hidden fees, no credit card required. Just create a free account
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Educational Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Understanding DPI for DTF Printing
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">What DPI Do You Need?</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-medium">300+ DPI:</span> Professional quality, crisp details
                  </div>
                </div>
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-medium">150-299 DPI:</span> Acceptable for simple designs
                  </div>
                </div>
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Below 150 DPI:</span> Will appear pixelated
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Common DTF Print Widths</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="pb-2">Width</th>
                      <th className="pb-2">Shirt Size</th>
                      <th className="pb-2">Min Pixels @ 300 DPI</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900">
                    <tr className="border-t border-gray-200">
                      <td className="py-2">4" wide</td>
                      <td>Pocket</td>
                      <td>1200 px wide</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="py-2">8" wide</td>
                      <td>Youth</td>
                      <td>2400 px wide</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="py-2">10" wide</td>
                      <td>S-M Adult</td>
                      <td>3000 px wide</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="py-2">11" wide</td>
                      <td>L-XL Adult</td>
                      <td>3300 px wide</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="py-2">12" wide</td>
                      <td>2XL+</td>
                      <td>3600 px wide</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CTA for upscaling */}
          {hasSignedUp && (
            <div className="bg-gradient-to-r from-[#366494] to-[#233E5C] rounded-2xl p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-3">
                Image Resolution Too Low?
              </h3>
              <p className="text-white/90 mb-6 max-w-2xl mx-auto">
                Don't worry! Our AI upscaler can increase your image resolution up to 4x 
                while maintaining quality. You get 2 free credits with your new account.
              </p>
              <Link href="/process/upscale">
                <button className="bg-white text-[#366494] px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center">
                  Try AI Upscaler Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Why do I need to create an account?
              </h3>
              <p className="text-gray-600">
                Creating a free account gives you access to your DPI results history, 
                2 free AI tool credits, and the ability to save your calculations for future reference.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is this really free?
              </h3>
              <p className="text-gray-600">
                Yes! The DPI checker is 100% free forever. We also give you 2 free credits 
                to try our premium AI tools like upscaling and background removal.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What file types are supported?
              </h3>
              <p className="text-gray-600">
                Our DPI checker supports all common image formats including JPG, PNG, GIF, 
                WebP, and BMP files up to 10MB in size.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                How accurate is the DPI calculation?
              </h3>
              <p className="text-gray-600">
                Our calculations are 100% accurate based on your image's pixel dimensions 
                and the print size you specify. The math is simple: pixels ÷ inches = DPI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 mb-4">
            © 2024 DTF Editor. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-gray-900">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-gray-900">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}