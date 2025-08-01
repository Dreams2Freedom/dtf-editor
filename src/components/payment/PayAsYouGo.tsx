'use client';

import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { PayAsYouGoPackage } from '@/services/stripe';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Check, CreditCard, ShoppingCart } from 'lucide-react';

interface PayAsYouGoProps {
  onPurchaseComplete?: () => void;
}

export const PayAsYouGo: React.FC<PayAsYouGoProps> = ({ onPurchaseComplete }) => {
  const { user } = useAuthContext();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PayAsYouGoPackage[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch('/api/stripe/pricing');
        if (!response.ok) {
          throw new Error('Failed to fetch pricing');
        }
        const data = await response.json();
        setPackages(data.payAsYouGoPackages);
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
        setError('Failed to load pricing information');
      } finally {
        setPricingLoading(false);
      }
    };

    fetchPricing();
  }, []);

  const handlePurchase = async (pkg: PayAsYouGoPackage) => {
    if (!user) {
      setError('Please log in to purchase credits');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedPackage(pkg.id);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: pkg.stripePriceId,
          userId: user.id,
          mode: 'payment',
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
      setError(error.message || 'Failed to start purchase process');
      setIsLoading(false);
      setSelectedPackage(null);
    }
  };

  const getPackageIcon = (credits: number) => {
    if (credits >= 50) {
      return <CreditCard className="w-6 h-6 text-purple-500" />;
    } else if (credits >= 20) {
      return <ShoppingCart className="w-6 h-6 text-blue-500" />;
    } else {
      return <CreditCard className="w-6 h-6 text-green-500" />;
    }
  };

  const getPackageBadge = (credits: number) => {
    if (credits >= 50) {
      return <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">Best Value</span>;
    } else if (credits >= 20) {
      return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Popular</span>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Buy Credits</h2>
        <p className="text-lg text-gray-600">
          Purchase credits for one-time image processing needs
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
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={`relative p-6 transition-all duration-200 hover:shadow-lg ${
              selectedPackage === pkg.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {getPackageBadge(pkg.credits) && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                {getPackageBadge(pkg.credits)}
              </div>
            )}

            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                {getPackageIcon(pkg.credits)}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{pkg.name}</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ${pkg.price}
              </div>
              <p className="text-sm text-gray-600">
                {pkg.credits} credits
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ${(pkg.price / pkg.credits).toFixed(2)} per credit
              </p>
            </div>

            <ul className="space-y-2 mb-6">
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-sm text-gray-700">One-time purchase</span>
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-sm text-gray-700">No recurring charges</span>
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-sm text-gray-700">Credits never expire</span>
              </li>
            </ul>

            <Button
              onClick={() => handlePurchase(pkg)}
              disabled={isLoading}
              className={`w-full ${
                pkg.credits >= 50
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : pkg.credits >= 20
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isLoading && selectedPackage === pkg.id ? (
                'Processing...'
              ) : (
                `Buy ${pkg.credits} Credits`
              )}
            </Button>
          </Card>
        ))}
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        <p>Credits are added to your account immediately after payment</p>
        <p>Secure payment processing via Stripe</p>
      </div>
    </div>
  );
}; 