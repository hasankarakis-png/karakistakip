# Yapay zekâsız PDF deneme okuyucusu (js/pdf-exam.js) testi: sahte örnek PDF'ler tests/fixtures'ta (make_sample_pdf.py üretir).
import sys,subprocess,time,os
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
srv=subprocess.Popen([sys.executable,"-m","http.server","8769","--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
bad=0
def check(c,m):
    global bad
    print(("OK   " if c else "FAIL ")+m)
    if not c:bad+=1
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://127.0.0.1:8769/tests/pdf-exam.html")
    run=lambda f:pg.evaluate("async f=>{const b=await (await fetch(f)).blob();const t=performance.now();const r=await pdfExamLocal(new File([b],'x.pdf'));r.ms=Math.round(performance.now()-t);return r}",f)
    r=run("/tests/fixtures/sonuc-ornek.pdf");e=r["exam"]
    check(r["hasText"] and e is not None,"Metin katmanlı PDF okundu (%s ms)"%r["ms"])
    check(e["tur"]=="TYT","Tür TYT: %r"%e["tur"])
    check(e["sinav_adi"]=="MEBİ TYT 8 DENEME SINAVI","Sınav adı: %r"%e["sinav_adi"])
    check(e["tarih"]=="2026-10-25","Tarih: %r"%e["tarih"])
    check(e["puan"]==412.35,"Puan: %r"%e["puan"])
    check(e["siralama"]=="Kurum 3/41","Sıralama: %r"%e["siralama"])
    d={x["ders"]:x for x in e["dersler"]}
    check(list(d)==["Türkçe","Sosyal Bilimler","Temel Matematik","Fen Bilimleri"],"4 ders, Toplam satırı ders sayılmadı: %s"%list(d))
    check((d["Türkçe"]["dogru"],d["Türkçe"]["yanlis"],d["Türkçe"]["bos"],d["Türkçe"]["net"])==(30,8,2,28),"Türkçe D/Y/B/net")
    check((d["Temel Matematik"]["dogru"],d["Temel Matematik"]["yanlis"],d["Temel Matematik"]["bos"],d["Temel Matematik"]["net"])==(25,10,5,22.5),"Temel Matematik D/Y/B/net")
    check(d["Türkçe"]["ogrenci_yuzde"]==70.0 and d["Türkçe"]["kurum_yuzde"]==50.33,"Yüzdeler okundu")
    check(e["toplam_net_gorsel"]==70,"Toplam net: %r"%e["toplam_net_gorsel"])
    check(e["soru_satiri"]==120,"120 soru satırı okundu: %r"%e["soru_satiri"])
    tot=sum(k["dogru"]+k["yanlis"]+k["bos"] for k in e["konular"])
    check(tot==120 and len(e["konular"])>0,"Konu istatistiği ders tablolarıyla birebir (%d konu, toplam %d)"%(len(e["konular"]),tot))
    check(r["uyarilar"]==[],"Uyarı yok: %r"%r["uyarilar"])
    s=str(r)
    check("Ayşe" not in s and "12345678901" not in s and "Anadolu" not in s,"Kişisel bilgi (ad, T.C., okul) çıkarılmadı")
    r2=run("/tests/fixtures/sonuc-taranmis.pdf")
    check(r2["hasText"] is False and r2["exam"] is None,"Metinsiz (taranmış) PDF: hasText=false, eski görsel okumaya düşer")
    b.close()
srv.terminate()
print("JS hataları:",errs or "yok");sys.exit(1 if bad or errs else 0)
