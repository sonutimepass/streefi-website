/**
 * WhatsApp Business Policy Guards
 * 
 * Exports all guards for WhatsApp business rules and limits.
 */

export {
  DailyLimitGuard,
  getDailyLimitGuard,
  type DailyLimitCheckResult,
  type ConversationRecord,
} from './dailyLimitGuard';

export {
  GlobalDailyLimitGuard,
  getGlobalDailyLimitGuard,
  createGlobalDailyLimitGuard,
  type GlobalDailyLimitCheckResult,
} from './globalDailyLimitGuard';

export {
  BlockRateCircuitBreaker,
  getBlockRateCircuitBreaker,
  createBlockRateCircuitBreaker,
  type BlockRateCheckResult,
} from './blockRateCircuitBreaker';
