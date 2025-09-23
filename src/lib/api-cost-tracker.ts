import { createServiceRoleClient } from '@/lib/supabase/server';

export type ApiProvider = 'deep_image' | 'clipping_magic' | 'vectorizer' | 'openai' | 'stripe';
export type ApiOperation = 'upscale' | 'background_removal' | 'vectorization' | 'image_generation' | 'payment_processing';

/**
 * Server-side API cost tracking
 * This should be called from API routes after making external API calls
 */
export class ApiCostTracker {
  // Actual API costs as of 2025
  private static readonly API_COSTS = {
    deep_image: {
      upscale: 0.08, // $0.08 per image
    },
    clipping_magic: {
      background_removal: 0.125, // $0.125 per image
    },
    vectorizer: {
      vectorization: 0.20, // $0.20 per image
    },
    openai: {
      image_generation: 0.04, // $0.04 per DALL-E 3 image (1024x1024 standard)
    },
    stripe: {
      payment_processing: 0.029, // 2.9% + $0.30 fixed (we'll calculate actual)
    },
  };

  // Credit package pricing for revenue calculation
  private static readonly CREDIT_PRICING = {
    payg_10: { credits: 10, price: 7.99 },
    payg_20: { credits: 20, price: 14.99 },
    payg_50: { credits: 50, price: 29.99 },
    basic: { credits: 20, price: 9.99 },
    starter: { credits: 60, price: 24.99 },
    professional: { credits: 60, price: 49.99 },
  };

  /**
   * Get cost from database or fall back to hardcoded values
   */
  private static async getDynamicCost(provider: ApiProvider, operation: ApiOperation): Promise<number> {
    try {
      const supabase = createServiceRoleClient();

      // Try to fetch from database
      const { data, error } = await supabase
        .from('api_cost_config')
        .select('cost_per_unit')
        .eq('provider', provider)
        .eq('operation', operation)
        .single();

      if (!error && data?.cost_per_unit !== undefined) {
        return data.cost_per_unit;
      }
    } catch (err) {
      console.warn(`[ApiCostTracker] Failed to fetch dynamic cost for ${provider}/${operation}, using fallback`);
    }

    // Fall back to hardcoded values
    const costs = this.API_COSTS[provider];
    if (costs && costs[operation as keyof typeof costs]) {
      return costs[operation as keyof typeof costs];
    }

    return 0;
  }

  /**
   * Log API usage and costs
   */
  static async logUsage(params: {
    userId: string;
    provider: ApiProvider;
    operation: ApiOperation;
    status: 'success' | 'failed' | 'refunded';
    creditsCharged: number;
    userPlan?: string;
    processingTimeMs?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    stripeAmount?: number; // For Stripe, pass the actual transaction amount in cents
  }): Promise<void> {
    try {
      const supabase = createServiceRoleClient();

      // Calculate API cost (dynamic or fallback)
      let apiCost = 0;
      if (params.provider === 'stripe' && params.stripeAmount) {
        // For Stripe, get the percentage from config and calculate
        const stripePercentage = await this.getDynamicCost('stripe', 'payment_processing');
        // Stripe: configured percentage + $0.30
        apiCost = (params.stripeAmount * stripePercentage / 100) + 0.30;
      } else {
        // Other APIs: get cost from database or fallback
        apiCost = await this.getDynamicCost(params.provider, params.operation);
      }
      
      // Calculate credit value (revenue)
      const creditValue = this.calculateCreditValue(
        params.creditsCharged,
        params.userPlan || 'free'
      );
      
      // Log to database
      const { error } = await supabase
        .from('api_usage_logs')
        .insert({
          user_id: params.userId,
          provider: params.provider,
          operation: params.operation,
          processing_status: params.status,
          api_cost: apiCost,
          credits_charged: params.creditsCharged,
          credit_value: creditValue,
          processing_time_ms: params.processingTimeMs,
          error_message: params.errorMessage,
          metadata: params.metadata || {},
        });
      
      if (error) {
        console.error('[ApiCostTracker] Failed to log usage:', error);
      } else {
        console.log(`[ApiCostTracker] Logged ${params.provider}/${params.operation}:`, {
          apiCost: `$${apiCost.toFixed(4)}`,
          creditValue: `$${creditValue.toFixed(4)}`,
          profit: `$${(creditValue - apiCost).toFixed(4)}`,
          margin: creditValue > 0 ? `${((creditValue - apiCost) / creditValue * 100).toFixed(1)}%` : 'N/A'
        });
      }
    } catch (error) {
      console.error('[ApiCostTracker] Error logging usage:', error);
    }
  }
  
  /**
   * Calculate the revenue value of credits based on user's plan
   */
  private static calculateCreditValue(credits: number, userPlan: string): number {
    if (credits === 0) return 0;
    
    let perCreditValue = 0;
    
    switch (userPlan) {
      case 'basic':
        // Basic plan: $9.99 for 20 credits
        perCreditValue = this.CREDIT_PRICING.basic.price / this.CREDIT_PRICING.basic.credits;
        break;
      case 'starter':
        // Starter plan: $24.99 for 60 credits
        perCreditValue = this.CREDIT_PRICING.starter.price / this.CREDIT_PRICING.starter.credits;
        break;
      case 'professional':
      case 'pro':
        // Professional plan: $49.99 for 60 credits
        perCreditValue = this.CREDIT_PRICING.professional.price / this.CREDIT_PRICING.professional.credits;
        break;
      default:
        // Free or pay-as-you-go: use best matching package
        if (credits >= 50) {
          perCreditValue = this.CREDIT_PRICING.payg_50.price / this.CREDIT_PRICING.payg_50.credits;
        } else if (credits >= 20) {
          perCreditValue = this.CREDIT_PRICING.payg_20.price / this.CREDIT_PRICING.payg_20.credits;
        } else {
          perCreditValue = this.CREDIT_PRICING.payg_10.price / this.CREDIT_PRICING.payg_10.credits;
        }
    }
    
    return credits * perCreditValue;
  }
  
  /**
   * Get cost analytics for admin dashboard
   */
  static async getCostAnalytics(days: number = 30) {
    try {
      const supabase = createServiceRoleClient();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get usage logs
      const { data: logs, error } = await supabase
        .from('api_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[ApiCostTracker] Error fetching analytics:', error);
        return null;
      }
      
      // Calculate totals by provider
      const byProvider: Record<string, {
        requests: number;
        successfulRequests: number;
        failedRequests: number;
        totalCost: number;
        totalRevenue: number;
        totalProfit: number;
        avgProcessingTime: number;
        operations: Record<string, {
          count: number;
          cost: number;
          revenue: number;
        }>;
      }> = {};
      let totalCost = 0;
      let totalRevenue = 0;
      let totalRequests = 0;
      
      logs?.forEach(log => {
        const provider = log.provider;
        if (!byProvider[provider]) {
          byProvider[provider] = {
            requests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalCost: 0,
            totalRevenue: 0,
            totalProfit: 0,
            avgProcessingTime: 0,
            operations: {}
          };
        }
        
        byProvider[provider].requests++;
        if (log.processing_status === 'success') {
          byProvider[provider].successfulRequests++;
        } else {
          byProvider[provider].failedRequests++;
        }
        
        byProvider[provider].totalCost += log.api_cost || 0;
        byProvider[provider].totalRevenue += log.credit_value || 0;
        byProvider[provider].totalProfit += (log.credit_value || 0) - (log.api_cost || 0);
        
        // Track by operation
        if (!byProvider[provider].operations[log.operation]) {
          byProvider[provider].operations[log.operation] = {
            count: 0,
            cost: 0,
            revenue: 0
          };
        }
        byProvider[provider].operations[log.operation].count++;
        byProvider[provider].operations[log.operation].cost += log.api_cost || 0;
        byProvider[provider].operations[log.operation].revenue += log.credit_value || 0;
        
        totalCost += log.api_cost || 0;
        totalRevenue += log.credit_value || 0;
        totalRequests++;
      });
      
      // Calculate profit margins
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      
      return {
        summary: {
          totalRequests,
          totalCost,
          totalRevenue,
          totalProfit,
          profitMargin,
          avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
          avgRevenuePerRequest: totalRequests > 0 ? totalRevenue / totalRequests : 0,
        },
        byProvider,
        recentLogs: logs?.slice(0, 100), // Last 100 logs
      };
    } catch (error) {
      console.error('[ApiCostTracker] Error getting analytics:', error);
      return null;
    }
  }
  
  /**
   * Get daily cost summaries for charts
   */
  static async getDailySummaries(days: number = 30) {
    try {
      const supabase = createServiceRoleClient();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('api_cost_summaries')
        .select('*')
        .gte('summary_date', startDate.toISOString().split('T')[0])
        .order('summary_date', { ascending: true });
      
      if (error) {
        console.error('[ApiCostTracker] Error fetching summaries:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('[ApiCostTracker] Error getting summaries:', error);
      return [];
    }
  }
}