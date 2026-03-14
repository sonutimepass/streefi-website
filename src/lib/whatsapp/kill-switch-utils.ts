/**
 * Kill Switch Utility Functions
 * Helper functions for checking kill switch status (for use in other APIs)
 */

import { whatsappRepository } from '@/lib/repositories';

/**
 * Check if kill switch is enabled
 * Returns true if sending is DISABLED
 */
export async function isKillSwitchEnabled(): Promise<{ enabled: boolean; reason?: string }> {
  const status = await whatsappRepository.getKillSwitchStatus();
  return {
    enabled: status.enabled,
    reason: status.reason
  };
}
