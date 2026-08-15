#!/usr/bin/env node
// Apply the legacy stripe_app_tables migration using a caller-supplied PostgreSQL URL.
// Prefer the canonical Supabase CLI migration workflow for normal deployments.
import pg from 'pg';

const { Client } = pg;
const POSTGRES_URL = process.env.SUPABASE_DB_URL;

if (!POSTGRES_URL) {
  console.error('SUPABASE_DB_URL is required; no database credential fallback is embedded in source.');
  process.exit(1);
}

async function applyMigration() {
  const client = new Client({
    connectionString: POSTGRES_URL,
    ssl: process.env.SUPABASE_DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');

    const fs = await import('fs');
    const migrationSQL = fs.readFileSync('./supabase/migrations/20260606185643_stripe_app_tables.sql', 'utf8');

    // Keep this legacy runner behavior for compatibility. Canonical deployments use Supabase CLI migrations.
    const statements = migrationSQL
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0 && !statement.startsWith('--'));

    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        await client.query(statement);
        console.log('✓ Success');
      } catch (error) {
        console.error(`⚠ ${error.message}`);
      }
    }

    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('stripe_app_accounts', 'stripe_operation_policies', 'stripe_operation_audits')
    `);

    console.log('\n=== Tables Created ===');
    result.rows.forEach((row) => console.log(`✓ ${row.table_name}`));
  } catch (error) {
    console.error(`Fatal: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

applyMigration();
