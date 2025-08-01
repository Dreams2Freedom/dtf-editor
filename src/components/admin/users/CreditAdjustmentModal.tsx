'use client';

import { useState } from 'react';
import { X, CreditCard, Plus, Minus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/lib/toast';

interface CreditAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    full_name?: string;
    credits_remaining: number;
  };
  onUpdate: (updatedCredits: number) => void;
}

export function CreditAdjustmentModal({ 
  isOpen, 
  onClose, 
  user,
  onUpdate
}: CreditAdjustmentModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    const adjustmentAmount = operation === 'add' ? numAmount : -numAmount;
    const newBalance = user.credits_remaining + adjustmentAmount;

    if (newBalance < 0) {
      toast.error('Cannot reduce credits below zero');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: adjustmentAmount,
          reason: reason.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to adjust credits');
      }

      const data = await response.json();
      
      toast.success(
        operation === 'add' 
          ? `Added ${numAmount} credits to ${user.email}`
          : `Removed ${numAmount} credits from ${user.email}`
      );
      
      onUpdate(data.new_balance);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error adjusting credits:', error);
      toast.error('Failed to adjust credits');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setReason('');
    setOperation('add');
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose} title="Adjust User Credits">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700">User Information</h3>
          <p className="text-sm text-gray-600 mt-1">{user.full_name || 'No name'}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <p className="text-sm font-medium text-gray-700 mt-2">
            Current Balance: <span className="text-primary-blue">{user.credits_remaining} credits</span>
          </p>
        </div>

        {/* Operation Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Operation
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOperation('add')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                operation === 'add'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Plus className="h-4 w-4" />
              Add Credits
            </button>
            <button
              type="button"
              onClick={() => setOperation('subtract')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                operation === 'subtract'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Minus className="h-4 w-4" />
              Remove Credits
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter number of credits"
              className="pl-10"
              required
            />
          </div>
          {amount && (
            <p className="text-sm text-gray-500 mt-1">
              New balance will be: {' '}
              <span className={operation === 'add' ? 'text-green-600' : 'text-red-600'}>
                {user.credits_remaining + (operation === 'add' ? parseInt(amount) || 0 : -(parseInt(amount) || 0))} credits
              </span>
            </p>
          )}
        </div>

        {/* Reason Input */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Adjustment
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Customer support compensation, Refund for failed processing, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            rows={3}
            required
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              resetForm();
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={operation === 'add' ? 'default' : 'destructive'}
            loading={loading}
          >
            {operation === 'add' ? 'Add' : 'Remove'} Credits
          </Button>
        </div>
      </form>
    </Modal>
  );
}