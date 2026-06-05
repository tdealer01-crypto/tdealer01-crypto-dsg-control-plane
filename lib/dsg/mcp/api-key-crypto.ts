export async function generateMcpApiKey(): Promise<{
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
}> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(20));
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const rawKey = `dsg_${hex}`;
  const keyHash = await hashMcpApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);
  return { rawKey, keyHash, keyPrefix };
}

export async function hashMcpApiKey(rawKey: string): Promise<string> {
  const encoded = new TextEncoder().encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
