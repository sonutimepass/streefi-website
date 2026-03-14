/**
 * System Settings Utility Functions
 * Helper functions for WhatsApp system settings (for use in other APIs)
 */

import { whatsappRepository, type SystemSettings } from '@/lib/repositories';

/**
 * Get system settings
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  return whatsappRepository.getSystemSettings();
}
