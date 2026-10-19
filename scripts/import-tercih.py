#!/usr/bin/env python3
"""ÖSYM yerleştirme tablolarından (Tablo-3 ön lisans, Tablo-4 lisans; "en küçük ve en büyük puanlar") tercih.json üretir.
Kullanım: python3 scripts/import-tercih.py <yıl> <lisans.xlsx> <onlisans.xlsx> [çıktı=tercih.json]
Yalnızca genel kontenjan sütunları kullanılır. Hücrede "--" olan değerler boş (null) kalır."""
import sys,re,json,openpyxl
PROV="Adana Adıyaman Afyonkarahisar Ağrı Aksaray Amasya Ankara Antalya Ardahan Artvin Aydın Balıkesir Bartın Batman Bayburt Bilecik Bingöl Bitlis Bolu Burdur Bursa Çanakkale Çankırı Çorum Denizli Diyarbakır Düzce Edirne Elazığ Erzincan Erzurum Eskişehir Gaziantep Giresun Gümüşhane Hakkari Hatay Iğdır Isparta İstanbul İzmir Kahramanmaraş Karabük Karaman Kars Kastamonu Kayseri Kırıkkale Kırklareli Kırşehir Kilis Kocaeli Konya Kütahya Malatya Manisa Mardin Mersin Muğla Muş Nevşehir Niğde Ordu Osmaniye Rize Sakarya Samsun Siirt Sinop Sivas Şanlıurfa Şırnak Tekirdağ Tokat Trabzon Tunceli Uşak Van Yalova Yozgat Zonguldak".split()
up=lambda s:s.replace("i","İ").replace("ı","I").upper()
PU={up(p):p for p in PROV}
EXTRA={"GEBZE TEKNİK ÜNİVERSİTESİ":"Kocaeli","TÜRK-JAPON BİLİM VE TEKNOLOJİ ÜNİVERSİTESİ":"İstanbul"}  # adında şehir geçmeyen iki üniversite
def low(s): return s.replace("İ","i").replace("I","ı").lower()
def title(s):
    out=[]
    for w in re.split(r"(\s+|-|\(|\))",s):
        if not w or re.fullmatch(r"\s+|-|\(|\)",w): out.append(w);continue
        if w in("VE","İLE"): out.append(low(w));continue
        out.append(up(w[0])+low(w[1:]))
    return "".join(out)
def num(v):
    return round(float(v),5) if isinstance(v,(int,float)) else None
def conv(path,lv):
    ws=openpyxl.load_workbook(path,read_only=True,data_only=True).worksheets[0];res=[]
    for r in ws.iter_rows(min_row=4,values_only=True):
        if not r[0] or not str(r[0]).strip().isdigit():continue
        uni=str(r[2]).strip();m=re.search(r"\(([^)]+)\)\s*$",uni)
        if m: il=m.group(1);name=uni[:m.start()].strip()
        else:
            name=uni;il=EXTRA.get(uni) or PU.get(uni.split()[0],"")
        il=PU.get(up(il),title(il)) if il else ""
        il=re.sub(r"^Kktc-","KKTC - ",il)
        tur={"DEVLET":"Devlet","VAKIF":"Vakıf","KKTC":"KKTC","YURTDISI KAMU":"Yurt dışı (kamu)","YURTDISI VAKIF":"Yurt dışı (vakıf)"}.get(str(r[1]).strip(),str(r[1]).title())
        res.append({"kod":str(r[0]).strip(),"uni":title(name),"il":il,"tur":tur,"b":str(r[4]).strip(),"pt":str(r[5]).strip(),"lv":lv,
                    "k":int(r[6]) if isinstance(r[6],(int,float)) else None,"y":int(r[7]) if isinstance(r[7],(int,float)) else None,"tp":num(r[8]),"mp":num(r[9])})
    return res
if __name__=="__main__":
    yil,lis,onl=sys.argv[1],sys.argv[2],sys.argv[3];out=sys.argv[4] if len(sys.argv)>4 else "tercih.json"
    P=conv(lis,"L")+conv(onl,"O")
    json.dump({"meta":{"yil":int(yil),"kaynak":"ÖSYM %s yerleştirme sonuçları (Tablo-3, Tablo-4)"%yil,"guncelleme":""},"p":P},open(out,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
    print(len(P),"program yazıldı →",out)
