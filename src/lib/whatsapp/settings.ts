/**
 * Whatsapp System Settings Utility
 * Helper functions for system settings (for use in other APIs)
 */

import { whatsappRepository, type SystemSettings } from '@/lib/repositories';

/**
 * Get current system settings
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  return whatsappRepository.getSystemSettings();
}
