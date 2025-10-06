'use client';

import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { SubscriptionPlan } from '@/services/stripe';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Check, CreditCard, Star, Zap } from 'lucide-react';

interface SubscriptionPlansProps {
  onSubscriptionComplete?: () => void;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  onSubscriptionComplete,
}) => {
  const { user } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch('/api/stripe/pricing');
        if (!response.ok) {
          throw new Error('Failed to fetch pricing');
        }
        const data = await response.json();
        setPlans(data.subscriptionPlans);
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
        setError('Failed to load pricing information');
      } finally {
        setPricingLoading(false);
      }
    };

    fetchPricing();
  }, []);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      setError('Please log in to subscribe');
      return;
    }

    if (plan.price === 0) {
      // Handle free plan
      setError('Free plan is automatically activated when you sign up!');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          userId: user.id,
          mode: 'subscription',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to start subscription process');
      setIsLoading(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Star className="w-6 h-6 text-gray-400" />;
      case 'basic':
        return <Zap className="w-6 h-6 text-blue-500" />;
      case 'starter':
        return <CreditCard className="w-6 h-6 text-purple-500" />;
      case 'professional':
        return <Star className="w-6 h-6 text-yellow-500" />;
      default:
        return <Star className="w-6 h-6" />;
    }
  };

  const getPlanBadge = (planId: string) => {
    switch (planId) {
      case 'free':
        return (
          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Free
          </span>
        );
      case 'basic':
        return (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Popular
          </span>
        );
      case 'starter':
        return (
          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Pro
          </span>
        );
      case 'professional':
        return (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Best Value
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h2>
        <p className="text-lg text-gray-600">
          Select the perfect plan for your image processing needs
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {pricingLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-gray-600 mt-2">Loading pricing...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <Card
              key={plan.id}
              className={`relative p-6 transition-all duration-200 hover:shadow-lg ${
                selectedPlan === plan.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {getPlanBadge(plan.id) && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  {getPlanBadge(plan.id)}
                </div>
              )}

              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  {getPlanIcon(plan.id)}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${plan.price}
                  <span className="text-sm font-normal text-gray-500">
                    /{plan.interval}
                  </span>
                </div>
                {plan.creditsPerMonth && (
                  <p className="text-sm text-gray-600">
                    {plan.creditsPerMonth} credits per month
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={isLoading}
                className={`w-full ${
                  plan.id === 'basic'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : plan.id === 'free'
                      ? 'bg-gray-600 hover:bg-gray-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isLoading && selectedPlan === plan.id
                  ? 'Processing...'
                  : plan.price === 0
                    ? 'Get Started Free'
                    : 'Subscribe Now'}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        <p>All plans include secure payment processing via Stripe</p>
        <p>Cancel or change your plan at any time</p>
      </div>
    </div>
  );
};
