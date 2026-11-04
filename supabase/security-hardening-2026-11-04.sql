-- Security hardening 2026-11-04: announcements and acknowledgements.
-- Apply in Supabase SQL Editor after schema-v48.sql; review against production policies.
-- No existing data is deleted.
BEGIN;

-- Existing announcement creators cannot be impersonated by a different coach.
-- This protects audit attribution even when a caller bypasses the UI.
CREATE OR REPLACE FUNCTION public.announcements_author_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR NEW.created_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Announcement creator must match authenticated user'
        USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Announcement creator cannot be changed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcements_author_guard_trigger ON public.announcements;
CREATE TRIGGER announcements_author_guard_trigger
BEFORE INSERT OR UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.announcements_author_guard();

-- Students may acknowledge only announcements currently active for them.
-- Keep the coach's read permission unchanged.
DROP POLICY IF EXISTS ack_student_insert ON public.announcement_acks;
CREATE POLICY ack_student_insert ON public.announcement_acks
FOR INSERT TO authenticated
WITH CHECK (
  student_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_id
      AND (a.student_ids IS NULL OR (SELECT auth.uid()) = ANY(a.student_ids))
      AND a.starts_on <= (now() AT TIME ZONE 'Europe/Istanbul')::date
      AND a.ends_on >= (now() AT TIME ZONE 'Europe/Istanbul')::date
  )
);

COMMIT;
