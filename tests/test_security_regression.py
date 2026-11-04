#!/usr/bin/env python3
"""Static guards against accidental removal of security controls.
These checks are not a substitute for database integration tests.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

class SecurityRegression(unittest.TestCase):
    def test_password_attempt_reservation(self):
        sql = read("supabase/security-pin-rate-limit.sql")
        fn = read("supabase/functions/pin-change/index.ts")
        self.assertIn("pg_advisory_xact_lock", sql)
        self.assertIn("TO service_role", sql)
        self.assertIn('admin.rpc("pin_reserve_attempt"', fn)
        self.assertLess(fn.index('admin.rpc("pin_reserve_attempt"'), fn.index('admin.rpc("pin_check"'))
        self.assertNotIn('admin.from("pin_attempts").insert(', fn)

    def test_announcement_author_and_active_window(self):
        sql = read("supabase/security-hardening-2026-11-04.sql")
        self.assertIn("NEW.created_by IS DISTINCT FROM auth.uid()", sql)
        self.assertIn("announcements_author_guard_trigger", sql)
        self.assertIn("a.starts_on <=", sql)
        self.assertIn("a.ends_on >=", sql)

    def test_edge_function_origin_policy(self):
        for path in ("pin-change", "exam-extract"):
            with self.subTest(path=path):
                src = read(f"supabase/functions/{path}/index.ts")
                self.assertIn("ALLOWED_ORIGINS", src)
                self.assertIn('"Vary": "Origin"', src)
                self.assertIn('"Cache-Control": "no-store"', src)
                self.assertNotIn('"Access-Control-Allow-Origin": "*"', src)
                self.assertIn('const J = (body: unknown, status = 200) => respond(body, status, req)', src)

    def test_publishable_key_is_not_service_secret(self):
        core = read("js/core.js")
        self.assertNotIn("SUPABASE_SERVICE_ROLE_KEY", core)
        self.assertNotIn("sb_secret_", core)

if __name__ == "__main__":
    unittest.main()
