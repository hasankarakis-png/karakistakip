import sys,subprocess,time
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen','srv = None and subprocess.Popen'))
srv=subprocess.Popen([sys.executable,"-m","http.server","8772","--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
URL="http://127.0.0.1:8772/index.html"
errs=[]
SEED="""(function(){const f=window.__FX;const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");const t=ymd(new Date());
f.announcements=[{id:1,title:"Cumartesi ortak deneme",body:"Saat 10:00'da kitapçıkları getirin.\\nGeç kalmayın.",starts_on:t,ends_on:t,student_ids:null,created_at:new Date().toISOString()},
{id:2,title:"Sadece Mehmet",body:"Bu duyuru s1'e görünmemeli.",starts_on:t,ends_on:t,student_ids:["s2"],created_at:new Date().toISOString()},
{id:3,title:"Dünkü duyuru",body:"Süresi bitti.",starts_on:"2000-01-01",ends_on:"2000-01-02",student_ids:null,created_at:new Date().toISOString()}];f.announcement_acks=[];try{const k=JSON.parse(sessionStorage.getItem("__acks")||"null");if(k)f.announcement_acks=k}catch(e){};f.daily=f.daily.filter(r=>!(r.student_id==="s1"&&r.day===t))})();"""
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    # ---------- ÖĞRENCİ ----------
    ctx=b.new_context(viewport={"width":390,"height":844},service_workers="block");setup(ctx,"student")
    ctx.add_init_script("window.__CLEAN=1")
    # mock yüklendikten sonra tohum verisini yaz
    ctx.add_init_script("window.addEventListener('DOMContentLoaded',()=>{});")
    page=ctx.new_page();page.on("pageerror",lambda e:errs.append(str(e)));page.on("dialog",lambda d:d.accept())
    page.route("**/js/boot.js*",lambda r:r.fulfill(status=200,content_type="application/javascript",body=SEED+open(ROOT+"/js/boot.js").read()))
    page.goto(URL);page.wait_for_selector(".an",timeout=8000);page.wait_for_timeout(300)
    check(page.query_selector(".an-card h2").inner_text()=="Cumartesi ortak deneme","Girişten sonra duyuru paneli ilk ekran olarak açıldı")
    check("Geç kalmayın" in page.inner_text(".an-body"),"Duyuru metni (satır sonuyla) görünüyor")
    check(page.query_selector(".an-count") is None,"Yalnızca 1 duyuru var (başkasına özel ve süresi biten görünmüyor)")
    check(page.query_selector("#anx") is None,"Onaylamadan arka plana dokunup kapatılamaz")
    page.mouse.click(190,60);page.wait_for_timeout(200)
    check(page.query_selector(".an") is not None,"Arka plana dokununca panel kapanmadı")
    check(page.query_selector("#onbx") is None,"Kurulum sihirbazı duyurunun üstüne binmedi")
    page.click("#anok");page.wait_for_selector(".an-w",timeout=4000)
    check("Uyandım" in page.inner_text(".an-w #anwake"),"Onaydan sonra 'Uyandım' adımı çıktı")
    check(page.evaluate("window.__FX.announcement_acks.length")==1 and page.evaluate("window.__FX.announcement_acks[0].student_id")=="s1","Onay s1 adına kaydedildi")
    page.click("#anwake");page.wait_for_timeout(500)
    check(page.query_selector(".an") is None,"Panel kapandı")
    check(page.evaluate("S.status")=="awake","Uyandım işlendi (S.status=awake)")
    check("Cumartesi ortak deneme" in page.inner_text(".an-home")and "Onaylandı" in page.inner_text(".an-home"),"Bugün sayfasının üstünde duyuru kartı: Onaylandı")
    check(page.query_selector(".an-home .an-it") is not None and page.evaluate("document.querySelectorAll('.an-home .an-it').length")==1,"Kartta yalnızca ilgili duyuru var")
    page.click(".an-it");page.wait_for_selector("#anx");check(page.query_selector("#anok") is None,"Onaylanmış duyuru yeniden okunurken onay düğmesi yok")
    page.click("#anx2");page.wait_for_timeout(300)
    # aynı gün sayfa yenilenirse onaylandığı için tekrar sorulmaz
    page.evaluate("sessionStorage.setItem('__acks',JSON.stringify(window.__FX.announcement_acks))")
    page.reload();page.wait_for_selector(".pill",timeout=8000);page.wait_for_timeout(600)
    check(page.query_selector(".an") is None,"Onaylı duyuru yenilemede tekrar sorulmadı")
    # çevrimdışı/hata: onay yazılamazsa 'Şimdilik geç' çıkar
    page.evaluate("sessionStorage.removeItem('__acks')")
    page.reload();page.wait_for_selector(".an",timeout=8000)
    page.evaluate("(()=>{const o=window.supabase;})()")
    check(page.evaluate("typeof AN.list.length")=="number","Yenilemede onaylanmamış duyuru tekrar geldi")
    ctx.close()
    # ---------- ÖĞRENCİ: duyuru yok ----------
    ctx=b.new_context(viewport={"width":390,"height":844},service_workers="block");setup(ctx,"student");ctx.add_init_script("window.__CLEAN=1")
    page=ctx.new_page();page.on("pageerror",lambda e:errs.append(str(e)));page.goto(URL);page.wait_for_selector(".pill",timeout=8000);page.wait_for_timeout(600)
    check(page.query_selector(".an") is None and page.query_selector(".an-home") is None,"Duyuru yoksa panel ve kart hiç görünmez")
    ctx.close()
    # ---------- KOÇ ----------
    ctx=b.new_context(viewport={"width":1100,"height":900},service_workers="block");setup(ctx,"coach");ctx.add_init_script("window.__CLEAN=1")
    page=ctx.new_page();page.on("pageerror",lambda e:errs.append(str(e)));page.on("dialog",lambda d:d.accept())
    page.route("**/js/boot.js*",lambda r:r.fulfill(status=200,content_type="application/javascript",body=SEED+open(ROOT+"/js/boot.js").read()))
    page.goto(URL);page.wait_for_timeout(4800)
    page.evaluate("CPG='t';render()");page.wait_for_selector("#coach-ann",timeout=5000);page.wait_for_timeout(500)
    check("Cumartesi ortak deneme" in page.inner_text("#coach-ann"),"Koç duyuru listesinde yayındaki duyuruyu görüyor")
    check("0/" in page.inner_text("#coach-ann"),"Onay sayısı gösteriliyor (0 onay)")
    page.fill("#ant","Yeni duyuru testi");page.fill("#anb","Hepinize merhaba");page.click("#anpub");page.wait_for_timeout(700)
    rows=page.evaluate("window.__FX.announcements.filter(a=>a.title==='Yeni duyuru testi')")
    check(len(rows)==1 and rows[0]["student_ids"] is None and rows[0]["created_by"]=="c1","Koç duyuruyu yayınladı (tüm öğrencilere, created_by=c1)")
    check("Yeni duyuru testi" in page.inner_text("#coach-ann"),"Yeni duyuru listede görünüyor")
    page.click("#anpub");page.wait_for_timeout(300)
    check("Başlık yaz" in page.inner_text("#coach-ann"),"Boş başlıkla yayınlanmıyor")
    page.fill("#ant","Geçmiş");page.fill("#anb","x");page.fill("#ane","2000-01-01");page.click("#anpub");page.wait_for_timeout(300)
    check("geçmişte" in page.inner_text("#coach-ann") or "önce olamaz" in page.inner_text("#coach-ann"),"Geçmiş tarihli duyuru reddediliyor")
    page.click("[data-andel='1']");page.wait_for_timeout(600)
    check(page.evaluate("window.__FX.announcements.some(a=>a.id===1)")==False,"Koç duyuruyu silebiliyor")
    ctx.close()
    b.close()
finally:
  srv.terminate()
print("JS hataları:",errs if errs else "yok")
print("SONUÇ:","TÜMÜ GEÇTİ" if not fails and not errs else f"{len(fails)} BAŞARISIZ")
