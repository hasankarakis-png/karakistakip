// Edge Function: pin-change
// Giriş yapmış kullanıcı (öğrenci) kendi şifresini değiştirir.
// Mevcut şifre sunucuda doğrulanır (public.pin_check), 15 dakikada en fazla 5 hatalı deneme (public.pin_attempts).
// Yeni şifre Auth yönetici API'siyle yazılır; Auth diğer oturumları kapatır, istemci yeniden giriş ister.
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const ALLOWED_ORIGINS = new Set([
  "https://takip.hasankarakis.com",
  "https://hasankarakis.com",
  "https://www.hasankarakis.com",
  ...(Deno.env.get("APP_ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
]);
const corsFor = (req: Request) => {
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://takip.hasankarakis.com",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};
const J = (b: unknown, s = 200, req?: Request) => new Response(JSON.stringify(b), { status: s, headers: { ...corsFor(req ?? new Request("https://takip.hasankarakis.com")), "Content-Type": "application/json", "Cache-Control": "no-store" } });
const DOMAIN = "@takip.karakis.app";
const MAX_FAIL = 5, WINDOW_MIN = 15;

const COMMON = ["password", "parola123", "sifre123", "şifre123", "qwerty123", "12341234", "11223344", "123123123", "1q2w3e4r", "asdf1234", "abcd1234",
  "abc12345", "iloveyou", "karakis1", "karakis123", "galatasaray", "fenerbahce", "fenerbahçe", "besiktas", "beşiktaş", "trabzonspor", "amedspor", "diyarbakir", "diyarbakır"];

// İstemcideki pwRule() ile aynı kurallar (js/account.js). Boş dize = geçerli.
export function pinRule(p: unknown, user = ""): string {
  if (typeof p !== "string" || !p) return "Yeni şifreyi yaz.";
  if (p.length < 8) return "Yeni şifre en az 8 karakter olmalı.";
  if (p.length > 64) return "Yeni şifre en fazla 64 karakter olabilir.";
  if (/^\s|\s$/.test(p)) return "Şifrenin başında veya sonunda boşluk olmasın.";
  if (/[\u0000-\u001f\u007f]/.test(p)) return "Şifrede geçersiz bir karakter var.";
  const l = p.toLocaleLowerCase("tr");
  if (/^(.{1,2})\1+$/.test(l)) return "Tekrar eden şifreler (11111111, 12121212) kolay tahmin edilir.";
  const runs = ["01234567890", "09876543210", "abcdefghijklmnopqrstuvwxyz", "zyxwvutsrqponmlkjihgfedcba", "qwertyuiopasdfghjklzxcvbnm"];
  if (runs.some((r) => r.includes(l))) return "Sıralı karakterler (12345678, abcdefgh) kolay tahmin edilir.";
  if (user.length >= 3 && l.includes(user.toLocaleLowerCase("tr"))) return "Şifrende kullanıcı adın olmasın.";
  if (COMMON.includes(l)) return "Bu şifre çok yaygın, başka bir şifre seç.";
  return "";
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.headers.get("Origin") && !ALLOWED_ORIGINS.has(req.headers.get("Origin")!)) return J({ error: "Origin not allowed." }, 403, req);
  if (req.method !== "POST") return J({ error: "Yalnızca POST kabul edilir." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), pk = Deno.env.get("APP_PUBLISHABLE_KEY"), sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !pk || !sk) return J({ error: "Sunucu yapılandırması eksik." }, 500);

  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(url, pk, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await sb.auth.getUser(auth.replace(/^Bearer /i, ""));
  if (!u?.user) return J({ error: "Oturumun kapanmış. Yeniden giriş yapıp tekrar dene." }, 401);
  const uid = u.user.id, username = String(u.user.email ?? "").replace(DOMAIN, "");

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: "Geçersiz istek." }, 400); }
  const oldPin = typeof body.old === "string" ? body.old : "", newPin = body.new;
  if (!oldPin || oldPin.length > 128) return J({ error: "Mevcut şifreni yaz." }, 400);
  const rule = pinRule(newPin, username);
  if (rule) return J({ error: rule, field: "new" }, 400);
  if (newPin === oldPin) return J({ error: "Yeni şifre mevcut şifrenle aynı olamaz.", field: "new" }, 400);

  const admin = createClient(url, sk, { auth: { autoRefreshToken: false, persistSession: false } });

  // Every attempt reserves a slot transactionally in Postgres, preventing concurrent bypass.
  const { data: attemptId, error: reserveError } = await admin.rpc("pin_reserve_attempt", {
    p_uid: uid, p_max: MAX_FAIL, p_window_minutes: WINDOW_MIN,
  });
  if (reserveError) return J({ error: "Şifre doğrulaması şu anda kullanılamıyor." }, 503);
  if (attemptId == null) return J({ error: `Çok fazla hatalı deneme yapıldı. ${WINDOW_MIN} dakika sonra tekrar dene.` }, 429);
  const { data: ok, error: pe } = await admin.rpc("pin_check", { p_uid: uid, p_pin: oldPin });
  if (pe || ok === null) return J({ error: "Şifre doğrulanamadı, biraz sonra tekrar dene." }, 500);
  if (ok === true) {
    // Only a verified successful check clears its own reserved failed-attempt slot.
    await admin.from("pin_attempts").update({ ok: true }).eq("id", attemptId).eq("user_id", uid);
  }
  if (ok !== true) {
    const { count: failedCount } = await admin.from("pin_attempts").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("ok", false).gte("at", new Date(Date.now() - WINDOW_MIN * 60000).toISOString());
    const left = Math.max(0, MAX_FAIL - (failedCount ?? MAX_FAIL));
    return J({ error: left ? `Mevcut şifren hatalı. ${left} deneme hakkın kaldı.` : `Mevcut şifren hatalı. ${WINDOW_MIN} dakika sonra tekrar deneyebilirsin.`, field: "old" }, 400);
  }

  const { error: ue } = await admin.auth.admin.updateUserById(uid, { password: newPin });
  if (ue) {
    const m = String(ue.message || "");
    if (/weak|pwned|leak|characters|length/i.test(m)) return J({ error: "Bu şifre güvenlik kurallarına uymuyor. Daha uzun ya da harf ve rakam karışık bir şifre dene.", field: "new" }, 400);
    return J({ error: "Şifre değiştirilemedi, tekrar dene." }, 500);
  }
  // Eski oturumları kapat (Auth bunu zaten yapıyor olabilir; çift güvence).
  try { await admin.auth.admin.signOut(auth.replace(/^Bearer /i, ""), "global"); } catch { /* yoksay */ }
  return J({ ok: true });
}

Deno.serve(handler);
