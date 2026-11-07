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
    # K14Net düzeni (gerçek belge şablonu, sahte veri): 3 sütun, ayrı % parçası, sütun taşan ders
    r3=run("/tests/fixtures/sonuc-k14.pdf");k=r3["exam"]
    check(k is not None,"K14 düzeni okundu: %r"%r3.get("why"))
    if k:
        check((k["sinav_adi"],k["tur"],k["puan"],k["siralama"])==("TEST-TYT 7","TYT",301.5,"Kurum 9/50"),"K14 ad/tür/puan/sıra: %r"%[k["sinav_adi"],k["tur"],k["puan"],k["siralama"]])
        kd={x["ders"]:x for x in k["dersler"]}
        check(list(kd)==["Türkçe","Din Kültürü ve Ahlak Bilgisi","Matematik","Fizik"],"K14 dersler (kısaltılmış ad blok başlığıyla tamamlandı): %s"%list(kd))
        check((kd["Türkçe"]["dogru"],kd["Türkçe"]["yanlis"],kd["Türkçe"]["bos"])==(5,3,2) and kd["Türkçe"]["kurum_yuzde"]==70.25,"K14 Türkçe D/Y/B ve kurum %")
        check(k["toplam_net_gorsel"]==8.5 and k["soru_satiri"]==21,"K14 toplam net ve 21 soru satırı: %r %r"%(k["toplam_net_gorsel"],k["soru_satiri"]))
        check(sum(x["dogru"]+x["yanlis"]+x["bos"] for x in k["konular"])==21,"K14 konu istatistiği tabloyla birebir (Matematik sütun taşması dahil)")
        check(all("tarih" not in u or True for u in r3["uyarilar"]) and len([u for u in r3["uyarilar"] if "uyuşmuyor" in u or "farklı" in u])==0,"K14 tutarsızlık uyarısı yok: %r"%r3["uyarilar"])
        check("AYŞE" not in str(r3).upper() and "KURUM" not in str(k["sinav_adi"]).upper(),"K14 öğrenci adı ve kurum adı alınmadı")
    # K14Net "Eğim-Önya" karnesi (sahte veri): ders tablosunda BOŞ sütunu yok, kazanım tabloları 2 sütun, küçük harf = yanlış
    r4=run("/tests/fixtures/sonuc-egim.pdf");g=r4["exam"]
    check(g is not None,"Eğim-Önya düzeni okundu: %r"%r4.get("why"))
    if g:
        check((g["sinav_adi"],g["tur"],g["tarih"],g["puan"],g["siralama"])==("TEST-TYT 9 DENEME","TYT","2026-11-02",301.5,"Kurum 10/41"),"Eğim ad/tür/tarih (rapor tarihi değil)/puan/sıra: %r"%[g["sinav_adi"],g["tur"],g["tarih"],g["puan"],g["siralama"]])
        gd={x["ders"]:x for x in g["dersler"]}
        check(list(gd)==["Türkçe","Din Kültürü","Matematik","Fizik"],"Eğim dersler: %s"%list(gd))
        check((gd["Din Kültürü"]["dogru"],gd["Din Kültürü"]["yanlis"],gd["Din Kültürü"]["bos"])==(1,1,1),"Eğim boş = soru − doğru − yanlış, kazanımdaki boş cevapla tutuyor")
        check((gd["Matematik"]["dogru"],gd["Matematik"]["yanlis"],gd["Matematik"]["net"])==(4,1,3.75),"Eğim sağ sütundaki Matematik D/Y/net")
        check(g["toplam_net_gorsel"]==8.75 and g["soru_satiri"]==16,"Eğim toplam net ve 16 soru satırı: %r %r"%(g["toplam_net_gorsel"],g["soru_satiri"]))
        kn={(k["ders"],k["konu"]):k for k in g["konular"]}
        check(("Matematik","Dik Prizmalar Ve Dik Piramitlerin Uzunluk, Alan Ve Haci") in kn and kn[("Matematik","Dik Prizmalar Ve Dik Piramitlerin Uzunluk, Alan Ve Haci")]["yanlis"]==1,"Eğim kırpılmış kazanım adı tam adla birleşti, yanlış sayıldı")
        check(sum(x["dogru"]+x["yanlis"]+x["bos"] for x in g["konular"])==16,"Eğim konu istatistiği tabloyla birebir")
        check(r4["uyarilar"]==[],"Eğim uyarı yok: %r"%r4["uyarilar"])
        check("AYŞE" not in str(r4).upper() and "1234" not in str(g),"Eğim öğrenci adı ve numarası alınmadı")
    b.close()
srv.terminate()
print("JS hataları:",errs or "yok");sys.exit(1 if bad or errs else 0)
