# K14Net "SINAV SONUÇ BELGESİ" düzenini taklit eden SAHTE örnek (gerçek öğrenci verisi yok). python3 make_sample_k14.py
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("DJ","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
H=842
# ders adı, tablo adı, [(Ö, A, kazanım)]
D=[("Türkçe","Türkçe",[("b","E","Sözcükler Arası Anlam"),("A","A","Metne Sözcük Yerleştirme"),("e","C","Sözcükler Arası Anlam"),("B","B","Cümle Tamamlama"),("","D","Çekim Ekleri"),("C","C","Paragraf Bilgisi"),("c","A","Paragraf Bilgisi"),("E","E","Noktalama"),("","B","Noktalama"),("D","D","Paragraf Bilgisi")]),
   ("Din Kültürü ve Ahlak Bilgisi","Din Kültürü ve",[("B","B","Din ve Hayat"),("","E","Allah-insan İlişkisi"),("c","A","Gönül Coğrafyamız")]),
   ("Matematik","Matematik",[("D","D","Fark İşlemi"),("","B","Bölme Kuralları"),("a","B","Oran Orantı"),("E","E","Üslü İfadeler"),("","C","Üslü İfadeler"),("A","A","Köklü İfadeler")]),
   ("Fizik","Fizik",[("A","A","Optik"),("b","C","Elektrik")])]
def cnt(rows):
    d=sum(1 for o,a,_ in rows if o and o.upper()==a);y=sum(1 for o,a,_ in rows if o and o.upper()!=a);return d,y,len(rows)-d-y
def make(path):
    c=canvas.Canvas(path,pagesize=(595,H));c.setFont("DJ",8)
    T=lambda x,t,y:c.drawString(x,H-y-6,t)
    T(105,"TEST-TYT 7",16);T(105,"ÖRNEK KURUM",32);T(105,"AYŞE ÖRNEK",48);T(130,"A/",63)
    for x,v in zip([254,277,307,337],["-","50","50","50"]):T(x,v,64)
    T(386,"301.50",45);T(395,"TYT",59);T(453,"8.5",43);T(462,"Net",58);T(527,"9",41)
    for x,h in zip([24,68,91,113,138,166,193,232,265],["DERSLER","S.SAYISI","DOĞRU","YANLIŞ","BOŞ","NET","ÖĞRENCİ","ŞUBE","KURUM"]):T(x,h,87)
    tot=0
    for i,(full,short,rows) in enumerate(D):
        d,y,b=cnt(rows);net=d-y/4;tot+=net;yy=100+i*11
        T(17,short,yy);[T(x,str(v),yy) for x,v in zip([80,97,120,143],[len(rows),d,y,b])];T(165,("%g"%net),yy)
        for xv,xp,val in [(196,212,"%.1f"%(net/len(rows)*100)),(230,246,"60.5"),(265,284,"70.25")]:T(xv,val,yy);T(xp,"%",yy)
    for x,t in zip([313,337,371,409,438],["Puan","Türü","Puanı","Şube","Okul"]):T(x,t,159)
    for x,t in zip([312,370,413,441],["TYT","301.50","7","9"]):T(x,t,170)
    # üç sütunlu kazanım blokları (sütun başları 14 / 207 / 400); Din ve Matematik arasında sütun taşması
    cols=[14,207,400];ci=0;yy=221
    def head(name):
        nonlocal yy
        T(cols[ci],name+" dersi",yy);yy+=11
        T(cols[ci],"Sr",yy);T(cols[ci]+12,"Ö",yy);T(cols[ci]+20,"A",yy);T(cols[ci]+29,"D",yy);T(cols[ci]+37,"Kazanım",yy);yy+=11
    def rows_(di,s0,e0):
        nonlocal yy
        _,_,rows=D[di]
        for n in range(s0,e0):
            o,a,kz=rows[n];T(cols[ci]+1,str(n+1),yy);o and T(cols[ci]+12,o,yy);T(cols[ci]+20,a,yy);T(cols[ci]+37,kz,yy);yy+=11
        yy+=6
    head("Türkçe");rows_(0,0,10)
    head(D[1][0]);rows_(1,0,3)
    head("Matematik");rows_(2,0,3)
    ci=1;yy=221;rows_(2,3,6)          # Matematik 4-6: ikinci sütunun başında BAŞLIKSIZ devam
    head("Fizik");rows_(3,0,2)
    T(400,"TYT son 4 sınav",600);T(404,"216.75",650)
    c.showPage();c.save()
if __name__=="__main__":make("fixtures/sonuc-k14.pdf")
