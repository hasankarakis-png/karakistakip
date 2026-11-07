import os, sys, subprocess, time, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.dirname(os.path.abspath(__file__))
MOCK = open(os.path.join(SP, "mock-supabase.js")).read().replace("exam_calendar:[", "deneme_plan:[{code:\"261113|T|Nitelik TYT 2 2027\"},{code:\"261204|A|Limit AYT 3 2027\"},{code:\"261218|T|Alternatif TYT 2 2027\"},{code:\"270121|T|Aday TYT 2 2027\"},{code:\"270226|A|Limit AYT 4 2027\"},{code:\"270409|A|Tözok AYT 4 2027\"},{code:\"270611|A|Nitelik AYT 6 2027\"}],exam_calendar:[", 1)
SHOTS = os.path.join(SP, "shots"); os.makedirs(SHOTS, exist_ok=True)

srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
URL = "http://127.0.0.1:8765/index.html"
fails = []
def check(cond, msg):
    print(("OK   " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)

def setup(ctx, role):
    ctx.add_init_script(f"localStorage.setItem('__role','{role}');localStorage.setItem('karakis-rehber-s1','1');if(!window.__ONB)localStorage.setItem('karakis-onb-v1-s1',JSON.stringify({{t:Date.now()}}));")
    ctx.route("**/supabase.js*", lambda r: r.fulfill(status=200, content_type="application/javascript", body=MOCK))
    ctx.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    ctx.route("**/challenges.cloudflare.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))
    def fn(r):
        u=r.request.url
        if "task-plan" in u:
            import json as _j
            b=_j.loads(r.request.post_data or "{}");d=b.get("days",[])
            r.fulfill(status=200,content_type="application/json",body=_j.dumps({"plan":{"ozet":"Matematik ve Türkçe farklı günlere yayıldı.","atamalar":[{"id":1,"tarih":d[0],"neden":"en eski görev"},{"id":2,"tarih":d[-1]}]},"kaynak":"ai"}))
        elif "wa-send" in u: r.fulfill(status=200,content_type="application/json",body='{"configured":false,"template":false}')
        else: r.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route("**/functions/v1/**", fn)

def wait(page, ms=350): page.wait_for_timeout(ms)
def txt(page, sel):
    el = page.query_selector(sel); return el.inner_text() if el else ""
def st(page): return page.evaluate("history.state")

with sync_playwright() as p:
    b = p.chromium.launch()
    errs = []
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", device_scale_factor=1)
    setup(ctx, "student")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("console", lambda m: m.type=="error" and errs.append(m.text)); page.on("dialog", lambda d: d.accept())
    page.goto(URL); page.wait_for_selector(".pill"); page.wait_for_timeout(5600)
    page.evaluate("render()"); wait(page)
    page.click(".pn[data-tab='d']"); wait(page, 500)
    check(page.query_selector(".dt-stu") is None, "Analiz → Özet sekmesinde kart yok")
    page.click("[data-ant='n']"); wait(page, 900)
    check(page.query_selector(".dt-stu") is not None, "Analiz → Denemeler'de Yaklaşan denemeler kartı var")
    n = len(page.query_selector_all(".dt-stu .dt-ln"))
    check(n == 5, f"varsayılan olarak yaklaşan 5 deneme gösteriliyor (bulunan {n})")
    first = txt(page, ".dt-stu .dt-ln")
    check("13 Kas" in first and "Nitelik TYT 2 2027" in first, "ilk satır en yakın deneme: " + first.replace("\n", " "))
    check(page.query_selector(".dt-stu [data-dtstu]") is not None, "Tüm takvimi göster düğmesi var")
    page.click(".dt-stu [data-dtstu]"); wait(page, 400)
    n2 = len(page.query_selector_all(".dt-stu .dt-ln")); m2 = len(page.query_selector_all(".dt-stu .dt-mm"))
    check(n2 == 7 and m2 >= 3, f"tüm takvim ay ay açıldı ({n2} deneme, {m2} ay)")
    check(page.query_selector(".dt-stu [data-dtp]") is None, "öğrenci deneme işaretleyemez (düğme yok)")
    check(page.query_selector("#exf") is not None, "mevcut Deneme sonuçlarım kartı yerinde")
    page.screenshot(path=f"{SHOTS}/deneme-ogrenci.png", full_page=True)
    sw = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check(sw <= 1, f"telefonda yatay taşma yok (fark {sw})")
    page.click("[data-ant='o']"); wait(page, 400)
    check(page.query_selector(".dt-stu") is None, "Özet'e dönünce kart kayboldu")
    ctx.close(); b.close()

srv.terminate()
print("\nJS hataları:", errs if errs else "yok")
print("SONUÇ:", "HEPSİ GEÇTİ" if not fails and not errs else f"{len(fails)} başarısız")
