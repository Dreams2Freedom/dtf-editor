'use client';

import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { toast } from '@/lib/toast';

interface BulkCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedUserIds: string[];
  onSuccess: () => void;
}

export function BulkCreditModal({
  isOpen,
  onClose,
  selectedCount,
  selectedUserIds,
  onSuccess
}: BulkCreditModalProps) {
  const [creditAmount, setCreditAmount] = useState('');
  const [operation, setOperation] = useState<'add' | 'set'>('add');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    if (operation === 'set' && amount > 1000) {
      toast.error('Cannot set credits higher than 1000');
      return;
    }

    if (operation === 'add' && amount > 500) {
      toast.error('Cannot add more than 500 credits at once');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/users/bulk-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userIds: selectedUserIds,
          amount,
          operation
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to adjust credits');
      }

      const result = await response.json();
      toast.success(`Successfully updated credits for ${result.affected} users`);
      
      onSuccess();
      onClose();
      setCreditAmount('');
    } catch (error) {
      console.error('Bulk credit adjustment error:', error);
      toast.error('Failed to adjust credits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            Bulk Credit Adjustment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Adjusting credits for <span className="font-semibold">{selectedCount} users</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operation
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="operation"
                      value="add"
                      checked={operation === 'add'}
                      onChange={(e) => setOperation(e.target.value as 'add' | 'set')}
                      className="mr-2"
                    />
                    <span className="text-sm">Add to existing credits</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="operation"
                      value="set"
                      checked={operation === 'set'}
                      onChange={(e) => setOperation(e.target.value as 'add' | 'set')}
                      className="mr-2"
                    />
                    <span className="text-sm">Set to specific amount</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="creditAmount" className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Amount
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="creditAmount"
                    name="creditAmount"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder={operation === 'add' ? 'Credits to add' : 'New credit balance'}
                    min="0"
                    max={operation === 'add' ? '500' : '1000'}
                    required
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {operation === 'add' 
                    ? 'Maximum 500 credits can be added at once'
                    : 'Maximum balance of 1000 credits'
                  }
                </p>
              </div>

              {operation === 'add' && parseInt(creditAmount) > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Each user will receive <span className="font-semibold">{creditAmount} additional credits</span>
                  </p>
                </div>
              )}

              {operation === 'set' && parseInt(creditAmount) >= 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    All selected users will have their credits set to <span className="font-semibold">{creditAmount}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !creditAmount}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-blue rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Credits'}
          </button>
        </div>
      </div>
    </div>
  );
}