#!/usr/bin/env bash
set -euo pipefail

fail() { echo "FAIL: $1" >&2; exit 1; }
pass() { echo "PASS: $1"; }

grep -Fq "week_title text check (char_length(week_title) <= 40)" supabase/schema-ai.sql || fail "fresh schema missing week_title"
grep -Fq "source in ('coach','ai','student')" supabase/schema-ai.sql || fail "fresh schema rejects student-created tasks"
grep -Fq "new.week_title is distinct from old.week_title" supabase/schema-ai.sql || fail "student task guard does not protect week_title"
test -f supabase/migrations/20261027_week_title.sql || fail "existing-database migration missing"
grep -Fq "const providers:" supabase/functions/exam-extract/index.ts || fail "exam extraction provider fallback missing"
grep -Fq "FREE_AI_KEY" supabase/functions/plan-extract/index.ts || fail "free provider config missing for plan extraction"
grep -Fq "error: dailyError" supabase/functions/send-reminders/index.ts || fail "reminder job hides daily data read errors"
grep -Fq "navigator.clipboard.writeText(text)" js/coach.js || fail "preference copy action regression"
pass "Weekly-task schema and guard"
pass "AI provider fallback configuration"
pass "Reminder failure handling"
pass "Preference copy action"
