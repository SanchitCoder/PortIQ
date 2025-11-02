import { supabase } from './supabase';
import { PaymentService } from './paymentService';

export type FeatureType = 'portfolio_monitor' | 'stock_analyzer' | 'alphaedge_evaluator';

export interface FeatureUsage {
  id: string;
  user_id: string;
  feature_type: FeatureType;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// Usage limits for free plan
export const FREE_PLAN_LIMITS: Record<FeatureType, number> = {
  portfolio_monitor: 3,
  stock_analyzer: 2,
  alphaedge_evaluator: 1,
};

export class UsageService {
  /**
   * Check if user has a paid subscription
   */
  static async hasPaidSubscription(userId: string): Promise<boolean> {
    const subscription = await PaymentService.getUserSubscription(userId);
    if (!subscription) {
      return false;
    }
    return subscription.plan_id !== 'free';
  }

  /**
   * Get current usage for a feature
   */
  static async getFeatureUsage(
    userId: string,
    featureType: FeatureType
  ): Promise<FeatureUsage | null> {
    try {
      const { data, error } = await supabase
        .from('feature_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('feature_type', featureType)
        .maybeSingle();

      if (error) {
        console.error('Error fetching feature usage:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching feature usage:', error);
      return null;
    }
  }

  /**
   * Get usage count for a feature
   */
  static async getUsageCount(userId: string, featureType: FeatureType): Promise<number> {
    try {
      // Direct query to avoid any potential caching issues
      const { data, error } = await supabase
        .from('feature_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('feature_type', featureType)
        .maybeSingle();

      if (error) {
        console.error('Error fetching usage count:', error);
        return 0;
      }

      const count = data?.usage_count || 0;
      console.log(`getUsageCount for ${userId}, ${featureType}: ${count}`);
      return count;
    } catch (error) {
      console.error('Error in getUsageCount:', error);
      return 0;
    }
  }

  /**
   * Get remaining uses for a feature
   */
  static async getRemainingUses(userId: string, featureType: FeatureType): Promise<number> {
    const hasPaid = await this.hasPaidSubscription(userId);
    
    // Paid users have unlimited usage
    if (hasPaid) {
      console.log(`getRemainingUses: User ${userId} has paid subscription, returning Infinity`);
      return Infinity;
    }

    const limit = FREE_PLAN_LIMITS[featureType];
    const currentUsage = await this.getUsageCount(userId, featureType);
    const remaining = Math.max(0, limit - currentUsage);
    console.log(`getRemainingUses for ${userId}, ${featureType}: limit=${limit}, used=${currentUsage}, remaining=${remaining}`);
    return remaining;
  }

  /**
   * Check if user can use a feature
   */
  static async canUseFeature(userId: string, featureType: FeatureType): Promise<boolean> {
    const hasPaid = await this.hasPaidSubscription(userId);
    
    // Paid users have unlimited access
    if (hasPaid) {
      return true;
    }

    const remaining = await this.getRemainingUses(userId, featureType);
    return remaining > 0;
  }

  /**
   * Increment feature usage (lifetime tracking - never resets)
   * Note: This function assumes usage permission has already been checked.
   * It should only be called after n8n successfully delivers output.
   */
  static async incrementUsage(userId: string, featureType: FeatureType): Promise<boolean> {
    try {
      // Get or create usage record
      const { data: existingUsage } = await supabase
        .from('feature_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('feature_type', featureType)
        .maybeSingle();

      if (existingUsage) {
        // Update existing usage
        const { error } = await supabase
          .from('feature_usage')
          .update({
            usage_count: existingUsage.usage_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUsage.id);

        if (error) {
          console.error('Error updating feature usage:', error);
          return false;
        }
        console.log(`✓ Usage incremented for ${userId}, ${featureType}: ${existingUsage.usage_count + 1}`);
      } else {
        // Create new usage record
        const { data, error } = await supabase.from('feature_usage').insert({
          user_id: userId,
          feature_type: featureType,
          usage_count: 1,
        }).select();

        if (error) {
          console.error('❌ Error creating feature usage:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          
          // Check if it's a 404/table doesn't exist error
          if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('404')) {
            console.error('');
            console.error('⚠️ IMPORTANT: The feature_usage table does not exist in your Supabase database!');
            console.error('');
            console.error('To fix this, run the migration:');
            console.error('1. Go to Supabase Dashboard → SQL Editor');
            console.error('2. Copy and run: supabase/migrations/20251103000001_create_feature_usage_table.sql');
            console.error('3. Or see MIGRATION_SETUP.md for detailed instructions');
            console.error('');
          }
          return false;
        }
        console.log(`✓ New usage record created for ${userId}, ${featureType}: 1`, data);
      }

      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  }

  /**
   * Get usage stats for all features
   */
  static async getAllUsageStats(userId: string): Promise<{
    portfolio_monitor: { used: number; limit: number; remaining: number };
    stock_analyzer: { used: number; limit: number; remaining: number };
    alphaedge_evaluator: { used: number; limit: number; remaining: number };
  }> {
    const hasPaid = await this.hasPaidSubscription(userId);
    
    const portfolioUsage = await this.getUsageCount(userId, 'portfolio_monitor');
    const stockUsage = await this.getUsageCount(userId, 'stock_analyzer');
    const evaluatorUsage = await this.getUsageCount(userId, 'alphaedge_evaluator');

    if (hasPaid) {
      return {
        portfolio_monitor: { used: portfolioUsage, limit: Infinity, remaining: Infinity },
        stock_analyzer: { used: stockUsage, limit: Infinity, remaining: Infinity },
        alphaedge_evaluator: { used: evaluatorUsage, limit: Infinity, remaining: Infinity },
      };
    }

    return {
      portfolio_monitor: {
        used: portfolioUsage,
        limit: FREE_PLAN_LIMITS.portfolio_monitor,
        remaining: Math.max(0, FREE_PLAN_LIMITS.portfolio_monitor - portfolioUsage),
      },
      stock_analyzer: {
        used: stockUsage,
        limit: FREE_PLAN_LIMITS.stock_analyzer,
        remaining: Math.max(0, FREE_PLAN_LIMITS.stock_analyzer - stockUsage),
      },
      alphaedge_evaluator: {
        used: evaluatorUsage,
        limit: FREE_PLAN_LIMITS.alphaedge_evaluator,
        remaining: Math.max(0, FREE_PLAN_LIMITS.alphaedge_evaluator - evaluatorUsage),
      },
    };
  }
}

