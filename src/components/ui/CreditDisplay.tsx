'use client';

import { useAuthStore } from '@/stores/authStore';
import { Coins, Plus } from 'lucide-react';
import { Button } from './Button';
import Link from 'next/link';

interface CreditDisplayProps {
  showPurchaseButton?: boolean;
  className?: string;
}

export function CreditDisplay({ showPurchaseButton = true, className = '' }: CreditDisplayProps) {
  const { profile, user } = useAuthStore();

  if (!user || !profile) {
    return null;
  }

  const credits = profile.credits ?? profile.credits_remaining ?? 0;
  const isLowCredits = credits <= 2;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isLowCredits ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
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
            Get More
          </Button>
        </Link>
      )}
    </div>
  );
}