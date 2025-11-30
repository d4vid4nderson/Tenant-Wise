// Export all document prompts and their data types

export {
  generateLateRentNoticePrompt,
  type LateRentNoticeData,
} from './late-rent-notice';

export {
  generateLeaseRenewalPrompt,
  type LeaseRenewalData,
} from './lease-renewal';

export {
  generateMaintenanceResponsePrompt,
  type MaintenanceResponseData,
} from './maintenance';

export {
  generateMoveInOutChecklistPrompt,
  type MoveInOutChecklistData,
  type RoomCondition,
  type ConditionRating,
} from './move-in-out';

export {
  generateSecurityDepositReturnPrompt,
  type SecurityDepositReturnData,
} from './deposit-return';

// Document type to prompt function mapping
import { generateLateRentNoticePrompt } from './late-rent-notice';
import { generateLeaseRenewalPrompt } from './lease-renewal';
import { generateMaintenanceResponsePrompt } from './maintenance';
import { generateMoveInOutChecklistPrompt } from './move-in-out';
import { generateSecurityDepositReturnPrompt } from './deposit-return';

export type DocumentPromptType =
  | 'late_rent'
  | 'lease_renewal'
  | 'maintenance'
  | 'move_in_out'
  | 'deposit_return';

export const PROMPT_GENERATORS = {
  late_rent: generateLateRentNoticePrompt,
  lease_renewal: generateLeaseRenewalPrompt,
  maintenance: generateMaintenanceResponsePrompt,
  move_in_out: generateMoveInOutChecklistPrompt,
  deposit_return: generateSecurityDepositReturnPrompt,
} as const;
