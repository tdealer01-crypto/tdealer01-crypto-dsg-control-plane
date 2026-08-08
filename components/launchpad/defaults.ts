import type { LaunchpadSection } from '@/lib/dsg/launchpad/types';

const SECTION_DEFS = [
  { id: 'pre-launch', title: 'Pre-Launch', icon: '🔧' },
  { id: 'launch-day', title: 'Launch Day', icon: '🚀' },
  { id: 'post-launch', title: 'Post-Launch', icon: '📊' },
] as const;

const ITEMS: Record<(typeof SECTION_DEFS)[number]['id'], string[]> = {
  'pre-launch': [
    'Code review completed',
    'Unit tests passing',
    'Integration tests passing',
    'Documentation updated',
    'Security review done',
    'Performance benchmarks met',
  ],
  'launch-day': [
    'Deploy to production',
    'Monitor error rates',
    'Monitor latency metrics',
    'Announce to stakeholders',
    'Update status page',
    'Verify rollback plan ready',
  ],
  'post-launch': [
    'Schedule retrospective',
    'Review success metrics',
    'Close out JIRA tickets',
    'Archive feature branch',
    'Update runbooks',
    'Celebrate the team 🎉',
  ],
};

export function createDefaultLaunchpadSections(): LaunchpadSection[] {
  return SECTION_DEFS.map((section) => ({
    ...section,
    items: ITEMS[section.id].map((label, index) => ({
      id: `${section.id}-${index}`,
      label,
      checked: false,
      notes: '',
    })),
  }));
}
