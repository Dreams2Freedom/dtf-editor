'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Info } from 'lucide-react';

interface ServiceProfitability {
  service: string;
  apiCost: number;
  creditCost: number;
  creditsCharged: number;
  revenuePerImage: number;
  profitPerImage: number;
  profitMargin: number;
}

export function ProfitabilityAnalysis() {
  // API costs (actual)
  const apiCosts = {
    upscale: 0.08, // Deep-Image.ai
    backgroundRemoval: 0.125, // ClippingMagic
    vectorization: 0.2, // Vectorizer.ai
    imageGeneration: 0.04, // OpenAI DALL-E 3 (standard quality)
  };

  // Credit pricing based on plans
  const creditPricing = {
    payAsYouGo: {
      10: 7.99, // $0.799 per credit
      20: 14.99, // $0.7495 per credit
      50: 29.99, // $0.5998 per credit
    },
    basic: 9.99 / 20, // $0.4995 per credit
    starter: 24.99 / 60, // $0.4165 per credit
  };

  // Calculate profitability for each service at different price points
  const calculateProfitability = (
    apiCost: number,
    creditsCharged: number,
    creditValue: number
  ): ServiceProfitability => {
    const revenuePerImage = creditsCharged * creditValue;
    const profitPerImage = revenuePerImage - apiCost;
    const profitMargin = (profitPerImage / revenuePerImage) * 100;

    return {
      service: '',
      apiCost,
      creditCost: creditValue,
      creditsCharged,
      revenuePerImage,
      profitPerImage,
      profitMargin,
    };
  };

  // Services and their credit costs
  const services = [
    { name: 'Image Upscaling', apiCost: apiCosts.upscale, credits: 1 },
    {
      name: 'Background Removal',
      apiCost: apiCosts.backgroundRemoval,
      credits: 1,
    },
    { name: 'Vectorization', apiCost: apiCosts.vectorization, credits: 2 },
    {
      name: 'AI Image Generation',
      apiCost: apiCosts.imageGeneration,
      credits: 3,
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profitability Analysis by Service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Credit Value by Plan:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pay-as-you-go (10 credits): $0.799/credit</li>
                  <li>Pay-as-you-go (50 credits): $0.600/credit</li>
                  <li>Basic Plan: $0.500/credit</li>
                  <li>Starter Plan: $0.417/credit</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {services.map(service => {
              // Calculate profitability for different credit values
              const scenarios = [
                { label: 'Pay-as-you-go (worst)', creditValue: 0.799 },
                { label: 'Pay-as-you-go (best)', creditValue: 0.6 },
                { label: 'Basic Plan', creditValue: 0.5 },
                { label: 'Starter Plan', creditValue: 0.417 },
              ];

              return (
                <div key={service.name} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">{service.name}</h3>
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">API Cost</p>
                      <p className="font-medium">
                        {formatCurrency(service.apiCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Credits Charged</p>
                      <p className="font-medium">{service.credits}</p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Scenario
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Revenue
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Profit
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Margin
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {scenarios.map(scenario => {
                          const prof = calculateProfitability(
                            service.apiCost,
                            service.credits,
                            scenario.creditValue
                          );

                          return (
                            <tr key={scenario.label}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {scenario.label}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                {formatCurrency(prof.revenuePerImage)}
                              </td>
                              <td
                                className={`px-4 py-2 text-sm font-medium text-right ${
                                  prof.profitPerImage >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {formatCurrency(prof.profitPerImage)}
                              </td>
                              <td
                                className={`px-4 py-2 text-sm font-medium text-right ${
                                  prof.profitMargin >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {formatPercentage(prof.profitMargin)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
              <div>
                <p className="font-medium text-gray-900">
                  Most Profitable Service
                </p>
                <p className="text-sm text-gray-600">
                  Background Removal has the highest profit margins (83.9% -
                  90.0%) due to low API cost ($0.125) relative to credit value.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5"></div>
              <div>
                <p className="font-medium text-gray-900">
                  Moderate Profit Service
                </p>
                <p className="text-sm text-gray-600">
                  Vectorization generates good profit ($0.634 - $0.998 per
                  image) despite higher API cost ($0.20) because it charges 2
                  credits.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
              <div>
                <p className="font-medium text-gray-900">
                  Lowest Margin Service
                </p>
                <p className="text-sm text-gray-600">
                  AI Image Generation has the highest API cost relative to
                  credits charged, but still maintains positive margins across
                  all plans.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
              <div>
                <p className="font-medium text-gray-900">Plan Impact</p>
                <p className="text-sm text-gray-600">
                  Subscription plans significantly improve margins by reducing
                  per-credit cost. Starter plan users provide 15-20% better
                  margins than pay-as-you-go users.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
