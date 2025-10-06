'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Download, X, Eye, AlertTriangle } from 'lucide-react';

interface TaxFormData {
  // W-9 Fields
  name?: string;
  businessName?: string;
  taxClassification?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  ssn?: string;
  ein?: string;

  // W-8BEN Fields (International)
  country?: string;
  permanentAddress?: string;
  mailingAddress?: string;
  dateOfBirth?: string;
  foreignTaxId?: string;
  referenceNumber?: string;
  treatyCountry?: string;
  treatyArticle?: string;
}

interface TaxFormViewerProps {
  affiliateId: string;
  affiliateName: string;
  onClose: () => void;
}

export function TaxFormViewer({
  affiliateId,
  affiliateName,
  onClose,
}: TaxFormViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxFormData, setTaxFormData] = useState<{
    tax_form_type: string;
    tax_id: string;
    form_data: TaxFormData;
    completed_at: string;
  } | null>(null);

  const handleViewTaxForm = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/affiliates/tax-form?affiliate_id=${affiliateId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tax form');
      }

      setTaxFormData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTaxId = (taxId: string, type: string) => {
    if (!taxId) return 'Not provided';

    if (type === 'W9') {
      // SSN format: XXX-XX-XXXX or EIN format: XX-XXXXXXX
      if (taxId.length === 9) {
        return `${taxId.slice(0, 3)}-${taxId.slice(3, 5)}-${taxId.slice(5)}`;
      } else if (taxId.length === 10) {
        return `${taxId.slice(0, 2)}-${taxId.slice(2)}`;
      }
    }

    return taxId;
  };

  const downloadAsPDF = () => {
    // Create a simple text representation for download
    const content = `
TAX FORM - ${taxFormData?.tax_form_type}
Affiliate: ${affiliateName}
Completed: ${taxFormData?.completed_at ? new Date(taxFormData.completed_at).toLocaleDateString() : 'N/A'}

${taxFormData?.tax_form_type === 'W9' ? 'W-9 INFORMATION' : 'W-8BEN INFORMATION'}
${'='.repeat(50)}

${taxFormData?.form_data.name ? `Name: ${taxFormData.form_data.name}` : ''}
${taxFormData?.form_data.businessName ? `Business Name: ${taxFormData.form_data.businessName}` : ''}
${taxFormData?.form_data.taxClassification ? `Tax Classification: ${taxFormData.form_data.taxClassification}` : ''}

Address: ${taxFormData?.form_data.address || ''}
City: ${taxFormData?.form_data.city || ''}
State: ${taxFormData?.form_data.state || ''}
ZIP: ${taxFormData?.form_data.zip || ''}

Tax ID: ${formatTaxId(taxFormData?.tax_id || '', taxFormData?.tax_form_type || '')}

${
  taxFormData?.tax_form_type === 'W8BEN'
    ? `
Country: ${taxFormData?.form_data.country || ''}
Foreign Tax ID: ${taxFormData?.form_data.foreignTaxId || ''}
Treaty Country: ${taxFormData?.form_data.treatyCountry || ''}
`
    : ''
}

Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-form-${affiliateId}-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold">Tax Form Information</h2>
                <p className="text-sm text-gray-600">{affiliateName}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">
                Confidential Tax Information
              </p>
              <p className="text-amber-700 mt-1">
                This information is highly sensitive. Access is logged for
                compliance and audit purposes. Do not share or distribute this
                information.
              </p>
            </div>
          </div>

          {/* View Button */}
          {!taxFormData && !error && (
            <div className="text-center py-8">
              <Button onClick={handleViewTaxForm} disabled={loading} size="lg">
                <Eye className="w-4 h-4 mr-2" />
                {loading ? 'Loading...' : 'View Tax Form'}
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Tax Form Data */}
          {taxFormData && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-600">Form Type</p>
                  <p className="font-semibold">{taxFormData.tax_form_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="font-semibold">
                    {new Date(taxFormData.completed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              {taxFormData.tax_form_type === 'W9' ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">W-9 Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Name</label>
                      <p className="font-medium">
                        {taxFormData.form_data.name || 'N/A'}
                      </p>
                    </div>

                    {taxFormData.form_data.businessName && (
                      <div>
                        <label className="text-sm text-gray-600">
                          Business Name
                        </label>
                        <p className="font-medium">
                          {taxFormData.form_data.businessName}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm text-gray-600">
                        Tax Classification
                      </label>
                      <p className="font-medium capitalize">
                        {taxFormData.form_data.taxClassification || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">
                        Tax ID (SSN/EIN)
                      </label>
                      <p className="font-medium font-mono">
                        {formatTaxId(
                          taxFormData.tax_id,
                          taxFormData.tax_form_type
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <label className="text-sm text-gray-600 block mb-2">
                      Address
                    </label>
                    <p className="font-medium">
                      {taxFormData.form_data.address || 'N/A'}
                    </p>
                    <p className="font-medium">
                      {taxFormData.form_data.city},{' '}
                      {taxFormData.form_data.state} {taxFormData.form_data.zip}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">
                    W-8BEN Information (International)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Name</label>
                      <p className="font-medium">
                        {taxFormData.form_data.name || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">
                        Country of Residence
                      </label>
                      <p className="font-medium">
                        {taxFormData.form_data.country || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">
                        Date of Birth
                      </label>
                      <p className="font-medium">
                        {taxFormData.form_data.dateOfBirth || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">
                        Foreign Tax ID
                      </label>
                      <p className="font-medium font-mono">
                        {taxFormData.form_data.foreignTaxId || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {taxFormData.form_data.treatyCountry && (
                    <div className="pt-4 border-t">
                      <label className="text-sm text-gray-600 block mb-2">
                        Tax Treaty Information
                      </label>
                      <p className="font-medium">
                        Country: {taxFormData.form_data.treatyCountry}
                      </p>
                      {taxFormData.form_data.treatyArticle && (
                        <p className="font-medium">
                          Article: {taxFormData.form_data.treatyArticle}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={downloadAsPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
