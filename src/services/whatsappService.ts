/**
 * WhatsApp Service
 * 
 * Business logic for WhatsApp platform operations.
 * Uses WhatsAppRepository.
 * 
 * Responsibilities:
 * - Template synchronization with Meta API
 * - Platform settings management (kill switch, limits)
 * - Account warmup management
 * - Sending messages (integration with Meta WhatsApp Cloud API)
 * 
 * NOTE: This is a skeleton - implement business logic gradually
 */

import { whatsappRepository } from "../lib/repositories";
import type {
  WhatsAppTemplate,
  PlatformSettings,
  TemplateStatus,
  TemplateCategory
} from "../lib/repositories/whatsappRepository";
import type {
  AccountWarmup,
  KillSwitch
} from "../types/domain";

export class WhatsAppService {
  // ==================== TEMPLATE OPERATIONS ====================

  /**
   * Get template by name
   */
  async getTemplate(templateName: string): Promise<WhatsAppTemplate | null> {
    try {
      // Note: repository.getTemplate uses templateId, use getTemplateByName for name lookup
      const template = await whatsappRepository.getTemplateByName(templateName);
      return template; // Return as-is from repository
    } catch (error) {
      console.error("[WhatsAppService] Get template error:", error);
      throw new Error(`Failed to get template: ${templateName}`);
    }
  }

  /**
   * List all templates
   */
  async listTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      const templates = await whatsappRepository.listTemplates();
      return templates; // Return as-is from repository
    } catch (error) {
      console.error("[WhatsAppService] List templates error:", error);
      throw new Error("Failed to list templates");
    }
  }

  /**
   * Sync templates from Meta API
   * 
   * TODO: Implement Meta API integration
   * - Fetch templates from Meta Business API
   * - Compare with local database
   * - Update status for approved/rejected templates
   */
  async syncTemplatesFromMeta(): Promise<{ synced: number; updated: number }> {
    console.log("[WhatsAppService] Template sync not yet implemented");
    return { synced: 0, updated: 0 };
  }

  /**
   * Save template (create or update)
   */
  async saveTemplate(template: WhatsAppTemplate): Promise<void> {
    try {
      await whatsappRepository.saveTemplate(template);
      console.log(`[WhatsAppService] Template saved: ${template.name}`);
    } catch (error) {
      console.error("[WhatsAppService] Save template error:", error);
      throw new Error(`Failed to save template: ${template.name}`);
    }
  }

  // ==================== PLATFORM SETTINGS ====================

  /**
   * Get platform settings
   */
  async getSettings(): Promise<PlatformSettings> {
    try {
      const settings = await whatsappRepository.getSettings();
      
      if (!settings) {
        // Return defaults if no settings exist
        return {
          kill_switch_enabled: false,
          daily_limit: 1000,
          rate_limit: 80,
          warmup_enabled: false,
          updated_at: Date.now()
        };
      }

      return settings;
    } catch (error) {
      console.error("[WhatsAppService] Get settings error:", error);
      throw new Error("Failed to get platform settings");
    }
  }

  /**
   * Update platform settings
   */
  async updateSettings(settings: Partial<PlatformSettings>): Promise<void> {
    try {
      await whatsappRepository.updateSettings(settings);
      
      console.log("[WhatsAppService] Settings updated");
    } catch (error) {
      console.error("[WhatsAppService] Update settings error:", error);
      throw new Error("Failed to update platform settings");
    }
  }

  /**
   * Get kill switch status
   */
  async getKillSwitch(): Promise<KillSwitch> {
    try {
      const settings = await this.getSettings();
      return {
        enabled: settings.kill_switch_enabled
      };
    } catch (error) {
      console.error("[WhatsAppService] Get kill switch error:", error);
      throw new Error("Failed to get kill switch status");
    }
  }

  /**
   * Toggle kill switch
   */
  async toggleKillSwitch(enabled: boolean, reason?: string): Promise<void> {
    try {
      await this.updateSettings({ kill_switch_enabled: enabled });
      console.log(`[WhatsAppService] Kill switch ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("[WhatsAppService] Toggle kill switch error:", error);
      throw new Error("Failed to toggle kill switch");
    }
  }

  // ==================== ACCOUNT WARMUP ====================

  /**
   * Get account warmup state
   */
  async getWarmupState(accountId: string): Promise<AccountWarmup | null> {
    try {
      const state = await whatsappRepository.getWarmupState(accountId);
      
      if (!state) {
        return null;
      }

      return {
        accountId: state.account_id,
        phase: state.phase as any,
        dailyLimit: state.daily_limit,
        messagesToday: state.messages_today,
        lastUpdated: new Date(state.last_updated)
      };
    } catch (error) {
      console.error("[WhatsAppService] Get warmup state error:", error);
      throw new Error(`Failed to get warmup state: ${accountId}`);
    }
  }

  /**
   * Update warmup state
   * 
   * TODO: Implement warmup progression logic:
   * - Track messages sent per day
   * - Automatically progress to next phase
   * - Enforce daily limits based on phase
   */
  async updateWarmupState(accountId: string, messagesToday: number): Promise<void> {
    try {
      const state = await whatsappRepository.getWarmupState(accountId);
      
      if (!state) {
        console.log("[WhatsAppService] No warmup state found, skipping update");
        return;
      }

      await whatsappRepository.saveWarmupState({
        account_id: accountId,
        phase: state.phase,
        daily_limit: state.daily_limit,
        messages_today: messagesToday,
        last_updated: Date.now()
      });

      console.log(`[WhatsAppService] Warmup state updated: ${accountId}`);
    } catch (error) {
      console.error("[WhatsAppService] Update warmup state error:", error);
      throw new Error(`Failed to update warmup state: ${accountId}`);
    }
  }

  // ==================== MESSAGE SENDING ====================

  /**
   * Send template message
   * 
   * TODO: Implement Meta WhatsApp Cloud API integration
   * - Build message payload
   * - Send to WhatsApp API
   * - Handle response and errors
   * - Return message ID and WAMID
   */
  async sendTemplateMessage(params: {
    to: string;
    templateName: string;
    templateParams?: Record<string, string>;
  }): Promise<{ messageId: string; wamid: string }> {
    console.log("[WhatsAppService] Send message not yet implemented");
    throw new Error("Message sending not implemented");
  }

  /**
   * Check if sending is allowed
   * 
   * TODO: Implement checks:
   * - Kill switch enabled?
   * - Daily limit reached?
   * - Rate limit exceeded?
   * - Account in warmup phase?
   */
  async canSendMessage(): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const settings = await this.getSettings();
      
      if (settings.kill_switch_enabled) {
        return { allowed: false, reason: "Kill switch is enabled" };
      }

      // TODO: Check daily limit, rate limit, warmup state
      
      return { allowed: true };
    } catch (error) {
      console.error("[WhatsAppService] Can send check error:", error);
      return { allowed: false, reason: "System error" };
    }
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();
