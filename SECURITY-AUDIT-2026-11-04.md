# Security audit — 2026-11-04

## Scope reviewed
Static inspection of `index.html`, `_headers`, `js/core.js`, `js/boot.js`, `js/account.js`, `js/announce.js`, `supabase/schema.sql`, `supabase/schema-v47.sql`, `supabase/schema-v48.sql`, `supabase/functions/pin-change/index.ts`, and `supabase/functions/exam-extract/index.ts`.

**This is not a live penetration test.** Production database policies, deployed Edge Function versions, provider-side auth/rate limits, and production headers were not verified.

## Findings
1. **Announcement creator impersonation (medium):** `ann_coach_all` permits any authenticated coach to supply another `created_by` UUID on insert or change it on update. The proposed database trigger binds the author to `auth.uid()` and prohibits edits to the author field.
2. **Premature acknowledgement (low):** `ack_student_insert` checks the audience but not the announcement's active date range. The proposed policy limits acknowledgements to the current date (Europe/Istanbul).
3. **Browser-held publishable Supabase key (informational):** this is expected; never replace it with a service-role/secret key. Security depends on properly deployed RLS and grants.
4. **Sensitive student data cached in localStorage (review needed):** daily study state and cached profile data are written locally. Shared-device/logout data-retention behavior should be checked and privacy impact assessed.
5. **Wildcard CORS in Edge Functions (review needed):** endpoints accept cross-origin browser requests; bearer authentication still protects user data. Prefer a deliberate origin allowlist after checking Cloudflare preview domains and integrations.
6. **Password-change lockout (review needed):** rate limiting performs count then insert, which is not atomic under concurrent requests. Harden using a transactional database RPC or managed rate-limiting service.

## Production validation checklist
- Run migration in staging first and test: coach publishes, edits, deletes; students view and acknowledge today's announcements; cross-student read/ack attempts return denied; unauthenticated reads return denied.
- Check RLS and GRANTs on every exposed table, view, RPC and storage bucket with separate coach/student/anon tokens.
- Test both registered and unregistered user login attempts, brute-force controls and session invalidation.
- Confirm deployed headers include CSP, HSTS, no-sniff and frame protection; investigate CSP reports before tightening.
- Confirm Supabase Edge Function secrets are stored in environment configuration, never in frontend assets or git history.
- Rotate any confirmed exposed **secret/service-role** credentials immediately; a publishable key is not by itself a leak.
- Run regression workflows and manual test with production-like staging users before merge/deployment.

## Rollback
If staging reveals incompatibility, revert migration by dropping trigger `announcements_author_guard_trigger`, dropping function `announcements_author_guard`, and restoring the previous `ack_student_insert` policy from `schema-v48.sql`. Do not roll back by dropping announcement tables.


## Additional hardening prepared in the same branch
- `supabase/security-pin-rate-limit.sql`: atomic password-attempt reservation using transaction advisory locks; role restricted to `service_role`.
- `supabase/functions/pin-change/index.ts`: reserve a failed-attempt slot **before** validating a password, and mark only successfully verified attempts as successful. The SQL migration MUST precede Edge Function deployment; otherwise password changes fail closed.
- `supabase/functions/exam-extract/index.ts` and `pin-change`: explicit browser Origin allowlist, `Vary: Origin` and no-store response headers. Any additional trusted preview URLs must be set in server-only `APP_ALLOWED_ORIGINS` (comma-separated exact origins) before deploying. Requests without an Origin header still require authentication. **CORS is not an authorization boundary.**
- Initial source-level assertions: 11/11 checks passed for expected changes. SQL execution, deployed Edge Function integration, role-isolation tests, and GitHub CI have **not** been verified.

## Ordered deployment checklist (not executed)
1. Validate the current production `pin_attempts` table against `schema-v39.sql`, the currently deployed `pin-change` function, and `auth.role()` behavior in the target Supabase project.
2. In staging, apply `supabase/security-hardening-2026-11-04.sql` then `supabase/security-pin-rate-limit.sql`.
3. Exercise a student and coach account with positive and negative RLS cases, including concurrent password change attempts and all protected announcement operations.
4. Set `APP_ALLOWED_ORIGINS` in the Supabase function environment for needed preview origins; confirm both production origins work and an untrusted Origin is rejected.
5. Deploy the two updated Edge Functions only *after* the SQL migration succeeds. Verify real requests and rollback behavior.
6. Merge approved PR after CI and smoke tests pass, then monitor Supabase errors and user login success. Database SQL files in git are not automatically applied.
7. Validate and remediate localStorage privacy, additional Edge Functions, all deployed RPC/grants, Supabase Storage policies and external integrations. These are **open checks**, not claimed fixed.

## Scope boundaries
A static source review cannot certify production security. CORS restrictions cannot replace JWT/RLS policies; anti-brute-force protection on `pin-change` does not replace Supabase Auth's login rate limiting and Turnstile configuration. Stored student data is sensitive; do not clear unsynchronized offline state without a safe migration/flush strategy.


## Read-only production Supabase inspection — 2026-11-04
Project `ramcghaefbbwgwtgtdtt` (matched the frontend's Supabase URL) is active. No user rows were read.

- All **36 public tables have RLS enabled**. Three tables (`app_secrets`, `challenge_messages`, `pin_attempts`) have no policies; this is appropriate for server-only tables, but revoke unnecessary table GRANTs as defense-in-depth. The existing `pin_attempts` table unexpectedly grants DML to `authenticated`, though RLS currently prevents direct client access. Addressed in `security-rpc-grants-2026-11-04.sql`.
- There are **no public views** and **no storage buckets** at the time of inspection. This does not certify external object stores.
- Supabase security advisors detected 3 anonymously callable SECURITY DEFINER RPCs. `task_self_reschedule(jsonb)` and `task_self_undo(bigint[])` unnecessarily grant `anon` EXECUTE; revoke that while keeping authenticated usage. `parent_view(text)` deliberately returns consented parent data to a 32–64-character bearer token, and is needed for parent sharing; do **not** indiscriminately revoke it. Recheck token expiration/revocation and rate limits separately.
- Security advisors flag several authenticated-callable SECURITY DEFINER functions. This alone is not an exploit; each function's internal ownership checks still need review. `msg_read` and task-self RPC implementations contain explicit identity checks; challenge RPCs require further coverage.
- Supabase Auth security advisor reports **leaked-password protection disabled**. Enable in Auth settings if available on the project's plan; this cannot be corrected by checking in a GitHub file.
- `challenges` and `exam_calendar` have authenticated broad-read policies (`USING true`). Confirm those records are intentionally shared with all enrolled students.
- Production migration and browser-role regression tests have **not** been applied. Do not equate code prepared in a PR with deployed protection.

References: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable ; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
