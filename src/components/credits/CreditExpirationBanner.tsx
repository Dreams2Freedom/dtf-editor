'use client';

import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { AlertCircle, Clock, Info } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface ExpiringCredits {
  credits: number;
  expiresAt: string;
  daysUntilExpiration: number;
}

export function CreditExpirationBanner() {
  const { user, profile } = useAuthContext();
  const [expiringCredits, setExpiringCredits] = useState<ExpiringCredits[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const checkExpiringCredits = async () => {
      try {
        const response = await fetch('/api/credits/expiring');
        if (response.ok) {
          const data = await response.json();
          setExpiringCredits(data.expiringCredits || []);
        }
      } catch (error) {
        console.error('Error checking expiring credits:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExpiringCredits();
  }, [user?.id]);

  if (loading || !expiringCredits.length) {
    return null;
  }

  // Group by days until expiration
  const criticalExpiring = expiringCredits.filter(
    c => c.daysUntilExpiration <= 3
  );
  const warningExpiring = expiringCredits.filter(
    c => c.daysUntilExpiration > 3 && c.daysUntilExpiration <= 7
  );
  const infoExpiring = expiringCredits.filter(
    c => c.daysUntilExpiration > 7 && c.daysUntilExpiration <= 14
  );

  const totalExpiringCredits = expiringCredits.reduce(
    (sum, c) => sum + c.credits,
    0
  );

  if (criticalExpiring.length > 0) {
    const soonestExpiring = criticalExpiring[0];
    return (
      <Card className="border-red-200 bg-red-50 mb-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">
                Credits Expiring Soon!
              </h3>
              <p className="text-red-700 text-sm mt-1">
                {soonestExpiring.credits} credit
                {soonestExpiring.credits > 1 ? 's' : ''} will expire
                {soonestExpiring.daysUntilExpiration === 0
                  ? ' today'
                  : soonestExpiring.daysUntilExpiration === 1
                    ? ' tomorrow'
                    : ` in ${soonestExpiring.daysUntilExpiration} days`}
              </p>
              <div className="mt-3 flex gap-2">
                <Link href="/process">
                  <Button size="sm" variant="primary">
                    Use Credits Now
                  </Button>
                </Link>
                <Link href="/pricing?tab=payasyougo">
                  <Button size="sm" variant="outline">
                    Buy More Credits
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (warningExpiring.length > 0) {
    return (
      <Card className="border-amber-200 bg-amber-50 mb-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">
                Credits Expiring This Week
              </h3>
              <p className="text-amber-700 text-sm mt-1">
                {totalExpiringCredits} credit
                {totalExpiringCredits > 1 ? 's' : ''} will expire within the
                next week
              </p>
              <Link href="/process">
                <Button size="sm" className="mt-2">
                  Use Credits
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (infoExpiring.length > 0) {
    return (
      <Card className="border-blue-200 bg-blue-50 mb-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-blue-700 text-sm">
                You have {totalExpiringCredits} credit
                {totalExpiringCredits > 1 ? 's' : ''} expiring in the next 2
                weeks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
