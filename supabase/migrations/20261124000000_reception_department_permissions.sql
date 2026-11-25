CREATE OR REPLACE FUNCTION public.replace_reception_departments(
    p_user_id bigint,
    p_depart_ids bigint[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_role text;
    requested_depart_ids bigint[] := COALESCE(p_depart_ids, ARRAY[]::bigint[]);
    unique_department_count integer;
    valid_department_count integer;
BEGIN
    SELECT role
    INTO target_role
    FROM public."user"
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND';
    END IF;

    IF target_role <> 'reception' THEN
        RAISE EXCEPTION 'USER_NOT_RECEPTION';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(requested_depart_ids) AS requested_department(depart_id)
        WHERE depart_id IS NULL OR depart_id <= 0
    ) THEN
        RAISE EXCEPTION 'INVALID_DEPARTMENTS';
    END IF;

    SELECT count(DISTINCT depart_id)
    INTO unique_department_count
    FROM unnest(requested_depart_ids) AS requested_department(depart_id);

    IF cardinality(requested_depart_ids) <> unique_department_count THEN
        RAISE EXCEPTION 'INVALID_DEPARTMENTS';
    END IF;

    SELECT count(*)
    INTO valid_department_count
    FROM public.department AS department
    WHERE department.depart_id = ANY(requested_depart_ids)
        AND (
            NOT (to_jsonb(department) ? 'status')
            OR to_jsonb(department) ->> 'status' = 'active'
        )
        AND (
            NOT (to_jsonb(department) ? 'is_active')
            OR to_jsonb(department) ->> 'is_active' IN ('true', 'active')
        );

    IF cardinality(requested_depart_ids) <> valid_department_count THEN
        RAISE EXCEPTION 'INVALID_DEPARTMENTS';
    END IF;

    DELETE FROM public.reception_departments
    WHERE user_id = p_user_id;

    INSERT INTO public.reception_departments (user_id, depart_id)
    SELECT p_user_id, depart_id
    FROM unnest(requested_depart_ids) AS requested_department(depart_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.change_user_role_and_clear_reception_departments(
    p_user_id bigint,
    p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_role text;
BEGIN
    SELECT role
    INTO target_role
    FROM public."user"
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND';
    END IF;

    IF p_role NOT IN ('admin', 'reception', 'user') THEN
        RAISE EXCEPTION 'INVALID_ROLE';
    END IF;

    UPDATE public."user"
    SET role = p_role
    WHERE user_id = p_user_id;

    IF p_role <> 'reception' THEN
        DELETE FROM public.reception_departments
        WHERE user_id = p_user_id;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_reception_departments(bigint, bigint[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.change_user_role_and_clear_reception_departments(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_reception_departments(bigint, bigint[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.change_user_role_and_clear_reception_departments(bigint, text) TO service_role;
