-- Atomic password attempt reservation. Install before deploying updated pin-change.
-- Uses existing public.pin_attempts (id, user_id, ok, at).
BEGIN;
CREATE OR REPLACE FUNCTION public.pin_reserve_attempt(p_uid uuid, p_max integer DEFAULT 5, p_window_minutes integer DEFAULT 15)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id bigint; v_count bigint;
BEGIN
  IF coalesce(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role only' USING ERRCODE = '42501';
  END IF;
  IF p_uid IS NULL OR p_max < 1 OR p_max > 20 OR p_window_minutes < 1 OR p_window_minutes > 60 THEN
    RAISE EXCEPTION 'Invalid attempt limit' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_uid::text, 8675309));
  SELECT count(*) INTO v_count FROM public.pin_attempts
    WHERE user_id = p_uid AND ok = false
      AND at >= now() - (p_window_minutes * interval '1 minute');
  IF v_count >= p_max THEN RETURN NULL; END IF;
  INSERT INTO public.pin_attempts(user_id, ok) VALUES(p_uid, false) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.pin_reserve_attempt(uuid,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pin_reserve_attempt(uuid,integer,integer) TO service_role;
COMMIT;
