'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Shield,
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Globe,
  Flag
} from 'lucide-react';

interface TaxFormData {
  form_type: 'W9' | 'W8BEN';
  legal_name: string;
  business_name?: string;
  tax_id: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code: string;
  tax_classification?: string;
  foreign_tax_id?: string;
  treaty_country?: string;
  treaty_article?: string;
  treaty_rate?: string;
  signature_name: string;
  signature_date: string;
  certified: boolean;
}

export default function TaxFormsPage() {
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Record<string, any> | null>(null);
  const [formType, setFormType] = useState<'W9' | 'W8BEN' | null>(null);
  const [taxFormData, setTaxFormData] = useState<TaxFormData>({
    form_type: 'W9',
    legal_name: '',
    tax_id: '',
    address: '',
    city: '',
    country: 'US',
    postal_code: '',
    signature_name: '',
    signature_date: new Date().toISOString().split('T')[0],
    certified: false
  });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  async function fetchAffiliateData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get affiliate record
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (affiliateError || !affiliateData) {
        toast.error('Please apply to the affiliate program first');
        router.push('/affiliate/apply');
        return;
      }

      setAffiliate(affiliateData);

      // Check if tax form already submitted
      if (affiliateData.tax_form_submitted) {
        setFormType(affiliateData.tax_form_type);
      }
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
      toast.error('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!taxFormData.certified) {
      toast.error('Please certify that the information is correct');
      return;
    }

    setSubmitting(true);
    try {
      // Get the user's auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to submit tax form');
        router.push('/auth/login');
        return;
      }

      // Submit tax form through secure API endpoint
      const response = await fetch('/api/affiliate/tax-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          affiliateId: affiliate.id,
          taxFormData: {
            ...taxFormData,
            submitted_at: new Date().toISOString()
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit tax form');
      }

      toast.success('Tax form submitted securely');
      router.push('/dashboard/affiliate');
    } catch (error) {
      console.error('Error submitting tax form:', error);
      toast.error((error as Error).message || 'Failed to submit tax form');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (affiliate?.tax_form_submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Tax Form Submitted</h1>
              <p className="text-gray-600 mb-6">
                Your {formType} form has been submitted and is on file.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                <p className="text-sm font-medium text-gray-700 mb-2">Important Information:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Form Type: {formType}</li>
                  <li>• Submitted: {new Date(affiliate.tax_form_submitted_at).toLocaleDateString()}</li>
                  <li>• Tax ID: ***-**-****</li>
                  {formType === 'W9' && (
                    <li>• 1099-MISC will be issued if earnings exceed $600</li>
                  )}
                </ul>
              </div>
              <Button
                onClick={() => router.push('/dashboard/affiliate')}
                className="mt-6"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-6 w-6 mr-2 text-blue-600" />
              Tax Information Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Why we need this information:</p>
                  <ul className="mt-1 text-yellow-700 space-y-1">
                    <li>• IRS regulations require tax reporting for affiliate earnings</li>
                    <li>• US affiliates earning $600+ will receive a 1099-MISC</li>
                    <li>• International affiliates may be eligible for tax treaty benefits</li>
                    <li>• This information is securely encrypted and stored</li>
                  </ul>
                </div>
              </div>
            </div>

            {!formType ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Select Your Tax Status:</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setFormType('W9');
                      setTaxFormData(prev => ({ ...prev, form_type: 'W9', country: 'US' }));
                    }}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
                  >
                    <Flag className="h-8 w-8 text-blue-600 mb-2" />
                    <h3 className="font-semibold mb-1">US Taxpayer</h3>
                    <p className="text-sm text-gray-600">
                      US citizens, residents, or businesses
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Form W-9</p>
                  </button>

                  <button
                    onClick={() => {
                      setFormType('W8BEN');
                      setTaxFormData(prev => ({ ...prev, form_type: 'W8BEN', country: '' }));
                    }}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
                  >
                    <Globe className="h-8 w-8 text-green-600 mb-2" />
                    <h3 className="font-semibold mb-1">International</h3>
                    <p className="text-sm text-gray-600">
                      Non-US individuals or businesses
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Form W-8BEN</p>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  {formType === 'W9' ? 'W-9 Tax Form' : 'W-8BEN Tax Form'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={taxFormData.legal_name}
                      onChange={(e) => setTaxFormData(prev => ({ ...prev, legal_name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  {formType === 'W9' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Name (if different)
                      </label>
                      <input
                        type="text"
                        value={taxFormData.business_name || ''}
                        onChange={(e) => setTaxFormData(prev => ({ ...prev, business_name: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formType === 'W9' ? 'SSN or EIN *' : 'Foreign Tax ID *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={taxFormData.tax_id}
                      onChange={(e) => setTaxFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder={formType === 'W9' ? 'XXX-XX-XXXX or XX-XXXXXXX' : ''}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={taxFormData.address}
                      onChange={(e) => setTaxFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={taxFormData.city}
                      onChange={(e) => setTaxFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  {formType === 'W9' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        required
                        value={taxFormData.state || ''}
                        onChange={(e) => setTaxFormData(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                        maxLength={2}
                        placeholder="XX"
                      />
                    </div>
                  )}

                  {formType === 'W8BEN' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country *
                      </label>
                      <input
                        type="text"
                        required
                        value={taxFormData.country}
                        onChange={(e) => setTaxFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal/ZIP Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={taxFormData.postal_code}
                      onChange={(e) => setTaxFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {formType === 'W8BEN' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">Tax Treaty Information (Optional)</p>
                    <p className="text-xs text-blue-700 mb-3">
                      If your country has a tax treaty with the US, you may be eligible for reduced withholding.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Treaty Country"
                        value={taxFormData.treaty_country || ''}
                        onChange={(e) => setTaxFormData(prev => ({ ...prev, treaty_country: e.target.value }))}
                        className="px-3 py-2 border rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Treaty Article"
                        value={taxFormData.treaty_article || ''}
                        onChange={(e) => setTaxFormData(prev => ({ ...prev, treaty_article: e.target.value }))}
                        className="px-3 py-2 border rounded text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-3">Certification & Signature</h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Electronic Signature (Type your full legal name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={taxFormData.signature_name}
                      onChange={(e) => setTaxFormData(prev => ({ ...prev, signature_name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Enter your full legal name"
                    />
                  </div>

                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="certify"
                      checked={taxFormData.certified}
                      onChange={(e) => setTaxFormData(prev => ({ ...prev, certified: e.target.checked }))}
                      className="mt-1 mr-2"
                      required
                    />
                    <label htmlFor="certify" className="text-sm text-gray-700">
                      Under penalties of perjury, I certify that:
                      <ul className="mt-1 ml-4 space-y-1">
                        <li>• The information provided is true, correct, and complete</li>
                        <li>• I am the person/entity named above</li>
                        {formType === 'W9' && (
                          <>
                            <li>• I am not subject to backup withholding</li>
                            <li>• I am a U.S. citizen or U.S. resident alien</li>
                          </>
                        )}
                        {formType === 'W8BEN' && (
                          <>
                            <li>• I am the beneficial owner of the income</li>
                            <li>• I am not a U.S. person</li>
                          </>
                        )}
                      </ul>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button
                    type="submit"
                    disabled={submitting || !taxFormData.certified}
                    className="flex-1"
                  >
                    {submitting ? 'Submitting...' : 'Submit Tax Form'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setFormType(null)}
                    variant="secondary"
                    disabled={submitting}
                  >
                    Back
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Privacy Notice:</strong> Your tax information is encrypted and stored securely.
                It will only be used for tax reporting purposes as required by law. We will never share
                your tax information with third parties except as required for tax reporting.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}