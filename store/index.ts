// Single import point for all stores.
// Usage:  import { checklistStore, useChecklist } from '@/store';

export { checklistStore } from './checklistStore';
export type { ChecklistState } from './checklistStore';

export { languageStore, DSG_LANGUAGE_EVENT } from './languageStore';
export type { AppLanguage } from './languageStore';

// ─── Convenience hooks (thin wrappers — keep logic in stores) ────────────────
export { useChecklist } from './useChecklist';
export { useAppLanguage } from './useAppLanguage';
