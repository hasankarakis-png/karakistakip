// Edge Function: wa-send
// Koç mesajlarını ve mola hatırlatmalarını Meta'nın resmî WhatsApp Business Cloud API'siyle öğrencinin telefonuna gönderir.
// - Veritabanı tetikleyicisi (messages tablosuna koç mesajı eklenince, x-cron-secret ile) { message_id } gönderir.
// - Koç (JWT) { action: "status" } ile bağlantı durumunu, { action: "resend", message_id } ile yeniden gönderimi ister.
// Gerekli secret'lar (Supabase → Edge Functions → Secrets): WA_TOKEN, WA_PHONE_ID. İsteğe bağlı: WA_TEMPLATE, WA_TEMPLATE_LANG (tr), WA_API_VERSION.
// Secret'lar yoksa hiçbir şey göndermez. Yalnızca telefonu kayıtlı ve WhatsApp izni işaretli öğrencilere gider.
// İşletme tarafından başlatılan mesajlar (öğrenci son 24 saatte numaraya yazmadıysa) Meta'nın onayladığı şablonla gönderilmelidir:
// WA_TEMPLATE iki gövde değişkeni bekler: {{1}} = öğrencinin adı, {{2}} = mesaj metni.
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const env = (k: string) => (Deno.env.get(k) ?? "").trim();

export function eq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const configured = () => !!(env("WA_TOKEN") && /^[0-9]{6,20}$/.test(env("WA_PHONE_ID")));

export async function waSend(to: string, name: string, text: string): Promise<string> {
  if (!configured()) return "kapalı: WhatsApp bağlı değil";
  if (!/^[0-9]{10,15}$/.test(to)) return "hata: telefon numarası geçersiz";
  const tpl = env("WA_TEMPLATE"), lang = env("WA_TEMPLATE_LANG") || "tr", ver = /^v\d+\.\d+$/.test(env("WA_API_VERSION")) ? env("WA_API_VERSION") : "v23.0";
  // Şablon değişkenlerinde satır sonu, sekme ve 4'ten fazla ardışık boşluk olamaz.
  const flat = text.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").slice(0, 900);
  const payload = tpl
    ? { messaging_product: "whatsapp", to, type: "template", template: { name: tpl, language: { code: lang }, components: [{ type: "body", parameters: [{ type: "text", text: name || "Merhaba" }, { type: "text", text: flat }] }] } }
    : { messaging_product: "whatsapp", to, type: "text", text: { body: text.slice(0, 4000), preview_url: false } };
  try {
    const r = await fetch(`https://graph.facebook.com/${ver}/${env("WA_PHONE_ID")}/messages`, {
      method: "POST", headers: { Authorization: "Bearer " + env("WA_TOKEN"), "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.messages?.[0]?.id) return "gönderildi";
    const code = j?.error?.code, m = String(j?.error?.error_data?.details ?? j?.error?.message ?? r.status).replace(/[\u0000-\u001f<>]/g, " ").slice(0, 110);
    return code === 131047 ? "hata: 24 saat penceresi kapalı, şablon (WA_TEMPLATE) gerekli" : "hata: " + m;
  } catch { return "hata: WhatsApp'a ulaşılamadı"; }
}

async function sendMessage(adm: any, id: number): Promise<{ status: string }> {
  const { data: m } = await adm.from("messages").select("id,student_id,from_coach,body,kind,wa_status").eq("id", id).maybeSingle();
  if (!m || !m.from_coach) return { status: "atlandı" };
  if (String(m.wa_status ?? "").startsWith("gönderildi")) return { status: m.wa_status };
  const { data: st } = await adm.from("app_settings").select("value").eq("key", "wa").maybeSingle();
  const S = { on: false, chat: true, nudge: true, ...(st?.value ?? {}) };
  if (!S.on) return { status: "kapalı" };
  if ((m.kind === "auto" && !S.nudge) || (m.kind !== "auto" && !S.chat)) return { status: "atlandı" };
  const { data: c } = await adm.from("student_contacts").select("phone,wa_ok").eq("student_id", m.student_id).maybeSingle();
  if (!c?.wa_ok || !c?.phone) return { status: "atlandı: izin veya telefon yok" };
  const { data: p } = await adm.from("profiles").select("name").eq("id", m.student_id).maybeSingle();
  const ad = String(p?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const status = await waSend(c.phone, ad ? ad.charAt(0).toLocaleUpperCase("tr-TR") + ad.slice(1) : "", String(m.body));
  await adm.from("messages").update({ wa_status: status, wa_at: new Date().toISOString() }).eq("id", m.id);
  if (m.kind === "auto") await adm.from("break_nudges").update({ wa_status: status }).eq("message_id", m.id);
  return { status };
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return J({ error: "Yalnızca POST." }, 405);
  const url = env("SUPABASE_URL"), sk = env("SUPABASE_SERVICE_ROLE_KEY"), pk = env("APP_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
  if (!url || !sk) return J({ error: "Sunucu yapılandırması eksik." }, 500);
  const adm = createClient(url, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: any = {};
  try { body = await req.json(); } catch { /* boş */ }

  const cron = req.headers.get("x-cron-secret");
  if (cron) {
    const { data: s } = await adm.from("app_secrets").select("value").eq("name", "CRON_SECRET").maybeSingle();
    if (!s?.value || !eq(cron, s.value)) return J({ error: "Yetkisiz." }, 401);
    const id = Number(body?.message_id);
    if (!Number.isInteger(id) || id < 1) return J({ error: "Mesaj yok." }, 400);
    return J(await sendMessage(adm, id));
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (!pk || !/^Bearer .{20,}/.test(auth)) return J({ error: "Giriş gerekli." }, 401);
  const sb = createClient(url, pk, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: u } = await sb.auth.getUser(auth.replace(/^Bearer /i, ""));
  if (!u?.user) return J({ error: "Oturum geçersiz." }, 401);
  const { data: prof } = await adm.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (prof?.role !== "coach") return J({ error: "Yalnızca koç kullanabilir." }, 403);
  if (body?.action === "status") return J({ configured: configured(), template: !!env("WA_TEMPLATE") });
  if (body?.action === "resend") {
    const { data: okq } = await adm.rpc("bump_usage", { p_student: u.user.id, p_kind: "wa_send", p_limit: 300 });
    if (okq !== true) return J({ error: "Bugünkü gönderim sınırı doldu." }, 429);
    const id = Number(body?.message_id);
    if (!Number.isInteger(id) || id < 1) return J({ error: "Mesaj yok." }, 400);
    await adm.from("messages").update({ wa_status: null }).eq("id", id).not("wa_status", "like", "gönderildi%");
    return J(await sendMessage(adm, id));
  }
  return J({ error: "Bilinmeyen işlem." }, 400);
}

Deno.serve(handler);
