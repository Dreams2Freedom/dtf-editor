'use client';

import { useEffect, useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { format } from 'date-fns';
import {
  CreditCard,
  ShoppingBag,
  Gift,
  RefreshCw,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ClientOnly } from '@/components/auth/ClientOnly';
import { Button } from '@/components/ui/Button';

interface CreditTransaction {
  id: string;
  type: 'purchase' | 'subscription' | 'usage' | 'refund' | 'bonus';
  amount: number;
  description: string;
  metadata: any;
  created_at: string;
  // Note: balance_before and balance_after don't exist in the table
}

const ITEMS_PER_PAGE = 10;

export function CreditHistory() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
    }
  }, [user?.id, currentPage]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;

      // Fetch one extra item to check if there are more pages
      const { data, error } = await supabase.rpc(
        'get_user_credit_transactions',
        {
          p_user_id: user?.id,
          p_limit: ITEMS_PER_PAGE + 1,
          p_offset: offset,
        }
      );

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      const results = data || [];

      // Check if there are more items beyond the current page
      if (results.length > ITEMS_PER_PAGE) {
        setHasMore(true);
        // Remove the extra item
        setTransactions(results.slice(0, ITEMS_PER_PAGE));
      } else {
        setHasMore(false);
        setTransactions(results);
      }

      console.log(
        '[CreditHistory] Fetched:',
        results.length,
        'Has more:',
        results.length > ITEMS_PER_PAGE
      );
    } catch (error) {
      console.error('Error fetching credit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <CreditCard className="h-4 w-4" />;
      case 'subscription':
        return <RefreshCw className="h-4 w-4" />;
      case 'usage':
        return <Zap className="h-4 w-4" />;
      case 'bonus':
        return <Gift className="h-4 w-4" />;
      default:
        return <ShoppingBag className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'subscription':
      case 'bonus':
        return 'text-green-600';
      case 'usage':
        return 'text-red-600';
      case 'refund':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === 'usage' ? '-' : '+';
    return `${prefix}${Math.abs(amount)}`;
  };

  if (!mounted) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (loading) {
    return <div className="text-center py-4">Loading credit history...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No credit transactions yet</p>
        <p className="text-sm mt-1">
          Your credit purchases and usage will appear here
        </p>
      </div>
    );
  }

  const showPagination = currentPage > 1 || hasMore;
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = startItem + transactions.length - 1;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {transactions.map(transaction => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-full bg-white ${getTransactionColor(transaction.type)}`}
              >
                {getTransactionIcon(transaction.type)}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {transaction.description || `${transaction.type} transaction`}
                </p>
                <p className="text-sm text-gray-500">
                  {format(
                    new Date(transaction.created_at),
                    'MMM d, yyyy h:mm a'
                  )}
                </p>
                {transaction.metadata?.price_paid && (
                  <p className="text-xs text-gray-500">
                    Paid: ${(transaction.metadata.price_paid / 100).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p
                className={`font-semibold ${getTransactionColor(transaction.type)}`}
              >
                {formatAmount(transaction.amount, transaction.type)} credits
              </p>
              <p className="text-sm text-gray-500">
                {/* Balance tracking not available */}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {showPagination && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            Showing {startItem} to {endItem} transactions
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-600 px-3">
              Page {currentPage}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!hasMore}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
