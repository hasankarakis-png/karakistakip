# v3.9 · Öğrencinin kendi şifresini değiştirmesi, grafikli haftalık veli PDF raporu
import sys, subprocess, time, os, json
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen', 'srv = None and subprocess.Popen'))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8776", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
BASE = "http://127.0.0.1:8776/"; URL = BASE + "index.html"
errs = []
W = lambda page: page.evaluate("[document.documentElement.scrollWidth,innerWidth]")
PIN_CALLS = []
def pin_route(r):
    b = json.loads(r.request.post_data or "{}"); PIN_CALLS.append(b)
    if b.get("old") == "eski2024x":
        r.fulfill(status=200, content_type="application/json", body='{"ok":true}')
    else:
        r.fulfill(status=400, content_type="application/json", body=json.dumps({"error": "Mevcut şifren hatalı. 4 deneme hakkın kaldı.", "field": "old"}))
with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- ÖĞRENCİ: şifreni değiştir ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", device_scale_factor=2); setup(ctx, "student")
    ctx.add_init_script("if(sessionStorage.getItem('kt-relog'))window.__NOSESS=1;")
    ctx.route("**/functions/v1/pin-change", pin_route)
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("dialog", lambda d: d.accept())
    page.goto(URL); page.wait_for_selector(".pill"); wait(page, 800)
    E = page.evaluate
    E("tab='h';render()"); wait(page, 500)
    row = page.query_selector("#pwopen")
    check(row is not None and "Şifreni değiştir" in row.inner_text(), "Profil → Hesap kartında 'Şifreni değiştir' satırı var")
    check("alic" in (row.inner_text() if row else ""), "Satırda kullanıcı adı görünüyor")
    page.screenshot(path=f"{SHOTS}/p3-hesap.png", full_page=True)
    page.click("#pwopen"); wait(page, 400)
    check(page.query_selector(".pws #pwo") is not None, "Şifre ekranı açıldı")
    check(E("document.activeElement.id") == "pwo", "Mevcut şifre alanına odaklandı")
    # geri tuşu ekranı kapatır
    page.go_back(); wait(page, 400)
    check(page.query_selector(".pws") is None and E("tab") == "h", "Geri tuşu şifre ekranını kapattı, profilde kaldı")
    page.click("#pwopen"); wait(page, 400)
    page.fill("#pwn", "12345678"); wait(page, 150)
    check("Sıralı" in txt(page, "#pwms") and E("document.querySelector('.pwm').dataset.s") == "1", "Sıralı şifre zayıf olarak işaretlendi")
    page.fill("#pwn", "Kalem2027!"); wait(page, 150)
    check(E("document.querySelector('.pwm').dataset.s") == "3" and "Güçlü" in txt(page, "#pwms"), "Güçlü şifre göstergesi")
    check(E("[...document.querySelectorAll('.pwr li.on')].length") == 3, "Üç kural da işaretli")
    page.fill("#pwc", "Kalem2027"); wait(page, 150)
    check("aynı değil" in txt(page, "#pwcm"), "Tekrar alanı uyuşmazlığı gösteriyor")
    # göster/gizle
    page.click("[data-pweye='pwn']"); check(E("document.getElementById('pwn').type") == "text", "Göz simgesi şifreyi gösteriyor")
    page.click("[data-pweye='pwn']"); check(E("document.getElementById('pwn').type") == "password", "Göz simgesi şifreyi gizliyor")
    # istemci doğrulaması: mevcut şifre boş
    page.click("#pwok"); wait(page, 200)
    check("Mevcut şifreni yaz" in txt(page, "#pwerr") and len(PIN_CALLS) == 0, "Mevcut şifre boşken sunucuya gitmiyor")
    page.fill("#pwo", "yanlis999"); page.click("#pwok"); wait(page, 200)
    check("iki kez aynı" in txt(page, "#pwerr") and len(PIN_CALLS) == 0, "Tekrar alanı farklıyken sunucuya gitmiyor")
    # arka plan yenilemesi yazılanı silmemeli
    check(E("busy()") is True, "Yazarken arka plan yenilemesi bekliyor (DRAFTS)")
    page.fill("#pwc", "Kalem2027!"); page.click("#pwok"); wait(page, 500)
    check(len(PIN_CALLS) == 1 and PIN_CALLS[0] == {"old": "yanlis999", "new": "Kalem2027!"}, f"Sunucuya doğru istek gitti: {PIN_CALLS[-1:]}")
    check("hatalı" in txt(page, "#pwerr") and E("document.getElementById('pwo').value") == "" and E("document.activeElement.id") == "pwo", "Hatalı mevcut şifre: mesaj, alan temizlendi, odak orada")
    check(E("document.getElementById('pwn').value") == "Kalem2027!", "Yeni şifre alanı korunuyor")
    page.screenshot(path=f"{SHOTS}/p3-sifre-hata.png", full_page=False)
    page.fill("#pwo", "eski2024x"); page.keyboard.press("Enter"); wait(page, 600)
    check(len(PIN_CALLS) == 2 and page.query_selector(".pwdone") is not None, "Doğru şifreyle değişti, başarı ekranı (Enter ile gönderim)")
    check("tüm cihazlardaki oturumların kapatıldı" in txt(page, ".pws"), "Oturumların kapatıldığı söyleniyor")
    page.screenshot(path=f"{SHOTS}/p3-sifre-tamam.png", full_page=False)
    page.click("#pwrelog"); page.wait_for_selector("#lu", timeout=8000); wait(page, 400)
    check("Şifren değişti" in page.inner_text("#app"), "Giriş ekranında 'Şifren değişti' mesajı")
    check(E("document.getElementById('lu').value") == "alic", "Kullanıcı adı giriş ekranında hazır")
    check(not any("push_subs" in c for c in E("window.__CALLS||[]")), "Bildirim aboneliği silinmedi")
    page.screenshot(path=f"{SHOTS}/p3-giris.png", full_page=False)
    print("Genişlik (öğrenci):", W(page))
    ctx.close()
    if os.environ.get("ONLY_PW"):
        b.close(); srv.terminate()
        print("\nHatalar:", errs or "yok"); print("FAIL sayısı:", len(fails)); sys.exit(1 if fails or errs else 0)
    # ---------- KOÇ: grafikli haftalık veli raporu ----------
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block", device_scale_factor=1); setup(ctx, "coach")
    ctx.add_init_script("""window.__ENRICH=function(){const F=window.__FX,dn=k=>{const d=new Date();d.setDate(d.getDate()+k);return ymd(d)};
      F.daily=F.daily.filter(r=>r.student_id!=="s1");
      const M=[95,140,0,170,120,205,80],P=[60,90,45,110,0,150,70],SB=[["Matematik","Fizik"],["Türkçe","Matematik"],[],["Kimya","Matematik"],["Biyoloji","Türkçe"],["Matematik","Fizik"],["Türkçe"]];
      for(let i=0;i<7;i++){const m=M[i],sb=SB[i],subt={};sb.forEach((x,j)=>subt[x]=Math.round(m*(j?0.4:0.6))*60000);const qs=sb.map((x,j)=>({s:x,n:j?25:40,c:j?18:31,b:2}));
        F.daily.push({student_id:"s1",day:dn(i-6),state:{day:dn(i-6),status:"closed",done:m*60000,qs,subt,log:[]},snap:{m,q:qs.reduce((a,q)=>a+q.n,0),c:qs.reduce((a,q)=>a+q.c,0),mood:2,sleep:5}});
        F.daily.push({student_id:"s1",day:dn(i-13),state:{day:dn(i-13),status:"closed",done:P[i]*60000,qs:[],subt:{}},snap:{m:P[i],q:P[i]?30:0}})}
      F.weekly_tasks=F.weekly_tasks.filter(t=>t.student_id!=="s1").concat([["Türev 40 soru","Matematik",-6,true],["Paragraf 30 soru","Türkçe",-5,true],["Vektörler konu","Fizik",-4,false],["Mol hesapları","Kimya",-3,true],["Hücre tekrar","Biyoloji",-2,true],["TYT deneme","",-1,true],["Problemler 30 soru","Matematik",0,false]].map((t,i)=>({id:100+i,student_id:"s1",title:t[0],subject:t[1],task_date:dn(t[2]),done:t[3],source:"coach"})));
      F.exam_results=[[-40,64.25],[-27,68.5],[-13,72.5],[-2,78.75]].map((e,i)=>({id:900+i,student_id:"s1",exam_name:"MEBİ "+(i+1),exam_type:"TYT",exam_date:dn(e[0]),total_net:e[1],topics:[]}));
      F.exam_targets=[{student_id:"s1",exam_type:"TYT",target_net:90,university:"",department:""}];
      F.notes.push({student_id:"s1",body:"GİZLİ: ailede taşınma",created_at:new Date().toISOString(),private:true});
    };""")
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e))); page.on("dialog", lambda d: d.accept())
    page.goto(URL); page.wait_for_selector(".kst"); wait(page, 1500)
    E = page.evaluate
    E("__ENRICH()")
    E("openStu('s1','d')"); wait(page, 900)
    btn = page.query_selector("[data-vpdf='s1']")
    check(btn is not None and "Haftalık veli raporu" in btn.inner_text(), "Diğer → Haftalık rapor kartında 'Haftalık veli raporu (PDF)' düğmesi")
    with ctx.expect_page() as pi: page.click("[data-vpdf='s1']")
    rp = pi.value; rp.on("pageerror", lambda e: errs.append("rapor: "+str(e)))
    rp.wait_for_selector("#vpPrint", timeout=10000); rp.wait_for_timeout(600)
    T = rp.inner_text("body")
    check(rp.evaluate("(()=>{const i=document.querySelector('.top img');return i.complete&&i.naturalWidth>0})()"), "Logo raporda yüklendi")
    check("Haftalık Veli Raporu" in T and "Ayşe Yılmaz" in T, "Rapor başlığı ve öğrenci adı")
    check("13 sa 30 dk" in T, "Toplam çalışma doğru (95+140+0+170+120+205+80 = 810 dk)")
    check("6 gün" in T and "6/7" in T, "Çalışılan gün 6/7")
    check("▲ +4 sa 45 dk" in T, "Geçen haftayla süre farkı (810−525 = +285 dk)")
    check("%71" in T and "5 / 7 görev" in T, "Görev tamamlama %71 (5/7)")
    check("Vektörler konu" in T and "Problemler 30 soru" in T and "Türev 40 soru" not in T.split("Tamamlanmayan")[1], "Tamamlanmayan görevler listeleniyor")
    check("Matematik" in T and "Hedef 90" in T, "Ders dağılımı ve hedef çizgisi")
    check(rp.evaluate("document.querySelectorAll('svg').length") >= 5, "En az 5 grafik çizildi")
    check("taşınma" not in T and "uyku" not in T.lower().replace("uyku ve ruh hali bilgileri paylaşılmaz",""), "Gizli not ve uyku bilgisi raporda yok")
    check("veli rızası kayıtlı değil" in T, "Veli rızası yoksa uyarı (yalnızca ekranda)")
    check(rp.evaluate("getComputedStyle(document.querySelector('.warn')).display") != "none", "Uyarı ekranda görünüyor")
    rp.emulate_media(media="print")
    check(rp.evaluate("getComputedStyle(document.querySelector('.bar')).display") == "none" and rp.evaluate("getComputedStyle(document.querySelector('.warn')).display") == "none", "Baskıda araç çubuğu ve uyarı gizli")
    check(rp.evaluate("getComputedStyle(document.querySelector('.hide-empty')).display") == "none", "Boş koç notu baskıda gizli")
    rp.pdf(path=f"{SHOTS}/p3-veli-rapor.pdf", format="A4", print_background=True)
    rp.emulate_media(media="screen")
    rp.screenshot(path=f"{SHOTS}/p3-veli-rapor.png", full_page=True)
    # koç notu yazılınca baskıda görünür; hafta değişince not korunur
    rp.click("#vpNote"); rp.keyboard.type("Bu hafta istikrar çok iyiydi."); rp.emulate_media(media="print")
    check(rp.evaluate("getComputedStyle(document.querySelector('.hide-empty')).display") != "none", "Yazılan koç notu baskıda görünüyor")
    rp.emulate_media(media="screen")
    E7 = E("dayN(-7)")
    rp.fill("#vpEnd", E7); rp.dispatch_event("#vpEnd", "change"); rp.wait_for_timeout(900)
    T2 = rp.inner_text("body")
    check("istikrar çok iyiydi" in T2 and "8 sa 45 dk" in T2, "Önceki haftaya geçildi (525 dk), koç notu korundu")
    # telefon genişliği
    rp.set_viewport_size({"width": 390, "height": 844}); rp.wait_for_timeout(300)
    check(rp.evaluate("document.documentElement.scrollWidth") <= 390, f"Telefonda yatay kaydırma yok: {rp.evaluate('document.documentElement.scrollWidth')}")
    rp.screenshot(path=f"{SHOTS}/p3-veli-rapor-tel.png", full_page=False)
    ctx.close()
    b.close()
srv.terminate()
print("\nSayfa hataları:", errs or "yok")
print("FAIL sayısı:", len(fails))
sys.exit(1 if fails or errs else 0)
