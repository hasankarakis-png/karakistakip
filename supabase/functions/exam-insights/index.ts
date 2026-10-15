// Edge Function: exam-insights
// Öğrencinin kayıtlı TÜM deneme geçmişinden gelişim analizi, konu önceliklendirme ve koç raporu üretir.
// Sayısal karşılaştırmalar kodla hesaplanır; Gemini yalnızca bu gerçek verileri yorumlar.
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const LIMIT_STUDENT = Number(Deno.env.get("INSIGHTS_DAILY_LIMIT") ?? "10");
const LIMIT_COACH = Number(Deno.env.get("INSIGHTS_COACH_DAILY_LIMIT") ?? "60");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYSTEM = `Sen bir öğrenci koçluğu asistanısın. Sana bir öğrencinin KAYITLI deneme sınavı verilerinden hesaplanmış istatistikler verilecek.
Kurallar:
- Yalnızca verilen verilere dayan. Verilmeyen bir deneme, ders, konu veya sayı UYDURMA. Veri yoksa "veri yok" de.
- Konu bazlı veri (konu_verisi_var=false) yoksa kesin konu eksikliği üretme: öncelikte konu alanını null bırak, kanit_turu "DERS_NETI" yaz ve mini_test alanına o dersin konularını taramak için bir değerlendirme testi öner.
- Konu verisi varsa yalnızca verilen konuları kullan, kanit_turu "KONU_VERISI" olsun.
- Tek deneme varsa karşılaştırma yapma; veri_notu alanında daha fazla deneme gerektiğini söyle.
- Öğrenciyi suçlama, başarı garantisi verme, akademik verilerden psikolojik sonuç çıkarma. Destekleyici, açık, uygulanabilir bir dil kullan. Türkçe yaz.
- Öncelikleri en fazla 5 madde ver. Çalışma yöntemi, miktar ve mini_test somut olsun (ör. "her gün 20 soru + hata defteri").
- konular listesinde tekrar_eden=true olan konular birden fazla denemede yanlış yapılmıştır: önceliği bunlara ver, gerekçede kaç denemede yanlış yapıldığını (yanlis_sinav) belirt. Yalnızca tek denemede yanlış olan konular için "olası eksik" de ve mini_test ile doğrulat, kesin eksik deme.
- dersler içinde kurumun_altinda=true ise öğrencinin başarı yüzdesi kurum ortalamasının altındadır; veride yüzdeler varsa bunu yorumuna kat.
- Hedef bilgisi verilmediği için hedef farkı hakkında yorum yapma; veri_notu'nda hedefin tanımlanmadığını belirt.
- istek_sahibi "KOC" ise koc_basliklari alanına görüşmede ele alınabilecek 3-5 akademik başlık yaz; "OGRENCI" ise boş liste ver.`;

const S = { type: "STRING" };
const SA = { type: "ARRAY", items: S };
const SCHEMA = {
  type: "OBJECT",
  properties: {
    ozet: S, egilim: S,
    ders_yorumlari: { type: "ARRAY", items: { type: "OBJECT", properties: { ders: S, yorum: S }, required: ["ders", "yorum"] } },
    guclu_yonler: SA, gelistirilecek_alanlar: SA,
    oncelikler: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          ders: S, konu: { type: "STRING", nullable: true },
          seviye: { type: "STRING", enum: ["YUKSEK", "ORTA", "DUSUK"] },
          kanit_turu: { type: "STRING", enum: ["KONU_VERISI", "DERS_NETI"] },
          gerekce: S, calisma_yontemi: S, miktar: S, mini_test: S,
        },
        required: ["ders", "seviye", "kanit_turu", "gerekce", "calisma_yontemi", "miktar", "mini_test"],
      },
    },
    veri_notu: S, koc_basliklari: SA,
  },
  required: ["ozet", "egilim", "ders_yorumlari", "guclu_yonler", "gelistirilecek_alanlar", "oncelikler", "veri_notu", "koc_basliklari"],
};

const r2 = (x: number) => Math.round(x * 100) / 100;
const cut = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, n) : "");
const arr = (v: unknown, n: number, m: number) => (Array.isArray(v) ? v.slice(0, n).map((x) => cut(x, m)).filter(Boolean) : []);

// Kayıtlı deneme geçmişinden deterministik istatistikler (Gemini kullanılmaz).
export function buildStats(exams: any[]) {
  const sub: Record<string, { net: number; acc: number | null; oy: number | null; ky: number | null }[]> = {};
  const top: Record<string, { ders: string; konu: string; dogru: number; yanlis: number; bos: number; sinav: number; yanlis_sinav: number; bos_sinav: number }> = {};
  for (const e of exams) {
    for (const s of (e.subjects ?? [])) {
      if (typeof s.net !== "number") continue;
      const t = (s.dogru ?? 0) + (s.yanlis ?? 0) + (s.bos ?? 0);
      const k = e.exam_type + " " + s.ders;
      (sub[k] ??= []).push({ net: s.net, acc: s.dogru != null && t > 0 ? r2(s.dogru / t) : null, oy: typeof s.ogrenci_yuzde === "number" ? s.ogrenci_yuzde : null, ky: typeof s.kurum_yuzde === "number" ? s.kurum_yuzde : null });
    }
    for (const t of (e.topics ?? [])) {
      const k = e.exam_type + "|" + t.ders + "|" + t.konu;
      const o = (top[k] ??= { ders: e.exam_type + " " + t.ders, konu: t.konu, dogru: 0, yanlis: 0, bos: 0, sinav: 0, yanlis_sinav: 0, bos_sinav: 0 });
      o.dogru += t.dogru ?? 0; o.yanlis += t.yanlis ?? 0; o.bos += t.bos ?? 0; o.sinav++;
      if ((t.yanlis ?? 0) > 0) o.yanlis_sinav++;
      if ((t.bos ?? 0) > 0) o.bos_sinav++;
    }
  }
  const dersler = Object.entries(sub).map(([ders, a]) => {
    const nets = a.map((x) => x.net), n = nets.length, son = nets[n - 1], onceki = n > 1 ? nets[n - 2] : null;
    let egilim: string | null = null;
    if (n >= 3) {
      const mx = (n - 1) / 2, my = nets.reduce((p, c) => p + c, 0) / n;
      let num = 0, den = 0;
      nets.forEach((y, i) => { num += (i - mx) * (y - my); den += (i - mx) ** 2; });
      const sl = num / den;
      egilim = sl > 0.5 ? "yükseliyor" : sl < -0.5 ? "düşüyor" : "yatay";
    }
    const accs = a.map((x) => x.acc).filter((x): x is number => x != null);
    return {
      ders, deneme_sayisi: n, son_net: son, onceki_net: onceki, fark: onceki == null ? null : r2(son - onceki),
      ortalama_net: r2(nets.reduce((p, c) => p + c, 0) / n), en_iyi_net: Math.max(...nets), egilim,
      ortalama_dogruluk: accs.length ? r2(accs.reduce((p, c) => p + c, 0) / accs.length) : null,
      son_ogrenci_yuzde: a[n - 1].oy, son_kurum_yuzde: a[n - 1].ky,
      kurumun_altinda: a[n - 1].oy != null && a[n - 1].ky != null ? a[n - 1].oy! < a[n - 1].ky! : null,
    };
  });
  const konular = Object.values(top).map((o) => {
    const t = o.dogru + o.yanlis + o.bos;
    return { ...o, soru: t, dogruluk: t ? r2(o.dogru / t) : null, tekrar_eden: o.yanlis_sinav >= 2 };
  }).filter((o) => o.soru > 0 && (o.yanlis + o.bos) > 0)
    .sort((a, b) => b.yanlis_sinav - a.yanlis_sinav || (b.yanlis + b.bos) - (a.yanlis + a.bos) || (a.dogruluk ?? 1) - (b.dogruluk ?? 1)).slice(0, 40);
  const denemeler = exams.map((e) => ({ ad: e.exam_name, tarih: e.exam_date, tur: e.exam_type, toplam_net: e.total_net, puan: e.score, siralama: e.rank }));
  return { deneme_sayisi: exams.length, denemeler: denemeler.slice(-12), dersler, konu_verisi_var: Object.keys(top).length > 0, konular, tekrar_eden_konular: konular.filter((o) => o.tekrar_eden).slice(0, 15) };
}

function clean(r: any, coach: boolean) {
  return {
    ozet: cut(r?.ozet, 600), egilim: cut(r?.egilim, 600),
    ders_yorumlari: (Array.isArray(r?.ders_yorumlari) ? r.ders_yorumlari : []).slice(0, 20).map((d: any) => ({ ders: cut(d?.ders, 80), yorum: cut(d?.yorum, 400) })),
    guclu_yonler: arr(r?.guclu_yonler, 8, 300), gelistirilecek_alanlar: arr(r?.gelistirilecek_alanlar, 8, 300),
    oncelikler: (Array.isArray(r?.oncelikler) ? r.oncelikler : []).slice(0, 5).map((o: any) => ({
      ders: cut(o?.ders, 80), konu: o?.konu ? cut(o.konu, 100) : null,
      seviye: ["YUKSEK", "ORTA", "DUSUK"].includes(o?.seviye) ? o.seviye : "ORTA",
      kanit_turu: o?.kanit_turu === "KONU_VERISI" ? "KONU_VERISI" : "DERS_NETI",
      gerekce: cut(o?.gerekce, 500), calisma_yontemi: cut(o?.calisma_yontemi, 400), miktar: cut(o?.miktar, 200), mini_test: cut(o?.mini_test, 400),
    })),
    veri_notu: cut(r?.veri_notu, 500), koc_basliklari: coach ? arr(r?.koc_basliklari, 6, 300) : [],
  };
}

let RESOLVED: string | null = null;
const GURL = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

// Ayarlı model bulunamazsa (404), anahtarın erişebildiği en yeni kararlı "flash" modelini seçer.
async function pickModel(key: string): Promise<string | null> {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
  if (!r.ok) return null;
  const j = await r.json();
  const names: string[] = (j?.models ?? []).filter((m: any) => (m?.supportedGenerationMethods ?? []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  const ver = (n: string) => parseFloat(n.match(/^gemini-(\d+(?:\.\d+)?)-flash$/)?.[1] ?? "0");
  const ok = names.filter((n) => /^gemini-\d+(\.\d+)?-flash$/.test(n)).sort((a, b) => ver(b) - ver(a));
  return ok[0] ?? (names.includes("gemini-flash-latest") ? "gemini-flash-latest" : null);
}

async function errDetail(r: Response): Promise<string> {
  try { const m = String(JSON.parse(await r.text())?.error?.message ?? "").replace(/[\u0000-\u001f<>]/g, " ").slice(0, 160); return m ? " " + m : ""; } catch { return ""; }
}

async function gemini(key: string, facts: unknown, role: string) {
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify({ istek_sahibi: role, veriler: facts }) }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.3 },
  });
  const send = (m: string) => fetch(GURL(m), { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: payload });
  let r = await send(RESOLVED ?? MODEL);
  if (r.status === 404 && !RESOLVED) {
    const alt = await pickModel(key);
    if (alt && alt !== MODEL) { RESOLVED = alt; r = await send(alt); }
  }
  if (r.status === 429) throw { code: 429, msg: "Yapay zekâ kotası doldu, biraz sonra tekrar dene." };
  if (!r.ok) throw { code: 502, msg: `Yapay zekâ hizmeti hata verdi (${r.status}).` + await errDetail(r) };
  const j = await r.json();
  const t = (j?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("");
  try { return JSON.parse(t); } catch { throw { code: 502, msg: "Yapay zekâ yanıtı okunamadı, tekrar dene." }; }
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return J({ error: "Yalnızca POST kabul edilir." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), pk = Deno.env.get("APP_PUBLISHABLE_KEY"), gk = Deno.env.get("GEMINI_API_KEY");
  if (!url || !pk || !gk) return J({ error: "Sunucu yapılandırması eksik." }, 500);
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(url, pk, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await sb.auth.getUser(auth.replace(/^Bearer /i, ""));
  const user = u?.user;
  if (!user) return J({ error: "Giriş gerekli." }, 401);
  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = prof?.role;
  if (role !== "student" && role !== "coach") return J({ error: "Yetkisiz." }, 403);
  let body: any = {};
  try { body = await req.json(); } catch { /* boş gövde */ }

  // Bağlantı testi (yalnızca koç): anahtarı ve model adını doğrular, anahtarı asla döndürmez.
  if (body?.ping) {
    if (role !== "coach") return J({ error: "Yetkisiz." }, 403);
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": gk } });
    if (!r.ok) return J({ ok: false, status: r.status, model: MODEL, hata: "Gemini anahtarı kabul edilmedi veya servis erişilemiyor." });
    const j = await r.json();
    const names: string[] = (j?.models ?? []).filter((m: any) => (m?.supportedGenerationMethods ?? []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
    return J({ ok: true, model: MODEL, model_kullanilabilir: names.includes(MODEL), flash_modeller: names.filter((n) => /flash/.test(n)).slice(0, 15) });
  }

  // Öğrenci yalnızca kendini; koç student_id ile istediği öğrenciyi (RLS koçun erişimini zaten sınırlar).
  const sid = role === "student" ? user.id : String(body?.student_id ?? "");
  if (!UUID.test(sid)) return J({ error: "Öğrenci belirtilmedi." }, 400);

  const { data: exams, error } = await sb.from("exam_results")
    .select("exam_name,exam_date,exam_type,total_net,score,rank,subjects,topics,created_at")
    .eq("student_id", sid).order("exam_date", { ascending: true }).order("created_at", { ascending: true });
  if (error) return J({ error: "Veri okunamadı." }, 500);
  const list = exams ?? [];
  if (!list.length) return J({ error: "Henüz kayıtlı deneme sonucu yok." }, 404);

  const stats = buildStats(list);
  if (!body?.force) {
    const { data: c } = await sb.from("ai_reports").select("exam_count,content,updated_at").eq("student_id", sid).maybeSingle();
    if (c && c.exam_count === list.length && c.content?.report) return J({ ...c.content, stats, cached: true, updated_at: c.updated_at });
  }

  const day = new Date().toISOString().slice(0, 10), limit = role === "coach" ? LIMIT_COACH : LIMIT_STUDENT;
  const { data: us } = await sb.from("ai_usage").select("n").eq("student_id", user.id).eq("day", day).eq("kind", "insights").maybeSingle();
  const n = us?.n ?? 0;
  if (n >= limit) return J({ error: `Günlük analiz sınırına ulaşıldı (${limit}). Yarın tekrar dene.` }, 429);

  try {
    const raw = await gemini(gk, stats, role === "coach" ? "KOC" : "OGRENCI");
    const report = clean(raw, role === "coach");
    await sb.from("ai_usage").upsert({ student_id: user.id, day, kind: "insights", n: n + 1 });
    // Önbelleğe koç başlıkları yazılmaz: öğrenci de bu satırı okuyabilir.
    await sb.from("ai_reports").upsert({ student_id: sid, exam_count: list.length, content: { report: { ...report, koc_basliklari: [] }, stats }, updated_at: new Date().toISOString() });
    return J({ report, stats, cached: false, model: RESOLVED ?? MODEL });
  } catch (e: any) {
    return J({ error: e?.msg ?? "Beklenmeyen hata." }, e?.code ?? 500);
  }
}

Deno.serve(handler);
