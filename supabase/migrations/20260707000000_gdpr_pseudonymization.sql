-- GDPR Article 17: Right-to-Erasure (Pseudonymization Migration)
-- This migration separates identity data from audit logs to allow erasure without breaking the hash chain.

-- 1. Create Identity Map table
CREATE TABLE IF NOT EXISTS public.actor_identity_map (
    actor_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ -- For soft delete / erasure tracking
);

-- 2. Add actor_uuid to audit_logs (if not already present as UUID)
-- Based on schema, audit_logs currently has agent_id, org_id, etc. 
-- We will add a generic actor_uuid to link to our identity map.
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_uuid UUID REFERENCES public.actor_identity_map(actor_uuid);

-- 3. Create a function to handle erasure
CREATE OR REPLACE FUNCTION public.erase_actor_identity(target_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- We delete the identity data but keep the record in identity_map 
    -- (or mark as deleted) to maintain referential integrity in audit_logs.
    UPDATE public.actor_identity_map 
    SET identity_data = '{}'::jsonb, 
        deleted_at = now() 
    WHERE actor_uuid = target_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. (Optional) Data Migration Strategy:
-- In a real production environment, we would populate actor_identity_map 
-- from existing user/agent data and backfill audit_logs.actor_uuid.
