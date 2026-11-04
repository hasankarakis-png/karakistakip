-- Verified 2026-11-04 against production catalog. Apply in staging first.
-- Task self-service RPCs require an authenticated user. Anonymous EXECUTE is unnecessary.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.task_self_reschedule(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.task_self_undo(bigint[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.task_self_reschedule(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.task_self_undo(bigint[]) TO authenticated;

-- pin_attempts is used exclusively by the service role: RLS already has no user policies.
REVOKE ALL ON TABLE public.pin_attempts FROM anon, authenticated;
-- parent_view(text) intentionally remains anon-executable for consented, time-limited
-- bearer-token family access; removing it would break existing parent links.
COMMIT;
