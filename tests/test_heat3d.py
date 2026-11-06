import sys,subprocess,time
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen','srv = None and subprocess.Popen'))
srv=subprocess.Popen([sys.executable,"-m","http.server","8772","--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
URL="http://127.0.0.1:8772/index.html"
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    ctx=b.new_context(viewport={"width":390,"height":844},service_workers="block");setup(ctx,"student")
    ctx.add_init_script("window.__CLEAN=1")
    page=ctx.new_page();page.on("pageerror",lambda e:errs.append(str(e)));page.on("dialog",lambda d:d.accept())
    page.goto(URL);page.wait_for_selector(".pill");page.wait_for_timeout(4700)
    E=page.evaluate
    E("tab='d';ANT='o';render()");page.wait_for_timeout(600)
    # Analiz özetinde ısı haritası katlanmış olabilir: kartı aç
    E("document.querySelectorAll('[data-sxfold=\"heat\"]').forEach(b=>{if(b.getAttribute('aria-expanded')==='false')b.click()})");page.wait_for_timeout(400)
    check(page.query_selector(".h3-tg") is not None,"2B/3B düğmesi var")
    check(page.query_selector(".hm button") is not None,"Varsayılan 2B ızgara çiziliyor")
    print("diag fold:",E("[...document.querySelectorAll('[data-sxfold]')].map(b=>b.dataset.sxfold+':'+b.getAttribute('aria-expanded'))"),E("(()=>{const b=document.querySelector('[data-h3=\"3\"]');if(!b)return 'yok';const r=b.getBoundingClientRect();return [r.width,r.height]})()"))
    page.click("[data-h3='3']",timeout=5000);page.wait_for_timeout(2500)
    E("document.querySelectorAll('[data-sxfold=\"heat\"]').forEach(b=>{if(b.getAttribute('aria-expanded')==='false')b.click()})");page.wait_for_timeout(1200)
    check(E("localStorage.getItem('karakis-heat3d')")=="3","3B seçimi hatırlandı")
    st=page.query_selector("#h3stage")
    check(st is not None,"3B kutusu var")
    if st:
        check(st.query_selector("canvas") is not None,"3B tuval çizildi")
        bx=st.bounding_box()
        check(bx and bx["height"]>=200,"3B kutu yüksekliği yeterli")
        page.screenshot(path=f"{SHOTS}/heat3d.png",full_page=True)
        # render sonrası tuval korunuyor
        E("render()");page.wait_for_timeout(600)
        check(E("!!document.querySelector('#h3stage canvas')"),"render() sonrası tuval yeni kutuda")
        # çubuğa dokunma HMSEL'i seçer
        page.wait_for_timeout(1500)
        bx=page.query_selector("#h3stage").bounding_box()
        hit=None
        for fx in (.5,.45,.55,.4,.6,.35,.65,.3,.7,.25,.75,.2,.8):
            for fy in (.75,.7,.65,.6,.55,.8,.5,.85,.45):
                E("HMSEL=null")
                page.mouse.click(bx["x"]+bx["width"]*fx,bx["y"]+bx["height"]*fy);page.wait_for_timeout(300)
                if E("HMSEL"):hit=E("HMSEL");break
            if hit:break
        check(bool(hit),f"Çubuğa dokunmak günü seçti (HMSEL={hit})")
    page.click("[data-h3='2']",timeout=5000);page.wait_for_timeout(500)
    check(page.query_selector("#h3stage") is None and page.query_selector(".hm button") is not None,"2B'ye dönüş")
    b.close()
srv.terminate()
print("JS hataları:",errs or "yok")
print("FAIL:",fails or "yok")
