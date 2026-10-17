// Edge Function: send-reminders
// Zamanlanmış görev (pg_cron) tarafından çağrılır; x-cron-secret başlığı CRON_SECRET ile eşleşmelidir.
// Çalışmaya başlamayan veya bekleyen görevi olan öğrencilere web push hatırlatması gönderir.
import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import webpush from "npm:web-push@3.6.7";

const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const istDay = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

export function eq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export function messageFor(kind: string, studied: boolean, pending: number): { title: string; body: string } | null {
  if (kind === "afternoon") {
    if (studied) return null;
    return { title: "Çalışma zamanı", body: pending > 0 ? `Bugün ${pending} görevin var. Küçük bir başlangıç yap!` : "Bugün henüz çalışmaya başlamadın. 25 dakikalık bir odakla başla!" };
  }
  if (pending > 0) return { title: "Görevlerini tamamla", body: `Bugün ${pending} görevin bekliyor. Bitirince işaretlemeyi unutma.` };
  if (!studied) return { title: "Günü kapatmadan önce", body: "Bugün çalışma kaydı yok. Kısa bir tekrar bile seriyi korur." };
  return null;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return J({ error: "Yalnızca POST." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !sk) return J({ error: "Sunucu yapılandırması eksik." }, 500);
  const sb = createClient(url, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  // Anahtarlar yalnızca servis rolünün okuyabildiği app_secrets tablosunda durur.
  const { data: sec } = await sb.from("app_secrets").select("name,value").in("name", ["CRON_SECRET", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]);
  const K: Record<string, string> = Object.fromEntries((sec ?? []).map((r: any) => [r.name, r.value]));
  if (!K.CRON_SECRET || !eq(req.headers.get("x-cron-secret") ?? "", K.CRON_SECRET)) return J({ error: "Yetkisiz." }, 401);
  const pub = K.VAPID_PUBLIC_KEY, priv = K.VAPID_PRIVATE_KEY, subj = K.VAPID_SUBJECT ?? "mailto:admin@karakis.app";
  if (!pub || !priv) return J({ error: "Sunucu yapılandırması eksik." }, 500);
  let kind = "afternoon";
  try { const b = await req.json(); if (b?.kind === "evening") kind = "evening"; } catch { /* varsayılan */ }
  webpush.setVapidDetails(subj, pub, priv);
  const day = istDay();
  const { data: subs } = await sb.from("push_subs").select("id,student_id,endpoint,p256dh,auth");
  const list = subs ?? [];
  if (!list.length) return J({ ok: true, sent: 0, subs: 0 });
  const ids = [...new Set(list.map((s: any) => s.student_id))];
  const { data: daily } = await sb.from("daily").select("student_id,snap,status:state->>status").eq("day", day).in("student_id", ids);
  const { data: tasks } = await sb.from("weekly_tasks").select("student_id,done").eq("task_date", day).eq("done", false).in("student_id", ids);
  // Çalışıyor sayılır: kayıtlı süre/soru var VEYA oturum açık/molada/noktalanmış/kapatılmış (snap.m yalnızca kayıt anında hesaplandığından).
  const ACTIVE = ["study", "break", "stopped", "closed"];
  const studied = new Set((daily ?? []).filter((d: any) => Number(d.snap?.m) > 0 || Number(d.snap?.q) > 0 || ACTIVE.includes(d.status)).map((d: any) => d.student_id));
  const pend: Record<string, number> = {};
  (tasks ?? []).forEach((t: any) => { pend[t.student_id] = (pend[t.student_id] ?? 0) + 1; });
  let sent = 0, gone = 0, failed = 0;
  const one = async (s: any) => {
    const m = messageFor(kind, studied.has(s.student_id), pend[s.student_id] ?? 0);
    if (!m || !/^https:\/\//.test(String(s.endpoint))) return;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(m), { TTL: 6 * 3600, timeout: 8000 });
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) { gone++; await sb.from("push_subs").delete().eq("id", s.id); } else failed++;
    }
  };
  // Gönderimi 10'arlı gruplar halinde paralel yap (tek tek beklemek süre sınırını zorlar).
  for (let i = 0; i < list.length; i += 10) await Promise.allSettled((list as any[]).slice(i, i + 10).map(one));
  return J({ ok: true, sent, gone, failed, subs: list.length });
}

Deno.serve(handler);
