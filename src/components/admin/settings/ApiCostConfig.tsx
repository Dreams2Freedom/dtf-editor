'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  DollarSign,
  Save,
  RefreshCw,
  AlertCircle,
  Check,
  Edit2,
  X
} from 'lucide-react';

interface ApiCostConfig {
  id?: string;
  provider: string;
  operation: string;
  cost_per_unit: number;
  unit_description: string;
  notes?: string;
  effective_date?: string;
  updated_at?: string;
}

const PROVIDER_NAMES = {
  deep_image: 'Deep-Image.ai',
  clipping_magic: 'ClippingMagic',
  vectorizer: 'Vectorizer.ai',
  openai: 'OpenAI',
  stripe: 'Stripe'
};

const OPERATION_NAMES = {
  upscale: 'Image Upscaling',
  background_removal: 'Background Removal',
  vectorization: 'Vectorization',
  image_generation: 'AI Generation',
  payment_processing: 'Payment Processing'
};

export default function ApiCostConfig() {
  const [configs, setConfigs] = useState<ApiCostConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ApiCostConfig>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/cost-config');
      const data = await response.json();

      if (data.configs) {
        setConfigs(data.configs);
        setIsDefault(data.isDefault || false);
      }
    } catch (error) {
      console.error('Error fetching cost configs:', error);
      setErrorMessage('Failed to load cost configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (config: ApiCostConfig) => {
    setEditingId(`${config.provider}-${config.operation}`);
    setEditValues({
      cost_per_unit: config.cost_per_unit,
      unit_description: config.unit_description,
      notes: config.notes
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleSave = async (provider: string, operation: string) => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/cost-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          operation,
          cost_per_unit: parseFloat(editValues.cost_per_unit?.toString() || '0'),
          unit_description: editValues.unit_description,
          notes: editValues.notes
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`Cost configuration ${data.action} successfully!`);
        setEditingId(null);
        setEditValues({});
        await fetchConfigs();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setErrorMessage('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkSave = async () => {
    if (isDefault) {
      // If using defaults, save all of them to database
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      try {
        const response = await fetch('/api/admin/cost-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configs })
        });

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage(`Saved ${data.updated} configurations to database!`);
          setIsDefault(false);
          await fetchConfigs();
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          setErrorMessage(data.error || 'Failed to save configurations');
        }
      } catch (error) {
        console.error('Error saving configs:', error);
        setErrorMessage('Failed to save configurations');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const calculateMonthlyCost = (cost: number, operation: string) => {
    // Estimate monthly volume based on operation type
    const estimatedVolume = {
      upscale: 500,
      background_removal: 300,
      vectorization: 200,
      image_generation: 100,
      payment_processing: 150
    };

    const volume = estimatedVolume[operation as keyof typeof estimatedVolume] || 100;
    return (cost * volume).toFixed(2);
  };

  const calculateProfitMargin = (cost: number) => {
    // Average credit value is ~$0.50
    const avgCreditValue = 0.50;
    const margin = ((avgCreditValue - cost) / avgCreditValue) * 100;
    return margin.toFixed(1);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading cost configurations...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              API Cost Configuration
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your API provider costs to track profitability accurately
            </p>
          </div>
          <Button
            onClick={fetchConfigs}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-800">
            <Check className="h-4 w-4 mr-2" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-800">
            <AlertCircle className="h-4 w-4 mr-2" />
            {errorMessage}
          </div>
        )}

        {isDefault && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800 font-medium">Using Default Values</p>
                <p className="text-xs text-yellow-700 mt-1">
                  These are default costs. Click "Save All to Database" to persist them.
                </p>
              </div>
              <Button
                onClick={handleBulkSave}
                size="sm"
                variant="default"
                disabled={isSaving}
                className="ml-4"
              >
                <Save className="h-4 w-4 mr-2" />
                Save All to Database
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Cost Configuration Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Provider</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Operation</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Cost per Unit</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Unit</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Est. Monthly</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Margin</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => {
                const configId = `${config.provider}-${config.operation}`;
                const isEditing = editingId === configId;

                return (
                  <tr key={configId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium">
                        {PROVIDER_NAMES[config.provider as keyof typeof PROVIDER_NAMES] || config.provider}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {OPERATION_NAMES[config.operation as keyof typeof OPERATION_NAMES] || config.operation}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.0001"
                          value={editValues.cost_per_unit || ''}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            cost_per_unit: parseFloat(e.target.value)
                          })}
                          className="w-24"
                        />
                      ) : (
                        <span className="font-mono">${config.cost_per_unit.toFixed(4)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editValues.unit_description || ''}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            unit_description: e.target.value
                          })}
                          className="w-32"
                        />
                      ) : (
                        <span className="text-sm text-gray-600">{config.unit_description}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        ${calculateMonthlyCost(config.cost_per_unit, config.operation)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-medium ${
                        parseFloat(calculateProfitMargin(config.cost_per_unit)) > 50
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }`}>
                        {calculateProfitMargin(config.cost_per_unit)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSave(config.provider, config.operation)}
                            size="sm"
                            variant="success"
                            disabled={isSaving}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={handleCancel}
                            size="sm"
                            variant="outline"
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleEdit(config)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Notes Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Cost Management Tips</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Update costs immediately when you negotiate new rates with providers</p>
          <p>• Monitor profit margins regularly - aim for at least 50% margin</p>
          <p>• Consider volume discounts from providers for popular operations</p>
          <p>• Stripe costs include both percentage (2.9%) and fixed fee ($0.30)</p>
          <p>• All changes are tracked in the audit log for accountability</p>
        </div>
      </Card>
    </div>
  );
}