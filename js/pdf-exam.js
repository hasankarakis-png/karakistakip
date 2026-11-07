/* Deneme sonuç PDF'ini yapay zekâsız, tarayıcıda okur (pdf.js metin katmanı). Hızlıdır, kota yemez, belge cihazdan çıkmaz.
   Çıktı biçimi sunucudaki exam-extract ile aynıdır ({exam,uyarilar}); böylece "Okunan sonucu kontrol et" formu ve kayıt aynen çalışır.
   Kurumsal "SINAV SONUÇ BELGESİ" düzeni beklenir: üstte sınav adı/puan/sıralama, "DERSLER" tablosu (ders, soru, D, Y, B, net, öğrenci %, kurum %),
   altta ders başına soru bazlı kazanım tabloları (Sr, Ö, A, kazanım). Soru bazlı konu verisi yalnızca ders tablosuyla BİREBİR tutuyorsa kaydedilir.
   Metin katmanı olmayan (taranmış/fotoğraf) PDF'te null döner ve hasText=false olur; çağıran eski görsel okumaya geçer.
   Kişisel bilgi (ad, T.C., okul, sınıf) hiç çıkarılmaz. */
let PEJS=null;
const peR2=x=>Math.round(x*100)/100;
const peNorm=s=>String(s).toLocaleLowerCase("tr").replace(/\s+/g," ").replace(/[.…]+$/,"").trim();
const peKey=s=>peNorm(s).replace(/ dersi$/,"");
const peSame=(a,b)=>{const x=peKey(a),y=peKey(b);return x===y||(x.length>=5&&y.length>=5&&(x.startsWith(y)||y.startsWith(x)))};
const peNum=s=>parseFloat(String(s).replace("%","").replace(",","."));
const peYmd=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const PE_NUM=/^-?\d+(?:[.,]\d+)?%?$/;
const peClean=(s,n=120)=>{const t=String(s||"").replace(/[\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim().slice(0,n);return t||null};

/* PDF → satırlar (metin). Aynı yükseklikteki parçalar bir satır olur; parçalar arasında boşluk varsa kelime ayrılır. */
async function pdfExamLines(file){
  if(!PEJS){PEJS=await import("/js/vendor/pdf.min.mjs");PEJS.GlobalWorkerOptions.workerSrc="/js/vendor/pdf.worker.min.mjs"}
  const doc=await PEJS.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const n=Math.min(doc.numPages,15),lines=[],pages=[];let chars=0;
  for(let p=1;p<=n;p++){
    const tc=await (await doc.getPage(p)).getTextContent(),by=new Map(),pg=[];pages.push(pg);
    for(const it of tc.items){
      if(!it.str||!it.str.trim())continue;
      chars+=it.str.length;pg.push({x:it.transform[4],y:it.transform[5],w:it.width||0,s:it.str});
      const y=Math.round(it.transform[5]/2.5),a=by.get(y)||[];a.push({x:it.transform[4],w:it.width||0,h:it.height||8,s:it.str});by.set(y,a);
    }
    [...by.entries()].sort((a,b)=>b[0]-a[0]).forEach(([,its])=>{
      its.sort((a,b)=>a.x-b.x);
      let t="",end=null;
      for(const it of its){
        if(end!==null&&it.x-end>Math.max(1.2,it.h*0.18)&&!t.endsWith(" ")&&!it.s.startsWith(" "))t+=" ";
        t+=it.s;end=it.x+it.w;
      }
      t=t.replace(/\s+/g," ").trim();if(t)lines.push(t);
    });
  }
  return {lines,chars,pages};
}

/* Satırlardan sonucu çıkarır; ders tablosu bulunamazsa null. */
function pdfExamParse(lines){
  const warn=[],head=lines.slice(0,18);
  // Tür
  const all=lines.slice(0,40).join(" \n ");
  let tur="BILINMIYOR";
  for(const t of ["TYT","AYT","LGS"])if(new RegExp("(^|[^A-ZÇĞİÖŞÜa-zçğıöşü])"+t+"([^A-ZÇĞİÖŞÜa-zçğıöşü]|$)").test(all)){tur=t;break}
  const k0=tur==="LGS"?3:4;
  // Ders tablosu satırları: "Ders adı  soru D Y B net %öğrenci ... %kurum"
  const dersler=[];let toplamNet=null;
  for(const ln of lines){
    const tk=ln.split(" ");
    let i=-1;
    for(let j=1;j<tk.length;j++){if(tk.slice(j).every(x=>PE_NUM.test(x))){i=j;break}}
    if(i<1||tk.length-i<5)continue;
    const name=tk.slice(0,i).join(" ");
    if(name.length<3||name.length>40||/^[\d.,%\s-]+$/.test(name))continue;
    const nums=tk.slice(i).map(peNum);
    if(!nums.slice(0,4).every(v=>Number.isInteger(v)&&v>=0&&v<=500))continue;
    const [soru,d,y,b,net]=nums;
    if(/^(toplam|genel)/i.test(name)){toplamNet=peR2(net);continue}
    if(d+y+b>soru)continue;
    if(dersler.some(x=>peSame(x.ders,name)))continue;
    const pct=v=>(typeof v==="number"&&isFinite(v)&&v>=0&&v<=100?peR2(v):null);
    dersler.push({ders:peClean(name,60),soru_sayisi:soru,dogru:d,yanlis:y,bos:b,net_gorsel:isFinite(net)?peR2(net):null,
      ogrenci_yuzde:nums.length>5?pct(nums[5]):null,kurum_yuzde:nums.length>=7?pct(nums[nums.length-1]):null});
  }
  if(!dersler.length){PEWHY=lines.length<5?"çok az satır okundu":"DERSLER tablosu (ders, soru, D, Y, B, net) bulunamadı";return null}
  if(tur==="BILINMIYOR")warn.push("Sınav türü anlaşılamadı, lütfen sen seç.");
  for(const d of dersler){
    d.net=peR2(d.dogru-d.yanlis/k0);
    if(d.net_gorsel!=null&&Math.abs(d.net_gorsel-d.net)>0.26)warn.push(`${d.ders}: belgedeki net (${d.net_gorsel}) hesaplanan netten (${d.net}) farklı.`);
    if(d.dogru+d.yanlis+d.bos!==d.soru_sayisi)warn.push(`${d.ders}: doğru+yanlış+boş toplamı soru sayısıyla (${d.soru_sayisi}) uyuşmuyor.`);
  }
  const hesap=peR2(dersler.reduce((a,d)=>a+d.net,0));
  if(toplamNet!=null&&Math.abs(toplamNet-hesap)>0.51)warn.push(`Belgedeki toplam net (${toplamNet}) ders netlerinden hesaplanan toplamdan (${hesap}) farklı; tabloda alt dersler de olabilir, kontrol et.`);
  // Başlık: ad, tarih, puan, sıralama
  let sinav_adi=null;
  for(const ln of head){
    const lw=peNorm(ln);
    if(/sonuç belgesi|sonuc belgesi|ad[ıi]\s*soyad|t\.?\s?c\.?|okul|sınıf|numara|öğrenci/.test(lw))continue;
    if(/deneme|mebi|sınav|sinav|tyt|ayt|lgs/.test(lw)&&ln.length<=120&&!/\d{1,3}\s+\d{1,3}\s+\d/.test(ln)){sinav_adi=peClean(ln.replace(/\s*(sınav tarihi|tarih)\s*:?.*$/i,""));break}
  }
  let tarih=null;
  for(const ln of lines.slice(0,40)){
    const m=/(?:s[ıi]nav\s*)?tarih[iı]?\s*:?\s*(\d{1,2})[./](\d{1,2})[./](\d{4})/i.exec(ln);
    if(m){const iso=`${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;if(!isNaN(Date.parse(iso))&&iso<=peYmd()){tarih=iso;break}}
  }
  let puan=null;
  for(const ln of lines.slice(0,40)){const m=/(?:s[ıi]nav\s*)?puan[ıi]?\s*:?\s*(\d{2,3}[.,]\d{1,3})/i.exec(ln);if(m){const v=peNum(m[1]);if(v>0&&v<=600){puan=peR2(v);break}}}
  let siralama=null;
  for(const ln of lines.slice(0,40)){const m=/s[ıi]ralama[sıi]?\D{0,20}?(\d{1,5})\s*[\/-]\s*(\d{1,5})/i.exec(ln);if(m){siralama=`${/kurum/i.test(ln)?"Kurum ":""}${m[1]}/${m[2]}`;break}}
  // Soru bazlı kazanım satırları (ders başlığı satırı → sonraki "Sr Ö A kazanım" satırları)
  const rows=[],seen=new Set();let cur=null;
  const byLen=dersler.map(d=>d.ders).sort((a,b)=>b.length-a.length);
  for(const ln of lines){
    const m=/^(\d{1,3})\s+(?:([A-Ea-e])\s+)?([A-E])\s+(\S.*)$/.exec(ln);
    if(m&&cur){
      const no=+m[1],oz=m[2]||"",key=m[3];
      const durum=!oz?"BOS":oz.toUpperCase()===key?"DOGRU":"YANLIS";
      const kz=peClean(m[4],100),id=peKey(cur)+"#"+no;
      if(kz&&!seen.has(id)){seen.add(id);rows.push({ders:cur,no,kazanim:kz,durum})}
      continue;
    }
    if(/^\d/.test(ln)||ln.length>70)continue;
    const nl=peNorm(ln),hit=byLen.find(dn=>nl.includes(peKey(dn)));
    if(hit&&!tk0Numeric(ln))cur=hit;
  }
  const topicMap=new Map(),topicDers=new Set();
  for(const d of dersler){
    const mine=rows.filter(r=>peSame(r.ders,d.ders));
    if(!mine.length){if(rows.length>0&&d.soru_sayisi>0)warn.push(`${d.ders}: soru detayı okunamadı, bu ders için konu verisi kaydedilmeyecek.`);continue}
    const c={DOGRU:0,YANLIS:0,BOS:0};mine.forEach(r=>c[r.durum]++);
    if(c.DOGRU!==d.dogru||c.YANLIS!==d.yanlis||c.BOS!==d.bos){
      warn.push(`${d.ders}: soru detayı tabloyla uyuşmuyor (tabloda D/Y/B ${d.dogru}/${d.yanlis}/${d.bos}, detayda ${c.DOGRU}/${c.YANLIS}/${c.BOS}). Bu ders için konu verisi kaydedilmeyecek.`);continue;
    }
    topicDers.add(peKey(d.ders));
    for(const r of mine){
      const kk=peKey(d.ders)+"|"+peNorm(r.kazanim),o=topicMap.get(kk)||{ders:d.ders,konu:r.kazanim,dogru:0,yanlis:0,bos:0};
      if(r.durum==="DOGRU")o.dogru++;else if(r.durum==="YANLIS")o.yanlis++;else o.bos++;
      topicMap.set(kk,o);
    }
  }
  const konular=[...topicMap.values()].slice(0,200).map(o=>({...o,basari_yuzdesi:null}));
  const out=dersler.map(d=>({ders:d.ders,dogru:d.dogru,yanlis:d.yanlis,bos:d.bos,net:d.net,net_gorsel:d.net_gorsel,soru_sayisi:d.soru_sayisi,ogrenci_yuzde:d.ogrenci_yuzde,kurum_yuzde:d.kurum_yuzde}));
  return {exam:{sinav_adi,tarih,tur,dersler:out,toplam_net_gorsel:toplamNet,puan,siralama,konular,soru_satiri:rows.length},uyarilar:warn};
}
const tk0Numeric=ln=>{const t=ln.split(" ");return t.length>=6&&t.slice(1).filter(x=>PE_NUM.test(x)).length>=5};


/* ===== K14Net "SINAV SONUÇ BELGESİ" (ödev PDF'indeki ppParse gibi konuma dayalı) =====
   Üstte sınav adı (sol üst ilk satır; 2. satır kurum, 3. satır öğrenci adı: ALINMAZ), DERSLER tablosu
   (ders, S.SAYISI, DOĞRU, YANLIŞ, BOŞ, NET, ÖĞRENCİ %, ŞUBE %, KURUM %; yüzdelerde "64.4 %" ayrı parça),
   "Puan Türü Puanı Şube Okul" satırı, toplam net ("46.25 Net") ve altta 3 SÜTUNLU ders blokları:
   "<Ders> dersi" başlığı, "Sr Ö A D Kazanım" üst satırı, satırlar: sıra, Ö (öğrenci cevabı; boşsa BOŞ), A (doğru cevap),
   kazanım. Ö = A ise doğru, farklıysa yanlış. Bir ders sütun/sayfa sonunda sonraki sütunun başında devam eder. */
let PEWHY="";
function peWords(pg){
  const W=[];
  for(const it of pg){
    const s=it.s;if(!s||!s.trim())continue;
    if(!/\s/.test(s.trim())){W.push({x:it.x,y:it.y,w:it.w,s:s.trim()});continue}
    const L=s.length,re=/\S+/g;let m;
    while((m=re.exec(s)))W.push({x:it.x+it.w*m.index/L,y:it.y,w:it.w*m[0].length/L,s:m[0]});
  }
  return W;
}
function peGroup(W,tol=3){
  const a=W.slice().sort((p,q)=>q.y-p.y||p.x-q.x),out=[];
  for(const w of a){const g=out[out.length-1];if(g&&Math.abs(g.y-w.y)<=tol){g.w.push(w)}else out.push({y:w.y,w:[w]})}
  out.forEach(g=>g.w.sort((p,q)=>p.x-q.x));
  return out;
}
function peK14(pages){
  PEWHY="";
  const P=pages.map(peWords),W0=P[0]||[],warn=[];
  const hd=W0.find(w=>w.s==="DERSLER");
  if(!hd){PEWHY="\"DERSLER\" tablosu başlığı bulunamadı";return null}
  const kr=W0.find(w=>w.s==="KURUM"&&Math.abs(w.y-hd.y)<4)||W0.find(w=>/^KURUM$/i.test(w.s)&&Math.abs(w.y-hd.y)<4);
  const xMin=Math.max(0,hd.x-40),xMax=(kr?kr.x:hd.x+260)+30;
  const srs0=W0.filter(w=>w.s==="Sr"),srY=srs0.length?Math.max(...srs0.map(w=>w.y)):-1e9;
  // --- DERSLER tablosu
  const dersler=[];let toplamNet=null;
  for(const g of peGroup(W0.filter(w=>w.x>=xMin&&w.x<=xMax&&w.y<hd.y-2&&w.y>srY+8))){
    const tk=g.w.map(w=>w.s);let i=0;const nm=[];
    while(i<tk.length&&!PE_NUM.test(tk[i])&&tk[i]!=="%"){nm.push(tk[i]);i++}
    if(!nm.length)continue;
    const nums=[],pc=[];
    while(i<tk.length){
      const t=tk[i];if(t==="%"){i++;continue}
      if(!PE_NUM.test(t))break;
      const isP=t.endsWith("%")||tk[i+1]==="%",v=peNum(t);
      if(isP)pc.push(v);else if(!pc.length)nums.push(v);else break;
      i++;
    }
    if(nums.length<5)continue;
    const name=nm.join(" ");
    if(name.length<3||name.length>40)continue;
    const [soru,d,y,b,net]=nums;
    if(!nums.slice(0,4).every(v=>Number.isInteger(v)&&v>=0&&v<=500))continue;
    if(/^(toplam|genel)/.test(peNorm(name))){toplamNet=peR2(net);continue}
    if(d+y+b>soru||dersler.some(x=>peSame(x.ders,name)))continue;
    const pct=v=>(typeof v==="number"&&isFinite(v)&&v>=-100&&v<=100?peR2(v):null);
    dersler.push({ders:peClean(name,60),soru_sayisi:soru,dogru:d,yanlis:y,bos:b,net_gorsel:isFinite(net)?peR2(net):null,
      ogrenci_yuzde:pc.length?pct(pc[0]):null,kurum_yuzde:pc.length>=2?pct(pc[pc.length-1]):null});
  }
  if(!dersler.length){PEWHY="DERSLER tablosunda ders satırı okunamadı (ders, soru, doğru, yanlış, boş, net)";return null}
  // --- başlık: sınav adı = sol üstteki ilk satır (kurum ve öğrenci adı satırlarına dokunulmaz)
  let sinav_adi=null;
  const top=peGroup(W0.filter(w=>w.x<xMax&&w.y>hd.y+4));
  if(top.length){const t=top[0].w.map(w=>w.s).join(" ");if(/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(t)&&!/sonuç belgesi|sonuc belgesi/.test(peNorm(t)))sinav_adi=peClean(t)}
  const lines0=peGroup(W0).map(g=>g.w.map(w=>w.s).join(" "));
  // --- puan türü, puan, şube/okul sırası
  let tur="BILINMIYOR",puan=null,okul=null;
  for(const ln of lines0){
    const m=/(?:^|\s)(TYT|AYT|LGS|SAY|EA|SÖZ|DİL)\s+(\d{2,3}[.,]\d{1,3})\s+(\d+|-)\s+(\d+|-)(?:\s|$)/.exec(ln);
    if(m){const v=peNum(m[2]);if(v>0&&v<=600){puan=peR2(v);if(m[1]==="TYT"||m[1]==="AYT"||m[1]==="LGS")tur=m[1];if(/^\d+$/.test(m[4]))okul=+m[4];break}}
  }
  if(tur==="BILINMIYOR"){
    const all=[sinav_adi||"",...lines0.slice(0,6)].join(" \n ");
    for(const t of ["TYT","AYT","LGS"])if(new RegExp("(^|[^A-ZÇĞİÖŞÜa-zçğıöşü])"+t+"([^A-ZÇĞİÖŞÜa-zçğıöşü]|$)").test(all)){tur=t;break}
  }
  if(tur==="BILINMIYOR")warn.push("Sınav türü anlaşılamadı, lütfen sen seç.");
  let kat=null;
  for(const ln of lines0.slice(0,6)){const m=/(?:^|\s)(?:-|\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/.exec(ln);if(m){kat=+m[1];break}}
  const siralama=okul?(kat&&okul<=kat?`Kurum ${okul}/${kat}`:`Kurum ${okul}`):null;
  // toplam net: "Net" yazısının hemen üstündeki sayı
  if(toplamNet==null){
    const nt=W0.find(w=>w.s==="Net"&&w.x>xMax-20);
    if(nt){const c=W0.filter(w=>PE_NUM.test(w.s)&&!w.s.endsWith("%")&&w.y>nt.y&&w.y-nt.y<40&&Math.abs((w.x+w.w/2)-(nt.x+nt.w/2))<30).sort((a,b)=>a.y-b.y)[0];if(c)toplamNet=peR2(peNum(c.s))}
  }
  // tarih: bu şablonda yok; metinde dd.mm.yyyy varsa kullan
  let tarih=null;
  for(const ln of lines0){const m=/(\d{1,2})[./](\d{1,2})[./](20\d{2})/.exec(ln);if(m){const iso=`${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;if(!isNaN(Date.parse(iso))&&iso<=peYmd()){tarih=iso;break}}}
  if(!tarih)warn.push("Belgede sınav tarihi yok; kaydederken bugünün tarihi yazılır, gerekirse düzelt.");
  // --- soru bazlı kazanım satırları (3 sütun, sütunlar soldan sağa, sayfalar sırayla)
  const rows=[],seen=new Set();let cur=null,prevStarts=[];
  P.forEach((W,pi)=>{
    const sr=W.filter(w=>w.s==="Sr");let starts=[];
    sr.map(w=>w.x).sort((a,b)=>a-b).forEach(x=>{if(!starts.length||x-starts[starts.length-1]>20)starts.push(x)});
    if(!starts.length)starts=prevStarts;if(!starts.length)return;prevStarts=starts;
    const topY=pi===0&&sr.length?Math.max(...sr.map(w=>w.y))+12:Infinity;
    const colOf=x=>{let c=0;starts.forEach((s,i)=>{if(x>=s-6)c=i});return c};
    starts.forEach((cs,ci)=>{
      const cw=W.filter(w=>w.y<=topY&&colOf(w.x)===ci);
      let hdr=null;
      for(const g of peGroup(cw)){
        const tk=g.w.map(w=>w.s);
        if(/^dersi$/.test(peNorm(tk[tk.length-1]))&&tk.length>=2){cur=tk.slice(0,-1).join(" ");hdr=null;continue}
        if(tk[0]==="Sr"){
          const f=n=>{const w=g.w.find(x=>x.s===n);return w?w.x:null};
          hdr={o:f("Ö")??cs+12,a:f("A")??cs+20,k:f("Kazanım")??cs+37};continue;
        }
        if(/^TYT son|^AYT son|^LGS son/.test(tk.join(" "))){cur=null;continue}
        if(!cur||!/^\d{1,3}$/.test(tk[0])||Math.abs(g.w[0].x-cs)>6)continue;
        const h=hdr||{o:cs+12,a:cs+20,k:cs+37},half=Math.max(3,(h.a-h.o)/2);
        const L=/^[A-Za-zÇĞİÖŞÜ]$/;
        const ow=g.w.find(w=>L.test(w.s)&&Math.abs(w.x-h.o)<=half),aw=g.w.find(w=>L.test(w.s)&&Math.abs(w.x-h.a)<=half&&w!==ow);
        if(!aw)continue;
        const oz=ow?ow.s:"",key=aw.s.toUpperCase();
        const durum=!oz?"BOS":oz.toUpperCase()===key?"DOGRU":"YANLIS";
        const kz=peClean(g.w.filter(w=>w.x>=h.k-3).map(w=>w.s).join(" "),100)||"Belirtilmemiş",no=+tk[0],id=peKey(cur)+"#"+no;
        if(!seen.has(id)){seen.add(id);rows.push({ders:cur,no,kazanim:kz,durum})}
      }
    });
  });
  // tablodaki kısaltılmış ders adı ("Din Kültürü ve") yerine blok başlığındaki tam ad
  for(const d of dersler){const r=rows.find(r=>peSame(r.ders,d.ders));if(r&&r.ders.length>d.ders.length)d.ders=peClean(r.ders,60)}
  return peAssemble({tur,dersler,toplamNet,sinav_adi,tarih,puan,siralama,rows,warn});
}

/* ===== K14Net "Eğim-Önya" öğrenci karnesi (üstte kurum logosu, "Kazanım Bazlı Detaylı Analiz" sayfası) =====
   Sayfa 1: sınav adı (TARİH yazısının solu), özet kartları (Toplam Net / Puan + tür / Kurum Sırası), "Ders Soru Doğ Yan Net Şube Kurum Genel"
   tablosu (BOŞ sütunu yok: boş = soru − doğru − yanlış; sonda 4 yüzde: şube, kurum, genel, öğrenci başarısı), altta "Net ve Başarı Yüzdeleri"
   satırında sınav tarihi (sayfa başındaki TARİH rapor tarihidir, alınmaz).
   Sayfa 2: "<Ders> (A)  Cvp Öğr Şube% Kurum% Genel%" blokları, 2 sütun. Satır: sıra, kazanım (kırpılmış), Cvp = doğru cevap, Öğr = öğrencinin cevabı:
   BÜYÜK harf ve Cvp ile aynıysa doğru, küçük harfse yanlış, boşsa boş. Kırpılmış kazanım adları, sonraki sayfalardaki "KAZANIM DETAYI" tablosundan
   tek eşleşme varsa tam adla değiştirilir. Öğrenci adı/şube/no alınmaz. */
function peEgim(pages){
  PEWHY="";
  const P=pages.map(peWords),W0=P[0]||[],warn=[];
  const L1=/^[A-Za-zÇĞİÖŞÜçğıöşü]$/,HAS=/[A-Za-zÇĞİÖŞÜçğıöşü]/,gl=s=>!/[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(s);
  const near=(a,b,t=3)=>Math.abs(a.y-b.y)<t,cx=w=>w.x+w.w/2;
  const dh=W0.find(w=>w.s==="Ders"&&W0.some(v=>v.s==="Doğ"&&near(v,w))&&W0.some(v=>v.s==="Yan"&&near(v,w)));
  if(!dh||!P.some(W=>W.some(w=>w.s==="Cvp")&&W.some(w=>w.s==="Öğr")))return null;
  // --- ders tablosu
  const dersler=[];
  for(const g of peGroup(W0.filter(w=>w.x>=dh.x-12&&w.y<dh.y-3))){
    const tk=g.w.map(w=>w.s).filter(s=>!gl(s));let i=0;const nm=[];
    while(i<tk.length&&!PE_NUM.test(tk[i])){nm.push(tk[i]);i++}
    if(!nm.length)continue;
    const nums=[],pc=[];
    for(;i<tk.length;i++){const t=tk[i];if(!PE_NUM.test(t))break;if(t.endsWith("%"))pc.push(peNum(t));else if(!pc.length)nums.push(peNum(t));else break}
    if(nums.length<4||pc.length<3)continue;
    const name=nm.join(" ");if(name.length<3||name.length>40)continue;
    const [soru,d,y,net]=nums;
    if(![soru,d,y].every(v=>Number.isInteger(v)&&v>=0&&v<=500)||d+y>soru||dersler.some(x=>peSame(x.ders,name)))continue;
    const pct=v=>(typeof v==="number"&&isFinite(v)&&v>=0&&v<=100?peR2(v):null);
    dersler.push({ders:peClean(name,60),soru_sayisi:soru,dogru:d,yanlis:y,bos:soru-d-y,net_gorsel:isFinite(net)?peR2(net):null,
      ogrenci_yuzde:pc.length>=4?pct(pc[3]):null,kurum_yuzde:pct(pc[1])});
  }
  if(!dersler.length){PEWHY="Ders tablosunda ders satırı okunamadı (ders, soru, doğru, yanlış, net)";return null}
  // --- başlık: sınav adı, tarih, puan/tür, kurum sırası, toplam net
  const tw=W0.find(w=>w.s==="TARİH");let sinav_adi=null;
  if(tw){const t=W0.filter(w=>near(w,tw)&&w.x<tw.x-3).sort((a,b)=>a.x-b.x).map(w=>w.s).join(" ");if(HAS.test(t))sinav_adi=peClean(t)}
  let tarih=null;
  for(const w of W0){
    const m=/^(\d{2})\/(\d{2})\/(20\d{2})$/.exec(w.s);if(!m||(tw&&near(w,tw)))continue;
    const iso=`${m[3]}-${m[2]}-${m[1]}`;if(!isNaN(Date.parse(iso))&&iso<=peYmd()){tarih=iso;break}
  }
  if(!tarih)warn.push("Belgede sınav tarihi okunamadı; kaydederken bugünün tarihi yazılır, gerekirse düzelt.");
  const dec=s=>/^\d+(?:\.\d+)?$/.test(s);
  const above=(lb,min,max)=>W0.filter(w=>dec(w.s)&&w.y>lb.y+min&&w.y<lb.y+max&&Math.abs(cx(w)-cx(lb))<55).sort((a,b)=>a.y-b.y)[0];
  let puan=null,tur="BILINMIYOR";
  const pl=W0.find(w=>w.s==="Puan");
  if(pl){
    const c=above(pl,8,50);if(c){const v=peNum(c.s);if(v>0&&v<=600)puan=peR2(v)}
    const t=W0.find(w=>/^(TYT|AYT|LGS)$/.test(w.s)&&w.y>pl.y+5&&w.y<pl.y+50&&Math.abs(cx(w)-cx(pl))<55);if(t)tur=t.s;
  }
  if(tur==="BILINMIYOR"){const all=(sinav_adi||"")+" \n "+W0.slice(0,12).map(w=>w.s).join(" ");for(const t of ["TYT","AYT","LGS"])if(new RegExp("(^|[^A-ZÇĞİÖŞÜa-zçğıöşü])"+t+"([^A-ZÇĞİÖŞÜa-zçğıöşü]|$)").test(all)){tur=t;break}}
  if(tur==="BILINMIYOR")warn.push("Sınav türü anlaşılamadı, lütfen sen seç.");
  let siralama=null;
  const kl=W0.find(w=>w.s==="Kurum"&&W0.some(v=>v.s==="Sırası"&&near(v,w,2)&&v.x>w.x&&v.x-w.x<50));
  if(kl){
    const t=peGroup(W0.filter(w=>w.x>=kl.x-5&&w.x<=kl.x+95&&w.y<kl.y-8&&w.y>kl.y-45)).map(g=>g.w.map(w=>w.s).join(" ")).join(" ");
    const m=/(\d{1,5})\s*\/\s*(\d{1,5})/.exec(t);if(m)siralama=`Kurum ${m[1]}/${m[2]}`;
  }
  let toplamNet=null;
  const tl=W0.find(w=>w.s==="Toplam"&&W0.some(v=>v.s==="Net"&&near(v,w,2)&&v.x>w.x&&v.x-w.x<45));
  if(tl){const c=above(tl,8,50);if(c)toplamNet=peR2(peNum(c.s))}
  // --- soru bazlı kazanımlar (2 sütun) ve sonraki sayfalardaki tam kazanım adları
  const rows=[],seen=new Set(),full=[];
  P.forEach(W=>{
    const cv=W.filter(w=>w.s==="Cvp");
    if(!cv.length){
      for(const g of peGroup(W)){
        const t=g.w.map(w=>w.s).join(" ");
        if(!/^\d{1,3}\s/.test(t)||!/\d+ - \d+ - \d+/.test(t)||g.w[0].x>45)continue;
        const nm=peClean(g.w.filter(w=>w.x>50&&w.x<325).map(w=>w.s).join(" "),100);if(nm)full.push(nm);
      }
      return;
    }
    const heads=cv.map(c=>{
      const og=W.find(w=>w.s==="Öğr"&&near(w,c)&&w.x>c.x&&w.x-c.x<40);
      const nw=W.filter(w=>near(w,c)&&w.x<c.x-10&&w.x>c.x-170).sort((a,b)=>a.x-b.x);
      const tk=[];for(const w of nw){if(/^\([A-Z]\)$/.test(w.s))break;tk.push(w.s)}
      return {y:c.y,cx:c.x+c.w/2,ox:og?og.x+og.w/2:c.x+c.w/2+21.5,start:nw.length?nw[0].x:c.x-162,name:tk.join(" ")};
    }).filter(h=>h.name);
    const starts=[...new Set(heads.map(h=>Math.round(h.start/20)))].sort((a,b)=>a-b);
    heads.forEach(h=>{
      const si=starts.indexOf(Math.round(h.start/20)),x1=h.start-6,x2=si+1<starts.length?starts[si+1]*20-26:Infinity;
      const nxt=heads.filter(o=>Math.round(o.start/20)===Math.round(h.start/20)&&o.y<h.y-3).sort((a,b)=>b.y-a.y)[0];
      const ws=W.filter(w=>w.x>=x1&&w.x<x2&&w.y<h.y-3&&(!nxt||w.y>nxt.y+3));
      for(const g of peGroup(ws)){
        const f=g.w[0];
        if(!/^\d{1,3}$/.test(f.s)||Math.abs(f.x-h.start)>8)continue;
        const cw=g.w.find(w=>L1.test(w.s)&&Math.abs(cx(w)-h.cx)<=7);
        if(!cw)continue;
        const ow=g.w.find(w=>w!==cw&&L1.test(w.s)&&Math.abs(cx(w)-h.ox)<=7);
        const key=cw.s.toUpperCase(),durum=!ow?"BOS":ow.s===key?"DOGRU":"YANLIS";
        const kz=peClean(g.w.filter(w=>w!==f&&w.x>f.x+8&&w.x<h.cx-8).map(w=>w.s).join(" "),100)||"Belirtilmemiş",no=+f.s,id=peKey(h.name)+"#"+no;
        if(!seen.has(id)){seen.add(id);rows.push({ders:h.name,no,kazanim:kz,durum})}
      }
    });
  });
  const fn=[...new Set(full)],fk=fn.map(peNorm);
  for(const r of rows){const t=peNorm(r.kazanim);if(t.length<8||fk.includes(t))continue;const c=fn.filter((s,i)=>fk[i].startsWith(t));if(c.length===1)r.kazanim=c[0]}
  return peAssemble({tur,dersler,toplamNet,sinav_adi,tarih,puan,siralama,rows,warn});
}

function peAssemble(c){
  const {tur,dersler,toplamNet,sinav_adi,tarih,puan,siralama,rows,warn}=c,k0=tur==="LGS"?3:4;
  for(const d of dersler){
    d.net=peR2(d.dogru-d.yanlis/k0);
    if(d.net_gorsel!=null&&Math.abs(d.net_gorsel-d.net)>0.26)warn.push(`${d.ders}: belgedeki net (${d.net_gorsel}) hesaplanan netten (${d.net}) farklı.`);
    if(d.dogru+d.yanlis+d.bos!==d.soru_sayisi)warn.push(`${d.ders}: doğru+yanlış+boş toplamı soru sayısıyla (${d.soru_sayisi}) uyuşmuyor.`);
  }
  const hesap=peR2(dersler.reduce((a,d)=>a+d.net,0));
  if(toplamNet!=null&&Math.abs(toplamNet-hesap)>0.51)warn.push(`Belgedeki toplam net (${toplamNet}) ders netlerinden hesaplanan toplamdan (${hesap}) farklı; kontrol et.`);
  const topicMap=new Map();
  for(const d of dersler){
    const mine=rows.filter(r=>peSame(r.ders,d.ders));
    if(!mine.length){if(rows.length>0&&d.soru_sayisi>0)warn.push(`${d.ders}: soru detayı okunamadı, bu ders için konu verisi kaydedilmeyecek.`);continue}
    const cn={DOGRU:0,YANLIS:0,BOS:0};mine.forEach(r=>cn[r.durum]++);
    if(cn.DOGRU!==d.dogru||cn.YANLIS!==d.yanlis||cn.BOS!==d.bos){
      warn.push(`${d.ders}: soru detayı tabloyla uyuşmuyor (tabloda D/Y/B ${d.dogru}/${d.yanlis}/${d.bos}, detayda ${cn.DOGRU}/${cn.YANLIS}/${cn.BOS}). Bu ders için konu verisi kaydedilmeyecek.`);continue;
    }
    for(const r of mine){
      const kk=peKey(d.ders)+"|"+peNorm(r.kazanim),o=topicMap.get(kk)||{ders:d.ders,konu:r.kazanim,dogru:0,yanlis:0,bos:0};
      if(r.durum==="DOGRU")o.dogru++;else if(r.durum==="YANLIS")o.yanlis++;else o.bos++;
      topicMap.set(kk,o);
    }
  }
  const konular=[...topicMap.values()].slice(0,200).map(o=>({...o,basari_yuzdesi:null}));
  const out=dersler.map(d=>({ders:d.ders,dogru:d.dogru,yanlis:d.yanlis,bos:d.bos,net:d.net,net_gorsel:d.net_gorsel,soru_sayisi:d.soru_sayisi,ogrenci_yuzde:d.ogrenci_yuzde,kurum_yuzde:d.kurum_yuzde}));
  return {exam:{sinav_adi,tarih,tur,dersler:out,toplam_net_gorsel:toplamNet,puan,siralama,konular,soru_satiri:rows.length},uyarilar:warn};
}

/* Giriş noktası: {exam,uyarilar,hasText}; ders tablosu yoksa exam=null. Hata olursa null döner. */
async function pdfExamLocal(file){
  const {lines,chars,pages}=await pdfExamLines(file);
  if(chars<80)return {exam:null,uyarilar:[],hasText:false};
  let r=null,why="";
  try{r=peK14(pages)}catch(e){r=null;PEWHY="okuma hatası"}
  why=PEWHY;
  if(!r){PEWHY="";try{r=peEgim(pages)}catch(e){r=null;PEWHY="okuma hatası"}if(PEWHY)why=PEWHY}
  if(!r){PEWHY="";r=pdfExamParse(lines);if(!r)why=why||PEWHY||"ders tablosu bulunamadı"}
  return r?{exam:r.exam,uyarilar:r.uyarilar,hasText:true}:{exam:null,uyarilar:[],hasText:true,why,lines:lines.length};
}
