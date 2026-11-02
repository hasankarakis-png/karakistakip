# Deneme sonuç belgesi PDF okuyucusu için SAHTE örnek (gerçek öğrenci verisi yok). Çalıştır: python3 make_sample_pdf.py
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("DJ","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DJB","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
L="ABCDE"
DERS=[("Türkçe",40,30,8,2,["Sözcükte anlam","Cümlede anlam","Paragraf","Yazım kuralları","Noktalama"]),
      ("Sosyal Bilimler",20,12,4,4,["İlk Türk devletleri","Harita bilgisi","Felsefeye giriş"]),
      ("Temel Matematik",40,25,10,5,["Sayı basamakları","Üslü sayılar","Problemler","Fonksiyonlar"]),
      ("Fen Bilimleri",20,10,6,4,["Genleşme","Atom modelleri","Hücre"])]
def make(path,text=True):
    c=canvas.Canvas(path,pagesize=(595,842))
    if not text:
        c.rect(50,50,400,600,fill=1);c.showPage();c.save();return
    y=800
    c.setFont("DJB",16);c.drawString(40,y,"SINAV SONUÇ BELGESİ");y-=22
    c.setFont("DJ",11)
    c.drawString(40,y,"Adı Soyadı: Ayşe Yılmaz");y-=14
    c.drawString(40,y,"T.C. Kimlik No: 12345678901");y-=14
    c.drawString(40,y,"Okul / Sınıf: Örnek Anadolu Lisesi 12-A");y-=18
    c.setFont("DJB",13);c.drawString(40,y,"MEBİ TYT 8 DENEME SINAVI");y-=16
    c.setFont("DJ",11)
    c.drawString(40,y,"Sınav Tarihi: 25.10.2026");y-=14
    c.drawString(40,y,"Sınav Puanı: 412,35");y-=14
    c.drawString(40,y,"Kurum Sıralaması: 3 / 41");y-=22
    c.setFont("DJB",11);c.drawString(40,y,"DERSLER");y-=14
    xs=[40,200,245,290,335,385,445,505]
    for x,h in zip(xs,["Ders","Soru","Doğru","Yanlış","Boş","Net","ÖĞRENCİ %","KURUM %"]):c.drawString(x,y,h)
    y-=14;c.setFont("DJ",10)
    tot=0
    for n,q,d,yy,b,_ in DERS:
        net=d-yy/4;tot+=net
        vals=[n,str(q),str(d),str(yy),str(b),("%.2f"%net).replace(".",","),("%.1f"%(net/q*100)).replace(".",","),"50,33"]
        for x,v in zip(xs,vals):c.drawString(x,y,v)
        y-=13
    for x,v in zip(xs,["Toplam","120","77","28","15",("%.2f"%tot).replace(".",","),"",""]):c.drawString(x,y,v)
    y-=24
    import itertools
    for n,q,d,yy,b,kz in DERS:
        st=["D"]*d+["Y"]*yy+["B"]*b
        # deterministik karıştır
        st=[st[(i*7)%len(st)] for i in range(len(st))] if len(set((i*7)%len(st) for i in range(len(st))))==len(st) else st
        if y<120:c.showPage();y=800
        c.setFont("DJB",11);c.drawString(40,y,f"{n} Dersi Kazanım Açıklama");y-=14
        c.setFont("DJB",9)
        for x,h in zip([40,70,100,130],["Sr","Ö","A","Kazanım"]):c.drawString(x,y,h)
        y-=12;c.setFont("DJ",9)
        for i,s in enumerate(st,1):
            if y<60:c.showPage();y=800;c.setFont("DJ",9)
            key=L[i%5]
            c.drawString(40,y,str(i));c.drawString(100,y,key);c.drawString(130,y,kz[i%len(kz)])
            if s=="D":c.drawString(70,y,key)
            elif s=="Y":c.drawString(70,y,L[(i+1)%5].lower())
            y-=11
        y-=10
    c.showPage();c.save()
make("fixtures/sonuc-ornek.pdf");make("fixtures/sonuc-taranmis.pdf",text=False)
print("ok")
