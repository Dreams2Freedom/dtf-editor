'use client';

import { useAuthStore } from '@/stores/authStore';
import { Coins, Plus, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { Button } from './Button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';

interface CreditSummary {
  total_credits: number;
  active_credits: number;
  rollover_credits: number;
  next_expiration_date: string | null;
  active_purchases: number;
}

interface CreditDisplayEnhancedProps {
  showPurchaseButton?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function CreditDisplayEnhanced({ 
  showPurchaseButton = true, 
  showDetails = false,
  className = '' 
}: CreditDisplayEnhancedProps) {
  const { profile, user } = useAuthStore();
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && showDetails) {
      fetchCreditSummary();
    }
  }, [user, showDetails]);

  const fetchCreditSummary = async () => {
    if (!user) return;
    
    setLoading(true);
    const supabase = createClientSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_credit_summary')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setCreditSummary(data);
    }
    setLoading(false);
  };

  if (!user || !profile) {
    return null;
  }

  const credits = profile.credits_remaining || 0;
  const isLowCredits = credits <= 2;
  const isFreeUser = !profile.subscription_status || profile.subscription_status === 'free';

  // Calculate days until next expiration
  let daysUntilExpiration: number | null = null;
  let expiringCredits = 0;
  
  if (creditSummary?.next_expiration_date) {
    const expirationDate = new Date(creditSummary.next_expiration_date);
    const today = new Date();
    daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // If expiring soon (within 30 days), show warning
    if (daysUntilExpiration <= 30 && creditSummary.rollover_credits > 0) {
      expiringCredits = creditSummary.rollover_credits;
    }
  }

  // Calculate when free credits reset
  let daysUntilReset: number | null = null;
  if (isFreeUser && profile.last_credit_reset) {
    const lastReset = new Date(profile.last_credit_reset);
    const nextReset = new Date(lastReset);
    nextReset.setDate(nextReset.getDate() + 30);
    const today = new Date();
    daysUntilReset = Math.ceil((nextReset.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main credit display */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          isLowCredits ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          <Coins className="w-4 h-4" />
          <span className="font-medium">
            {credits} credit{credits !== 1 ? 's' : ''}
          </span>
        </div>
        
        {showPurchaseButton && (isLowCredits || credits === 0) && (
          <Link href="/pricing">
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Buy Credits
            </Button>
          </Link>
        )}
      </div>

      {/* Detailed information */}
      {showDetails && creditSummary && (
        <div className="space-y-2 text-sm">
          {/* Credit breakdown */}
          {creditSummary.active_purchases > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <TrendingUp className="w-4 h-4" />
              <span>
                {creditSummary.active_credits} active
                {creditSummary.rollover_credits > 0 && ` + ${creditSummary.rollover_credits} rollover`}
              </span>
            </div>
          )}

          {/* Expiration warning */}
          {expiringCredits > 0 && daysUntilExpiration && daysUntilExpiration <= 30 && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>
                {expiringCredits} credit{expiringCredits !== 1 ? 's' : ''} expire{expiringCredits === 1 ? 's' : ''} in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Free tier reset info */}
          {isFreeUser && daysUntilReset !== null && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                {daysUntilReset > 0 
                  ? `Free credits reset in ${daysUntilReset} day${daysUntilReset !== 1 ? 's' : ''}`
                  : 'Free credits available for reset!'
                }
              </span>
            </div>
          )}

          {/* Low credits warning */}
          {isLowCredits && credits > 0 && (
            <div className="text-red-600 text-xs font-medium">
              Running low on credits!
            </div>
          )}
        </div>
      )}
    </div>
  );
}