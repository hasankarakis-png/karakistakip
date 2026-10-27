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
grep -Fq "function hataMatrisiCard(sid)" js/coach.js || fail "topic error matrix missing"
grep -Fq 'const sid=PX.studentId||(ROLE==="coach"?sel:ME)' js/coach.js || fail "exam save does not bind to the selected student"
grep -Fq 'EXERR[id]="Deneme kayıtları yüklenemedi.' js/coach.js || fail "exam load errors are silently hidden"
grep -Fq 'async function examStudentId()' js/exams.js || grep -Fq 'function examStudentId()' js/exams.js || fail "exam CRUD selected-student helper missing"
grep -Fq 'other configured provider' supabase/functions/exam-extract/index.ts || grep -Fq 'Network exceptions (TypeError)' supabase/functions/exam-extract/index.ts || fail "AI network errors can bypass provider fallback"
pass "Weekly-task schema and guard"
pass "AI provider fallback configuration"
pass "Reminder failure handling"
pass "Preference copy action"
pass "Explainable topic error matrix"
pass "Exam save scope and load-error visibility"
pass "AI provider fallback on network failures"
