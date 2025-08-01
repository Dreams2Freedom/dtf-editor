'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Coins, TrendingUp, TrendingDown, RotateCcw, CreditCard, Settings } from 'lucide-react';

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'refund' | 'reset' | 'manual' | 'subscription';
  description: string | null;
  balance_after: number;
  created_at: string;
}

export function CreditHistory() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;

    const supabase = createClientSupabaseClient();
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'subscription':
        return <CreditCard className="w-4 h-4" />;
      case 'usage':
        return <TrendingDown className="w-4 h-4" />;
      case 'refund':
        return <TrendingUp className="w-4 h-4" />;
      case 'reset':
        return <RotateCcw className="w-4 h-4" />;
      case 'manual':
        return <Settings className="w-4 h-4" />;
      default:
        return <Coins className="w-4 h-4" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'subscription':
      case 'refund':
      case 'reset':
      case 'manual':
        return 'text-green-600';
      case 'usage':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const isPositive = ['purchase', 'subscription', 'refund', 'reset', 'manual'].includes(type);
    return `${isPositive ? '+' : '-'}${Math.abs(amount)}`;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Coins className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No credit transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${getColorClass(transaction.type)}`}>
              {getIcon(transaction.type)}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {transaction.description || transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
              </p>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${getColorClass(transaction.type)}`}>
              {formatAmount(transaction.amount, transaction.type)}
            </p>
            <p className="text-sm text-gray-500">
              Balance: {transaction.balance_after}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}