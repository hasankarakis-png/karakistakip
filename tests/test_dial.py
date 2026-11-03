import sys,subprocess,time
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen','srv = None and subprocess.Popen'))
srv=subprocess.Popen([sys.executable,"-m","http.server","8771","--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
URL="http://127.0.0.1:8771/index.html"
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={"width":390,"height":844},service_workers="block",device_scale_factor=2);setup(ctx,"student")
    ctx.add_init_script("window.__CLEAN=1")
    page=ctx.new_page();page.on("pageerror",lambda e:errs.append(str(e)));page.on("dialog",lambda d:d.accept())
    page.goto(URL);page.wait_for_selector(".pill");page.wait_for_timeout(4700)
    page.evaluate("S=fresh();save();render()")
    E=page.evaluate
    page.click("[data-a='wake']");page.wait_for_timeout(600)
    page.click("[data-sxfold='day']");page.wait_for_timeout(300)
    check(len(page.query_selector_all(".dl"))==4,"Dört kadran çizildi (uyku, dikkat, stres, enerji)")
    check(page.query_selector(".dl-off") is not None,"Seçilmemiş kadran soluk durumda")
    # alttaki değere dokunma: eski veri akışıyla aynı
    page.click("[data-dial='str'] .dl-t[data-v='4']");page.wait_for_timeout(700)
    check(E("S.str")==4,"Stres 4'e dokunarak seçildi (S.str=4)")
    check(page.get_attribute("[data-dial='str'] .dl-g","aria-valuetext")=="Yüksek","Kadran değeri 'Yüksek' diyor")
    # sürükleme: yayın en sağ ucuna çek
    def drag(f,fx,fy,tx,ty):
        r=page.query_selector(f"[data-dial='{f}'] .dl-g").bounding_box()
        pt=lambda a,b:(r["x"]+r["width"]*a/200,r["y"]+r["height"]*b/118)
        x0,y0=pt(fx,fy);x1,y1=pt(tx,ty)
        page.mouse.move(x0,y0);page.mouse.down();page.mouse.move((x0+x1)/2,(y0+y1)/2,steps=4);page.mouse.move(x1,y1,steps=4);page.mouse.up();page.wait_for_timeout(700)
    drag("sleep",20,100,180,100)
    check(E("S.sleep")==8.5,f"Uyku yayı sağa çekilince 8+ saat (S.sleep={E('S.sleep')})")
    drag("sleep",180,100,100,20)
    check(E("S.sleep")==6.5,f"Uyku ortaya çekilince 6–7 saat (S.sleep={E('S.sleep')})")
    drag("dist",20,100,20,100)
    check(E("S.dist")==1,"Dikkat dağınıklığı en sola çekilince 1")
    # renk: stres yüksekken sıcak (kırmızı/turuncu), düşükken serin
    page.click("[data-dial='str'] .dl-t[data-v='5']");page.wait_for_timeout(900)
    hot=E("getComputedStyle(document.querySelector(\"[data-dial='str']\")).getPropertyValue('--c')")
    page.click("[data-dial='str'] .dl-t[data-v='1']");page.wait_for_timeout(900)
    cool=E("getComputedStyle(document.querySelector(\"[data-dial='str']\")).getPropertyValue('--c')")
    check(hot!=cool,f"Stres arttıkça renk değişiyor ({cool.strip()} → {hot.strip()})")
    r=lambda s:[int(x) for x in s.strip().replace('rgb(','').replace(')','').split(',')]
    check(r(hot)[0]>r(cool)[0] and r(hot)[1]<r(cool)[1],"Yüksek stres daha kırmızı (R yüksek, G düşük)")
    page.click("[data-dial='sleep'] .dl-t[data-v='8.5']");page.wait_for_timeout(900)
    sb=r(E("getComputedStyle(document.querySelector(\"[data-dial='sleep']\")).getPropertyValue('--c')"))
    page.click("[data-dial='sleep'] .dl-t[data-v='4.5']");page.wait_for_timeout(900)
    sl=r(E("getComputedStyle(document.querySelector(\"[data-dial='sleep']\")).getPropertyValue('--c')"))
    check(sb[2]>sb[0] and sb[2]>sl[2]-1 and sb[0]<sl[0],f"Uyku arttıkça maviye dönüyor ({sl} → {sb})")
    # klavye
    page.focus("[data-dial='en'] .dl-g");page.keyboard.press("ArrowRight");page.wait_for_timeout(500)
    check(E("S.en")==1,"Klavye: boş kadranda → 1'e getirir")
    page.keyboard.press("ArrowRight");page.wait_for_timeout(500)
    check(E("S.en")==2,"Klavye: → bir adım artırır")
    check(E("document.activeElement.classList.contains('dl-g')"),"Klavye odağı yeniden çizimden sonra kadranda kalıyor")
    # günlük durum özeti ve sürükleme sırasında yenileme beklemesi
    check("dolu" in page.inner_text("[data-sxfold='day']"),"Katlanmış özet dolu alan sayısını gösteriyor")
    E("window.DIAL_DRAG=true");check(E("busy()")==True,"Sürüklerken arka plan yenilemesi bekliyor (busy)");E("window.DIAL_DRAG=false")
    page.screenshot(path=f"{SHOTS}/dial.png")
    check(not errs,f"JS hataları: {errs or 'yok'}")
    b.close()
srv.terminate()
print("SONUÇ:","HEPSİ GEÇTİ" if not fails else f"{len(fails)} BAŞARISIZ")
sys.exit(1 if fails else 0)
