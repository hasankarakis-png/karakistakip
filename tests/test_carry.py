import sys, subprocess, time
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen', 'srv = None and subprocess.Popen'))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8779", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
URL = "http://127.0.0.1:8779/index.html"
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- KOÇ: kalan görevlerin sarkıp sarkmayacağına karar verir ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block"); setup(ctx, "coach")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("dialog", lambda d: d.accept())
    page.goto(URL); page.wait_for_selector(".kst"); page.wait_for_timeout(4700)
    E = page.evaluate
    # 28 günlük pencere: 20 gün önceki görev görünür, 40 gün önceki görünmez
    E("__FX.weekly_tasks.push({id:9101,student_id:'s1',task_date:dayN(-20),title:'Eski görev 20 gün',subject:'Fizik',amount:null,done:false,source:'coach'},{id:9102,student_id:'s1',task_date:dayN(-40),title:'Çok eski görev',subject:'Fizik',amount:null,done:false,source:'coach'})")
    E("openStu('s1','g')"); wait(page, 1800)
    txt = page.inner_text(".dashboard-main")
    check("Geçen günlerden kalan görevler (3)" in txt, "Koç: Ayşe'nin kalan görevleri tek kartta (3 görev)")
    check("Eski görev 20 gün" in txt and "Çok eski görev" not in txt, "Pencere 28 gün: 20 gün önceki görünüyor, 40 gün önceki görünmüyor")
    check("sarksın mı" in txt and page.query_selector("[data-clx='s1']") is not None, "Koç kararı için 'Ekleme' düğmesi var")
    check("Yeni haftaya ekle" in page.inner_text(".rd-ai"), "Yeni haftaya ekleme (yapay zekâ dağıtımı) seçeneği var")

    # Ekleme: hepsi kalksın
    page.click("[data-clx='s1']"); wait(page, 1000)
    closed = E("__FX.weekly_tasks.filter(t=>t.student_id==='s1'&&t.carry_state==='closed').map(t=>t.id).sort((a,b)=>a-b)")
    check(closed == [1, 2, 9101], f"Ekleme: 3 görev kapatıldı, satırlar silinmedi ({closed})")
    check(E("__FX.weekly_tasks.length") >= 7, "Ekleme satır silmedi (geri alınabilir)")
    txt = page.inner_text(".dashboard-main")
    check("yeni haftaya eklenmedi" in txt and page.query_selector("[data-clundo='s1']") is not None, "Sonuç kartı ve Geri al düğmesi göründü")
    check("Türev 40 soru" not in txt and "Geçen günlerden kalan görevler" not in txt, "Kapatılan görevler listeden kalktı")
    check(E("overdue('s1').length") == 0 and E("ODL.filter(t=>t.student_id==='s1').length") == 0, "Gecikenler (detay + bildirim listesi) boşaldı")
    check(E("ODL.some(t=>t.id===3)"), "Başka öğrencinin (Zeynep) kalan görevi etkilenmedi")

    # Geri al
    page.click("[data-clundo='s1']"); wait(page, 1000)
    check(E("__FX.weekly_tasks.filter(t=>t.carry_state==='closed').length") == 0, "Geri al: kapatma kalktı")
    check("Geçen günlerden kalan görevler (3)" in page.inner_text(".dashboard-main"), "Geri al: kalan görevler kartta geri geldi")

    # Yeni haftaya ekle (AI dağıtımı) işaretler
    page.wait_for_selector("[data-rdgo='s1']", timeout=5000)
    page.click("[data-rdgo='s1']"); wait(page, 1000)
    t1 = E("__FX.weekly_tasks.find(t=>t.id===1)")
    check(t1.get("carry_state") == "carried" and t1.get("carried_from") and t1["task_date"] >= E("day()"), f"Yeni haftaya ekle: görev taşındı ve 'geçen haftadan' işaretlendi ({t1.get('carry_state')}, {t1.get('carried_from')})")
    check("tarihinden" in E("taskRow(__FX.weekly_tasks.find(t=>t.id===1),true)"), "Taşınan görevde '↪ … tarihinden' rozeti var")
    errs_before = len(errs)
    # Program sayfası: kalanlar yeni PDF'ten önce görünür
    E("__FX.weekly_tasks.push({id:9103,student_id:'s1',task_date:dayN(-3),title:'Kalan deneme sorusu',subject:'Matematik',amount:null,done:false,source:'coach'})")
    E("loadTasks('s1')"); wait(page, 500)
    pp = E("planPage(roster().find(x=>x.id==='s1'))")
    check("Kalan deneme sorusu" in pp and pp.index("Kalan deneme sorusu") < pp.index("puf"), "Program ver sayfasında kalan görev kartı PDF yüklemeden önce geliyor")
    ctx.close()

    # ---------- ÖĞRENCİ: kendi kaydıramaz, koç kararını bekler ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block"); setup(ctx, "student")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("dialog", lambda d: d.accept())
    page.goto(URL); page.wait_for_selector(".pill"); page.wait_for_timeout(1500)
    E = page.evaluate
    E("__FX.weekly_tasks.find(t=>t.id===2).carry_state='closed'")  # koç bunu 'Ekleme' ile kapattı
    E("loadTasks(ME).then(()=>render())"); wait(page, 800)
    txt = page.inner_text("body")
    check("Koçun bu görevlerin yeni haftaya eklenip eklenmeyeceğine karar verecek" in txt, "Öğrenci: 'Koç kararı bekleniyor' notunu görüyor")
    check(page.query_selector("[data-rs]") is None, "Öğrenci: 'Yarına kaydır / Bugüne al' düğmeleri yok")
    check("Türev 40 soru" in txt and "Paragraf 30 soru" not in txt, "Öğrenci: koçun kapattığı görev listeden kalktı, diğeri bekliyor")
    err = E("sb.rpc('task_reschedule',{p_ids:[1],p_date:day()}).then(r=>r.error&&r.error.message)")
    check(err and "yalnızca koç" in err, f"Sunucu da öğrencinin kaydırmasını reddediyor ({err})")
    ctx.close(); b.close()
srv.terminate()
print("JS hataları:", errs or "yok")
print("SONUÇ:", "HEPSİ GEÇTİ" if not fails and not errs else f"{len(fails)} başarısız")
