export type UrlDetectedFlags = {
  networkRoute: "standard" | "tor" | "unknown";
  requiresLogin: boolean;
  requiresDownload: boolean;
  detectedDomain: string | null;
};

const LOGIN_PATTERNS = [/login/i, /signin/i, /auth\b/i, /account/i, /members/i, /register/i];
const DOWNLOAD_PATTERNS = [/download/i, /\.zip$/i, /\.tar$/i, /\.rar$/i, /\.7z$/i, /\.sql$/i];

export function detectFlagsFromUrl(rawUrl: string): UrlDetectedFlags {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { networkRoute: "unknown", requiresLogin: false, requiresDownload: false, detectedDomain: null };
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `http://${trimmed}`);
  } catch {
    return { networkRoute: "unknown", requiresLogin: false, requiresDownload: false, detectedDomain: null };
  }

  const isOnion = parsed.hostname.endsWith(".onion");
  const networkRoute: "standard" | "tor" | "unknown" = isOnion ? "tor" : "standard";

  const combined = parsed.href;
  const requiresLogin = LOGIN_PATTERNS.some((p) => p.test(combined));
  const requiresDownload = DOWNLOAD_PATTERNS.some((p) => p.test(combined));

  const detectedDomain = parsed.hostname.replace(/^www\./, "") || null;

  return { networkRoute, requiresLogin, requiresDownload, detectedDomain };
}
