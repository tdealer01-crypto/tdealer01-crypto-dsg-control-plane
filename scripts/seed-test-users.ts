import { createClient } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const admin = createClient<Database>(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const orgId = '00000000-0000-0000-0000-000000000001';
  const count = 20;
  const password = 'TestPass123!';

  console.log(`Seeding ${count} test users...`);

  for (let i = 1; i <= count; i++) {
    const email = `test${String(i).padStart(2, '0')}@dsg.local`;
    const name = `Test User ${i}`;

    // Create auth user
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authErr || !authUser.user) {
      console.error(`  [${email}] auth create failed:`, authErr?.message);
      continue;
    }

    // Upsert into public.users
    const { error: upsertErr } = await admin.from('users').upsert({
      id: authUser.user.id,
      email,
      full_name: name,
      org_id: orgId,
      is_active: true,
      role: 'OPERATOR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (upsertErr) {
      console.error(`  [${email}] users upsert failed:`, upsertErr.message);
    } else {
      console.log(`  [${email}] OK`);
    }
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
