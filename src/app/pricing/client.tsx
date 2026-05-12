'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SubscriptionPlans } from '@/components/payment/SubscriptionPlans';
import { PayAsYouGo } from '@/components/payment/PayAsYouGo';
import { CreditCard, Zap, Check, Minus } from 'lucide-react';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { COMPARISON_FEATURES, PRICING_FAQS } from '@/lib/publicData';
import { Accordion } from '@/components/public/Accordion';

export default function PricingClient() {
  useReferralTracking();

  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'subscription' | 'payg'>(
    'subscription'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'payasyougo') {
      setActiveTab('payg');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3">
            Simple pricing that grows with you
          </h1>
          <p className="text-base text-gray-500 max-w-xl mx-auto">
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-xl p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('subscription')}
              className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'subscription'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Subscription Plans
            </button>
            <button
              onClick={() => setActiveTab('payg')}
              className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'payg'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
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

        {/* Feature Comparison Table */}
        <div className="mt-16 lg:mt-20">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-8">
            Compare plans
          </h2>
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">
                    Feature
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-500">
                    Free
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-500">
                    Hobbyist
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-amber-600 bg-amber-50/50 rounded-t-lg">
                    Business
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((feature, i) => (
                  <tr
                    key={feature.name}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {feature.name}
                    </td>
                    {(['free', 'hobbyist', 'business'] as const).map(plan => {
                      const val = feature[plan];
                      return (
                        <td
                          key={plan}
                          className={`text-center py-3 px-4 ${plan === 'business' ? 'bg-amber-50/30' : ''}`}
                        >
                          {val === true ? (
                            <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : val === false ? (
                            <Minus className="w-4 h-4 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-gray-700">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Affiliate Section */}
        <div className="mt-16 lg:mt-20">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-w-2xl mx-auto text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Earn 20-25% commission
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Refer customers to DTF Editor and earn recurring commissions on
              every sale.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/affiliate/apply"
                className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
              >
                Apply to Affiliate Program &rarr;
              </Link>
              <Link
                href="/affiliate/terms"
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                View Terms
              </Link>
            </div>
          </div>
        </div>

        {/* Pricing FAQ */}
        <div className="mt-16 lg:mt-20">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-8">
            Frequently asked questions
          </h2>
          <Accordion items={PRICING_FAQS} className="max-w-2xl mx-auto" />
        </div>
      </div>
    </div>
  );
}
