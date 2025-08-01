'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Mail, 
  Send, 
  AlertCircle,
  User,
  Users,
  Tag
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface EmailUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUsers: Array<{
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  }>;
  onSuccess?: () => void;
}

type EmailTemplate = 'custom' | 'feature_update' | 'support' | 'billing' | 'promotional';

const EMAIL_TEMPLATES: Record<EmailTemplate, { name: string; subject: string; body: string }> = {
  custom: {
    name: 'Custom Message',
    subject: '',
    body: ''
  },
  feature_update: {
    name: 'Feature Update',
    subject: 'New features available in DTF Editor!',
    body: `Hi {{firstName}},

We're excited to share some new features that are now available in your DTF Editor account:

- [Feature 1]
- [Feature 2]
- [Feature 3]

Log in to your account to try them out!

Best regards,
The DTF Editor Team`
  },
  support: {
    name: 'Support Follow-up',
    subject: 'Following up on your DTF Editor experience',
    body: `Hi {{firstName}},

We noticed you've been using DTF Editor and wanted to check in to see how your experience has been.

Is there anything we can help you with? Any features you'd like to see?

Feel free to reply to this email with any questions or feedback.

Best regards,
The DTF Editor Support Team`
  },
  billing: {
    name: 'Billing Notification',
    subject: 'Important billing information for your DTF Editor account',
    body: `Hi {{firstName}},

This is a notification regarding your DTF Editor account billing.

[Add specific billing information here]

If you have any questions about your billing, please don't hesitate to reach out.

Best regards,
The DTF Editor Billing Team`
  },
  promotional: {
    name: 'Special Offer',
    subject: 'Special offer for DTF Editor users!',
    body: `Hi {{firstName}},

We have a special offer just for you!

[Add promotional details here]

This offer is valid until [date].

Best regards,
The DTF Editor Team`
  }
};

export function EmailUserModal({ isOpen, onClose, selectedUsers, onSuccess }: EmailUserModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [template, setTemplate] = useState<EmailTemplate>('custom');
  const [sending, setSending] = useState(false);
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState(true);
  const [testMode, setTestMode] = useState(true); // Default to test mode for safety

  const handleTemplateChange = (newTemplate: EmailTemplate) => {
    setTemplate(newTemplate);
    const templateData = EMAIL_TEMPLATES[newTemplate];
    setSubject(templateData.subject);
    setBody(templateData.body);
  };

  const personalizeMessage = (message: string, user: typeof selectedUsers[0]) => {
    return message
      .replace(/{{firstName}}/g, user.first_name || 'User')
      .replace(/{{lastName}}/g, user.last_name || '')
      .replace(/{{email}}/g, user.email);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please enter both subject and message');
      return;
    }

    setSending(true);
    
    try {
      const response = await fetch('/api/admin/users/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers.map(u => u.id),
          subject,
          body,
          includeUnsubscribe,
          testMode,
          template
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send emails');
      }

      const result = await response.json();
      
      toast.success(
        testMode 
          ? `Test email sent to admin (would send to ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''})`
          : `Email sent to ${result.sent} user${result.sent > 1 ? 's' : ''}`
      );
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={onClose}
      title="Send Email to Users"
      size="lg"
    >
      <div className="space-y-4">
        {/* Recipients Info */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">
                Sending to {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''}
              </p>
              {selectedUsers.length === 1 && (
                <p className="text-sm text-blue-700 mt-1">
                  {selectedUsers[0].email}
                </p>
              )}
              {selectedUsers.length > 1 && selectedUsers.length <= 5 && (
                <div className="text-sm text-blue-700 mt-1">
                  {selectedUsers.map(user => (
                    <div key={user.id}>{user.email}</div>
                  ))}
                </div>
              )}
              {selectedUsers.length > 5 && (
                <p className="text-sm text-blue-700 mt-1">
                  {selectedUsers.slice(0, 3).map(u => u.email).join(', ')} 
                  and {selectedUsers.length - 3} more...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Template
          </label>
          <select
            value={template}
            onChange={(e) => handleTemplateChange(e.target.value as EmailTemplate)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(EMAIL_TEMPLATES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject"
            className="w-full"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter your message..."
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Available variables: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeUnsubscribe}
              onChange={(e) => setIncludeUnsubscribe(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Include unsubscribe link</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-orange-700">
              Test mode (send to admin email only)
            </span>
          </label>
        </div>

        {/* Warning for live mode */}
        {!testMode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Live Mode Active</p>
                <p className="text-sm text-yellow-700">
                  Emails will be sent to actual users. Make sure to review your message carefully.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {selectedUsers.length === 1 && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Preview (personalized for first recipient):</p>
            <div className="bg-white rounded p-3 text-sm">
              <p className="font-medium mb-2">Subject: {personalizeMessage(subject, selectedUsers[0])}</p>
              <div className="whitespace-pre-wrap text-gray-600">
                {personalizeMessage(body, selectedUsers[0])}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
          >
            {sending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {testMode ? 'Send Test Email' : `Send to ${selectedUsers.length} User${selectedUsers.length > 1 ? 's' : ''}`}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}