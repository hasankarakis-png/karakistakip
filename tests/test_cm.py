import sys,subprocess,time
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen','srv = None and subprocess.Popen'))
srv=subprocess.Popen([sys.executable,"-m","http.server","8769","--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
URL="http://127.0.0.1:8769/index.html"
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={"width":1366,"height":860},service_workers="block");setup(ctx,"coach");page=ctx.new_page()
    page.on("pageerror",lambda e:errs.append(str(e)))
    page.on("dialog",lambda d:d.accept())
    page.goto(URL);page.wait_for_selector(".kst");page.wait_for_timeout(4700)
    page.click(".ch-ov");page.wait_for_timeout(600)
    check(page.query_selector("#coach-challenges [data-chman]") is not None,"Koç yarışma kartında “Elle süre ekle” düğmesi var")
    page.click("#coach-challenges [data-chman]");page.wait_for_timeout(300)
    check(page.query_selector("#cmst") is not None and page.query_selector("#cmh") is not None and page.query_selector("#cmm") is not None,"Form açıldı: öğrenci, saat, dakika alanları")
    # öğrenci seçmeden kaydet
    page.click("#cmsave");page.wait_for_timeout(300)
    check("Önce öğrenciyi seç" in page.inner_text("#coach-challenges"),"Öğrenci seçilmeden kayıt reddedildi")
    page.select_option("#cmst","s1");page.fill("#cmh","2");page.fill("#cmm","30")
    page.click("#cmsave");page.wait_for_timeout(500)
    t=page.inner_text("#coach-challenges")
    check("Kaydedildi" in t and "2 sa 30 dk" in t,f"Elle giriş kaydedildi ve listede görünüyor: {t[-160:]!r}")
    calls=page.evaluate("window.__CALLS")
    check("challenge_manual:upsert" in calls,"challenge_manual tablosuna upsert gitti")
    check(any(c.startswith("rpc:challenge_board") for c in calls[calls.index("challenge_manual:upsert"):]),"Kayıttan sonra sıralama yeniden yüklendi")
    # aynı öğrenci+gün tekrar: yerine geçer, çift satır olmaz
    page.select_option("#cmst","s1");page.fill("#cmh","3");page.fill("#cmm","0")
    page.click("#cmsave");page.wait_for_timeout(500)
    n=page.eval_on_selector_all("#coach-challenges [data-chmdel]","e=>e.length")
    check(n==1 and "3 sa 0 dk" in page.inner_text("#coach-challenges"),f"Aynı gün tekrar girince değer güncellendi (satır sayısı {n})")
    # geçersiz süre
    page.select_option("#cmst","s1");page.fill("#cmh","0");page.fill("#cmm","0")
    page.click("#cmsave");page.wait_for_timeout(300)
    check("1 dakika ile 24 saat" in page.inner_text("#coach-challenges"),"Sıfır süre reddedildi")
    # sil
    page.click("#coach-challenges [data-chmdel]");page.wait_for_timeout(500)
    check(page.query_selector("#coach-challenges [data-chmdel]") is None and "Elle giriş silindi" in page.inner_text("#coach-challenges"),"Elle giriş silindi")
    page.screenshot(path=f"{SHOTS}/ch-elle-d.png",full_page=True)
    ctx.close()
    # öğrenci tarafında düğme yok
    ctx=b.new_context(viewport={"width":390,"height":844},service_workers="block");setup(ctx,"student");page=ctx.new_page()
    page.on("pageerror",lambda e:errs.append(str(e)))
    page.goto(URL);page.wait_for_timeout(1500)
    page.evaluate("tab='y';render()");page.wait_for_timeout(500)
    check(page.query_selector("[data-chman]") is None and page.query_selector("#cmst") is None,"Öğrenci ekranında elle giriş yok")
    ctx.close()
    b.close()
srv.terminate()
print("JS hataları:",errs or "yok")
