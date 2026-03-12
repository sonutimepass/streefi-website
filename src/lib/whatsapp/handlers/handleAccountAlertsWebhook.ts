/**
 * Account Alerts Webhook Handler
 * 
 * Handles critical account-level alerts from Meta:
 * - Account restrictions
 * - Policy violations
 * - Rate limit warnings
 * - Business verification issues
 * 
 * CRITICAL: These alerts may indicate service disruptions.
 */

import { whatsappRepository } from '@/lib/repositories/whatsappRepository';

interface AccountAlertWebhookValue {
  entity_type?: string;          // e.g., "WABA"
  entity_id?: number;             // WhatsApp Business Account ID
  alert_type: string;             // e.g., "OBA_APPROVED", "RATE_LIMIT"
  alert_severity: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alert_status?: string;          // e.g., "NONE", "ACTIVE", "RESOLVED"
  alert_description?: string;     // Alert message
  alert_id?: string;              // Unique alert identifier
}

/**
 * Handle account alerts webhook
 */
export async function handleAccountAlertsWebhook(value: AccountAlertWebhookValue): Promise<void> {
  try {
    console.log('🚨 Account alert webhook received');

    // Validate payload
    if (!value || typeof value !== 'object') {
      console.warn('⚠️ Invalid account alerts webhook payload');
      return;
    }

    const {
      entity_type,
      entity_id,
      alert_type,
      alert_severity,
      alert_status,
      alert_description,
      alert_id
    } = value;

    // Validate required fields
    if (!alert_type || !alert_severity) {
      console.warn('⚠️ Missing required fields in account alerts webhook');
      console.warn('   Payload keys:', Object.keys(value));
      return;
    }

    // Extract alert information
    const alertMessage = alert_description || 'No description provided';
    const severity = alert_severity;
    const type = alert_type;

    console.log(`🚨 Account Alert [${severity}]: ${type}`);
    if (entity_type) {
      console.log(`   Entity Type: ${entity_type}`);
    }
    if (entity_id) {
      console.log(`   Entity ID: ${entity_id}`);
    }
    if (alert_status) {
      console.log(`   Status: ${alert_status}`);
    }
    if (alert_id) {
      console.log(`   Alert ID: ${alert_id}`);
    }
    console.log(`   Description: ${alertMessage}`);

    // Handle alert severity levels
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      console.error(`🔴 ${severity} ALERT: ${type}`);
      console.error(`   IMMEDIATE ACTION REQUIRED: ${alertMessage}`);
    } else if (severity === 'MEDIUM') {
      console.warn(`🟡 MEDIUM ALERT: ${type}`);
      console.warn(`   Review and take corrective action if needed`);
    } else if (severity === 'LOW') {
      console.log(`🔵 LOW ALERT: ${type}`);
      console.log(`   ${alertMessage}`);
    } else if (severity === 'INFORMATIONAL') {
      console.log(`ℹ️ INFO: ${type}`);
      console.log(`   ${alertMessage}`);
    }

    // Store alert in database for dashboard monitoring
    await whatsappRepository.storeAccountAlert({
      alertType: type,
      severity: severity,
      title: type,
      description: alertMessage,
      event: alert_status || '',
      metadata: {
        entity_type,
        entity_id,
        alert_id,
        alert_status
      }
    });

    console.log('✅ Account alert stored in database');

  } catch (error) {
    console.error('❌ Error in handleAccountAlertsWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
