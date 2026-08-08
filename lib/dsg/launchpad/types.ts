export type LaunchpadChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
  notes: string;
};

export type LaunchpadSection = {
  id: string;
  title: string;
  icon: string;
  items: LaunchpadChecklistItem[];
};

export type LaunchpadLaunch = {
  id: string;
  workspaceId: string;
  name: string;
  createdBy: string;
  sections: LaunchpadSection[];
  createdAt: string;
  updatedAt: string;
};

export type LaunchpadLaunchRow = {
  id: string;
  workspace_id: string;
  name: string;
  created_by: string;
  sections: unknown;
  created_at: string;
  updated_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validString(value: unknown, maxLength: number, allowEmpty = false): value is string {
  if (typeof value !== 'string') return false;
  if (!allowEmpty && value.trim().length === 0) return false;
  return value.length <= maxLength;
}

export function parseLaunchpadSections(value: unknown): LaunchpadSection[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;

  const sections: LaunchpadSection[] = [];
  for (const rawSection of value) {
    if (!isRecord(rawSection)) return null;
    if (!validString(rawSection.id, 120) || !validString(rawSection.title, 200)) return null;
    if (!validString(rawSection.icon, 32, true)) return null;
    if (!Array.isArray(rawSection.items) || rawSection.items.length > 100) return null;

    const items: LaunchpadChecklistItem[] = [];
    for (const rawItem of rawSection.items) {
      if (!isRecord(rawItem)) return null;
      if (!validString(rawItem.id, 120) || !validString(rawItem.label, 500)) return null;
      if (typeof rawItem.checked !== 'boolean') return null;
      if (!validString(rawItem.notes, 4000, true)) return null;

      items.push({
        id: rawItem.id,
        label: rawItem.label,
        checked: rawItem.checked,
        notes: rawItem.notes,
      });
    }

    sections.push({
      id: rawSection.id,
      title: rawSection.title,
      icon: rawSection.icon,
      items,
    });
  }

  return sections;
}

export function mapLaunchpadRow(row: LaunchpadLaunchRow): LaunchpadLaunch {
  const sections = parseLaunchpadSections(row.sections);
  if (!sections) throw new Error('LAUNCHPAD_STORED_SECTIONS_INVALID');

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    createdBy: row.created_by,
    sections,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
