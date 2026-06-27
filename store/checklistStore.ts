// External store for onboarding checklist — SSR-safe, cross-tab, mutation-proof.
// Uses useSyncExternalStore contract: one storage listener shared across all subscribers.

export type ChecklistState = {
  readonly dismissed: boolean;
  readonly completedSteps: readonly string[];
};

const SERVER_DEFAULT: ChecklistState = Object.freeze({
  dismissed: true,
  completedSteps: Object.freeze([]) as readonly string[],
});

const KEYS = {
  dismissed: 'onboarding_dismissed',
  steps: 'onboarding_steps',
} as const;

const STEP_FLAGS = [
  'dsg_visited_account',
  'dsg_visited_builder',
  'dsg_visited_templates',
  'dsg_visited_executions',
  'dsg_visited_team',
] as const;

// ─── internal state ───────────────────────────────────────────────────────────
let _cache: ChecklistState | null = null;
const _listeners = new Set<() => void>();

function _invalidate() { _cache = null; }
function _notifyAll() { _listeners.forEach((fn) => fn()); }

function _buildSnapshot(): ChecklistState {
  const dismissed = localStorage.getItem(KEYS.dismissed) === 'true';

  const saved: string[] = JSON.parse(localStorage.getItem(KEYS.steps) || '[]');
  const completed = new Set(saved);
  for (const flag of STEP_FLAGS) {
    if (localStorage.getItem(flag) === 'true') completed.add(flag);
  }

  return Object.freeze({
    dismissed,
    completedSteps: Object.freeze([...completed]),
  });
}

// ─── single storage listener shared across all subscribers ───────────────────
function _onStorage(event: StorageEvent) {
  const relevant =
    event.key === KEYS.dismissed ||
    event.key === KEYS.steps ||
    (STEP_FLAGS as readonly string[]).includes(event.key ?? '');

  if (!relevant) return;

  if (event.newValue === null) {
    _invalidate();
    _notifyAll();
    return;
  }

  // Early-return if value did not actually change
  if (_cache) {
    const unchanged =
      event.key === KEYS.dismissed
        ? String(_cache.dismissed) === event.newValue
        : JSON.stringify(_cache.completedSteps) === event.newValue;
    if (unchanged) return;
  }

  _invalidate();
  _notifyAll();
}

// ─── public store ─────────────────────────────────────────────────────────────
export const checklistStore = {
  getSnapshot(): ChecklistState {
    if (typeof window === 'undefined') return SERVER_DEFAULT;
    if (_cache !== null) return _cache;
    try {
      _cache = _buildSnapshot();
      return _cache;
    } catch {
      return SERVER_DEFAULT;
    }
  },

  getServerSnapshot(): ChecklistState {
    return SERVER_DEFAULT;
  },

  // Register storage listener only while subscribers exist (lazy mount/unmount).
  subscribe(callback: () => void): () => void {
    if (_listeners.size === 0 && typeof window !== 'undefined') {
      window.addEventListener('storage', _onStorage);
    }
    _listeners.add(callback);
    return () => {
      _listeners.delete(callback);
      if (_listeners.size === 0 && typeof window !== 'undefined') {
        window.removeEventListener('storage', _onStorage);
      }
    };
  },

  update(patch: Partial<{ dismissed: boolean; completedSteps: string[] }>) {
    if (typeof window === 'undefined') return;
    const current = checklistStore.getSnapshot();

    const next = {
      dismissed: patch.dismissed ?? current.dismissed,
      completedSteps: patch.completedSteps
        ? [...patch.completedSteps]
        : [...current.completedSteps],
    };

    try {
      localStorage.setItem(KEYS.dismissed, String(next.dismissed));
      localStorage.setItem(KEYS.steps, JSON.stringify(next.completedSteps));
    } catch {
      return;
    }

    _invalidate();
    _notifyAll();
  },
};
