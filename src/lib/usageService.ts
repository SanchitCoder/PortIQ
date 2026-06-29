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

export const FREE_PLAN_LIMITS: Record<FeatureType, number> = {
  portfolio_monitor: 3,
  stock_analyzer: 2,
  alphaedge_evaluator: 1,
};

const usageKey = (userId: string, featureType: FeatureType) =>
  `portiq_usage_${userId}_${featureType}`;

export class UsageService {
  static async hasPaidSubscription(userId: string): Promise<boolean> {
    const subscription = await PaymentService.getUserSubscription(userId);
    return subscription !== null && subscription.plan_id !== 'free';
  }

  static async getUsageCount(userId: string, featureType: FeatureType): Promise<number> {
    return parseInt(localStorage.getItem(usageKey(userId, featureType)) || '0', 10);
  }

  static async getFeatureUsage(userId: string, featureType: FeatureType): Promise<FeatureUsage | null> {
    const count = await this.getUsageCount(userId, featureType);
    return {
      id: `${userId}_${featureType}`,
      user_id: userId,
      feature_type: featureType,
      usage_count: count,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  static async getRemainingUses(userId: string, featureType: FeatureType): Promise<number> {
    const hasPaid = await this.hasPaidSubscription(userId);
    if (hasPaid) return Infinity;

    const limit = FREE_PLAN_LIMITS[featureType];
    const used = await this.getUsageCount(userId, featureType);
    return Math.max(0, limit - used);
  }

  static async canUseFeature(userId: string, featureType: FeatureType): Promise<boolean> {
    const hasPaid = await this.hasPaidSubscription(userId);
    if (hasPaid) return true;

    const remaining = await this.getRemainingUses(userId, featureType);
    return remaining > 0;
  }

  static async incrementUsage(userId: string, featureType: FeatureType): Promise<boolean> {
    const key = usageKey(userId, featureType);
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(current + 1));
    return true;
  }

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
