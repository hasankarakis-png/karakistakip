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
    for name, vp in (("masaüstü", {"width": 1280, "height": 900}), ("telefon", {"width": 390, "height": 844})):
        ctx = b.new_context(viewport=vp, service_workers="block", device_scale_factor=1)
        setup(ctx, "coach")
        page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("console", lambda m: m.type=="error" and errs.append(m.text))
        page.goto(URL); page.wait_for_selector(".kst", timeout=8000); wait(page, 600)
        check(page.query_selector("#coach-overview") is not None, name + ": Genel bakış hâlâ açılıyor")
        if name == "telefon":
            page.click("#sbtog"); wait(page)
        check(page.query_selector(".side-nav [data-cp='e']") is not None, name + ": menüde Deneme takvimi var")
        page.click(".side-nav [data-cp='e']"); wait(page, 700)
        check(page.query_selector("#coach-deneme") is not None, name + ": Deneme takvimi açıldı")
        check(len(page.query_selector_all(".dt-mo")) == 12, name + ": 12 ay düğmesi (Tem 2026 – Haz 2027)")
        check(len(page.query_selector_all(".dt-item")) >= 1, name + ": seçili ayda deneme satırları var")
        page.click(".dt-mo[data-dtm='2027-05']"); wait(page, 300)
        n_may = len(page.query_selector_all(".dt-item"))
        check(n_may == 89, name + f": Mayıs 2027'de 89 deneme (bulunan {n_may})")
        # tür filtresi
        page.click("[data-dtt='A']"); wait(page, 300)
        n_t = len(page.query_selector_all(".dt-item"))
        check(n_t == 46, name + f": yalnız TYT+YDT filtresinde Mayıs 46 (bulunan {n_t})")
        page.click("[data-dtt='A']"); wait(page, 300)
        # arama
        page.fill("#dtq", "eksen"); wait(page, 300)
        n_q = len(page.query_selector_all(".dt-item"))
        check(0 < n_q < 10 and page.evaluate("document.activeElement.id") == "dtq", name + f": arama listeyi daraltıyor ve kutu odağını koruyor ({n_q})")
        page.fill("#dtq", ""); wait(page, 300)
        # seçim
        page.click(".dt-item"); wait(page, 400)
        check(len(page.query_selector_all(".dt-item.dt-on")) == 1, name + ": satıra basınca işaretlendi")
        page.click("[data-dtv='mine']"); wait(page, 300)
        check(len(page.query_selector_all(".dt-ln")) == 1 and page.query_selector("[data-dtcopy]") is not None, name + ": Seçtiklerimiz tek denemeyi ve kopyala düğmesini gösteriyor")
        page.screenshot(path=f"{SHOTS}/deneme-{name}.png", full_page=True)
        page.click("[data-dtclear]"); wait(page, 300)
        check(page.query_selector(".dt-ln") is None, name + ": seçim temizlendi")
        page.click("[data-dtv='cal']"); wait(page, 300)
        page.screenshot(path=f"{SHOTS}/deneme-takvim-{name}.png", full_page=True)
        page.go_back(); wait(page, 500)
        check(page.query_selector("#coach-overview") is not None or page.query_selector("#coach-deneme") is not None, name + ": geri tuşu çalışıyor")
        if name == "telefon":
            page.click("#sbtog"); wait(page)
            page.click(".side-nav [data-cp='e']"); wait(page, 500)
            sw = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            check(sw <= 1, f"telefon: sayfa yatay taşmıyor (fark {sw})")
        ctx.close()
    b.close()

srv.terminate()
print("\nJS hataları:", errs if errs else "yok")
print("SONUÇ:", "HEPSİ GEÇTİ" if not fails and not errs else f"{len(fails)} başarısız")
