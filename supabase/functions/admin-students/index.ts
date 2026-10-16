// Edge Function: admin-students
// Yalnızca koç: öğrenci ekle, PIN sıfırla, öğrenci sil. Service key yalnızca burada, sunucuda kullanılır.
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOMAIN = "@takip.karakis.app";

export const slug = (s: string) => s.toLocaleLowerCase("tr").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/[^a-z0-9]/g, "");
export function baseUser(name: string) {
  const p = name.trim().split(/\s+/);
  return (slug(p[0] ?? "") + slug((p[p.length - 1] ?? "")[0] ?? "")) || "ogrenci";
}
const pin = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return J({ error: "Yalnızca POST kabul edilir." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), pk = Deno.env.get("APP_PUBLISHABLE_KEY"), sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !pk || !sk) return J({ error: "Sunucu yapılandırması eksik." }, 500);
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(url, pk, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await sb.auth.getUser(auth.replace(/^Bearer /i, ""));
  if (!u?.user) return J({ error: "Giriş gerekli." }, 401);
  const { data: me } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (me?.role !== "coach") return J({ error: "Yalnızca koç bu işlemi yapabilir." }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: "Geçersiz istek." }, 400); }
  const admin = createClient(url, sk, { auth: { autoRefreshToken: false, persistSession: false } });

  if (body.action === "create") {
    const name = String(body.name ?? "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 60);
    if (name.length < 2) return J({ error: "Ad Soyad gerekli." }, 400);
    const base = baseUser(name), password = pin();
    for (let i = 1; i <= 30; i++) {
      const username = i === 1 ? base : base + i;
      const { data, error } = await admin.auth.admin.createUser({ email: username + DOMAIN, password, email_confirm: true });
      if (error) { if (/already|registered|exists/i.test(error.message)) continue; return J({ error: "Hesap açılamadı: " + error.message }, 500); }
      const { error: e2 } = await admin.from("profiles").upsert({ id: data.user.id, name, role: "student" }, { onConflict: "id" });
      if (e2) { await admin.auth.admin.deleteUser(data.user.id); return J({ error: "Profil oluşturulamadı." }, 500); }
      return J({ ok: true, id: data.user.id, username, pin: password, name });
    }
    return J({ error: "Uygun kullanıcı adı bulunamadı." }, 409);
  }

  const sid = String(body.student_id ?? "");
  if (!UUID.test(sid)) return J({ error: "Öğrenci belirtilmedi." }, 400);
  const { data: tp } = await admin.from("profiles").select("id,role,name").eq("id", sid).maybeSingle();
  if (!tp || tp.role !== "student") return J({ error: "Öğrenci bulunamadı." }, 404);

  if (body.action === "reset") {
    const password = pin();
    const { error } = await admin.auth.admin.updateUserById(sid, { password });
    if (error) return J({ error: "PIN değiştirilemedi." }, 500);
    const { data: usr } = await admin.auth.admin.getUserById(sid);
    const username = String(usr?.user?.email ?? "").replace(DOMAIN, "");
    return J({ ok: true, username, pin: password, name: tp.name });
  }
  if (body.action === "delete") {
    if (body.confirm !== true) return J({ error: "Silme onayı gerekli." }, 400);
    await admin.from("profiles").delete().eq("id", sid);
    const { error } = await admin.auth.admin.deleteUser(sid);
    if (error) return J({ error: "Hesap silinemedi." }, 500);
    return J({ ok: true });
  }
  return J({ error: "Bilinmeyen işlem." }, 400);
}

Deno.serve(handler);
