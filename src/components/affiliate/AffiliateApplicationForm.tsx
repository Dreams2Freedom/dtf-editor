'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface AffiliateApplicationFormProps {
  userId: string;
}

export function AffiliateApplicationForm({
  userId,
}: AffiliateApplicationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    // Website & Social Media
    website_url: '',
    twitter: '',
    youtube: '',
    instagram: '',
    tiktok: '',
    facebook: '',

    // Promotional Methods
    promotional_methods: [] as string[],

    // Audience
    audience_size: '',
    application_reason: '',
    content_examples: '',

    // Payment
    payment_method: 'paypal' as 'paypal' | 'check',
    paypal_email: '',
    check_payable_to: '',
    mailing_street: '',
    mailing_city: '',
    mailing_state: '',
    mailing_zip: '',
    mailing_country: 'US',

    // Tax
    tax_form_type: 'W9' as 'W9' | 'W8BEN',

    // Agreement
    agree_to_terms: false,
  });

  const promotionalMethodOptions = [
    { value: 'blog', label: 'Blog/Website Content' },
    { value: 'youtube', label: 'YouTube Videos' },
    { value: 'social', label: 'Social Media Posts' },
    { value: 'email', label: 'Email Marketing' },
    { value: 'ads', label: 'Paid Advertising' },
    { value: 'forum', label: 'Forum/Community Posts' },
    { value: 'podcast', label: 'Podcast' },
    { value: 'other', label: 'Other' },
  ];

  const audienceSizeOptions = [
    { value: 'none', label: 'Just starting' },
    { value: '1-1000', label: '1 - 1,000 followers' },
    { value: '1000-10000', label: '1,000 - 10,000 followers' },
    { value: '10000-100000', label: '10,000 - 100,000 followers' },
    { value: '100000+', label: '100,000+ followers' },
  ];

  const handleMethodChange = (method: string) => {
    setFormData(prev => ({
      ...prev,
      promotional_methods: prev.promotional_methods.includes(method)
        ? prev.promotional_methods.filter(m => m !== method)
        : [...prev.promotional_methods, method],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare data
      const applicationData = {
        website_url: formData.website_url,
        social_media: {
          twitter: formData.twitter,
          youtube: formData.youtube,
          instagram: formData.instagram,
          tiktok: formData.tiktok,
          facebook: formData.facebook,
        },
        promotional_methods: formData.promotional_methods,
        audience_size: formData.audience_size,
        application_reason: formData.application_reason,
        content_examples: formData.content_examples.split('\n').filter(Boolean),
        payment_method: formData.payment_method,
        paypal_email:
          formData.payment_method === 'paypal'
            ? formData.paypal_email
            : undefined,
        check_payable_to:
          formData.payment_method === 'check'
            ? formData.check_payable_to
            : undefined,
        mailing_address:
          formData.payment_method === 'check'
            ? {
                street: formData.mailing_street,
                city: formData.mailing_city,
                state: formData.mailing_state,
                zip: formData.mailing_zip,
                country: formData.mailing_country,
              }
            : undefined,
        tax_form_type: formData.tax_form_type,
        agree_to_terms: formData.agree_to_terms,
      };

      const response = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application');
      }

      setSuccess(true);

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard/affiliate');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="max-w-2xl mx-auto p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Application Submitted!</h2>
        <p className="text-gray-600 mb-6">
          Thank you for applying to the DTF Editor Affiliate Program. We'll
          review your application and notify you within 24-48 hours.
        </p>
        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">
          Apply to Become an Affiliate
        </h1>
        <p className="text-gray-600">
          Join our affiliate program and earn 20% recurring commissions on every
          referral!
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Website & Social Media */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Website & Social Media</h2>
        <p className="text-sm text-gray-600 mb-4">
          Tell us where you'll be promoting DTF Editor
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Website URL
            </label>
            <Input
              type="url"
              placeholder="https://yourwebsite.com"
              value={formData.website_url}
              onChange={e =>
                setFormData({ ...formData, website_url: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Twitter/X
              </label>
              <Input
                placeholder="@username"
                value={formData.twitter}
                onChange={e =>
                  setFormData({ ...formData, twitter: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">YouTube</label>
              <Input
                placeholder="@channelname"
                value={formData.youtube}
                onChange={e =>
                  setFormData({ ...formData, youtube: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Instagram
              </label>
              <Input
                placeholder="@username"
                value={formData.instagram}
                onChange={e =>
                  setFormData({ ...formData, instagram: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">TikTok</label>
              <Input
                placeholder="@username"
                value={formData.tiktok}
                onChange={e =>
                  setFormData({ ...formData, tiktok: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Promotional Methods */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Promotional Methods</h2>
        <p className="text-sm text-gray-600 mb-4">
          How will you promote DTF Editor? (Select all that apply)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {promotionalMethodOptions.map(method => (
            <label
              key={method.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.promotional_methods.includes(method.value)}
                onChange={() => handleMethodChange(method.value)}
                className="rounded"
              />
              <span className="text-sm">{method.label}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Audience Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Audience Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Audience Size <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.audience_size}
              onChange={e =>
                setFormData({ ...formData, audience_size: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">Select audience size</option>
              {audienceSizeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Why do you want to join our affiliate program?{' '}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={formData.application_reason}
              onChange={e =>
                setFormData({ ...formData, application_reason: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Tell us about your audience and why DTF Editor would be a good fit..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Content Examples (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.content_examples}
              onChange={e =>
                setFormData({ ...formData, content_examples: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Links to your best content (one per line)"
            />
          </div>
        </div>
      </Card>

      {/* Payment Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Payment Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.payment_method}
              onChange={e =>
                setFormData({
                  ...formData,
                  payment_method: e.target.value as 'paypal' | 'check',
                })
              }
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="paypal">PayPal</option>
              <option value="check">Check (US Only)</option>
            </select>
          </div>

          {formData.payment_method === 'paypal' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                PayPal Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                required
                value={formData.paypal_email}
                onChange={e =>
                  setFormData({ ...formData, paypal_email: e.target.value })
                }
                placeholder="your-paypal@email.com"
              />
            </div>
          )}

          {formData.payment_method === 'check' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Check Payable To <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.check_payable_to}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      check_payable_to: e.target.value,
                    })
                  }
                  placeholder="Full name or business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Mailing Address <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <Input
                    required
                    placeholder="Street Address"
                    value={formData.mailing_street}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        mailing_street: e.target.value,
                      })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      required
                      placeholder="City"
                      value={formData.mailing_city}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          mailing_city: e.target.value,
                        })
                      }
                    />
                    <Input
                      required
                      placeholder="State"
                      value={formData.mailing_state}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          mailing_state: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Input
                    required
                    placeholder="ZIP Code"
                    value={formData.mailing_zip}
                    onChange={e =>
                      setFormData({ ...formData, mailing_zip: e.target.value })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Tax Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Tax Information</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p>Tax forms are required before your first payout.</p>
              <p>US affiliates: W-9 form</p>
              <p>International affiliates: W-8BEN form</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tax Form Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.tax_form_type}
              onChange={e =>
                setFormData({
                  ...formData,
                  tax_form_type: e.target.value as 'W9' | 'W8BEN',
                })
              }
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="W9">W-9 (US Citizens/Residents)</option>
              <option value="W8BEN">W-8BEN (International)</option>
            </select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-1">
              Tax Information Required After Approval
            </p>
            <p className="text-xs text-blue-700">
              You'll be required to submit your{' '}
              {formData.tax_form_type === 'W9' ? 'W-9' : 'W-8BEN'} form with tax
              ID after your application is approved. All tax information is
              encrypted and stored securely.
            </p>
          </div>
        </div>
      </Card>

      {/* Terms Agreement */}
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            required
            id="agree"
            checked={formData.agree_to_terms}
            onChange={e =>
              setFormData({ ...formData, agree_to_terms: e.target.checked })
            }
            className="mt-1"
          />
          <label htmlFor="agree" className="text-sm">
            I have read and agree to the{' '}
            <a
              href="/affiliate-agreement"
              target="_blank"
              className="text-blue-600 hover:underline"
            >
              Affiliate Program Agreement
            </a>
            , including the commission structure, payment terms, and promotional
            guidelines.
            <span className="text-red-500"> *</span>
          </label>
        </div>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={loading || !formData.agree_to_terms}
          className="px-8 py-3"
        >
          {loading ? 'Submitting...' : 'Submit Application'}
        </Button>
      </div>
    </form>
  );
}
