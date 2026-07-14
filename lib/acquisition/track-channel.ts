/**
 * First-touch acquisition channel capture.
 * Reads utm_source / ref / referrer once on first landing and stores it in a
 * cookie so later checkout requests can attribute the customer to a channel.
 */

const COOKIE_NAME = 'dsg_acquisition_channel';
const COOKIE_MAX_AGE_DAYS = 90;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function detectChannel(searchParams: URLSearchParams): string | null {
  const utmSource = searchParams.get('utm_source');
  if (utmSource) return utmSource.trim().toLowerCase();

  const ref = searchParams.get('ref');
  if (ref) return `referral:${ref.trim().toUpperCase()}`;

  if (typeof document !== 'undefined' && document.referrer) {
    try {
      const referrerHost = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (referrerHost && referrerHost !== window.location.hostname) {
        return referrerHost;
      }
    } catch {
      // malformed referrer — ignore
    }
  }

  return null;
}

/**
 * Call once on first page load (client-side only). No-ops if a channel is
 * already stored — this is first-touch attribution, not last-touch.
 */
export function captureAcquisitionChannel(): void {
  if (typeof window === 'undefined') return;
  if (readCookie(COOKIE_NAME)) return;

  const channel = detectChannel(new URLSearchParams(window.location.search));
  writeCookie(COOKIE_NAME, channel || 'direct', COOKIE_MAX_AGE_DAYS);
}

export function getStoredAcquisitionChannel(): string | null {
  return readCookie(COOKIE_NAME);
}
