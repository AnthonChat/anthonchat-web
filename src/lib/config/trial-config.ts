import { SubscriptionPlan } from '@/lib/queries/plans';

/**
 * Trial configuration interface
 */
export interface TrialConfig {
  enabled: boolean;
  defaultTrialDays: number;
  eligibilityRules: {
    checkProductMetadata: boolean;
    checkPriceMetadata: boolean;
    fallbackToLowestPrice: boolean;
  };
}

/**
 * Get trial configuration from environment variables
 */
export function getTrialConfig(): TrialConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_TRIALS_ENABLED !== 'false',
    defaultTrialDays: parseInt(process.env.NEXT_PUBLIC_DEFAULT_TRIAL_DAYS || '14', 10),
    eligibilityRules: {
      checkProductMetadata: process.env.NEXT_PUBLIC_TRIAL_CHECK_PRODUCT_METADATA !== 'false',
      checkPriceMetadata: process.env.NEXT_PUBLIC_TRIAL_CHECK_PRICE_METADATA !== 'false',
      fallbackToLowestPrice: process.env.NEXT_PUBLIC_TRIAL_FALLBACK_LOWEST_PRICE === 'true',
    },
  };
}

/**
 * Check if a plan is eligible for a trial based on configuration
 */
export function isPlanEligibleForTrial(plan: SubscriptionPlan): boolean {
  const config = getTrialConfig();
  
  if (!config.enabled) {
    return false;
  }

  // Check product metadata first
  if (config.eligibilityRules.checkProductMetadata && plan.metadata) {
    const trialEligible = plan.metadata.trial_eligible;
    if (typeof trialEligible === 'boolean') {
      return trialEligible;
    }
    if (typeof trialEligible === 'string') {
      return trialEligible.toLowerCase() === 'true';
    }
  }

  // Check price metadata for any price in the plan
  if (config.eligibilityRules.checkPriceMetadata) {
    for (const price of plan.prices) {
      if (price.metadata) {
        const trialEligible = price.metadata.trial_eligible;
        if (typeof trialEligible === 'boolean') {
          return trialEligible;
        }
        if (typeof trialEligible === 'string') {
          return trialEligible.toLowerCase() === 'true';
        }
      }
    }
  }

  // Fallback to lowest price if enabled
  if (config.eligibilityRules.fallbackToLowestPrice) {
    // This would require comparing with other plans, which we don't have access to here
    // This logic should be handled at a higher level where all plans are available
    return false;
  }

  // Default to no trial if no configuration is found
  return false;
}

/**
 * Get trial days for a plan based on configuration
 */
export function getTrialDaysForPlan(plan: SubscriptionPlan): number {
  const config = getTrialConfig();

  // Check product metadata first
  if (plan.metadata) {
    const trialDays = plan.metadata.trial_days;
    if (typeof trialDays === 'number' && trialDays > 0) {
      return trialDays;
    }
    if (typeof trialDays === 'string') {
      const parsed = parseInt(trialDays, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  // Check price metadata
  for (const price of plan.prices) {
    if (price.metadata) {
      const trialDays = price.metadata.trial_days;
      if (typeof trialDays === 'number' && trialDays > 0) {
        return trialDays;
      }
      if (typeof trialDays === 'string') {
        const parsed = parseInt(trialDays, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
  }

  // Fall back to default from environment
  return config.defaultTrialDays;
}

/**
 * Determine trial eligibility across all plans (for fallback to lowest price)
 */
export function determineTrialEligibilityAcrossPlans(plans: SubscriptionPlan[]): Map<string, boolean> {
  const config = getTrialConfig();
  const eligibilityMap = new Map<string, boolean>();

  // First pass: check explicit metadata configuration
  for (const plan of plans) {
    const isEligible = isPlanEligibleForTrial(plan);
    eligibilityMap.set(plan.id, isEligible);
  }

  // If fallback to lowest price is enabled and no plans are explicitly eligible
  if (config.eligibilityRules.fallbackToLowestPrice) {
    const hasExplicitEligible = Array.from(eligibilityMap.values()).some(eligible => eligible);
    
    if (!hasExplicitEligible) {
      // Find the plan with the lowest monthly price
      let lowestPrice = Infinity;
      let lowestPricePlanId: string | null = null;

      for (const plan of plans) {
        const monthlyPrice = plan.prices.find(p => p.recurring?.interval === 'month');
        if (monthlyPrice && monthlyPrice.unit_amount && monthlyPrice.unit_amount < lowestPrice) {
          lowestPrice = monthlyPrice.unit_amount;
          lowestPricePlanId = plan.id;
        }
      }

      if (lowestPricePlanId) {
        eligibilityMap.set(lowestPricePlanId, true);
      }
    }
  }

  return eligibilityMap;
}