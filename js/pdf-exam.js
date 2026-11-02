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
  const n=Math.min(doc.numPages,15),lines=[];let chars=0;
  for(let p=1;p<=n;p++){
    const tc=await (await doc.getPage(p)).getTextContent(),by=new Map();
    for(const it of tc.items){
      if(!it.str||!it.str.trim())continue;
      chars+=it.str.length;
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
  return {lines,chars};
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
  if(!dersler.length)return null;
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

/* Giriş noktası: {exam,uyarilar,hasText}; ders tablosu yoksa exam=null. Hata olursa null döner. */
async function pdfExamLocal(file){
  const {lines,chars}=await pdfExamLines(file);
  if(chars<80)return {exam:null,uyarilar:[],hasText:false};
  const r=pdfExamParse(lines);
  return r?{exam:r.exam,uyarilar:r.uyarilar,hasText:true}:{exam:null,uyarilar:[],hasText:true,lines:lines.length};
}
