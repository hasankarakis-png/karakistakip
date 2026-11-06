import sys,subprocess,time
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen','srv = None and subprocess.Popen'))
srv=subprocess.Popen([sys.executable,"-m","http.server","8771","--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
URL="http://127.0.0.1:8771/index.html"
MOCK=MOCK.replace('{id:2,title:"Yeni süre yarışması v2",metric:"minutes"','{id:2,title:"Yeni süre yarışması v2",mode:"points",metric:"minutes"')
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    for role in ["coach","student"]:
        ctx=b.new_context(viewport={"width":390,"height":844},service_workers="block");setup(ctx,role);page=ctx.new_page()
        page.on("pageerror",lambda e:errs.append(str(e)))
        page.goto(URL);page.wait_for_selector(".kst, .app, body");page.wait_for_timeout(1500)
        if role=="coach":
            page.evaluate("typeof go==='function'")
            try: page.click(".ch-ov",timeout=6000)
            except Exception as e: print("ch-ov yok",e)
            page.wait_for_timeout(500)
            try: page.click("#coach-challenges [data-chsel='2'][aria-expanded='false']",timeout=1500)
            except Exception: pass
        else:
            try: page.click("[data-tab='y']",timeout=3000)
            except Exception: print("öğrenci yarış sekmesi bulunamadı")
        page.wait_for_timeout(3500)
        root=page.query_selector("[data-pbroot]")
        check(root is not None,f"[{role}] Puan panosu bağlandı")
        if root:
            html=page.inner_html("[data-pbroot]")
            check(len(page.query_selector_all(".pb-row"))>=3,f"[{role}] Satırlar var")
            check("Ayşe" in html,f"[{role}] Kendi adı görünüyor")
            check("Zeynep" not in html and "Mehmet" not in html,f"[{role}] Başkalarının gerçek adı DOM'da yok")
            check(page.query_selector("[data-pbroot] canvas") is not None,f"[{role}] Canvas (grafik/3B) var")
            page.screenshot(path=f"{SHOTS}/pb-{role}.png",full_page=True)
        ctx.close()
    b.close()
srv.terminate()
print("JS hataları:",errs or "yok")
print("FAIL:",fails or "yok")
