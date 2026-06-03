export type HibpBreach = {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  AddedDate: string;
  DataClasses: string[];
  IsVerified: boolean;
  IsFabricated: boolean;
  IsSensitive: boolean;
};

export type HibpResult = {
  checked: boolean;
  breaches: HibpBreach[];
  breachCount: number;
  elevatesEvidence: boolean;
  skipReason?: string;
};

const HIBP_ALL_BREACHES_URL = "https://haveibeenpwned.com/api/v3/breaches";
const HIBP_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type Cache = { breaches: HibpBreach[]; fetchedAt: number };
let cache: Cache | null = null;

async function fetchAllBreaches(): Promise<HibpBreach[] | null> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.breaches;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

  try {
    const res = await fetch(HIBP_ALL_BREACHES_URL, {
      headers: { "user-agent": "dsg-control-plane/1.0" },
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as HibpBreach[];
    cache = { breaches: data, fetchedAt: Date.now() };
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkHibpDomain(domain: string): Promise<HibpResult> {
  const clean = domain.trim().toLowerCase().replace(/^www\./, "");
  if (!clean || clean.endsWith(".onion")) {
    return { checked: false, breaches: [], breachCount: 0, elevatesEvidence: false, skipReason: "DOMAIN_NOT_QUERYABLE" };
  }

  const all = await fetchAllBreaches();
  if (!all) {
    return { checked: false, breaches: [], breachCount: 0, elevatesEvidence: false, skipReason: "HIBP_FETCH_ERROR" };
  }

  const matched = all.filter(
    (b) => b.IsVerified && !b.IsFabricated && b.Domain.toLowerCase() === clean,
  );

  return {
    checked: true,
    breaches: matched,
    breachCount: matched.length,
    elevatesEvidence: matched.length > 0,
  };
}
