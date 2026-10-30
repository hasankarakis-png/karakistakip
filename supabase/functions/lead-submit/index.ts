// Edge Function: lead-submit
// hasankarakis.com iletişim formundaki ön görüşme başvurusunu public.leads tablosuna yazar (koç panelinde görünür).
// Giriş gerekmez: yalnızca site adreslerinden gelen istek, gizli tuzak alanı, alan doğrulaması, IP başına saatte 3 başvuru.
// IP adresi saklanmaz; yalnızca tek yönlü özeti (sha-256) sınır için tutulur.
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const OK_ORIGIN = /^https:\/\/((www\.)?hasankarakis\.com|([a-z0-9-]+\.)?hasankarakis-site\.pages\.dev)$/;
const cors = (o: string) => ({
  "Access-Control-Allow-Origin": OK_ORIGIN.test(o) ? o : "https://hasankarakis.com",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
export function normPhone(v: unknown): string | null {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d[0] === "0") d = "9" + d; else if (d.length === 10 && d[0] === "5") d = "90" + d;
  return /^[0-9]{10,15}$/.test(d) ? d : null;
}
const clean = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

export async function handler(req: Request): Promise<Response> {
  const o = req.headers.get("origin") ?? "", H = { ...cors(o), "Content-Type": "application/json" };
  const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: H });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== "POST") return J({ error: "Yalnızca POST." }, 405);
  if (!OK_ORIGIN.test(o)) return J({ error: "İzin verilmeyen kaynak." }, 403);
  let b: any = {};
  try { b = await req.json(); } catch { return J({ error: "Geçersiz istek." }, 400); }
  if (String(b?.hp ?? "").trim()) return J({ ok: true }); // tuzak alan doluysa sessizce yok say
  const name = clean(b?.name, 80), phone = normPhone(b?.phone), exam = ["YKS", "LGS", "Diğer"].includes(b?.exam) ? b.exam : null;
  const grade = clean(b?.grade, 20) || null, note = clean(b?.note, 500) || null;
  if (name.length < 2) return J({ error: "Adınızı yazın." }, 400);
  if (!phone) return J({ error: "Telefon numarasını kontrol edin (ör. 0532 123 45 67)." }, 400);
  if (b?.consent !== true) return J({ error: "İletişim onayı gerekli." }, 400);
  const url = Deno.env.get("SUPABASE_URL"), sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !sk) return J({ error: "Sunucu yapılandırması eksik." }, 500);
  const sb = createClient(url, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const dg = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|karakis-leads|" + url));
  const ipHash = Array.from(new Uint8Array(dg)).map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
  const hourAgo = new Date(Date.now() - 3600e3).toISOString(), dayAgo = new Date(Date.now() - 864e5).toISOString();
  const { count } = await sb.from("leads").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo);
  if ((count ?? 0) >= 3) return J({ error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin ya da WhatsApp'tan yazın." }, 429);
  const { count: dup } = await sb.from("leads").select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", dayAgo);
  if ((dup ?? 0) > 0) return J({ ok: true, again: true });
  const { error } = await sb.from("leads").insert({ name, phone, exam, grade, note, consent: true, ip_hash: ipHash });
  if (error) return J({ error: "Başvuru kaydedilemedi. Lütfen WhatsApp'tan yazın." }, 500);
  return J({ ok: true });
}

Deno.serve(handler);
