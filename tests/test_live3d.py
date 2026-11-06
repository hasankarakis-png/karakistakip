import os, sys, subprocess, time, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.dirname(os.path.abspath(__file__))
MOCK = open(os.path.join(SP, "mock-supabase.js")).read()
SHOTS = os.path.join(SP, "shots"); os.makedirs(SHOTS, exist_ok=True)

srv = subprocess.Popen([sys.executable, "-m", "http.server", "8774", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
URL = "http://127.0.0.1:8774/index.html"
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
    b = p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    errs = []
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", device_scale_factor=1)
    setup(ctx, "coach")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_selector(".kst", timeout=8000); wait(page, 600)
    page.click("#sbtog"); wait(page)
    page.click(".side-nav [data-cp='v']"); wait(page, 600)
    check(page.query_selector("#coach-live") is not None, "Canlı pano açıldı")
    check(page.query_selector("[data-l3='3']") is not None, "Liste/3B düğmesi var")
    check(len(page.query_selector_all(".lv-col")) == 5, "Varsayılan liste görünümü (5 kolon)")
    page.click("[data-l3='3']", timeout=5000); wait(page, 2500)
    check(page.evaluate("localStorage.getItem('karakis-live3d')") == "3", "3B seçimi hatırlandı")
    check(page.query_selector(".l3-stage canvas") is not None, "3B tuval çizildi")
    check(page.query_selector(".lv-col") is None, "3B açıkken kolon listesi gizli")
    rd = txt(page, "#l3rd")
    check("Kaydı aç" in rd and ":" in rd, f"Özet satırı öğrenci ve süreyi gösteriyor ({rd[:50]!r})")
    t1 = page.evaluate("document.querySelector('#l3rd [data-lv]').textContent"); wait(page, 2200)
    t2 = page.evaluate("document.querySelector('#l3rd [data-lv]').textContent")
    study = page.evaluate("roster().some(x=>x.st==='study')")
    check((not study) or t1 != t2, f"derste öğrencinin süresi akıyor ({t1} → {t2})")
    page.click("[data-l3m='q']"); wait(page, 400)
    check(page.query_selector("[data-l3m='q'][aria-pressed='true']") is not None, "Soru ölçütüne geçti")
    page.focus(".l3-stage"); before = txt(page, ".l3-who b"); page.keyboard.press("ArrowRight"); wait(page, 300)
    after = txt(page, ".l3-who b")
    check(after != "" and (after != before or page.evaluate("roster().length")==1), f"Ok tuşu öğrenciyi değiştirdi ({before} → {after})")
    page.evaluate("render()"); wait(page, 800)
    check(page.query_selector(".l3-stage canvas") is not None, "render() sonrası tuval yeni kutuda")
    page.screenshot(path=f"{SHOTS}/live3d.png", full_page=True)
    page.click(".l3-open"); wait(page, 600)
    check(page.query_selector("#coach-live") is None, "Kaydı aç öğrenci kaydını açtı")
    page.go_back(); wait(page, 600)
    check(page.query_selector("#coach-live") is not None, "Geri tuşu Canlı pano'ya döndürdü")
    page.click("[data-l3='2']", timeout=5000); wait(page, 500)
    check(len(page.query_selector_all(".lv-col")) == 5 and page.query_selector(".l3-stage") is None, "Listeye dönüş")
    b.close()

srv.terminate()
print("\nJS hataları:", errs if errs else "yok")
print("FAIL:", fails or "yok")
