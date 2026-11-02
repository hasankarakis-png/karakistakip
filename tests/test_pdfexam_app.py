# Öğrenci uygulamasında PDF yükleme: yapay zekâsız okuyucu forma bağlanıyor mu, sunucuya (exam-extract) hiç gitmiyor mu.
import sys, subprocess, time, os
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen', 'srv = None and subprocess.Popen'))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8774", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
URL = "http://127.0.0.1:8774/index.html"
errs = []; calls = []
FX = os.path.abspath("fixtures")
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block"); setup(ctx, "student")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("request", lambda r: calls.append(r.url) if "exam-extract" in r.url else None)
    page.goto(URL); page.wait_for_selector(".pill"); page.wait_for_timeout(1500)
    page.click("#qaopen"); wait(page); page.click(".qa [data-qa='d']"); wait(page, 400)
    check("PDF'ini yükle: uygulama PDF'i doğrudan okur" in page.inner_text("body"), "Yükleme açıklaması güncel")
    page.set_input_files("#exf", FX + "/sonuc-ornek.pdf"); page.click("#exgo"); page.wait_for_timeout(3500)
    body = page.inner_text("body")
    check("Okunan sonucu kontrol et" in body, "PDF okununca kontrol formu açıldı")
    check(page.input_value("#exn") == "MEBİ TYT 8 DENEME SINAVI" and page.input_value("#exd") == "2026-10-25" and page.input_value("#ext") == "TYT", "Ad, tarih ve tür forma yazıldı")
    check(page.input_value('[data-rx="0"][data-c="0"]') == "30" and page.input_value('[data-rx="0"][data-c="1"]') == "8" and page.input_value('[data-rx="0"][data-c="2"]') == "2", "Türkçe D/Y/B değerleri forma yazıldı")
    check("Toplam net: 70" in body, "Toplam net 70")
    check(len(calls) == 0, "Sunucuya (exam-extract) hiç istek gitmedi: %d" % len(calls))
    page.screenshot(path="shots/pdf-exam-form.png", full_page=True)
    page.click("#excancel"); wait(page, 300)
    check("image/*" not in (page.get_attribute("#exf","accept") or ""), "Dosya seçici yalnızca PDF kabul ediyor")
    page.set_input_files("#exf", FX + "/sonuc-taranmis.pdf"); page.click("#exgo"); page.wait_for_timeout(2500)
    check("okunabilir metin yok" in page.inner_text("#exmsg") and len(calls) == 0, "Taranmış PDF: neden yazıldı, yapay zekâya gitmedi")
    ctx.close(); b.close()
srv.terminate()
print("JS hataları:", errs or "yok"); sys.exit(1 if errs else 0)
