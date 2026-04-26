export async function hasPro(email: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email || !url || !key) return false;

  const res = await fetch(
    `${url}/rest/v1/release_gate_entitlements?email=eq.${email}&status=in.(active,trialing)&select=id`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    }
  );

  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}
