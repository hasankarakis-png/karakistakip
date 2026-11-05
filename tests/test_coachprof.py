# v5.0 · Koç profili: doluluk, tanıtım/iletişim, tercihler, güvenlik kartları
import sys, subprocess, time, os, json
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen', 'srv = None and subprocess.Popen'))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8778", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
URL = "http://127.0.0.1:8778/index.html"
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block"); setup(ctx, "coach")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("dialog", lambda d: d.accept())
    page.goto(URL); wait(page, 1200)
    E = page.evaluate
    E("CPG='h';render()"); wait(page, 500)
    check(page.query_selector("#coach-bio") is not None and page.query_selector("#coach-phone") is not None and page.query_selector("#coach-hours") is not None, "Tanıtım ve iletişim alanları var")
    check(page.query_selector("[role=progressbar]") is not None, "Profil doluluk çubuğu var")
    check(page.query_selector("#coach-signout-all") is not None and "hasan" in txt(page, "#coach-signout-all") + page.inner_text("body"), "Güvenlik kartı ve kullanıcı adı var")
    check(page.query_selector("#pwopen") is not None, "Şifre değiştirme satırı hâlâ var")
    page.fill("#coach-bio", "Merhaba, ben koçunuz."); wait(page, 100)
    page.fill("#coach-phone", "0532 111 22 33"); wait(page, 100)
    check(E("coachInfoDraft.bio") == "Merhaba, ben koçunuz." and E("coachInfoDraft.phone") == "0532 111 22 33", "Yazılanlar taslağa işleniyor")
    page.select_option("#coach-home", "s"); wait(page, 100)
    check(E("localStorage.getItem('karakis-coach-home')") == "s", "Açılış sayfası tercihi kaydedildi")
    E("render()"); wait(page, 200)
    check(page.input_value("#coach-bio") == "Merhaba, ben koçunuz.", "Yeniden çizimde yazılan metin silinmedi")
    check(len(errs) == 0, "JS hatası yok: " + str(errs[:2]))
    b.close()
srv.terminate()
print("JS hataları:", errs or "yok")
