'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Tag, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { format } from 'date-fns';

interface CancellationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  subscription: {
    plan: string;
    nextBillingDate: string;
  };
}

type FlowStep =
  | 'survey'
  | 'pause_offer'
  | 'discount_offer'
  | 'confirm_cancel'
  | 'complete';

export function CancellationFlow({
  isOpen,
  onClose,
  onComplete,
  subscription,
}: CancellationFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('survey');
  const [loading, setLoading] = useState(false);
  const [eligibilityLoading, setEligibilityLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [completedAction, setCompletedAction] = useState<
    'paused' | 'discounted' | 'cancelled' | null
  >(null);

  // Check retention eligibility when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('CancellationFlow opened, checking eligibility...');
      checkEligibility();
    }
  }, [isOpen]);

  const checkEligibility = async () => {
    setEligibilityLoading(true);
    try {
      console.log('Fetching eligibility from API...');
      const response = await fetch(
        '/api/subscription/check-retention-eligibility'
      );
      const data = await response.json();
      console.log('Full eligibility response:', data); // Debug log
      console.log('canPause:', data.canPause);
      console.log('canUseDiscount:', data.canUseDiscount);
      setEligibility(data);
    } catch (err) {
      console.error('Failed to check eligibility:', err);
      // Set default eligibility if check fails
      setEligibility({
        canPause: true,
        canUseDiscount: true,
        pauseOptions: [
          {
            duration: '2_weeks',
            label: '2 Weeks',
            description: 'Take a short break',
            resumeDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
          {
            duration: '1_month',
            label: '1 Month',
            description: 'Take a month off',
            resumeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          {
            duration: '2_months',
            label: '2 Months',
            description: 'Extended break',
            resumeDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        ],
      });
    } finally {
      setEligibilityLoading(false);
      console.log('Eligibility check complete. Loading:', false);
    }
  };

  const handlePauseSubscription = async (duration: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscription/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration }),
      });

      const data = await response.json();

      if (response.ok) {
        setCompletedAction('paused');
        setCurrentStep('complete');
        // Show success message
        setTimeout(() => {
          onComplete();
        }, 3000);
      } else {
        setError(data.error || 'Failed to pause subscription');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        '/api/subscription/apply-retention-discount',
        {
          method: 'POST',
        }
      );

      const data = await response.json();

      if (response.ok) {
        setCompletedAction('discounted');
        setCurrentStep('complete');
        // Show success message
        setTimeout(() => {
          onComplete();
        }, 3000);
      } else {
        setError(data.error || 'Failed to apply discount');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalCancellation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancellationReason }),
      });

      if (response.ok) {
        setCompletedAction('cancelled');
        setCurrentStep('complete');
        setTimeout(() => {
          onComplete();
        }, 3000);
      } else {
        setError('Failed to cancel subscription');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'survey':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">We're sorry to see you go</h3>
            <p className="text-gray-600">
              Before you cancel, please let us know why you're leaving:
            </p>

            <div className="space-y-2">
              {[
                'Too expensive',
                'Not using it enough',
                'Found a better alternative',
                'Missing features I need',
                'Technical issues',
                'Other',
              ].map(reason => (
                <label key={reason} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    onChange={e => setCancellationReason(e.target.value)}
                    className="rounded border-gray-300"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Keep Subscription
              </Button>
              <Button
                onClick={() => {
                  console.log(
                    'Survey submitted with reason:',
                    cancellationReason
                  );
                  console.log('Current eligibility state:', eligibility); // Debug log
                  console.log('eligibility?.canPause:', eligibility?.canPause);
                  console.log(
                    'eligibility?.canUseDiscount:',
                    eligibility?.canUseDiscount
                  );
                  const nextStep = eligibility?.canPause
                    ? 'pause_offer'
                    : eligibility?.canUseDiscount
                      ? 'discount_offer'
                      : 'confirm_cancel';
                  console.log('Determined next step:', nextStep); // Debug log
                  setCurrentStep(nextStep);
                }}
                disabled={!cancellationReason || eligibilityLoading}
              >
                {eligibilityLoading ? 'Loading...' : 'Continue'}
              </Button>
            </div>
          </div>
        );

      case 'pause_offer':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Take a Break Instead?</h3>
              <p className="text-gray-600 mt-2">
                Extend your current billing cycle and keep all your credits!
              </p>
              {eligibility?.pauseOptions?.[0]?.currentPeriodEnd && (
                <p className="text-sm text-gray-500 mt-2">
                  Your current billing cycle ends on{' '}
                  {format(
                    new Date(eligibility.pauseOptions[0].currentPeriodEnd),
                    'MMM d, yyyy'
                  )}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {eligibility?.pauseOptions?.map((option: any) => (
                <Card
                  key={option.duration}
                  className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => handlePauseSubscription(option.duration)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-gray-500">
                          {option.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Next billing</p>
                        <p className="font-medium">
                          {format(new Date(option.resumeDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentStep(
                    eligibility?.canUseDiscount
                      ? 'discount_offer'
                      : 'confirm_cancel'
                  )
                }
                disabled={loading}
              >
                No Thanks
              </Button>
            </div>

            {error && (
              <div className="text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        );

      case 'discount_offer':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Tag className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">How About 50% Off?</h3>
              <p className="text-gray-600 mt-2">
                Stay with us and get 50% off your next billing cycle
              </p>
            </div>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-700">50% OFF</p>
                  <p className="text-sm text-green-600 mt-1">
                    Applied to your next bill only
                  </p>
                  <p className="text-lg mt-2">
                    Next bill:{' '}
                    <span className="line-through text-gray-500">
                      ${getPlanPrice(subscription.plan)}
                    </span>{' '}
                    <span className="font-bold text-green-700">
                      ${getPlanPrice(subscription.plan) / 2}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={handleApplyDiscount}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Applying Discount...' : 'Accept 50% Off'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentStep('confirm_cancel')}
                disabled={loading}
                className="w-full"
              >
                No Thanks, Cancel Anyway
              </Button>
            </div>

            {error && (
              <div className="text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        );

      case 'confirm_cancel':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Are You Sure?</h3>
              <p className="text-gray-600 mt-2">
                You'll lose access to all premium features immediately
              </p>
            </div>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <p className="font-medium text-red-900 mb-2">You will lose:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  <li>All remaining credits</li>
                  <li>Access to AI image processing</li>
                  <li>Saved images and history</li>
                  <li>Priority support</li>
                </ul>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button variant="outline" onClick={onClose} className="w-full">
                Keep My Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={handleFinalCancellation}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel Subscription'}
              </Button>
            </div>

            {error && (
              <div className="text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <h3 className="text-lg font-semibold">All Set!</h3>
            <p className="text-gray-600">
              {completedAction === 'paused' &&
                'Your subscription has been paused.'}
              {completedAction === 'discounted' &&
                'Your 50% discount has been applied!'}
              {completedAction === 'cancelled' &&
                'Your subscription has been cancelled.'}
            </p>
          </div>
        );
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={open => !open && onClose()}
      showCloseButton={false}
      size="md"
    >
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Cancel Subscription</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderStep()}
      </div>
    </Modal>
  );
}

function getPlanPrice(plan: string): number {
  const prices: Record<string, number> = {
    basic: 5,
    starter: 15,
    professional: 30,
  };
  return prices[plan] || 0;
}
