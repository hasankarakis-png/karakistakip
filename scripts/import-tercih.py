#!/usr/bin/env python3
"""ÖSYM yerleştirme tablolarından (Tablo-3 ön lisans, Tablo-4 lisans; "en küçük ve en büyük puanlar") tercih.json üretir.
En yeni yıl ana veridir; önceki yıllar program koduyla eşleştirilip "h" altına eklenir.
Kullanım: python3 scripts/import-tercih.py tercih.json 2026:lisans.xlsx:onlisans.xlsx 2025:lisans.xlsx:onlisans.xlsx
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
def ival(v):
    if isinstance(v,(int,float)): return int(v)
    v=str(v).strip() if v is not None else ""
    return int(v) if v.isdigit() else None
def num(v):
    if isinstance(v,str):
        try: v=float(v.replace(",","."))
        except ValueError: return None
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
                    "k":ival(r[6]),"y":ival(r[7]),"tp":num(r[8]),"mp":num(r[9])})
    return res

def pack(meta,P):
    """Dosyayı küçültür (v2): tekrarlayan metinler sözlüğe, her program tek satır dizi. İstemci açılışta nesnelere geri çevirir."""
    yl=[str(y) for y in meta["yillar"][1:]]
    U,I,T={},{},{}
    ix=lambda d,k:d.setdefault(k,len(d))
    r2=lambda v:None if v is None else round(v,2)
    rows=[]
    for p in P:
        h=p.get("h") or {}
        rows.append([p["kod"],ix(U,p["uni"]),ix(I,p["il"]),ix(T,p["tur"]),p["b"],p["pt"],p["lv"],p["k"],p["y"],r2(p["tp"]),r2(p["mp"]),
                     [([r2(h[y][0]),h[y][1],h[y][2]] if y in h else None) for y in yl] if h else 0])
    return {"v":2,"meta":meta,"u":list(U),"il":list(I),"tur":list(T),"p":rows}
def unpack(d):
    if d.get("v")!=2: return d
    yl=[str(y) for y in d["meta"]["yillar"][1:]];P=[]
    for r in d["p"]:
        h={y:v for y,v in zip(yl,r[11])} if r[11] else None
        h={y:v for y,v in h.items() if v} if h else None
        p={"kod":r[0],"uni":d["u"][r[1]],"il":d["il"][r[2]],"tur":d["tur"][r[3]],"b":r[4],"pt":r[5],"lv":r[6],"k":r[7],"y":r[8],"tp":r[9],"mp":r[10]}
        if h:p["h"]=h
        P.append(p)
    return {"meta":d["meta"],"p":P}
if __name__=="__main__":
    # python3 scripts/import-tercih.py tercih.json 2026:lisans.xlsx:onlisans.xlsx 2025:lisans.xlsx:onlisans.xlsx
    if sys.argv[1]=="--repack":  # eski (v1) dosyayı v2'ye çevir: --repack tercih.json
        d=json.load(open(sys.argv[2],encoding="utf-8"))
        if d.get("v")!=2: json.dump(pack(d["meta"],d["p"]),open(sys.argv[2],"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
        sys.exit()
    out=sys.argv[1];yillar=[]
    for a in sys.argv[2:]:
        y,lis,onl=a.split(":",2)[0],a.split(":",2)[1],a.split(":",2)[2];yillar.append((int(y),conv(lis,"L")+conv(onl,"O")))
    yillar.sort(key=lambda x:-x[0]);son=yillar[0][0]
    P=yillar[0][1];by={p["kod"]:p for p in P}
    for y,L in yillar[1:]:
        for q in L:
            p=by.get(q["kod"])
            if p is not None: p.setdefault("h",{})[str(y)]=[q["tp"],q["k"],q["y"]]  # [taban puan, kontenjan, yerleşen]
    kaynak="ÖSYM %s yerleştirme sonuçları (Tablo-3, Tablo-4)"%" ve ".join(str(y) for y,_ in yillar)
    meta={"yil":son,"yillar":[y for y,_ in yillar],"kaynak":kaynak,"guncelleme":""}
    json.dump(pack(meta,P),open(out,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
    print(len(P),"program yazıldı →",out,"| geçmiş yıl eşleşen:",sum(1 for p in P if p.get("h")))
