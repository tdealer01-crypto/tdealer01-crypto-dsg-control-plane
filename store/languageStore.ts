// External store for app language — wraps lib/dsg/app-language.ts under the
// same useSyncExternalStore contract used by checklistStore:
// one window listener shared across all subscribers, filtered by key.

export type AppLanguage = 'th' | 'en';

const STORAGE_KEY = 'dsg:language';
export const DSG_LANGUAGE_EVENT = 'dsg-language-change';

// ─── helpers ─────────────────────────────────────────────────────────────────
function normalize(value: string | null | undefined): AppLanguage {
  return value === 'en' ? 'en' : 'th';
}

// ─── internal state ───────────────────────────────────────────────────────────
const _listeners = new Set<() => void>();

function _notifyAll() { _listeners.forEach((fn) => fn()); }

function _onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return; // ignore unrelated keys
  _notifyAll();
}

function _onLangEvent() { _notifyAll(); }

// ─── public store ─────────────────────────────────────────────────────────────
export const languageStore = {
  getSnapshot(): AppLanguage {
    if (typeof window === 'undefined') return 'th';
    return normalize(localStorage.getItem(STORAGE_KEY));
  },

  getServerSnapshot(): AppLanguage {
    return 'th';
  },

  subscribe(callback: () => void): () => void {
    if (_listeners.size === 0 && typeof window !== 'undefined') {
      window.addEventListener('storage', _onStorage);
      window.addEventListener(DSG_LANGUAGE_EVENT, _onLangEvent);
    }
    _listeners.add(callback);
    return () => {
      _listeners.delete(callback);
      if (_listeners.size === 0 && typeof window !== 'undefined') {
        window.removeEventListener('storage', _onStorage);
        window.removeEventListener(DSG_LANGUAGE_EVENT, _onLangEvent);
      }
    };
  },

  setLanguage(lang: AppLanguage) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent(DSG_LANGUAGE_EVENT, { detail: { language: lang } }));
    _notifyAll();
  },
};
