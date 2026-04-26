export async function hasReleaseGateProAccess(email: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email || !supabaseUrl || !supabaseKey) {
    return false;
  }

  const params = new URLSearchParams({
    email: `eq.${email}`,
    status: 'in.(active,trialing)',
    select: 'id,status,current_period_end',
    limit: '1',
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/release_gate_entitlements?${params.toString()}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    return false;
  }

  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}
