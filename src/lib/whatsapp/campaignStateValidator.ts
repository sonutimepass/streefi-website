/**
 * Campaign State Validator
 * 
 * CRITICAL: Prevents illegal state transitions that break campaigns.
 * 
 * VALID STATES:
 * - DRAFT: Campaign being created/edited
 * - POPULATED: Recipients added, ready to start
 * - RUNNING: Actively sending messages
 * - PAUSED: Temporarily stopped (can resume)
 * - COMPLETED: All messages sent
 * - FAILED: Unrecoverable error
 * 
 * ALLOWED TRANSITIONS:
 * DRAFT → POPULATED → RUNNING ⇄ PAUSED → COMPLETED
 *                              ↘ FAILED
 * 
 * FORBIDDEN:
 * COMPLETED → RUNNING (can't restart finished campaigns)
 * RUNNING → DRAFT (can't edit active campaign)
 * FAILED → RUNNING (must fix then repopulate)
 */

export type CampaignStatus = 
  | 'DRAFT' 
  | 'POPULATED' 
  | 'RUNNING' 
  | 'PAUSED' 
  | 'COMPLETED' 
  | 'FAILED';

export interface StateTransitionResult {
  allowed: boolean;
  reason?: string;
}

const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['POPULATED'],
  POPULATED: ['RUNNING', 'DRAFT'], // Can go back to edit
  RUNNING: ['PAUSED', 'COMPLETED', 'FAILED'],
  PAUSED: ['RUNNING', 'COMPLETED', 'FAILED'],
  COMPLETED: [], // Terminal state
  FAILED: ['DRAFT'] // Can restart from scratch
};

export class CampaignStateValidator {
  /**
   * Validate state transition
   */
  validateTransition(
    currentStatus: CampaignStatus,
    newStatus: CampaignStatus
  ): StateTransitionResult {
    // Same state is always allowed
    if (currentStatus === newStatus) {
      return { allowed: true };
    }

    // Check if transition is in allowed list
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions.includes(newStatus)) {
      return {
        allowed: false,
        reason: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`
      };
    }

    return { allowed: true };
  }

  /**
   * Validate campaign can be started
   */
  canStart(status: CampaignStatus, recipientCount: number): StateTransitionResult {
    if (status !== 'POPULATED' && status !== 'PAUSED') {
      return {
        allowed: false,
        reason: `Campaign must be POPULATED or PAUSED to start (current: ${status})`
      };
    }

    if (recipientCount === 0) {
      return {
        allowed: false,
        reason: 'Campaign has no recipients'
      };
    }

    return { allowed: true };
  }

  /**
   * Validate campaign can be paused
   */
  canPause(status: CampaignStatus): StateTransitionResult {
    if (status !== 'RUNNING') {
      return {
        allowed: false,
        reason: `Only RUNNING campaigns can be paused (current: ${status})`
      };
    }

    return { allowed: true };
  }

  /**
   * Validate campaign can be completed
   */
  canComplete(
    status: CampaignStatus,
    sentCount: number,
    totalRecipients: number
  ): StateTransitionResult {
    if (status !== 'RUNNING' && status !== 'PAUSED') {
      return {
        allowed: false,
        reason: `Campaign must be RUNNING or PAUSED to complete (current: ${status})`
      };
    }

    if (sentCount < totalRecipients) {
      return {
        allowed: false,
        reason: `Not all messages sent (${sentCount}/${totalRecipients})`
      };
    }

    return { allowed: true };
  }

  /**
   * Validate campaign can be edited
   */
  canEdit(status: CampaignStatus): StateTransitionResult {
    if (status !== 'DRAFT' && status !== 'POPULATED') {
      return {
        allowed: false,
        reason: `Cannot edit campaign in ${status} state`
      };
    }

    return { allowed: true };
  }

  /**
   * Get allowed actions for current state
   */
  getAllowedActions(status: CampaignStatus): string[] {
    const actions: string[] = [];

    switch (status) {
      case 'DRAFT':
        actions.push('edit', 'populate', 'delete');
        break;
      case 'POPULATED':
        actions.push('start', 'edit', 'delete');
        break;
      case 'RUNNING':
        actions.push('pause', 'view-logs', 'view-analytics');
        break;
      case 'PAUSED':
        actions.push('resume', 'stop', 'view-logs');
        break;
      case 'COMPLETED':
        actions.push('view-logs', 'view-analytics', 'archive');
        break;
      case 'FAILED':
        actions.push('retry', 'delete', 'view-logs');
        break;
    }

    return actions;
  }
}

// Singleton instance
let validatorInstance: CampaignStateValidator | null = null;

export function getCampaignStateValidator(): CampaignStateValidator {
  if (!validatorInstance) {
    validatorInstance = new CampaignStateValidator();
  }
  return validatorInstance;
}
