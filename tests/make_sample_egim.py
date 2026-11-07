# K14Net "Eğim-Önya" öğrenci karnesi düzenini taklit eden SAHTE örnek (gerçek öğrenci verisi yok). python3 make_sample_egim.py
# Sayfa 1: özet kartları + "Ders Soru Doğ Yan Net ..." tablosu; sayfa 2: iki sütunlu "<Ders> (A) Cvp Öğr ..." blokları; sayfa 3: tam kazanım adları.
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("DJ","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
H=842
# ders adı, tablodaki ad, blok başlığı, sütun (0 sol / 1 sağ), [(Cvp, Öğr, sayfa-2'deki kırpılmış kazanım)]
D=[("Türkçe","Türkçe","Türkçe",0,[("C","C","Metne Sözcük Yerleştirme"),("E","e","Paragrafta Boş Bırakılan Yerleri Tamamla"),("A","A","Paragraf Bilgisi"),("B","B","Paragraf Bilgisi"),("D","d","Yazım Kuralları"),("C","C","Paragraf Bilgisi")]),
   ("Din Kültürü","Din Kültürü","Din Kültür",0,[("A","A","BİLGİ VE İNANÇ"),("B","","İslam ın Inanç Esaslarının özelliklerin"),("C","c","BİLGİ VE İNANÇ")]),
   ("Matematik","Matematik","Matematik",1,[("B","B","Kesir Problemleri"),("E","e","Dik Prizmalar Ve Dik Piramitlerin Uzunlu"),("A","A","Önermeler"),("C","C","Önermeler"),("D","D","Kesir Problemleri")]),
   ("Fizik","Fizik","Fizik",1,[("A","A","Elektrostatik"),("B","b","Kaldırma Kuvveti İle İlgili Yaptığı Dene")])]
FULL={"Paragrafta Boş Bırakılan Yerleri Tamamla":"Paragrafta Boş Bırakılan Yerleri Tamamlama","Dik Prizmalar Ve Dik Piramitlerin Uzunlu":"Dik Prizmalar Ve Dik Piramitlerin Uzunluk, Alan Ve Haci","İslam ın Inanç Esaslarının özelliklerin":"İslam ın Inanç Esaslarının özelliklerini Ayet Ve Hadis","Kaldırma Kuvveti İle İlgili Yaptığı Dene":"Kaldırma Kuvveti İle İlgili Yaptığı Deneyden Elde Ettiği"}
def cnt(rows):
    d=sum(1 for c,o,_ in rows if o and o.upper()==c and o==o.upper());y=sum(1 for c,o,_ in rows if o and not(o.upper()==c and o==o.upper()));return d,y,len(rows)-d-y
def header(c,T,pageno):
    T(76.5,"Eğim-Önya",809.9);T(76.5,"TEST-TYT 9 DENEME",796.3)
    T(360,"AYŞE ÖRNEK",815.1);T(360,"Şb:TST/",807.2);T(360,"No:1234",798.7);T(360,"YIL",789.5);T(394,"2026-2027",789.5)
    T(405.4,"TARİH",757.0);T(439.4,"07/11/2026",757.0)
def make(path):
    c=canvas.Canvas(path,pagesize=(595,H));c.setFont("DJ",7)
    T=lambda x,t,y:c.drawString(x,y,t)
    # ---- sayfa 1
    header(c,T,1);T(102,"TEST-TYT 9 DENEME",756.9)
    tot=0;res=[]
    for full,short,blk,col,rows in D:
        d,y,b=cnt(rows);net=d-y/4;tot+=net;res.append((short,len(rows),d,y,net))
    T(41.8,"∑",718);T(75.6,"%.2f"%tot,721.5);T(60.5,"Toplam",686.6);T(88,"Net",686.6)
    T(302.3,"301.50",721.5);T(335.1,"TYT",710.7);T(298.1,"Puan",686.6)
    T(36.3,"Kurum Sırası / Katılım",656.6);T(71.7,"10",635.4);T(87,"/ 41",636.7)
    T(248.7,"Ders",588.9);T(315.3,"Soru Doğ",588.9);T(350.8,"Yan",588.9);T(371,"Net",588.9);T(391.2,"Şube Kurum Genel",588.9);T(478.6,"Başarı Grafiği",588.9)
    for i,(n,s,d,y,net) in enumerate(res):
        yy=573.3-i*14.1;T(246.6,"◉ "+n,yy)
        for x,v in zip([319,336,355.1,369.6],[s,d,y,("%g"%net)]):T(x,str(v),yy)
        for x,v in zip([393,415.7,438.4,534.9],["60%","50%","55%","%d%%"%round(net/s*100)]):T(x,v,yy)
    T(50,"1",300);T(70,"02/11/2026",300);T(130,"TEST-TYT 9 DENEME",300)
    for x,v in zip([290,320,350,380],["4.3","0.8","3.0","1.0"]):T(x,v,300)
    T(550,"%d%%"%60,300);c.showPage();c.setFont("DJ",7)
    # ---- sayfa 2: iki sütun; sütun başları 27.8 / 311.2, satır aralığı 10.2
    header(c,T,2);T(102,"Kazanım Bazlı Detaylı Analiz ve Soru İstatistikleri",756.9)
    ycur=[735.7,735.7]
    for full,short,blk,col,rows in D:
        s=[27.8,311.2][col];yy=ycur[col]
        T(s,blk+" (A)",yy);T(s+161.9,"Cvp",yy+0.4);T(s+183.7,"Öğr",yy+0.4);T(s+200.8,"Şube%Kurum%Genel%",yy+0.4)
        for i,(cv,og,kz) in enumerate(rows):
            yy-=10.2;T(s+0.1,str(i+1),yy);T(s+11.9,kz,yy);T(s+165,cv,yy);og and T(s+186.6,og,yy)
            for dx,v in zip([206.8,228.4,249.9],["48","50","45"]):T(s+dx,v,yy+0.2)
        ycur[col]=yy-14
    c.showPage();c.setFont("DJ",7)
    # ---- sayfa 3: kazanım detayı (tam adlar)
    header(c,T,3);T(102,"Net Performans Trendi ve Kazanım Başarı Oranları Tablosu",756.9)
    yy=637.4;seen=set()
    for full,short,blk,col,rows in D:
        for cv,og,kz in rows:
            nm=FULL.get(kz,kz)
            if nm in seen:continue
            seen.add(nm);T(37.6,str(len(seen)),yy);T(55.9,nm,yy);T(335.3,"1",yy);T(361,"1 - 0 - 0",yy);T(439.4,"100%",yy);T(504.6,"65%",yy);T(539,"+35",yy);yy-=12.7
    c.save()
if __name__=="__main__":
    import os;make(os.path.join(os.path.dirname(os.path.abspath(__file__)),"fixtures","sonuc-egim.pdf"))
