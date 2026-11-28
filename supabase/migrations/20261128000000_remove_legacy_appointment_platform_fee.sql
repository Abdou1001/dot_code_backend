-- Apply only after the preceding discount-pricing migrations and read-only
-- schema verification confirm no external SQL object still depends on this column.
-- PostgreSQL's default RESTRICT behavior prevents an unsafe drop when a
-- remaining dependency exists.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc AS proc
        JOIN pg_namespace AS namespace ON namespace.oid = proc.pronamespace
        WHERE namespace.nspname = 'public'
            AND pg_get_functiondef(proc.oid) ILIKE '%platform_fee%'
    ) THEN
        RAISE EXCEPTION 'LEGACY_PLATFORM_FEE_DEPENDENCY_FOUND';
    END IF;
END;
$$;

ALTER TABLE public.appointment
    DROP COLUMN IF EXISTS platform_fee;
