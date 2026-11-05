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
    page.click("[data-wptab='k']"); wait(page, 500)
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

    # Haftanın kalanını tek tıkla iptal et: yapılmamışlar kapanır, yapılan kalır, geri almada 'carried' durumu korunur
    E("__FX.weekly_tasks.push({id:9110,student_id:'s1',task_date:wkMon(0),title:'Hafta görevi A',subject:'Fizik',amount:null,done:false,source:'coach'},{id:9111,student_id:'s1',task_date:addD(wkMon(0),6),title:'Hafta görevi B',subject:'Fizik',amount:null,done:true,source:'coach'},{id:9112,student_id:'s1',task_date:addD(wkMon(0),5),title:'Hafta görevi C',subject:'Fizik',amount:null,done:false,source:'coach',carry_state:'carried',carried_from:addD(wkMon(0),-3)},{id:9113,student_id:'s2',task_date:wkMon(0),title:'Başkasının görevi',subject:'Fizik',amount:null,done:false,source:'coach'})")
    E("openStu('s1','g')"); wait(page, 1500)
    page.click("[data-wptab='h']"); wait(page, 500)
    check(page.query_selector("[data-clwk='s1']") is not None, "Haftalık takipte 'Kalan görevi iptal et' düğmesi var (koç)")
    page.click("[data-clwk='s1']"); wait(page, 1000)
    wk = E("__FX.weekly_tasks.filter(t=>t.carry_state==='closed'&&[9110,9111,9112,9113].includes(t.id)).map(t=>t.id).sort()")
    check(wk == [9110, 9112], f"Haftalık iptal: yalnızca yapılmamış görevler kapandı, yapılan (9111) ve başka öğrenci (9113) kaldı ({wk})")
    txt = page.inner_text(".dashboard-main")
    check("görev iptal edildi" in txt and page.query_selector("[data-clundo='s1']") is not None, "Haftalık iptal: sonuç kartı ve Geri al düğmesi göründü")
    check("Hafta görevi A" not in txt and "Hafta görevi C" not in txt, "İptal edilen görevler listeden kalktı")
    page.click("[data-clundo='s1']"); wait(page, 1000)
    a9 = E("__FX.weekly_tasks.find(t=>t.id===9110)"); c9 = E("__FX.weekly_tasks.find(t=>t.id===9112)")
    check(not a9.get("carry_state") and c9.get("carry_state") == "carried", f"Geri al: görevler eski durumuna döndü ({a9.get('carry_state')}, {c9.get('carry_state')})")
    ctx.close()

    # ---------- ÖĞRENCİ: geçen haftalardan kalanlar koç kararını bekler; bu haftanınkileri kendisi dağıtır (v4.7) ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block"); setup(ctx, "student")
    TP = []
    def tplan(r):
        import json as _j
        body = _j.loads(r.request.post_data or "{}"); TP.append(body); d = body.get("days", [])
        # 1 numaralı (geçen haftanın) görevi de araya sıkıştırır: istemci bunu süzmeli
        r.fulfill(status=200, content_type="application/json", body=_j.dumps({"plan": {"ozet": "Limit ve paragrafı farklı günlere yaydım.", "atamalar": [{"id": 9201, "tarih": d[0], "neden": "en eski"}, {"id": 9202, "tarih": d[-1]}, {"id": 1, "tarih": d[0]}]}, "kaynak": "ai"}))
    ctx.route("**/functions/v1/task-plan", tplan)
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("dialog", lambda d: d.accept())
    page.goto(URL); page.wait_for_selector(".pill"); page.wait_for_timeout(1500)
    E = page.evaluate
    E("__FX.weekly_tasks.find(t=>t.id===2).carry_state='closed'")  # koç bunu 'Ekleme' ile kapattı
    E("__FX.weekly_tasks.find(t=>t.id===1).task_date=addD(wkMon(0),-3)")  # geçen haftanın Cuma'sı (testin günü fark etmesin)
    can = E("wkMon(0)<day()")  # Pazartesi günü bu haftanın geçmiş günü yoktur
    if can:
        E("__FX.weekly_tasks.push({id:9201,student_id:'s1',task_date:wkMon(0),title:'Limit 25 soru',subject:'Matematik',amount:null,done:false,source:'coach'},{id:9202,student_id:'s1',task_date:wkMon(0),title:'Paragraf tekrar',subject:'Türkçe',amount:null,done:false,source:'coach'})")
    E("loadTasks(ME).then(()=>render())"); wait(page, 800)
    txt = page.inner_text("body")
    check("Koçun bu görevlerin yeni haftaya eklenip eklenmeyeceğine karar verecek" in txt, "Öğrenci: geçen haftadan kalan için 'Koç kararı bekleniyor' notunu görüyor")
    check(page.query_selector("[data-rs]") is None, "Öğrenci: 'Yarına kaydır / Bugüne al' düğmeleri yok")
    check("Türev 40 soru" in txt and "Paragraf 30 soru" not in txt, "Öğrenci: koçun kapattığı görev listeden kalktı, diğeri bekliyor")
    err = E("sb.rpc('task_reschedule',{p_ids:[1],p_date:day()}).then(r=>r.error&&r.error.message)")
    check(err and "yalnızca koç" in err, f"Sunucu da öğrencinin kaydırmasını reddediyor ({err})")
    if not can:
        print("ATLANDI  öğrencinin bu haftayı dağıtması (bugün Pazartesi, bu haftanın geçmiş günü yok)")
    else:
        check("Bu hafta kalan görevler (2)" in txt and page.query_selector("[data-rdask='s1']") is not None, "Öğrenci: bu haftanın kalanları ayrı kartta, 'Dağıtım öner' düğmesiyle")
        check(len(TP) == 0, "Öneri kendiliğinden istenmiyor (yapay zekâ kotası)")
        page.click("[data-rdask='s1']"); wait(page, 1000)
        check(len(TP) == 1 and TP[0].get("action") == "redistribute_self" and "student_id" not in TP[0], f"İstek öğrenci kipinde, öğrenci kimliği gönderilmiyor ({TP[:1]})")
        days = E("RD['s1'].days")
        check(all(E(f"'{d}'>=day()&&'{d}'<=addD(wkMon(0),6)") for d in days), f"Önerilen günler bugün ile bu Pazar arasında ({days})")
        rd = page.inner_text(".rd-ai")
        check("Limit 25 soru" in rd and "Paragraf tekrar" in rd and "Türev 40 soru" not in rd and "Bu dağıtımı uygula (2 görev)" in rd, "Öneri yalnızca bu haftanın 2 görevini içeriyor")
        page.screenshot(path=f"{SHOTS}/ogrenci-dagit.png", full_page=True)
        page.click("[data-rdgo='s1']"); wait(page, 900)
        a = E("__FX.weekly_tasks.find(t=>t.id===9201)"); b2 = E("__FX.weekly_tasks.find(t=>t.id===9202)"); t1 = E("__FX.weekly_tasks.find(t=>t.id===1)")
        check(a["task_date"] == days[0] and b2["task_date"] == days[-1] and a["self_from"] == E("wkMon(0)"), f"Görevler taşındı ve 'öğrenci kaydırdı' işaretlendi ({a['task_date']}, {b2['task_date']}, {a.get('self_from')})")
        check(t1["task_date"] == E("addD(wkMon(0),-3)") and not t1.get("self_from"), "Geçen haftanın görevine dokunulmadı")
        txt = page.inner_text("body")
        check("haftanın kalan günlerine dağıtıldı" in txt and page.query_selector("[data-rdundo='s1']") is not None, "Sonuç kartı ve Geri al düğmesi göründü")
        check("Bu hafta kalan görevler" not in txt, "Dağıtılan görevler geciken listesinden çıktı")
        check("kaydırdın" in E("taskRow(TK.s1.find(t=>t.id===9201),false)") and "öğrenci" in E("taskRow(TK.s1.find(t=>t.id===9201),true)"), "Görev satırında 'kaydırdın' (öğrenci) / 'öğrenci … kaydırdı' (koç) işareti")
        n0 = E("sb.rpc('task_self_reschedule',{p_moves:[{id:1,d:day()}]}).then(r=>r.data)")
        e2 = E("sb.rpc('task_self_reschedule',{p_moves:[{id:9201,d:addD(wkMon(0),9)}]}).then(r=>r.error&&r.error.message)")
        check(n0 == 0 and e2 and "bu haftanın" in e2, f"Sunucu: geçen haftanın görevi ve hafta dışı tarih reddediliyor ({n0}, {e2})")
        page.click("[data-rdundo='s1']"); wait(page, 900)
        a = E("__FX.weekly_tasks.find(t=>t.id===9201)")
        check(a["task_date"] == E("wkMon(0)") and not a.get("self_from") and "Bu hafta kalan görevler (2)" in page.inner_text("body"), "Geri al: görevler eski günlerine döndü, işaret kalktı")
    ctx.close(); b.close()
srv.terminate()
print("JS hataları:", errs or "yok")
print("SONUÇ:", "HEPSİ GEÇTİ" if not fails and not errs else f"{len(fails)} başarısız")
