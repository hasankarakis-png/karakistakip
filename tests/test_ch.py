import sys,subprocess,time
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen','srv = None and subprocess.Popen'))
srv=subprocess.Popen([sys.executable,"-m","http.server","8768","--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
URL="http://127.0.0.1:8768/index.html"
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for nm,vp in [("m",{"width":390,"height":844}),("d",{"width":1366,"height":860})]:
        ctx=b.new_context(viewport=vp,service_workers="block",device_scale_factor=2 if nm=="m" else 1);setup(ctx,"coach");page=ctx.new_page()
        page.on("pageerror",lambda e:errs.append(str(e)))
        page.goto(URL);page.wait_for_selector(".kst");page.wait_for_timeout(4700)
        ov=txt(page,".ch-ov")
        check("Yeni süre yarışması v2" in ov and "Ayşe Y." in ov,f"[{nm}] Genel bakışta aktif yarışma kartı ve ilk üç: {ov[:80]!r}")
        if nm=="m": page.screenshot(path=f"{SHOTS}/ch-genel-m.png")
        check(page.query_selector(".side-nav [data-cp='c']") is not None,f"[{nm}] Menüde Yarışmalar var")
        page.click(".ch-ov");page.wait_for_timeout(500)
        check(page.query_selector("#coach-challenges") is not None,f"[{nm}] Yarışmalar sayfası açıldı")
        t=page.inner_text("#coach-challenges")
        check("Yeni yarışma" in t and "Süre şampiyonluğu" in t and "Ayşe Y." in t,f"[{nm}] Sayfada oluşturma formu, liste ve sıralama var")
        page.screenshot(path=f"{SHOTS}/ch-sayfa-{nm}.png",full_page=True)
        page.go_back();page.wait_for_timeout(400)
        check(page.query_selector("#coach-overview") is not None,f"[{nm}] Geri: Genel bakışa döndü")
        if nm=="m":
            page.click("#sbtog");page.wait_for_timeout(300);page.click(".side-nav [data-cp='c']");page.wait_for_timeout(400)
            check(page.query_selector("#coach-challenges") is not None,"[m] Menüden Yarışmalar açıldı")
            check(not page.evaluate("document.body.classList.contains('sbopen')"),"[m] Menüden seçince menü kapandı")
            page.go_back();page.wait_for_timeout(400)
            check(page.query_selector("#coach-overview") is not None,"[m] Menüden açılan sayfadan tek geriyle Genel bakışa")
            page.go_forward();page.wait_for_timeout(400)
            page.click("#coach-challenges [data-chsel='1']");page.wait_for_timeout(400)
            check("Süre şampiyonluğu · sıralama" in page.inner_text("#coach-challenges"),"[m] Eski yarışma seçilip sıralaması açıldı")
        ctx.close()
    b.close()
srv.terminate()
print("JS hataları:",errs or "yok")
