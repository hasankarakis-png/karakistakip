import sys,subprocess,time
from playwright.sync_api import sync_playwright
exec(open("test_nav.py").read().split("with sync_playwright() as p:")[0].replace('srv = subprocess.Popen','srv = None and subprocess.Popen'))
srv=subprocess.Popen([sys.executable,"-m","http.server","8773","--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
URL="http://127.0.0.1:8773/index.html"
errs=[]
SEED='''(()=>{const ds=[["Türkçe",[22,24.5,26,28]],["Matematik",[11,13.5,15,18]],["Fen",[6,7.5,7,9.5]]];
EX[ME]=[0,1,2,3].map(i=>({id:900+i,student_id:ME,exam_name:"Deneme "+(i+1),exam_type:"TYT",exam_date:"2026-10-"+String(3+i*7).padStart(2,"0"),
total_net:ds.reduce((a,d)=>a+d[1][i],0),subjects:ds.map(d=>({ders:d[0],net:d[1][i]})),topics:[]}));})()'''
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    ctx=b.new_context(viewport={"width":390,"height":844},service_workers="block");setup(ctx,"student")
    ctx.add_init_script("window.__CLEAN=1")
    page=ctx.new_page();page.on("pageerror",lambda e:errs.append(str(e)));page.on("dialog",lambda d:d.accept())
    page.goto(URL);page.wait_for_selector(".pill");page.wait_for_timeout(4700)
    E=page.evaluate
    E(SEED);E("tab='d';ANT='n';render()");page.wait_for_timeout(600)
    check(page.query_selector("[data-n3]") is not None,"Net grafiğinde 2B/3B düğmesi var")
    check(page.query_selector(".n3-stage") is None,"Varsayılan 2B (3B kutusu yok)")
    page.click("[data-n3='3']",timeout=5000);page.wait_for_timeout(2500)
    check(E("localStorage.getItem('karakis-net3d')")=="3","3B seçimi hatırlandı")
    st=page.query_selector(".n3-stage")
    check(st is not None,"3B kutusu var")
    if st:
        check(st.query_selector("canvas") is not None,"3B tuval çizildi")
        rd=page.inner_text(".n3-rd")
        check("Deneme 4" in rd and "Türkçe" in rd and "Matematik" in rd,f"Okuma satırı son denemeyi ve dersleri yazıyor ({rd[:60]!r})")
        page.fill("[data-n3r]","1");page.dispatch_event("[data-n3r]","input");page.wait_for_timeout(500)
        rd=page.inner_text(".n3-rd")
        check("Deneme 2" in rd,"Kaydırıcı denemeyi değiştirdi")
        page.click("[data-n3d='1']",timeout=5000);page.wait_for_timeout(300)
        check("Deneme 3" in page.inner_text(".n3-rd"),"› düğmesi sonraki denemeye geçti")
        E("render()");page.wait_for_timeout(700)
        check(E("!!document.querySelector('.n3-stage canvas')"),"render() sonrası tuval yeni kutuda")
        check("Deneme 3" in page.inner_text(".n3-rd"),"render() sonrası seçili deneme korundu")
        page.screenshot(path=f"{SHOTS}/net3d.png",full_page=True)
    page.click("[data-n3='2']",timeout=5000);page.wait_for_timeout(500)
    check(page.query_selector(".n3-stage") is None and page.query_selector("svg[aria-label='Net grafiği']") is not None,"2B'ye dönüş: eski çizgi grafik")
    b.close()
srv.terminate()
print("JS hataları:",errs or "yok")
print("FAIL:",fails or "yok")
