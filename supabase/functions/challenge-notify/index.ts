// Edge Function: challenge-notify
// Yalnızca koç: yeni yarışmayı tüm öğrencilere web push ile duyurur. Aynı yarışma için yalnızca bir kez çalışır.
import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

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
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return J({ error: "Geçersiz yarışma." }, 400);

  const admin = createClient(url, sk, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: ch } = await admin.from("challenges").select("id,title,metric,start_day,end_day,notified_at").eq("id", id).maybeSingle();
  if (!ch) return J({ error: "Yarışma bulunamadı." }, 404);
  // Aynı yarışma iki kez duyurulmasın: işareti atomik olarak yalnızca boşsa koy.
  const { data: claimed } = await admin.from("challenges").update({ notified_at: new Date().toISOString() }).eq("id", id).is("notified_at", null).select("id");
  if (!claimed?.length) return J({ error: "Bu yarışma zaten duyuruldu." }, 409);

  const { data: sec } = await admin.from("app_secrets").select("name,value").in("name", ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]);
  const K: Record<string, string> = Object.fromEntries((sec ?? []).map((r: any) => [r.name, r.value]));
  if (!K.VAPID_PUBLIC_KEY || !K.VAPID_PRIVATE_KEY) {
    await admin.from("challenges").update({ notified_at: null }).eq("id", id);
    return J({ error: "Bildirim anahtarları ayarlı değil." }, 500);
  }
  webpush.setVapidDetails(K.VAPID_SUBJECT ?? "mailto:admin@karakis.app", K.VAPID_PUBLIC_KEY, K.VAPID_PRIVATE_KEY);
  const what = ch.metric === "minutes" ? "en çok çalışan" : "en çok soru çözen";
  const msg = JSON.stringify({ title: "🏆 Yeni yarışma: " + ch.title, body: `${what} kazanır. Sıralamayı uygulamadan takip et!` });
  const { data: subs } = await admin.from("push_subs").select("id,endpoint,p256dh,auth");
  const list = subs ?? [];
  let sent = 0, gone = 0, failed = 0;
  const one = async (s: any) => {
    if (!/^https:\/\//.test(String(s.endpoint))) return;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg, { TTL: 24 * 3600, timeout: 8000 });
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) { gone++; await admin.from("push_subs").delete().eq("id", s.id); } else failed++;
    }
  };
  for (let i = 0; i < list.length; i += 10) await Promise.allSettled((list as any[]).slice(i, i + 10).map(one));
  return J({ ok: true, sent, gone, failed, subs: list.length });
}

Deno.serve(handler);
