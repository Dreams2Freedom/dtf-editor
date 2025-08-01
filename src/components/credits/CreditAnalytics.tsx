'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Coins, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface CreditStats {
  totalUsed: number;
  totalPurchased: number;
  totalRefunded: number;
  currentBalance: number;
  lastResetDate: string | null;
  subscriptionStatus: string | null;
}

export function CreditAnalytics() {
  const { user, profile } = useAuthStore();
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    const supabase = createClientSupabaseClient();
    
    // Fetch transaction summary
    const { data: transactions, error } = await supabase
      .from('credit_transactions')
      .select('type, amount')
      .eq('user_id', user.id);

    if (!error && transactions && profile) {
      const stats: CreditStats = {
        totalUsed: 0,
        totalPurchased: 0,
        totalRefunded: 0,
        currentBalance: profile.credits_remaining || 0,
        lastResetDate: profile.last_credit_reset || null,
        subscriptionStatus: profile.subscription_status || 'free'
      };

      transactions.forEach(t => {
        switch (t.type) {
          case 'usage':
            stats.totalUsed += t.amount;
            break;
          case 'purchase':
          case 'subscription':
          case 'reset':
            stats.totalPurchased += t.amount;
            break;
          case 'refund':
            stats.totalRefunded += t.amount;
            break;
        }
      });

      setStats(stats);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: 'Current Balance',
      value: stats.currentBalance,
      icon: Coins,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Used',
      value: stats.totalUsed,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Total Earned',
      value: stats.totalPurchased,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Subscription',
      value: stats.subscriptionStatus === 'free' ? 'Free Tier' : 'Pro',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      isText: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {stat.isText ? stat.value : `${stat.value}`}
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}