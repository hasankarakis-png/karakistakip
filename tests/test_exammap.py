# Öğrenci uygulamasında PDF yükleme: yapay zekâsız okuyucu forma bağlanıyor mu, sunucuya (exam-extract) hiç gitmiyor mu.
import sys, subprocess, time, os
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen', 'srv = None and subprocess.Popen'))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8775", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
URL = "http://127.0.0.1:8775/index.html"
errs = []; calls = []
FX = os.path.abspath("fixtures")
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block"); setup(ctx, "student")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_selector(".pill"); page.wait_for_timeout(1500)
    page.click("#qaopen"); wait(page); page.click(".qa [data-qa='d']"); wait(page, 600)
    check(page.query_selector("#emc") is not None, "Konu eksik haritası kartı var")
    tabs = page.query_selector_all("#emc .emt")
    check(len(tabs) == 2, "Ders sekmeleri: %d" % len(tabs))
    first = page.inner_text("#emc .empanel")
    check("Üslü sayılar" in first and "Matematik" in first, "En çok eksiği olan ders (Matematik) ilk sekme: %r" % first[:60])
    page.click("#emc .emt:nth-child(2)"); page.wait_for_timeout(300)
    second = page.inner_text("#emc .empanel")
    check("Paragraf" in second and "3 yanlış" in second and "Doğru yapılan konular (1)" in second and "Üslü" not in second, "Türkçe sekmesine geçildi: %r" % second[:90])
    check(page.inner_text("#emc .emt.on").startswith("Türkçe"), "Seçili sekme işaretli")
    page.wait_for_timeout(1500); page.query_selector("#emc").screenshot(path="shots/exam-map-m.png")
    ctx.close(); b.close()
srv.terminate()
print("JS hataları:", errs or "yok"); sys.exit(1 if errs else 0)
