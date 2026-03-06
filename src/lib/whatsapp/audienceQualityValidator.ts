/**
 * Audience Quality Validator
 * 
 * Pre-send filtering to prevent bad recipient lists from destroying sender reputation.
 * 
 * WHY THIS EXISTS:
 * - Circuit breakers react AFTER damage is done
 * - Bad audience = high block rate even with perfect sending
 * - Pre-validation prevents quality issues before first send
 * 
 * VALIDATION RULES:
 * 1. Duplicate rate < 5%
 * 2. Invalid phone format < 10%
 * 3. Minimum list size (prevent single-user tests in production)
 * 4. Maximum list size (enforce gradual ramp-up)
 * 
 * USAGE:
 * ```
 * const validation = validateAudienceQuality(recipients);
 * if (!validation.valid) {
 *   return { error: validation.errors };
 * }
 * ```
 */

export interface AudienceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalCount: number;
    uniqueCount: number;
    duplicateCount: number;
    invalidCount: number;
    duplicateRate: number;
    invalidRate: number;
  };
}

export interface AudienceQualityConfig {
  maxDuplicateRate: number;      // Default: 0.05 (5%)
  maxInvalidRate: number;         // Default: 0.10 (10%)
  minListSize: number;            // Default: 10
  maxListSize: number;            // Default: 1000 (enforce gradual ramp)
  allowEmergencyOverride: boolean; // Default: false
}

const DEFAULT_CONFIG: AudienceQualityConfig = {
  maxDuplicateRate: 0.02,  // 2% (production-grade threshold)
  maxInvalidRate: 0.03,     // 3% (production-grade threshold)
  minListSize: 10,
  maxListSize: 1000,
  allowEmergencyOverride: false
};

/**
 * Validate phone number format (international format)
 * Expected: 10-15 digits, no special characters
 */
function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\d{10,15}$/;
  return phoneRegex.test(phone);
}

/**
 * Find duplicates in recipient list
 */
function findDuplicates(recipients: string[]): {
  duplicates: Set<string>;
  uniqueRecipients: string[];
} {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const uniqueRecipients: string[] = [];

  for (const phone of recipients) {
    if (seen.has(phone)) {
      duplicates.add(phone);
    } else {
      seen.add(phone);
      uniqueRecipients.push(phone);
    }
  }

  return { duplicates, uniqueRecipients };
}

/**
 * Calculate audience quality statistics
 */
function calculateAudienceStats(recipients: string[]): AudienceValidationResult['stats'] {
  const totalCount = recipients.length;
  const { duplicates, uniqueRecipients } = findDuplicates(recipients);
  const uniqueCount = uniqueRecipients.length;
  const duplicateCount = duplicates.size;

  // Count invalid numbers
  const invalidCount = uniqueRecipients.filter(phone => !isValidPhoneNumber(phone)).length;

  const duplicateRate = totalCount > 0 ? duplicateCount / totalCount : 0;
  const invalidRate = uniqueCount > 0 ? invalidCount / uniqueCount : 0;

  return {
    totalCount,
    uniqueCount,
    duplicateCount,
    invalidCount,
    duplicateRate,
    invalidRate
  };
}

/**
 * Main audience quality validation function
 */
export function validateAudienceQuality(
  recipients: string[],
  config: Partial<AudienceQualityConfig> = {}
): AudienceValidationResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Calculate stats
  const stats = calculateAudienceStats(recipients);

  // Validation Rule 1: Minimum list size
  if (stats.totalCount < finalConfig.minListSize) {
    errors.push(
      `Recipient list too small: ${stats.totalCount} recipients (minimum: ${finalConfig.minListSize})`
    );
  }

  // Validation Rule 2: Maximum list size (gradual ramp enforcement)
  if (stats.totalCount > finalConfig.maxListSize) {
    warnings.push(
      `Large recipient list: ${stats.totalCount} recipients. Consider splitting into smaller batches for gradual ramp-up.`
    );
    
    // Hard stop if way over limit
    if (stats.totalCount > finalConfig.maxListSize * 2) {
      errors.push(
        `Recipient list exceeds maximum: ${stats.totalCount} recipients (maximum: ${finalConfig.maxListSize})`
      );
    }
  }

  // Validation Rule 3: Duplicate rate
  if (stats.duplicateRate > finalConfig.maxDuplicateRate) {
    errors.push(
      `High duplicate rate: ${(stats.duplicateRate * 100).toFixed(2)}% (${stats.duplicateCount} duplicates). Maximum allowed: ${(finalConfig.maxDuplicateRate * 100)}%`
    );
  } else if (stats.duplicateRate > finalConfig.maxDuplicateRate * 0.5) {
    warnings.push(
      `Moderate duplicate rate: ${(stats.duplicateRate * 100).toFixed(2)}% (${stats.duplicateCount} duplicates)`
    );
  }

  // Validation Rule 4: Invalid phone number rate
  if (stats.invalidRate > finalConfig.maxInvalidRate) {
    errors.push(
      `High invalid phone number rate: ${(stats.invalidRate * 100).toFixed(2)}% (${stats.invalidCount} invalid). Maximum allowed: ${(finalConfig.maxInvalidRate * 100)}%`
    );
  } else if (stats.invalidRate > finalConfig.maxInvalidRate * 0.5) {
    warnings.push(
      `Moderate invalid phone number rate: ${(stats.invalidRate * 100).toFixed(2)}% (${stats.invalidCount} invalid)`
    );
  }

  // Validation Rule 5: Empty list
  if (stats.totalCount === 0) {
    errors.push('Recipient list is empty');
  }

  // Warning: All recipients are duplicates
  if (stats.uniqueCount === 0 && stats.totalCount > 0) {
    errors.push('All recipients are duplicates of each other');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}

/**
 * Enforce gradual velocity ramp for new senders
 * 
 * Meta punishes new numbers that blast at high volume immediately.
 * Enforce conservative ramp-up schedule.
 */
export function enforceVelocityRamp(
  recipientCount: number,
  accountAge: number // days since WhatsApp Business API activated
): {
  allowed: boolean;
  maxAllowed: number;
  reason?: string;
} {
  // Velocity ramp schedule (Meta's implicit expectations)
  const rampSchedule: Record<number, number> = {
    1: 50,      // Day 1: 50 messages max
    2: 100,     // Day 2: 100 messages max
    3: 200,     // Day 3: 200 messages max
    5: 300,     // Day 5: 300 messages max
    7: 400,     // Day 7: 400 messages max
    14: 600,    // Day 14: 600 messages max
    30: 1000    // Day 30+: full limit
  };

  // Find applicable limit based on account age
  let maxAllowed = 1000; // Default for mature accounts (30+ days)
  
  for (const [day, limit] of Object.entries(rampSchedule)) {
    const dayNum = parseInt(day, 10);
    if (accountAge < dayNum) {
      maxAllowed = limit;
      break;
    }
  }

  if (recipientCount > maxAllowed) {
    return {
      allowed: false,
      maxAllowed,
      reason: `Account age: ${accountAge} days. Maximum allowed recipients: ${maxAllowed}. You attempted: ${recipientCount}. Gradually increase volume to maintain quality score.`
    };
  }

  return {
    allowed: true,
    maxAllowed
  };
}

/**
 * Clean recipient list (remove duplicates and invalid numbers)
 * Returns cleaned list and cleaning report
 */
export function cleanRecipientList(recipients: string[]): {
  cleaned: string[];
  removed: {
    duplicates: string[];
    invalid: string[];
  };
  report: string;
} {
  const { duplicates, uniqueRecipients } = findDuplicates(recipients);
  const validRecipients = uniqueRecipients.filter(phone => isValidPhoneNumber(phone));
  const invalidRecipients = uniqueRecipients.filter(phone => !isValidPhoneNumber(phone));

  const report = `
Cleaning Report:
- Original: ${recipients.length} recipients
- Duplicates removed: ${duplicates.size}
- Invalid numbers removed: ${invalidRecipients.length}
- Final clean list: ${validRecipients.length} recipients
`.trim();

  return {
    cleaned: validRecipients,
    removed: {
      duplicates: Array.from(duplicates),
      invalid: invalidRecipients
    },
    report
  };
}

/**
 * Get audience quality recommendation
 */
export function getAudienceQualityRecommendation(
  validation: AudienceValidationResult
): string {
  if (validation.valid && validation.warnings.length === 0) {
    return '✅ Audience quality is excellent. Safe to proceed.';
  }

  if (validation.valid && validation.warnings.length > 0) {
    return '⚠️ Audience quality is acceptable but has warnings. Review before proceeding.';
  }

  // Has errors
  const recommendations: string[] = [];

  if (validation.stats.duplicateRate > 0.05) {
    recommendations.push('Remove duplicate phone numbers from list');
  }

  if (validation.stats.invalidRate > 0.10) {
    recommendations.push('Remove invalid phone numbers (should be 10-15 digits, no spaces/dashes)');
  }

  if (validation.stats.totalCount < 10) {
    recommendations.push('Increase list size to at least 10 recipients for production campaigns');
  }

  if (validation.stats.totalCount > 1000) {
    recommendations.push('Split large lists into smaller batches for gradual ramp-up');
  }

  return `❌ Audience quality issues detected:\n${recommendations.map(r => `- ${r}`).join('\n')}`;
}
