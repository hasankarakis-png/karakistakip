import sys, subprocess, time, json
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen', 'srv = None and subprocess.Popen'))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8773", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
URL = "http://127.0.0.1:8773/index.html"
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    # gerçek supabase.js dosyası yükleniyor mu (sahte istemci olmadan)
    ctx = b.new_context(service_workers="block"); pg = ctx.new_page()
    pg.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    pg.route("**/challenges.cloudflare.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=""))
    pg.route("**/*.supabase.co/**", lambda r: r.abort())
    pg.goto(URL); pg.wait_for_timeout(1500)
    check(pg.evaluate("typeof window.supabase!=='undefined'&&typeof window.supabase.createClient==='function'"), "Uygulamanın kendi sunucusundan yüklenen Supabase kütüphanesi çalışıyor")
    ctx.close()

    # ---------- ÖĞRENCİ ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block"); setup(ctx, "student")
    # dünden kalmış, sunucuya gitmemiş kayıt (gece yarısı çevrimdışı senaryosu)
    ctx.add_init_script("""(()=>{const d=new Date();d.setDate(d.getDate()-1);const y=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      const st={day:y,status:'stopped',cur:null,done:50*60000,log:[{t:Date.now()-20*3600e3,m:'Uyandım'},{t:Date.now()-19*3600e3,m:'Derse başladım'},{t:Date.now()-18*3600e3,m:'Çalışmayı noktaladım'}],qs:[{s:'Matematik',n:30,c:25,b:0,k:''}],prog:false,mood:0,sleep:0,dist:0,en:0,str:0,hard:'',meth:{'Soru çözme':50*60000}};
      if(!sessionStorage.getItem('__seeded')){localStorage.setItem('karakis-takip-v1s1-'+y,JSON.stringify(st));sessionStorage.setItem('__seeded','1')}})()""")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_selector(".pill"); page.wait_for_timeout(1500)
    E = page.evaluate
    y = E("dayN(-1)")
    row = E(f"__FX.daily.filter(r=>r.student_id==='s1'&&r.day==='{y}').slice(-1)[0]||null")
    check(row is not None and row["snap"]["m"] == 50 and row["snap"]["q"] == 30, f"Dünün gönderilemeyen kaydı açılışta sunucuya tamamlandı ({row and row['snap']})")
    check(E(f"localStorage.getItem('karakis-takip-v1s1-{y}')") is None, "Gönderilen yedek cihazdan silindi")
    # gece yarısını molada geçirme
    E("""(()=>{const m=new Date();m.setHours(0,0,0,0);S=Object.assign(fresh(),{day:dayN(-1),status:'break',cur:{start:m.getTime()-3600e3,brk:0,bs:m.getTime()-1200e3,subj:'Fizik',meth:'Soru çözme'},done:0,log:[{t:m.getTime()-3600e3,m:'Derse başladım'}]});rollover()})()""")
    check(E("S.status") == "break" and E("Math.round(curNet()/60000)") == 0, f"Gece yarısını molada geçiren öğrenci yeni günde molada başlıyor (durum={E('S.status')}, ders={E('Math.round(curNet()/60000)')} dk)")
    E("S=fresh();save();render()"); wait(page, 300)
    page.dblclick("[data-a='wake']"); wait(page, 300)
    check(E("S.status") == "awake", f"'Uyandım'a çift dokunuş yanlışlıkla derse başlatmıyor (durum={E('S.status')})")
    # hızlı işlem: deneme yükleme doğrudan Denemeler alt sekmesinde
    page.click("#qaopen"); wait(page); page.click(".qa [data-qa='d']"); wait(page, 400)
    check(E("ANT") == "n" and page.query_selector("#exf") is not None, "Hızlı işlem 'Yeni Sınav Sonucu' yükleme alanını açıyor")
    ctx.close()

    # ---------- KOÇ ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block"); setup(ctx, "coach")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e)))
    dialogs = []
    page.on("dialog", lambda d: (dialogs.append(d.message), d.accept()))
    page.goto(URL); page.wait_for_selector(".kst"); page.wait_for_timeout(1200)
    E = page.evaluate
    kc = page.inner_text(".kst")
    check("Bugün çalışan" in kc and "şu an derste" in kc, f"'Bugün çalışan' bugün çalışmış herkesi sayıyor: {kc.splitlines()[:3]}")
    fl = E("roster().filter(x=>flags(x.hist).length).map(x=>x.n)")
    check("Mehmet Demir" in fl, f"Hiç kaydı olmayan öğrenci de uyarı listesine düşüyor: {fl}")
    E("openStu('s1','o')"); wait(page, 600)
    E("ADMMSG={t:'Ayşe · kullanıcı adı: ayse · PIN: 123456'}")
    E("openStu('s2','d')"); wait(page, 600)
    check("123456" not in page.inner_text(".dashboard-main"), "Bir öğrencinin PIN mesajı diğer öğrencide görünmüyor")
    E("openStu('s1','a')"); wait(page, 800)
    page.fill("#gq", "-20"); page.click("#setgoal"); wait(page, 300)
    check(any("arasında" in d for d in dialogs) and E("goalOf('s1')") is None, "Eksi hedef reddedildi")
    page.fill("#gq", "120"); page.click("#setgoal"); wait(page, 500)
    check(E("goalOf('s1')&&goalOf('s1').q") == 120, "Geçerli hedef kaydedildi")
    page.fill("#note", "Bu hafta paragrafa ağırlık ver"); page.click("#addnote"); wait(page, 500)
    check(any(n["body"] == "Bu hafta paragrafa ağırlık ver" for n in E("__FX.notes")) and E("document.getElementById('note').value") == "", "Not kaydedildi ve alan temizlendi")
    E("openStu('s1','d')"); wait(page, 600)
    page.fill("#dnet", "999"); page.fill("#dad", "Deneme 5"); page.click("#adddn"); wait(page, 300)
    check(any("arasında" in d for d in dialogs[-1:]), "Elle deneme: geçersiz net reddedildi")
    # geçmiş gün şeridi
    E("openStu('s1','o')"); wait(page, 600)
    E(f"selDay=dayN(-2);loadDay('s1',dayN(-2)).then(()=>render())"); wait(page, 600)
    check(page.query_selector(".pastbar") is not None and page.is_visible(".pastbar"), "Geçmiş gün görünümünde telefonda da tarih şeridi var")
    page.click(".pastbar [data-d]"); wait(page, 400)
    check(E("selDay") is None, "'Bugüne dön' bugüne getirdi")
    E("selDay=dayN(-2);render()"); wait(page, 300); page.click(".tbar-w [data-dt]") if page.query_selector(".tbar-w [data-dt]") else E("document.querySelector('[data-dt=\"a\"]').click()"); wait(page, 300)
    check(E("selDay") is None, "Sekme değişince geçmiş gün görünümünden çıkılıyor")
    # çift tıklama: görev iki kez eklenmesin
    E("openStu('s1','g')"); wait(page, 1200)
    n0 = E("__FX.weekly_tasks.length")
    page.fill("#tkt", "Limit test 1-4")
    E("document.getElementById('tkadd').click();document.getElementById('tkadd').click()"); wait(page, 600)
    check(E("__FX.weekly_tasks.length") == n0 + 1, f"Görev çift tıklamada bir kez eklendi ({E('__FX.weekly_tasks.length') - n0})")
    ctx.close(); b.close()
srv.terminate()
print("JS hataları:", errs or "yok")
print("SONUÇ:", "HEPSİ GEÇTİ" if not fails and not errs else f"{len(fails)} başarısız")
