import os, sys, subprocess, time, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.dirname(os.path.abspath(__file__))
MOCK = open(os.path.join(SP, "mock-supabase.js")).read()
SHOTS = os.path.join(SP, "shots"); os.makedirs(SHOTS, exist_ok=True)

srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
URL = "http://127.0.0.1:8765/index.html"
fails = []
def check(cond, msg):
    print(("OK   " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)

def setup(ctx, role):
    ctx.add_init_script(f"localStorage.setItem('__role','{role}');localStorage.setItem('karakis-rehber-s1','1');")
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
    b = p.chromium.launch()
    errs = []
    # ---------- KOÇ, telefon ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", device_scale_factor=2)
    setup(ctx, "coach")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("console", lambda m: m.type=="error" and errs.append(m.text))
    page.goto(URL); page.wait_for_selector(".kst", timeout=8000); wait(page, 600)
    kc = page.inner_text(".kst")
    check("Ayşe Yılmaz" in kc and "Zeynep Kaya" in kc, "Genel bakış: geciken görev kartında öğrenci adları var")
    check("Mehmet Demir" in kc, "Genel bakış: okunmamış mesajda gönderen adı var")
    check(page.query_selector(".sbtog .sbdot") is not None, "Telefon menü düğmesinde bildirim noktası var")
    page.screenshot(path=f"{SHOTS}/1-koc-genel.png", full_page=False)
    # menüyü aç → geri tuşu menüyü kapatmalı
    page.click("#sbtog"); wait(page)
    check(page.evaluate("document.body.classList.contains('sbopen')"), "Menü açıldı")
    page.go_back(); wait(page)
    check(not page.evaluate("document.body.classList.contains('sbopen')"), "Geri tuşu menüyü kapattı")
    check(page.query_selector("#coach-overview") is not None, "Geri sonrası hâlâ Genel bakış")
    # menüden Görev yönetimi
    page.click("#sbtog"); wait(page)
    page.click(".side-nav [data-cp='t']"); wait(page)
    check(page.query_selector("#coach-notifs") is not None, "Görev yönetimi: bildirim kartı görünüyor")
    nt = page.inner_text("#coach-notifs")
    check("Ayşe Yılmaz" in nt and "2 görev gecikti" in nt, "Bildirim: Ayşe'nin 2 geciken görevi adıyla yazıyor")
    check("Zeynep Kaya" in nt and "Kimya mol konusu" in nt, "Bildirim: Zeynep'in geciken görevi başlığıyla yazıyor")
    check("Mehmet Demir" in nt and "deneme sonucum" in nt, "Bildirim: Mehmet'in mesajı önizlemeyle görünüyor")
    check("Ali Çelik" in nt, "Bildirim: uyarılı öğrenci (Ali) listede")
    page.screenshot(path=f"{SHOTS}/2-koc-bildirim.png", full_page=True)
    # Görev yönetimi → geri → Genel bakış (menü kaydı arada boş adım bırakmamalı)
    page.go_back(); wait(page)
    check(page.query_selector("#coach-overview") is not None, "Geri: Görev yönetiminden Genel bakışa döndü (tek basışta)")
    page.go_forward(); wait(page)
    check(page.query_selector("#coach-notifs") is not None, "İleri: tekrar Görev yönetimi")
    # bildirimden öğrenciye
    page.click("#coach-notifs [data-ngo='s1'][data-ndt='g']"); wait(page, 600)
    check(page.query_selector(".tbar-w") is not None, "Öğrenci sayfasında üst çubuk var")
    check("Ayşe Yılmaz" in txt(page, ".tbar"), "Üst çubukta öğrenci adı yazıyor")
    check(txt(page, ".tbar .nbl") == "Görev yönetimi", "Geri düğmesi gideceği yeri yazıyor: " + txt(page, ".tbar .nbl"))
    check(page.query_selector("#detail-tasks") is not None, "Görevler sekmesi açıldı")
    # sekme değiştir (geçmişe kayıt açmamalı), aşağı kaydır, üst çubuk görünür kalmalı
    page.click(".tbar-w [data-dt='a']"); wait(page)
    page.click(".tbar-w [data-dt='o']"); wait(page)
    page.mouse.wheel(0, 1500); wait(page, 500)
    box = page.query_selector(".tbar-w").bounding_box()
    check(box and box["y"] < 5, f"Kaydırınca üst çubuk ekranın üstünde sabit (y={box and round(box['y'])})")
    page.screenshot(path=f"{SHOTS}/3-koc-ogrenci-kaydirilmis.png")
    page.go_back(); wait(page, 500)
    check(page.query_selector("#coach-notifs") is not None, "Telefon geri tuşu: öğrenciden Görev yönetimine döndü (sekmeler araya girmedi)")
    # görünür geri düğmesi
    page.click("#coach-notifs [data-ngo='s3']"); wait(page, 500)
    page.click(".tbar [data-navback]"); wait(page, 500)
    check(page.query_selector("#coach-notifs") is not None, "Görünür ← düğmesi önceki ekrana döndü")
    # yarına kaydır
    page.once("dialog", lambda d: d.accept())
    page.click("#coach-notifs [data-nrs='s3'][data-nrd]:nth-of-type(3)"); wait(page, 600)
    nt2 = page.inner_text("#coach-notifs")
    check("Kimya mol konusu" not in nt2, "Yarına kaydır: Zeynep'in görevi gecikenlerden çıktı")
    # mesaj aç (telefon: liste gizli, geri listeye)
    page.click("#coach-notifs [data-nmsg='s2']"); wait(page, 600)
    check(page.query_selector(".mgrid.th") is not None and not page.is_visible(".mlist"), "Mesaj açıkken telefonda liste gizli")
    check("deneme sonucum" in txt(page, ".mth"), "Yazışma açıldı")
    page.screenshot(path=f"{SHOTS}/4-koc-mesaj.png")
    page.click(".mhd [data-i='s2']"); wait(page, 500)
    check(page.query_selector(".tbar-w") is not None and "Mehmet" in txt(page, ".tbar"), "Mesajdan 'Profili aç' öğrenci sayfasını açtı")
    page.go_back(); wait(page, 500)
    check(page.query_selector(".mgrid.th") is not None, "Geri: öğrenciden yazışmaya döndü")
    page.go_back(); wait(page, 500)
    check(page.query_selector("#coach-notifs") is not None, "Geri: yazışmadan Görev yönetimine döndü")
    # yenileme sonrası aynı ekran
    page.click("#coach-notifs [data-ngo='s1']"); wait(page, 500)
    page.reload(); page.wait_for_selector(".tbar-w", timeout=8000); wait(page, 600)
    check("Ayşe" in txt(page, ".tbar"), "Sayfa yenilenince öğrenci ekranında kalındı")
    page.go_back(); wait(page, 500)
    check(page.query_selector("#coach-notifs") is not None, "Yenilemeden sonra da geri tuşu çalışıyor")
    # öğrenciler sayfasında arama
    page.click("#sbtog"); wait(page); page.click(".side-nav [data-cp='s']"); wait(page)
    page.fill("#stq", "zey"); wait(page)
    vis = page.evaluate("[...document.querySelectorAll('#app .grid>button.s')].filter(b=>b.style.display!=='none').map(b=>b.innerText.split('\\n')[0])")
    check(len(vis) == 1 and vis[0] == 'ZK', f"Öğrenciler sayfasında arama çalışıyor: {vis}")
    ctx.close()

    # ---------- KOÇ, masaüstü ----------
    ctx = b.new_context(viewport={"width": 1366, "height": 860}, service_workers="block")
    setup(ctx, "coach")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_selector(".kst", timeout=8000); wait(page, 600)
    page.click(".side-bell"); wait(page)
    check(page.query_selector("#coach-notifs") is not None, "Masaüstü: zil bildirim merkezini açtı")
    page.screenshot(path=f"{SHOTS}/5-masaustu-bildirim.png")
    page.click("#coach-notifs [data-ngo='s1'][data-ndt='g']"); wait(page, 600)
    check(txt(page, ".side-nav [data-navback] .nbl") == "Görev yönetimi", "Masaüstü menüdeki geri öğesi de hedefi yazıyor")
    page.screenshot(path=f"{SHOTS}/6-masaustu-ogrenci.png")
    page.go_back(); wait(page)
    check(page.query_selector("#coach-notifs") is not None, "Masaüstü tarayıcı geri düğmesi çalışıyor")
    page.click(".side-nav [data-cp='a']"); wait(page)
    ctx.close()

    # ---------- ÖĞRENCİ, telefon ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", device_scale_factor=2)
    setup(ctx, "student")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_selector(".pill", timeout=8000); wait(page, 600)
    page.click(".pill [data-tab='g']"); wait(page)
    check("Görevlerim" in page.inner_text(".stu-main"), "Öğrenci: Görevler sekmesi")
    page.go_back(); wait(page)
    check(page.query_selector(".sh") is not None, "Öğrenci geri: Görevlerden Bugün'e döndü")
    page.click("[data-tab='c']"); wait(page, 500)
    check(page.query_selector(".stb [data-navback]") is not None, "Konu Takibi'nde geri düğmesi var")
    page.click("[data-ktd='0']"); wait(page)
    page.go_back(); wait(page)
    check("Konu Takibi" in txt(page, ".stb"), "Öğrenci geri: ders detayından Konu Takibi listesine")
    page.click(".stb [data-navback]"); wait(page)
    check(page.query_selector(".sh") is not None, "Görünür ← Konu Takibi'nden ana sayfaya döndü")
    page.click("#qaopen"); wait(page)
    check(page.query_selector(".qa") is not None, "Hızlı işlemler açıldı")
    page.go_back(); wait(page)
    check(page.query_selector(".qa") is None and page.query_selector(".sh") is not None, "Geri tuşu hızlı işlem panelini kapattı, sayfa yerinde")
    page.click("#qaopen"); wait(page); page.click(".qa [data-qa='t']"); wait(page, 800)
    check(page.query_selector(".stb") is not None and "Tercih" in txt(page, ".stb"), "Panelden Tercih Robotu açıldı, geri düğmesi var")
    page.go_back(); wait(page)
    check(page.query_selector(".sh") is not None, "Geri: Tercih Robotu'ndan ana sayfaya (panel adımı araya girmedi)")
    page.click("[data-tab='m']"); wait(page, 500)
    page.screenshot(path=f"{SHOTS}/7-ogrenci-kocum.png")
    ctx.close()
    b.close()

srv.terminate()
print("\nJS hataları:", errs if errs else "yok")
print("SONUÇ:", "HEPSİ GEÇTİ" if not fails and not errs else f"{len(fails)} başarısız")
