'use client';

import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Check, ArrowRight, Info, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { format } from 'date-fns';

interface PlanSwitcherProps {
  currentPlan: string;
  nextBillingDate?: string;
  onPlanChange?: () => void;
}

interface ProrationPreview {
  immediateCharge: number;
  nextInvoiceTotal: number;
  creditBalance: number;
  prorationDate: string;
  description: string;
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 2,
    features: ['2 credits per month', 'All basic features', 'Email support']
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    credits: 20,
    features: ['20 credits per month', 'All features', 'Priority support', 'HD downloads']
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 24.99,
    credits: 60,
    features: ['60 credits per month', 'All features', 'Priority support', 'HD downloads', 'Bulk processing (coming soon)']
  }
];

export function PlanSwitcher({ currentPlan, nextBillingDate, onPlanChange }: PlanSwitcherProps) {
  const { user } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [prorationPreview, setProrationPreview] = useState<ProrationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const currentPlanDetails = plans.find(p => p.id === currentPlan);
  const selectedPlanDetails = plans.find(p => p.id === selectedPlan);

  const isUpgrade = selectedPlanDetails && currentPlanDetails && 
    selectedPlanDetails.price > currentPlanDetails.price;
  const isDowngrade = selectedPlanDetails && currentPlanDetails && 
    selectedPlanDetails.price < currentPlanDetails.price;

  const handlePlanSelect = async (planId: string) => {
    if (planId === currentPlan) return;
    
    setSelectedPlan(planId);
    setError(null);
    
    // If user doesn't have a real subscription (just a plan in DB), redirect to checkout
    if (currentPlan === 'basic' || currentPlan === 'free') {
      try {
        setLoading(true);
        const targetPlan = plans.find(p => p.id === planId);
        if (!targetPlan) {
          throw new Error('Plan not found');
        }

        // First, fetch the pricing info from the API
        const pricingResponse = await fetch('/api/stripe/pricing');
        if (!pricingResponse.ok) {
          throw new Error('Failed to fetch pricing information');
        }
        const pricingData = await pricingResponse.json();
        
        // Find the price ID from the pricing data
        const plan = pricingData.subscriptionPlans?.find((p: any) => p.id === planId);
        if (!plan || !plan.stripePriceId) {
          throw new Error('Pricing not configured. Please contact support.');
        }

        // Create checkout session for new subscription
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: plan.stripePriceId,
            mode: 'subscription',
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create checkout session');
        }

        const { url } = await response.json();
        if (url) {
          window.location.href = url;
        } else {
          throw new Error('No checkout URL received');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to start subscription. Please try again.');
        setSelectedPlan(null);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Existing logic for plan changes
    setLoadingPreview(true);
    try {
      // Get proration preview
      const response = await fetch('/api/subscription/preview-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlanId: planId })
      });

      if (!response.ok) {
        throw new Error('Failed to get preview');
      }

      const preview = await response.json();
      setProrationPreview(preview);
      setShowConfirmModal(true);
    } catch (err) {
      setError('Failed to calculate proration. Please try again.');
      setSelectedPlan(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmChange = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPlanId: selectedPlan,
          prorationBehavior: isUpgrade ? 'always_invoice' : 'create_prorations'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change plan');
      }

      const result = await response.json();
      
      // Show success message
      if (result.immediateCharge > 0) {
        // Redirect to payment if immediate charge required
        if (result.paymentUrl) {
          window.location.href = result.paymentUrl;
        }
      } else {
        // Plan changed successfully
        setShowConfirmModal(false);
        if (onPlanChange) {
          onPlanChange();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Change Subscription Plan</h3>
        <p className="text-gray-600">
          Currently on <span className="font-medium">{currentPlanDetails?.name}</span> plan
          {nextBillingDate && (
            <span className="text-sm">
              {' '}• Next billing: {format(new Date(nextBillingDate), 'MMM d, yyyy')}
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isSelected = plan.id === selectedPlan;

          return (
            <Card 
              key={plan.id}
              className={`cursor-pointer transition-all ${
                isCurrent ? 'border-blue-500 bg-blue-50' : 
                isSelected ? 'border-green-500' : 
                'hover:border-gray-400'
              }`}
              onClick={() => !isCurrent && handlePlanSelect(plan.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-lg">{plan.name}</h4>
                      {isCurrent && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">
                      ${plan.price}/month • {plan.credits} credits
                    </p>
                    <ul className="mt-2 space-y-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-500 flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {!isCurrent && (
                    <div className="flex flex-col items-end">
                      {plan.price > (currentPlanDetails?.price || 0) ? (
                        <span className="text-sm text-green-600 font-medium">Upgrade</span>
                      ) : (
                        <span className="text-sm text-orange-600 font-medium">Downgrade</span>
                      )}
                      <ArrowRight className="w-5 h-5 text-gray-400 mt-2" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Proration Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How plan changes work:</p>
            <ul className="space-y-1">
              <li>• <strong>Upgrades:</strong> You'll be charged immediately for the difference</li>
              <li>• <strong>Downgrades:</strong> Credit will be applied to your next invoice</li>
              <li>• Credits are adjusted proportionally based on days remaining</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title="Confirm Plan Change"
      >
        <div className="space-y-4">
          {prorationPreview && selectedPlanDetails && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Plan Change Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current Plan:</span>
                    <span className="font-medium">{currentPlanDetails?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Plan:</span>
                    <span className="font-medium">{selectedPlanDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credits Change:</span>
                    <span className="font-medium">
                      {currentPlanDetails?.credits} → {selectedPlanDetails.credits} per month
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Billing Details</h4>
                <div className="space-y-2 text-sm">
                  {prorationPreview.immediateCharge > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Due Now:</span>
                      <span className="font-medium">${prorationPreview.immediateCharge.toFixed(2)}</span>
                    </div>
                  )}
                  {prorationPreview.creditBalance > 0 && (
                    <div className="flex justify-between text-orange-700">
                      <span>Account Credit:</span>
                      <span className="font-medium">${prorationPreview.creditBalance.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span>Next Invoice:</span>
                    <span className="font-medium">${prorationPreview.nextInvoiceTotal.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">{prorationPreview.description}</p>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmChange}
              disabled={loading}
            >
              {loading ? 'Processing...' : 
               prorationPreview?.immediateCharge ? `Pay $${prorationPreview.immediateCharge.toFixed(2)} & Change Plan` : 
               'Confirm Change'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}