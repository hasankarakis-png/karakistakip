import os, sys, subprocess, time, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.dirname(os.path.abspath(__file__))
MOCK = open(os.path.join(SP, "mock-supabase.js")).read()
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

with sync_playwright() as p:
    b = p.chromium.launch()
    errs = []
    for name, vp in (("masaüstü", {"width": 1280, "height": 900}), ("telefon", {"width": 390, "height": 844})):
        ctx = b.new_context(viewport=vp, service_workers="block", device_scale_factor=1)
        setup(ctx, "coach")
        page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("console", lambda m: m.type=="error" and errs.append(m.text))
        page.goto(URL); page.wait_for_selector(".kst", timeout=8000); wait(page, 600)
        check(page.query_selector("#coach-overview") is not None, name + ": Genel bakış hâlâ açılıyor")
        # menüde yeni öğe
        if name == "telefon":
            page.click("#sbtog"); wait(page)
        check(page.query_selector(".side-nav [data-cp='v']") is not None, name + ": menüde Canlı pano var")
        page.click(".side-nav [data-cp='v']"); wait(page, 600)
        check(page.query_selector("#coach-live") is not None, name + ": Canlı pano açıldı")
        check(len(page.query_selector_all(".lv-col")) == 5, name + ": 5 durum kolonu")
        check(len(page.query_selector_all(".lv-stu")) >= 1, name + ": en az bir öğrenci kartı")
        check(page.query_selector(".lv-kpis") is not None, name + ": özet kartları")
        page.screenshot(path=f"{SHOTS}/live-{name}.png", full_page=True)
        # sayaç saniye saniye akıyor mu (derste öğrenci varsa)
        t1 = page.evaluate("[...document.querySelectorAll('[data-lvtot]')].map(e=>e.textContent)[0]")
        wait(page, 2200)
        t2 = page.evaluate("[...document.querySelectorAll('[data-lvtot]')].map(e=>e.textContent)[0]")
        study = page.evaluate("document.querySelectorAll('.lv-col.lv-s .lv-stu').length")
        check(study == 0 or t1 != t2, name + f": toplam süre akıyor ({t1} → {t2}, derste {study})")
        # ölçü değiştir
        page.click("[data-lvm='q']"); wait(page, 400)
        check(page.query_selector("#coach-live") is not None and page.query_selector("[data-lvm='q'][aria-pressed='true']") is not None, name + ": ölçü Çözülen soru'ya geçti, sekme açık kaldı")
        # karta basınca öğrenci kaydı
        page.click(".lv-stu"); wait(page, 600)
        check(page.query_selector(".tbar-w") is not None or page.query_selector("#coach-live") is None, name + ": karta basınca öğrenci kaydı açıldı")
        page.go_back(); wait(page, 500)
        check(page.query_selector("#coach-live") is not None, name + ": geri tuşu Canlı pano'ya döndürdü")
        # geri → genel bakış
        page.go_back(); wait(page, 500)
        check(page.query_selector("#coach-overview") is not None, name + ": bir geri daha Genel bakış")
        # taşma kontrolü (telefonda yatay kaydırma olmamalı)
        if name == "telefon":
            page.click("#sbtog"); wait(page)
            page.click(".side-nav [data-cp='v']"); wait(page, 500)
            sw = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            check(sw <= 1, f"telefon: sayfa yatay taşmıyor (fark {sw})")
        ctx.close()
    b.close()

srv.terminate()
print("\nJS hataları:", errs if errs else "yok")
print("SONUÇ:", "HEPSİ GEÇTİ" if not fails and not errs else f"{len(fails)} başarısız")
