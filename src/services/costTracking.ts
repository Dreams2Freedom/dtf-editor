import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

export type ApiProvider =
  | 'deep_image'
  | 'clipping_magic'
  | 'vectorizer'
  | 'openai'
  | 'stripe';
export type ApiOperation =
  | 'upscale'
  | 'background_removal'
  | 'vectorization'
  | 'image_generation'
  | 'payment_processing';

interface ApiCostConfig {
  provider: ApiProvider;
  operation: ApiOperation;
  costPerUnit: number;
  unitDescription: string;
}

interface ApiUsageLog {
  userId: string;
  uploadId?: string;
  provider: ApiProvider;
  operation: ApiOperation;
  processingStatus: 'success' | 'failed' | 'refunded';
  apiCost: number;
  creditsCharged: number;
  creditValue: number;
  processingTimeMs?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class CostTrackingService {
  private supabase;

  constructor() {
    // Use client-side Supabase client for browser usage
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }

  /**
   * Get current API costs from configuration
   */
  async getCurrentApiCosts(): Promise<ApiCostConfig[]> {
    const { data, error } = await this.supabase.rpc('get_current_api_costs');

    if (error) {
      console.error('Error fetching API costs:', error);
      return this.getDefaultCosts();
    }

    return data || this.getDefaultCosts();
  }

  /**
   * Get default costs (fallback if DB is not configured)
   * These are the actual API costs as of 2025
   */
  private getDefaultCosts(): ApiCostConfig[] {
    return [
      {
        provider: 'deep_image',
        operation: 'upscale',
        costPerUnit: 0.08, // Actual Deep-Image.ai cost
        unitDescription: 'per image',
      },
      {
        provider: 'clipping_magic',
        operation: 'background_removal',
        costPerUnit: 0.125, // Actual ClippingMagic cost
        unitDescription: 'per image',
      },
      {
        provider: 'vectorizer',
        operation: 'vectorization',
        costPerUnit: 0.2, // Actual Vectorizer.ai cost
        unitDescription: 'per image',
      },
      {
        provider: 'openai',
        operation: 'image_generation',
        costPerUnit: 0.04, // DALL-E 3 Standard Quality 1024x1024
        unitDescription: 'per image (1024x1024 standard)',
      },
      {
        provider: 'stripe',
        operation: 'payment_processing',
        costPerUnit: 0.029, // 2.9% + $0.30 fixed fee
        unitDescription: 'per transaction',
      },
    ];
  }

  /**
   * Calculate credit value based on user's plan
   */
  private calculateCreditValue(credits: number, userPlan: string): number {
    // Credit values based on pay-as-you-go pricing
    const creditPackages = {
      10: 7.99,
      20: 14.99,
      50: 29.99,
    };

    // Calculate per-credit value
    let perCreditValue = 0.799; // Default: $7.99 / 10 credits

    if (userPlan === 'basic') {
      // Basic plan: $9.99 for 20 credits
      perCreditValue = 9.99 / 20;
    } else if (userPlan === 'starter') {
      // Starter plan: $24.99 for 60 credits
      perCreditValue = 24.99 / 60;
    } else {
      // Pay-as-you-go: best matching package
      if (credits >= 50) {
        perCreditValue = creditPackages[50] / 50;
      } else if (credits >= 20) {
        perCreditValue = creditPackages[20] / 20;
      } else {
        perCreditValue = creditPackages[10] / 10;
      }
    }

    return credits * perCreditValue;
  }

  /**
   * Log API usage for cost tracking
   */
  async logApiUsage(
    userId: string,
    provider: ApiProvider,
    operation: ApiOperation,
    status: 'success' | 'failed' | 'refunded',
    creditsCharged: number,
    userPlan: string,
    options?: {
      uploadId?: string;
      processingTimeMs?: number;
      errorMessage?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      // Get current API cost
      const costs = await this.getCurrentApiCosts();
      const costConfig = costs.find(
        c => c.provider === provider && c.operation === operation
      );
      const apiCost = costConfig?.costPerUnit || 0;

      // Calculate credit value
      const creditValue = this.calculateCreditValue(creditsCharged, userPlan);

      const logEntry: ApiUsageLog = {
        userId,
        uploadId: options?.uploadId,
        provider,
        operation,
        processingStatus: status,
        apiCost,
        creditsCharged,
        creditValue,
        processingTimeMs: options?.processingTimeMs,
        errorMessage: options?.errorMessage,
        metadata: options?.metadata,
      };

      const { error } = await this.supabase
        .from('api_usage_logs')
        .insert(logEntry);

      if (error) {
        console.error('Error logging API usage:', error);
      }
    } catch (error) {
      console.error('Error in logApiUsage:', error);
    }
  }

  /**
   * Get profitability report for date range
   */
  async getProfitabilityReport(startDate: Date, endDate: Date) {
    const { data, error } = await this.supabase.rpc('calculate_profitability', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
    });

    if (error) {
      console.error('Error fetching profitability report:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get API usage summary for admin dashboard
   */
  async getApiUsageSummary(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('api_cost_summaries')
      .select('*')
      .gte('summary_date', startDate.toISOString().split('T')[0])
      .order('summary_date', { ascending: false });

    if (error) {
      console.error('Error fetching API usage summary:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get cost breakdown by provider
   */
  async getCostBreakdownByProvider(days: number = 30) {
    const summaries = await this.getApiUsageSummary(days);

    const breakdown = summaries.reduce(
      (acc, summary) => {
        const provider = summary.provider;
        if (!acc[provider]) {
          acc[provider] = {
            totalCost: 0,
            totalRevenue: 0,
            totalRequests: 0,
            grossProfit: 0,
          };
        }

        acc[provider].totalCost += parseFloat(summary.total_api_cost);
        acc[provider].totalRevenue += parseFloat(summary.total_revenue);
        acc[provider].totalRequests += summary.total_requests;
        acc[provider].grossProfit += parseFloat(summary.gross_profit);

        return acc;
      },
      {} as Record<string, any>
    );

    return breakdown;
  }

  /**
   * Update API cost configuration (admin only)
   */
  async updateApiCost(
    provider: ApiProvider,
    operation: ApiOperation,
    newCostPerUnit: number,
    notes?: string
  ): Promise<boolean> {
    try {
      // End the current cost config
      const { error: updateError } = await this.supabase
        .from('api_cost_config')
        .update({ end_date: new Date().toISOString() })
        .eq('provider', provider)
        .eq('operation', operation)
        .is('end_date', null);

      if (updateError) {
        console.error('Error updating old cost config:', updateError);
        return false;
      }

      // Insert new cost config
      const { error: insertError } = await this.supabase
        .from('api_cost_config')
        .insert({
          provider,
          operation,
          cost_per_unit: newCostPerUnit,
          unit_description: 'per image',
          notes,
        });

      if (insertError) {
        console.error('Error inserting new cost config:', insertError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating API cost:', error);
      return false;
    }
  }
}
