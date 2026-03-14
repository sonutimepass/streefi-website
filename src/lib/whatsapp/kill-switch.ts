/**
 * Kill Switch Utility
 * Helper function to check kill switch status (for use in other APIs)
 */

import { whatsappRepository } from '@/lib/repositories';

/**
 * Check if kill switch is enabled (sending is DISABLED)
 * Returns true if sending is DISABLED
 */
export async function isKillSwitchEnabled(): Promise<{ enabled: boolean; reason?: string }> {
  const status = await whatsappRepository.getKillSwitchStatus();
  return {
    enabled: status.enabled,
    reason: status.reason
  };
}
