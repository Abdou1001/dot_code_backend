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

    IF target_role = 'doctor' OR p_role = 'doctor' THEN
        RAISE EXCEPTION 'DOCTOR_ROLE_PROTECTED';
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

REVOKE ALL ON FUNCTION public.change_user_role_and_clear_reception_departments(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_user_role_and_clear_reception_departments(bigint, text) TO service_role;
