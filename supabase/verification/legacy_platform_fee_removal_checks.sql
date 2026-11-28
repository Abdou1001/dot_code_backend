-- Run in the Supabase SQL Editor before applying the legacy-column removal.
-- These queries are read-only and do not expose application secrets.

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'appointment'
    AND column_name IN (
        'doctor_fee',
        'discount_amount',
        'platform_fee',
        'total_amount'
    )
ORDER BY column_name;

SELECT
    dependent_namespace.nspname AS dependent_schema,
    dependent_class.relname AS dependent_object,
    dependent_class.relkind AS dependent_kind
FROM pg_depend AS dependency
JOIN pg_class AS referenced_class ON referenced_class.oid = dependency.refobjid
JOIN pg_namespace AS referenced_namespace
    ON referenced_namespace.oid = referenced_class.relnamespace
LEFT JOIN pg_class AS dependent_class ON dependent_class.oid = dependency.objid
LEFT JOIN pg_namespace AS dependent_namespace
    ON dependent_namespace.oid = dependent_class.relnamespace
JOIN pg_attribute AS attribute
    ON attribute.attrelid = referenced_class.oid
    AND attribute.attnum = dependency.refobjsubid
WHERE referenced_namespace.nspname = 'public'
    AND referenced_class.relname = 'appointment'
    AND attribute.attname = 'platform_fee';

SELECT
    routine_name,
    pg_get_function_identity_arguments(proc.oid) AS arguments
FROM pg_proc AS proc
JOIN pg_namespace AS namespace ON namespace.oid = proc.pronamespace
WHERE namespace.nspname = 'public'
    AND pg_get_functiondef(proc.oid) ILIKE '%platform_fee%';
