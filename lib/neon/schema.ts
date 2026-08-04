// Table definitions intentionally not ported yet from supabase/migrations/20260801000001-3_phase2_neon_*.sql:
// those migrations call auth.uid()/auth.role() and grant to service_role/authenticated,
// which are Supabase Auth constructs that don't exist on plain Neon. See docs/PHASE2_PLAN.md.
export {};
