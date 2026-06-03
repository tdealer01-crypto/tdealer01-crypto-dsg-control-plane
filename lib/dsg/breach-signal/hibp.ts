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

const HIBP_TIMEOUT_MS = 4_000;

export async function checkHibpDomain(domain: string): Promise<HibpResult> {
  const apiKey = process.env.HIBP_API_KEY;
  if (!apiKey) {
    return { checked: false, breaches: [], breachCount: 0, elevatesEvidence: false, skipReason: "HIBP_API_KEY_NOT_CONFIGURED" };
  }

  const clean = domain.trim().toLowerCase().replace(/^www\./, "");
  if (!clean || clean.endsWith(".onion")) {
    return { checked: false, breaches: [], breachCount: 0, elevatesEvidence: false, skipReason: "DOMAIN_NOT_QUERYABLE" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

  try {
    const url = `https://haveibeenpwned.com/api/v3/breaches?domain=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: {
        "hibp-api-key": apiKey,
        "user-agent": "dsg-control-plane/1.0",
      },
      signal: controller.signal,
    });

    if (res.status === 404) {
      return { checked: true, breaches: [], breachCount: 0, elevatesEvidence: false };
    }

    if (!res.ok) {
      return { checked: false, breaches: [], breachCount: 0, elevatesEvidence: false, skipReason: `HIBP_HTTP_${res.status}` };
    }

    const data = await res.json() as HibpBreach[];
    const verified = data.filter((b) => b.IsVerified && !b.IsFabricated);

    return {
      checked: true,
      breaches: verified,
      breachCount: verified.length,
      elevatesEvidence: verified.length > 0,
    };
  } catch (err: unknown) {
    const reason = err instanceof Error && err.name === "AbortError" ? "HIBP_TIMEOUT" : "HIBP_FETCH_ERROR";
    return { checked: false, breaches: [], breachCount: 0, elevatesEvidence: false, skipReason: reason };
  } finally {
    clearTimeout(timeout);
  }
}
