/**
 * Template Rotation Utilities
 * 
 * Prevents template fatigue and reduces spam signals by rotating templates.
 * 
 * WHY THIS EXISTS:
 * - Meta's quality model flags repeated template usage as "broadcast spam"
 * - Template fatigue = engagement drops → blocks rise → quality score falls
 * - Real senders rotate templates to maintain engagement
 * 
 * HOW IT WORKS:
 * - Campaign can specify multiple templates: [template1, template2, template3]
 * - Optional weights: [40, 30, 30] (percentages or relative weights)
 * - Selection methods: random, weighted, round-robin
 * 
 * EXAMPLE:
 * ```
 * const templates = ['vendor_success_v1', 'vendor_success_v2', 'vendor_success_v3'];
 * const weights = [50, 30, 20]; // 50% v1, 30% v2, 20% v3
 * const selected = selectTemplate(templates, weights);
 * ```
 */

export type TemplateSelectionStrategy = 'random' | 'weighted' | 'round-robin';

export interface TemplateRotationConfig {
  templates: string[];
  weights?: number[];
  strategy?: TemplateSelectionStrategy;
}

/**
 * Select a template randomly (uniform distribution)
 */
function selectRandomTemplate(templates: string[]): string {
  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

/**
 * Select a template based on weights (weighted random)
 * Weights are relative (don't need to sum to 100)
 */
function selectWeightedTemplate(templates: string[], weights: number[]): string {
  // Validate weights array matches templates array
  if (weights.length !== templates.length) {
    console.warn('[TemplateRotation] Weights array length mismatch, falling back to random');
    return selectRandomTemplate(templates);
  }

  // Calculate total weight
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  if (totalWeight === 0) {
    console.warn('[TemplateRotation] Total weight is 0, falling back to random');
    return selectRandomTemplate(templates);
  }

  // Generate random number between 0 and totalWeight
  let random = Math.random() * totalWeight;

  // Find the template based on weighted probability
  for (let i = 0; i < templates.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return templates[i];
    }
  }

  // Fallback (should never reach here)
  return templates[templates.length - 1];
}

/**
 * Select template using round-robin
 * Requires maintaining state (index), so less ideal for stateless execution
 */
function selectRoundRobinTemplate(
  templates: string[],
  currentIndex: number
): { template: string; nextIndex: number } {
  const index = currentIndex % templates.length;
  const nextIndex = index + 1;
  return {
    template: templates[index],
    nextIndex
  };
}

/**
 * Main template selection function
 * 
 * @param config - Template rotation configuration
 * @param currentIndex - Optional, for round-robin strategy
 * @returns Selected template name
 */
export function selectTemplate(
  config: TemplateRotationConfig,
  currentIndex?: number
): string | { template: string; nextIndex: number } {
  const { templates, weights, strategy = 'weighted' } = config;

  // Validate templates array
  if (!templates || templates.length === 0) {
    throw new Error('[TemplateRotation] Templates array is empty');
  }

  // Single template = no rotation needed
  if (templates.length === 1) {
    return templates[0];
  }

  switch (strategy) {
    case 'random':
      return selectRandomTemplate(templates);

    case 'weighted':
      if (weights && weights.length === templates.length) {
        return selectWeightedTemplate(templates, weights);
      } else {
        // No weights or invalid weights = fallback to random
        console.warn('[TemplateRotation] No valid weights provided, using random selection');
        return selectRandomTemplate(templates);
      }

    case 'round-robin':
      if (currentIndex === undefined) {
        console.warn('[TemplateRotation] Round-robin requires currentIndex, defaulting to 0');
        return selectRoundRobinTemplate(templates, 0);
      }
      return selectRoundRobinTemplate(templates, currentIndex);

    default:
      console.warn('[TemplateRotation] Unknown strategy, falling back to random');
      return selectRandomTemplate(templates);
  }
}

/**
 * Parse template configuration from campaign metadata
 * Supports both single template (legacy) and multiple templates (new)
 */
export function parseTemplateConfig(campaign: {
  templateName?: string;
  templates?: string[];
  templateWeights?: number[];
  templateStrategy?: TemplateSelectionStrategy;
}): TemplateRotationConfig {
  // New format: templates array
  if (campaign.templates && campaign.templates.length > 0) {
    return {
      templates: campaign.templates,
      weights: campaign.templateWeights,
      strategy: campaign.templateStrategy || 'weighted'
    };
  }

  // Legacy format: single templateName
  if (campaign.templateName) {
    return {
      templates: [campaign.templateName],
      strategy: 'random' // Doesn't matter, only 1 template
    };
  }

  throw new Error('[TemplateRotation] No templates configured for campaign');
}

/**
 * Calculate actual distribution from weights (for UI display)
 */
export function calculateDistribution(weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  if (totalWeight === 0) {
    // Equal distribution if all weights are 0
    const equalWeight = 100 / weights.length;
    return weights.map(() => equalWeight);
  }

  return weights.map(weight => (weight / totalWeight) * 100);
}

/**
 * Validate template rotation config
 */
export function validateTemplateConfig(config: TemplateRotationConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.templates || config.templates.length === 0) {
    errors.push('Templates array is empty');
  }

  if (config.templates.some(t => !t || t.trim() === '')) {
    errors.push('Templates array contains empty values');
  }

  if (config.weights) {
    if (config.weights.length !== config.templates.length) {
      errors.push(`Weights array (${config.weights.length}) does not match templates array (${config.templates.length})`);
    }

    if (config.weights.some(w => w < 0)) {
      errors.push('Weights must be non-negative');
    }

    if (config.weights.every(w => w === 0)) {
      errors.push('All weights are 0');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
