import os, sys, subprocess, time, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.dirname(os.path.abspath(__file__))
MOCK = open(os.path.join(SP, "mock-supabase.js")).read()
SHOTS = os.path.join(SP, "shots"); os.makedirs(SHOTS, exist_ok=True)

srv = subprocess.Popen([sys.executable, "-m", "http.server", "8775", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
URL = "http://127.0.0.1:8775/index.html"
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
    page.goto(URL); page.wait_for_selector(".kst", timeout=8000); wait(page, 4700)
    page.click(".ch-ov"); wait(page, 700)
    check(page.query_selector("#coach-challenges") is not None, "Yarışmalar sayfası açıldı")
    check(page.query_selector("[data-c3='3']") is not None, "Liste/3B düğmesi var")
    check(page.query_selector("#coach-challenges [data-chbd]") is not None, "Varsayılan liste görünümü")
    page.click("[data-c3='3']", timeout=5000); wait(page, 2500)
    check(page.evaluate("localStorage.getItem('karakis-ch3d')") == "3", "3B seçimi hatırlandı")
    check(page.query_selector(".c3-stage canvas") is not None, "3B tuval çizildi")
    check(page.query_selector("#coach-challenges [data-chbd]") is None, "3B açıkken liste kutusu yok")
    rd = txt(page, "#c3rd")
    check("Ayşe" in rd and ":" in rd, f"Özet satırı lideri ve süreyi gösteriyor ({rd[:60]!r})")
    t1 = page.evaluate("document.querySelector('#c3rd .l3-nums b').textContent"); wait(page, 2300)
    t2 = page.evaluate("document.querySelector('#c3rd .l3-nums b').textContent")
    check(t1 != t2, f"Çalışan öğrencinin süresi akıyor ({t1} -> {t2})")
    page.focus(".c3-stage"); before = txt(page, "#c3rd .l3-who b"); page.keyboard.press("ArrowRight"); wait(page, 300)
    after = txt(page, "#c3rd .l3-who b")
    check(after != "" and after != before, f"Ok tuşu öğrenciyi değiştirdi ({before} -> {after})")
    page.evaluate("render()"); wait(page, 800)
    check(page.query_selector(".c3-stage canvas") is not None, "render() sonrası tuval yeni kutuda")
    # çubuğa dokunmak seçer
    bx = page.query_selector(".c3-stage").bounding_box(); hit = None
    for fx in (.5,.42,.58,.35,.65,.3,.7):
        for fy in (.7,.6,.55,.65,.5,.75):
            page.evaluate("window.__s=null"); cur = txt(page, "#c3rd .l3-who b")
            page.mouse.click(bx["x"]+bx["width"]*fx, bx["y"]+bx["height"]*fy); wait(page, 250)
            if txt(page, "#c3rd .l3-who b") != cur: hit = txt(page, "#c3rd .l3-who b"); break
        if hit: break
    check(bool(hit), f"Sütuna dokunmak öğrenciyi seçti ({hit})")
    page.screenshot(path=f"{SHOTS}/ch3d.png", full_page=True)
    page.click("[data-c3='2']", timeout=5000); wait(page, 500)
    check(page.query_selector(".c3-stage") is None and page.query_selector("#coach-challenges [data-chbd]") is not None, "Listeye dönüş")
    b.close()

srv.terminate()
print("\nJS hataları:", errs if errs else "yok")
print("FAIL:", fails or "yok")
