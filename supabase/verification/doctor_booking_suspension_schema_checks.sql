-- Run these read-only checks in the Supabase SQL Editor before applying the
-- Doctor booking migrations when the production schema was created elsewhere.

SELECT
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'doctor',
        'doctor_schedule',
        'appointment',
        'notifications',
        'user'
    )
ORDER BY table_name, ordinal_position;

SELECT
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
    AND table_name IN (
        'doctor',
        'doctor_schedule',
        'appointment',
        'notifications',
        'user'
    )
ORDER BY table_name, constraint_name;

SELECT
    routine_name,
    pg_get_function_identity_arguments(proc.oid) AS arguments,
    proc.prosecdef AS security_definer,
    pg_get_userbyid(proc.proowner) AS owner
FROM pg_proc AS proc
JOIN pg_namespace AS namespace ON namespace.oid = proc.pronamespace
WHERE namespace.nspname = 'public'
    AND routine_name IN (
        'toggle_doctor_booking',
        'create_appointment_with_booking_lock',
        'claim_doctor_booking_notification_tasks'
    )
ORDER BY routine_name;

SELECT
    table_name,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'doctor_booking_notification_outbox';
