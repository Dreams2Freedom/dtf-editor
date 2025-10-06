'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supportService } from '@/services/support';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Bug,
  Sparkles,
  CreditCard,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { TicketCategory, TicketPriority } from '@/types/support';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTicketModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTicketModalProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'technical' as TicketCategory,
    priority: 'medium' as TicketPriority,
    message: '',
  });

  const categories: Array<{
    value: TicketCategory;
    label: string;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      value: 'bug',
      label: 'Bug Report',
      icon: <Bug className="w-5 h-5" />,
      description: "Something isn't working correctly",
    },
    {
      value: 'feature_request',
      label: 'Feature Request',
      icon: <Sparkles className="w-5 h-5" />,
      description: 'Suggest a new feature or improvement',
    },
    {
      value: 'billing',
      label: 'Billing Issue',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Questions about payments or subscriptions',
    },
    {
      value: 'technical',
      label: 'Technical Help',
      icon: <AlertCircle className="w-5 h-5" />,
      description: 'Need help using the platform',
    },
    {
      value: 'other',
      label: 'Other',
      icon: <HelpCircle className="w-5 h-5" />,
      description: 'General questions or feedback',
    },
  ];

  const priorities: Array<{
    value: TicketPriority;
    label: string;
    color: string;
  }> = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const ticket = await supportService.createTicket(user.id, formData);
      console.log('Ticket created successfully:', ticket);

      // Reset form first
      setFormData({
        subject: '',
        category: 'technical',
        priority: 'medium',
        message: '',
      });

      // Then call success callback which should close modal and refresh
      onSuccess();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={open => !open && onClose()}
      title="Create Support Ticket"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject *
          </label>
          <Input
            required
            placeholder="Brief description of your issue"
            value={formData.subject}
            onChange={e =>
              setFormData({ ...formData, subject: e.target.value })
            }
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, category: cat.value })
                }
                className={`p-3 border rounded-lg text-left transition-colors ${
                  formData.category === cat.value
                    ? 'border-[#366494] bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={
                      formData.category === cat.value
                        ? 'text-[#366494]'
                        : 'text-gray-500'
                    }
                  >
                    {cat.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{cat.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {cat.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <div className="flex gap-2">
            {priorities.map(priority => (
              <button
                key={priority.value}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, priority: priority.value })
                }
                className={`px-4 py-2 border rounded-lg font-medium text-sm transition-colors ${
                  formData.priority === priority.value
                    ? 'border-[#366494] bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span
                  className={
                    formData.priority === priority.value
                      ? 'text-[#366494]'
                      : priority.color
                  }
                >
                  {priority.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            required
            rows={6}
            placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, or relevant information."
            value={formData.message}
            onChange={e =>
              setFormData({ ...formData, message: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#366494] focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.subject || !formData.message}
            className="bg-[#366494] hover:bg-[#233E5C]"
          >
            {loading ? 'Creating...' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
