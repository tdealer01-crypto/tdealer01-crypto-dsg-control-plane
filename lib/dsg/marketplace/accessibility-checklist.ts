export type AccessibilityReviewChecklistItem = {
  section: 'Keyboard' | 'Semantic Structure' | 'Visual' | 'Result';
  label: string;
  status: 'REVIEW';
  nextAction: string;
};

export const ACCESSIBILITY_REVIEW_CHECKLIST: AccessibilityReviewChecklistItem[] = [
  { section: 'Keyboard', label: 'Can tab to primary actions', status: 'REVIEW', nextAction: 'Reviewer must tab through primary actions and attach notes.' },
  { section: 'Keyboard', label: 'No keyboard trap', status: 'REVIEW', nextAction: 'Reviewer must verify escape/continue path for interactive regions.' },
  { section: 'Keyboard', label: 'Focus order logical', status: 'REVIEW', nextAction: 'Reviewer must record focus order for core pages.' },
  { section: 'Keyboard', label: 'Focus visible', status: 'REVIEW', nextAction: 'Reviewer must attach focus-visible notes or screenshots.' },
  { section: 'Semantic Structure', label: 'Page title', status: 'REVIEW', nextAction: 'Reviewer must verify title and route context.' },
  { section: 'Semantic Structure', label: 'Heading order', status: 'REVIEW', nextAction: 'Reviewer must inspect heading hierarchy.' },
  { section: 'Semantic Structure', label: 'Landmark', status: 'REVIEW', nextAction: 'Reviewer must inspect landmarks.' },
  { section: 'Semantic Structure', label: 'Form labels', status: 'REVIEW', nextAction: 'Reviewer must verify visible/programmatic labels.' },
  { section: 'Semantic Structure', label: 'Status text', status: 'REVIEW', nextAction: 'Reviewer must confirm statuses are readable as text.' },
  { section: 'Visual', label: 'Contrast checked', status: 'REVIEW', nextAction: 'Reviewer must run contrast check and attach result.' },
  { section: 'Visual', label: 'Mobile viewport', status: 'REVIEW', nextAction: 'Reviewer must check a mobile viewport.' },
  { section: 'Visual', label: 'Error/warning readable', status: 'REVIEW', nextAction: 'Reviewer must verify warning/error readability.' },
  { section: 'Visual', label: 'Status not color-only', status: 'REVIEW', nextAction: 'Reviewer must confirm status text/icons do not rely only on color.' },
  { section: 'Result', label: 'Verdict: PASS / REVIEW / BLOCKED', status: 'REVIEW', nextAction: 'Reviewer must choose verdict and list missing evidence before any PASS.' },
];
