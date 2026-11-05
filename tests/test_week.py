import sys, subprocess, time
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen', 'srv = None and subprocess.Popen'))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8781", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
URL = "http://127.0.0.1:8781/index.html"
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block"); setup(ctx, "coach")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("dialog", lambda d: d.accept())
    page.goto(URL); page.wait_for_selector(".kst"); page.wait_for_timeout(4700)
    E = page.evaluate
    E("__FX.weekly_tasks.push({id:8101,student_id:'s1',task_date:day(),title:'Hafta A',subject:'Fizik',amount:'30 soru',done:false,source:'coach'},{id:8102,student_id:'s1',task_date:day(),title:'Hafta B',subject:'Kimya',amount:null,done:true,source:'coach'},{id:8103,student_id:'s1',task_date:addD(wkMon(0),6),title:'Hafta C',subject:'Matematik',amount:null,done:false,source:'coach'})")
    E("openStu('s1','g')"); wait(page, 1800)

    # ---- yapı: hafta gezgini + 4 sekme ----
    nav = page.inner_text(".wp-nav")
    check("BU HAFTA" in nav, f"Hafta gezgini 'BU HAFTA' gösteriyor ({nav.splitlines()[:2]})")
    tabs = [t.inner_text().split("\n")[0] for t in page.query_selector_all(".wp-tab")]
    check(tabs == ["Hafta", "Kalanlar", "Program ekle", "Araçlar"], f"Dört alt sekme ({tabs})")
    check(page.query_selector("#detail-tasks .wp") is not None and page.query_selector("#planrun") is None, "Hafta sekmesinde yalnızca hafta içeriği var (PDF/yapay zekâ/araçlar ayrı sekmede)")
    check(page.query_selector("[data-clwk='s1']") is not None, "Haftanın kalanını iptal et düğmesi Hafta sekmesinde")

    # ---- hızlı ekleme ----
    page.click("[data-wpadd='" + E("day()") + "']"); wait(page, 400)
    page.fill("#wpat", "Yeni görev X"); page.fill("#wpaa", "20 soru"); page.select_option("#wpas", index=1)
    page.click("[data-wpaddgo]"); wait(page, 900)
    nx = E("__FX.weekly_tasks.find(t=>t.title==='Yeni görev X')")
    check(nx and nx["student_id"] == "s1" and nx["task_date"] == E("day()") and nx["amount"] == "20 soru" and nx["source"] == "coach", f"Günün altından hızlı ekleme çalıştı ({nx})")
    check("Yeni görev X" in page.inner_text("#detail-tasks"), "Eklenen görev günün kartında göründü")

    # ---- düzenle: ad, miktar, koç notu ----
    page.click("[data-wpedit='8101']"); wait(page, 500)
    check(page.query_selector(".wp-sheet") is not None, "Düzenleme penceresi açıldı")
    page.fill("#wpet", "Hafta A düzenlendi"); page.fill("#wpea", "45 soru"); page.fill("#wpen", "Önce çıkmış soruları çöz")
    page.click("[data-wpsave]"); wait(page, 900)
    a = E("__FX.weekly_tasks.find(t=>t.id===8101)")
    check(a["title"] == "Hafta A düzenlendi" and a["amount"] == "45 soru" and a.get("coach_note") == "Önce çıkmış soruları çöz", f"Düzenleme kaydedildi (ad, miktar, koç notu) ({a['title']}, {a['amount']}, {a.get('coach_note')})")
    check(page.query_selector(".wp-sheet") is None and "Önce çıkmış soruları çöz" in page.inner_text("#detail-tasks"), "Pencere kapandı, koç notu satırda görünüyor")
    check("Önce çıkmış soruları çöz" in E("taskRow(__FX.weekly_tasks.find(t=>t.id===8101),false)"), "Öğrenci görevinde koç notunu görüyor")

    # ---- koç onayı ----
    page.click("[data-wpok='8102']"); wait(page, 800)
    o = E("__FX.weekly_tasks.find(t=>t.id===8102)")
    check(o.get("coach_ok") is True and o.get("coach_ok_at"), "Koç 'Onayla' ile yapılan görevi onayladı")
    check("Koç onayladı" in page.inner_text("#detail-tasks") and page.query_selector("[data-wpok='8102']") is None, "Onaylanan görevde etiket var, Onayla düğmesi kalktı")

    # ---- toplu seçim: iptal et + geri al ----
    page.click("[data-wpselmode]"); wait(page, 400)
    page.click("[data-wpsel='8101']"); page.click("[data-wpsel='8103']"); wait(page, 300)
    check(page.query_selector(".wp-bar") is not None and "2 görev seçildi" in page.inner_text("#detail-tasks"), "Toplu seçim: 2 görev seçildi, işlem paneli göründü")
    page.click("[data-wpcancel]"); wait(page, 1000)
    cl = E("__FX.weekly_tasks.filter(t=>t.carry_state==='closed'&&[8101,8103].includes(t.id)).map(t=>t.id).sort()")
    check(cl == [8101, 8103], f"Seçilenler iptal edildi (satır silinmedi) ({cl})")
    check("görev iptal edildi" in page.inner_text("#detail-tasks") and page.query_selector("[data-clundo='s1']") is not None, "İptal sonrası 'Geri al' kartı göründü")
    page.click("[data-clundo='s1']"); wait(page, 1000)
    check(E("__FX.weekly_tasks.filter(t=>t.carry_state==='closed').length") == 0, "Geri al: iptal kalktı")

    # ---- toplu taşı + geri al ----
    tmr = E("dayN(1)")
    page.click("[data-wpselmode]"); wait(page, 300)
    page.click("[data-wpsel='8101']"); wait(page, 200)
    page.fill("#wpmd", tmr); page.click("[data-wpmvgo]"); wait(page, 1000)
    check(E("__FX.weekly_tasks.find(t=>t.id===8101).task_date") == tmr, "Seçili görev başka güne taşındı")
    page.wait_for_selector("[data-wpundo]", timeout=3000)
    page.click("[data-wpundo]"); wait(page, 1000)
    check(E("__FX.weekly_tasks.find(t=>t.id===8101).task_date") == E("day()"), "Taşıma geri alındı")

    # ---- toplu sil ----
    page.click("[data-wpselmode]"); wait(page, 300)
    page.click("[data-wpsel='8103']"); wait(page, 200)
    page.click("[data-wpdel]"); wait(page, 900)
    check(E("__FX.weekly_tasks.some(t=>t.id===8103)") is False, "Seçili görev kalıcı silindi")

    # ---- hafta gezgini ----
    page.click("[data-wpw='1']"); wait(page, 500)
    check("GELECEK HAFTA" in page.inner_text(".wp-nav") and page.query_selector("[data-wptoday]") is not None, "İleri: 'GELECEK HAFTA' + 'Bu haftaya dön'")
    check(len(page.query_selector_all(".wp-day")) == 7, "Boş haftada da 7 gün kartı var")
    page.click("[data-wptoday]"); wait(page, 400)
    check("BU HAFTA" in page.inner_text(".wp-nav"), "Bu haftaya dönüldü")

    # ---- diğer sekmeler ----
    page.click("[data-wptab='k']"); wait(page, 500)
    check(page.query_selector("[data-clx='s1']") is not None, "Kalanlar sekmesi: karar kartı (Ekleme) burada")
    page.click("[data-wptab='p']"); wait(page, 500)
    check(page.query_selector("#puf") is not None and page.query_selector("#planrun") is not None, "Program ekle sekmesi: PDF yükleme + yapay zekâ taslağı")
    page.click("[data-wptab='a']"); wait(page, 500)
    check(page.query_selector("[data-plcopy='s1']") is not None and page.query_selector("[data-wren]") is not None, "Araçlar sekmesi: kopyala/şablon/tekrar eden + hafta adı")
    page.click("[data-wptab='h']"); wait(page, 400)
    page.screenshot(path=f"{SHOTS}/hafta-yeni.png", full_page=True)
    ctx.close(); b.close()
srv.terminate()
print("JS hataları:", errs or "yok")
print("SONUÇ:", "HEPSİ GEÇTİ" if not fails and not errs else f"{len(fails)} başarısız")
