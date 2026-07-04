#!/usr/bin/env node
// Apply Supabase migration for stripe_app_tables using direct PostgreSQL connection with SSL disabled
import pg from 'pg';

const { Client } = pg;

const POSTGRES_URL = process.env.SUPABASE_DB_URL || 'postgres://postgres.zeyguilldygozufpgxms:Tar0638815592@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable&pgbouncer=true';

async function applyMigration() {
  const client = new Client({ 
    connectionString: POSTGRES_URL, 
    ssl: false 
  });
  
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL (SSL disabled)');
    
    const fs = await import('fs');
    const migrationSQL = fs.readFileSync('./supabase/migrations/20260606185643_stripe_app_tables.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const stmt of statements) {
      try {
        console.log(`Executing: ${stmt.substring(0, 80)}...`);
        await client.query(stmt);
        console.log('✓ Success');
      } catch (e) {
        // Some statements might already exist (IF NOT EXISTS), that's OK
        console.error(`⚠ ${e.message}`);
      }
    }
    
    // Verify tables were created
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('stripe_app_accounts', 'stripe_operation_policies', 'stripe_operation_audits')
    `);
    
    console.log('\n=== Tables Created ===');
    result.rows.forEach(row => console.log(`✓ ${row.table_name}`));
    
  } catch (e) {
    console.error(`Fatal: ${e.message}`);
  } finally {
    await client.end();
  }
}

applyMigration();