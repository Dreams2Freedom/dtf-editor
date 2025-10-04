'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SubscriptionPlans } from '@/components/payment/SubscriptionPlans';
import { PayAsYouGo } from '@/components/payment/PayAsYouGo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CreditCard, Zap, Star, Check } from 'lucide-react';
import { useReferralTracking } from '@/hooks/useReferralTracking';

export default function PricingClient() {
  useReferralTracking();

  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'subscription' | 'payg'>('subscription');

  useEffect(() => {
    // Check if tab parameter is set to 'payasyougo'
    const tab = searchParams.get('tab');
    if (tab === 'payasyougo') {
      setActiveTab('payg');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Whether you need ongoing access or just a few credits, we have the perfect option for you.
            All plans include our advanced AI-powered image processing features.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setActiveTab('subscription')}
              className={`inline-flex items-center px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'subscription'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Subscription Plans
            </button>
            <button
              onClick={() => setActiveTab('payg')}
              className={`inline-flex items-center px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'payg'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Zap className="w-4 h-4 mr-2" />
              Pay As You Go
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {activeTab === 'subscription' ? (
            <SubscriptionPlans />
          ) : (
            <PayAsYouGo />
          )}
        </div>


        {/* Features Comparison */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              All Plans Include
            </h2>
            <p className="text-lg text-gray-600">
              Powerful AI-powered image processing features available on every plan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI Image Upscaling
              </h3>
              <p className="text-gray-600">
                Upscale images up to 4x with advanced AI algorithms including auto-enhancement and generative upscaling.
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Background Removal
              </h3>
              <p className="text-gray-600">
                Remove backgrounds from images with precision using our advanced AI models.
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Secure Processing
              </h3>
              <p className="text-gray-600">
                Your images are processed securely and deleted after processing. We never store your original images.
              </p>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What's the difference between subscription and pay-as-you-go?
              </h3>
              <p className="text-gray-600">
                Subscriptions provide a set number of credits each month at a discounted rate, perfect for regular users. 
                Pay-as-you-go lets you purchase credits as needed without any recurring charges.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do credits expire?
              </h3>
              <p className="text-gray-600">
                Pay-as-you-go credits never expire. Subscription credits are refreshed monthly and don't carry over to the next billing period.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. You'll continue to have access to your plan features until the end of your current billing period.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards, debit cards, and digital wallets through our secure Stripe payment processing.
              </p>
            </Card>
          </div>
        </div>

        {/* Affiliate Program Section */}
        <div className="mt-16">
          <Card className="p-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Earn 20% Recurring Commissions
              </h2>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Join our affiliate program and earn generous commissions by referring customers to DTF Editor.
                Get 20% recurring revenue for 24 months, then 10% lifetime on all referred customers!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">20-25%</div>
                  <p className="text-sm text-gray-600">Commission Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">30 Days</div>
                  <p className="text-sm text-gray-600">Cookie Duration</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">$50</div>
                  <p className="text-sm text-gray-600">Min. Payout</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/affiliate/apply">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700">
                    Apply to Affiliate Program
                  </Button>
                </Link>
                <Link href="/affiliate/terms">
                  <Button size="lg" variant="secondary">
                    View Terms & Conditions
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-6 opacity-90">
              Join thousands of users who trust our AI-powered image processing
            </p>
            <Button
              onClick={() => setActiveTab('subscription')}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Start Your Free Trial
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
} 