/* Konu takibi: öğrenci bitirdiği konuları işaretler (topic_progress tablosu; localStorage yedeği) */
const KT_DATA={
TYT:[
["Türkçe","Sözcükte Anlam|Cümlede Anlam|Paragraf (Anlam ve Yapı)|Ses Bilgisi|Yazım Kuralları|Noktalama İşaretleri|Sözcükte Yapı (Kök, Ek)|İsimler|Sıfatlar|Zamirler|Zarflar|Edat, Bağlaç, Ünlem|Fiiller (Kip, Kişi, Çatı)|Fiilimsiler|Ek Fiil|Cümlenin Ögeleri|Cümle Türleri|Anlatım Bozukluğu|Anlatım Biçimleri ve Düşünceyi Geliştirme Yolları"],
["Tarih","Tarih ve Zaman|İlk ve Orta Çağlarda Türk Dünyası|İslam Medeniyetinin Doğuşu|İlk Türk-İslam Devletleri|Türkiye Selçuklu Devleti|Osmanlı Kuruluş ve Yükselme|Osmanlı Kültür ve Medeniyeti|Yeni Çağda Avrupa|Osmanlı Duraklama ve Gerileme|XIX. Yüzyılda Osmanlı|XX. Yüzyıl Başlarında Osmanlı|I. Dünya Savaşı|Millî Mücadele Hazırlık Dönemi|Kurtuluş Savaşı|Atatürk İlkeleri ve İnkılapları|Atatürk Dönemi Dış Politika|II. Dünya Savaşı ve Sonrası|Soğuk Savaş ve Yakın Dönem"],
["Coğrafya","Doğa ve İnsan|Dünya'nın Şekli ve Hareketleri|Coğrafi Konum|Harita Bilgisi|İklim Bilgisi|Yerin Şekillenmesi (İç ve Dış Kuvvetler)|Su, Toprak ve Bitki Örtüsü|Nüfus ve Yerleşme|Türkiye'de Ekonomik Faaliyetler|Bölgeler ve Ülkeler|Doğal Afetler|Çevre ve Toplum"],
["Felsefe","Felsefenin Konusu|Bilgi Felsefesi|Varlık Felsefesi|Ahlak Felsefesi|Sanat Felsefesi|Din Felsefesi|Siyaset Felsefesi|Bilim Felsefesi"],
["Din Kültürü","Bilgi ve İnanç|Din ve İslam|İslam ve İbadet|Gençlik ve Değerler|Hz. Muhammed'in Hayatı|Kur'an'a Göre Hz. Muhammed|İslam Düşüncesinde Yorumlar|Din, Kültür ve Medeniyet"],
["Matematik","Temel Kavramlar|Sayı Basamakları|Bölme ve Bölünebilme|EBOB - EKOK|Rasyonel Sayılar|Basit Eşitsizlikler|Mutlak Değer|Üslü Sayılar|Köklü Sayılar|Çarpanlara Ayırma|Oran Orantı|Denklem Çözme|Problemler (Sayı, Kesir, Yaş)|Problemler (Yüzde, Kâr-Zarar, Faiz)|Problemler (Hız, İşçi, Havuz, Karışım)|Kümeler|Mantık|Fonksiyonlar|Polinomlar|2. Dereceden Denklemler|Permütasyon ve Kombinasyon|Olasılık|Veri, Tablo ve Grafikler"],
["Geometri","Temel Geometri Kavramları|Doğruda ve Üçgende Açılar|Dik Üçgen ve Pisagor|Özel Üçgenler|Üçgende Alan|Açıortay ve Kenarortay|Benzerlik|Çokgenler ve Dörtgenler|Çember ve Daire|Analitik Geometri|Katı Cisimler|Dönüşüm Geometrisi"],
["Fizik","Fizik Bilimine Giriş|Madde ve Özellikleri|Kuvvet ve Hareket|Hareket (Konum, Hız, İvme)|Newton'ın Hareket Yasaları|İş, Güç, Enerji|Isı, Sıcaklık ve Genleşme|Basınç|Kaldırma Kuvveti|Elektrostatik|Elektrik Akımı ve Devreler|Manyetizma|Dalgalar|Optik (Aynalar, Kırılma, Mercekler)"],
["Kimya","Kimya Bilimi|Atom ve Periyodik Sistem|Kimyasal Türler Arası Etkileşimler|Maddenin Halleri|Kimyanın Temel Kanunları|Mol Kavramı|Kimyasal Hesaplamalar|Karışımlar|Asitler, Bazlar ve Tuzlar|Kimya Her Yerde"],
["Biyoloji","Canlıların Ortak Özellikleri|Canlıların Temel Bileşenleri|Hücre ve Organelleri|Madde Geçişleri|Canlıların Sınıflandırılması|Hücre Bölünmeleri|Kalıtım|Ekosistem Ekolojisi|Güncel Çevre Sorunları"]
],
AYT:[
["Matematik","Fonksiyonlar|Polinomlar|2. Dereceden Denklemler|Eşitsizlikler|Parabol|Trigonometri|Logaritma|Diziler|Limit|Türev|İntegral|Permütasyon, Kombinasyon, Binom|Olasılık|Karmaşık Sayılar"],
["Geometri","Üçgenler|Çokgenler ve Dörtgenler|Çember ve Daire|Analitik Geometri|Katı Cisimler|Dönüşümler|Çemberin Analitik İncelenmesi"],
["Fizik","Vektörler|Bağıl Hareket|Newton'ın Hareket Yasaları|Bir Boyutta Sabit İvmeli Hareket|İki Boyutta Hareket (Atışlar)|Enerji ve Hareket|İtme ve Momentum|Tork ve Denge|Elektriksel Kuvvet ve Alan|Elektriksel Potansiyel, Sığa|Manyetizma ve Elektromanyetik İndüksiyon|Alternatif Akım ve Transformatörler|Düzgün Dairesel Hareket|Basit Harmonik Hareket|Kütle Çekim|Dalga Mekaniği|Atom Fiziğine Giriş ve Radyoaktivite|Modern Fizik|Özel Görelilik"],
["Kimya","Modern Atom Teorisi|Gazlar|Sıvı Çözeltiler ve Çözünürlük|Kimyasal Tepkimelerde Enerji|Kimyasal Tepkimelerde Hız|Kimyasal Denge|Asit-Baz Dengesi|Çözünürlük Dengesi (KÇÇ)|Kimya ve Elektrik|Organik Kimyaya Giriş|Hidrokarbonlar|Organik Bileşikler (Alkol, Eter, Aldehit, Keton, Asit...)|Enerji Kaynakları ve Bilimsel Gelişmeler"],
["Biyoloji","Sinir Sistemi|Endokrin Sistem|Duyu Organları|Destek ve Hareket Sistemi|Sindirim Sistemi|Dolaşım Sistemi|Solunum Sistemi|Boşaltım Sistemi|Üreme Sistemi ve Embriyonik Gelişim|Komünite ve Popülasyon Ekolojisi|Genden Proteine (Nükleik Asitler, Protein Sentezi)|Genetik Mühendisliği ve Biyoteknoloji|Canlılık ve Enerji (Fotosentez, Solunum)|Bitki Biyolojisi|Canlılar ve Çevre"],
["Edebiyat","Giriş (Edebiyat, Sanat, Metinler)|Şiir Bilgisi|Edebi Sanatlar|Söz Sanatları|Dil ve Anlatım|İslamiyet Öncesi Türk Edebiyatı|Geçiş Dönemi (İslami Dönem) Edebiyatı|Halk Edebiyatı|Divan Edebiyatı|Tanzimat Edebiyatı|Servetifünun ve Fecriati|Millî Edebiyat|Cumhuriyet Dönemi Şiir|Cumhuriyet Dönemi Roman ve Hikâye|Tiyatro|Edebi Akımlar|Dünya Edebiyatı"],
["Tarih","Tarih Bilimi|İlk Türk Devletleri|İslam Tarihi ve Uygarlığı|Türk-İslam Devletleri|Selçuklu ve Anadolu Beylikleri|Osmanlı Devleti (Kuruluş-Yükselme)|Osmanlı Devleti (Duraklama-Dağılma)|Osmanlı Kültür ve Uygarlık|Avrupa Tarihi (Yeni ve Yakın Çağ)|XX. Yüzyıl Başlarında Dünya|Millî Mücadele|Atatürk İlke ve İnkılapları|Cumhuriyet Dönemi İç Politika|Atatürk Dönemi Dış Politika|II. Dünya Savaşı|Soğuk Savaş Dönemi|Yumuşama ve Küreselleşme|XXI. Yüzyılda Türkiye ve Dünya"],
["Coğrafya","Ekosistem|Nüfus ve Göç|Yerleşme|Türkiye'nin Yer Şekilleri|Türkiye'de İklim ve Bitki Örtüsü|Ekonomik Faaliyetler (Tarım, Hayvancılık, Sanayi)|Ulaşım ve Ticaret|Doğal Afetler|Bölgesel Kalkınma ve Projeler|Küresel Ortam|Çevre ve Toplum|Ülkeler Arası Etkileşim|Jeopolitik Konum"],
["Felsefe Grubu","Felsefe: Bilgi Felsefesi|Felsefe: Varlık Felsefesi|Felsefe: Ahlak ve Siyaset Felsefesi|Felsefe: Bilim, Sanat ve Din Felsefesi|Psikoloji: Bilimi ve Temel Süreçler|Psikoloji: Öğrenme, Bellek, Düşünme|Psikoloji: Ruh Sağlığı|Sosyoloji: Toplumsal Yapı|Sosyoloji: Toplumsal Değişme ve Gelişme|Sosyoloji: Kültür ve Toplumsal Kurumlar|Mantık: Önermeler|Mantık: Kıyaslar ve Akıl Yürütme"],
["Din Kültürü","Dünya ve Ahiret|Kur'an'a Göre Hz. Muhammed|Kur'an'da Bazı Kavramlar|İnançla İlgili Meseleler|İslam ve Bilim|Yaşayan Dinler|Din ve Hayat|Hz. Muhammed'in Örnekliği"]
]};
const KT=Object.fromEntries(Object.entries(KT_DATA).map(([e,L])=>[e,L.map(([n,t])=>({n,t:t.split("|")}))]));
let KTS={exam:"TYT",ders:null,done:null,st:"idle",timer:null};
const ktKey=()=>"karakis-konu-"+ME;
const ktId=(e,di,ti)=>e[0]+di+"."+ti;
function ktLoad(){
  if(KTS.st!=="idle")return;KTS.st="load";
  let loc=[];try{loc=JSON.parse(localStorage.getItem(ktKey())||"[]")}catch(e){}
  KTS.done=new Set(Array.isArray(loc)?loc:[]);
  Promise.resolve(sb.from("topic_progress").select("done").eq("student_id",ME).maybeSingle()).then(r=>{
    if(r&&r.data&&Array.isArray(r.data.done)){r.data.done.forEach(k=>KTS.done.add(k));try{localStorage.setItem(ktKey(),JSON.stringify([...KTS.done]))}catch(e){}}
    KTS.st="ok";if(tab==="c"||tab==="b")render();
  },()=>{KTS.st="ok"});
}
function ktSave(){
  const a=[...KTS.done];try{localStorage.setItem(ktKey(),JSON.stringify(a))}catch(e){}
  clearTimeout(KTS.timer);
  KTS.timer=setTimeout(()=>{dbw(sb.from("topic_progress").upsert({student_id:ME,done:a,updated_at:new Date().toISOString()},{onConflict:"student_id"}))},700);
}
function ktCount(ex,di){const d=KT[ex][di];let n=0;d.t.forEach((_,ti)=>{if(KTS.done.has(ktId(ex,di,ti)))n++});return [n,d.t.length]}

/* Tekrar et: tekrar eden yanlış konular + konu takibi eşleşmesi */
const ktN=x=>String(x||"").toLocaleLowerCase("tr").replace(/[^a-zçğıöşü0-9 ]/g," ").replace(/\s+/g," ").trim();
function ktMatch(type,ders,konu,done){
  const E=KT[type];if(!E)return null;const dn=ktN(ders),kn=ktN(konu);if(!kn)return null;
  const wk=kn.split(" ").filter(w=>w.length>=5);
  for(let di=0;di<E.length;di++){
    const dd=ktN(E[di].n);if(!(dd.includes(dn)||dn.includes(dd)))continue;
    for(let ti=0;ti<E[di].t.length;ti++){
      const tn=ktN(E[di].t[ti]);
      if(tn.includes(kn)||kn.includes(tn)||wk.some(w=>tn.includes(w.slice(0,Math.max(5,w.length-2))))){return {id:ktId(type,di,ti),name:E[di].t[ti],done:done.has(ktId(type,di,ti))}}
    }
  }
  return null;
}
function tekrarList(id,done){
  const ex=(EX[id]||[]).filter(e=>Array.isArray(e.topics)&&e.topics.length).slice().sort((a,b)=>String(a.exam_date||"").localeCompare(String(b.exam_date||""))).slice(-5);
  const m={};
  ex.forEach((e,i)=>e.topics.forEach(t=>{if(!t||!t.konu||num(t.yanlis)<=0)return;const k=(t.ders||"")+"|"+ktN(t.konu),o=m[k]=m[k]||{ders:t.ders||"",konu:t.konu,type:e.exam_type,n:0,y:0,last:i};o.n++;o.y+=num(t.yanlis);o.last=i}));
  return Object.values(m).filter(o=>o.n>=2||o.y>=3).map(o=>({...o,score:o.n*3+o.y+o.last*0.1,mt:ktMatch(o.type,o.ders,o.konu,done)})).sort((a,b)=>b.score-a.score).slice(0,6);
}
function tekrarCard(id,done,lim){
  const L=tekrarList(id,done||new Set()).slice(0,lim||6);
  if(!L.length)return"";
  return `<div class="card"><h2>🔁 Öncelikli tekrar listesi</h2><p class="empty" style="margin:0 0 8px;font-size:14px">Son denemelerde tekrar eden yanlışlar</p>${L.map(o=>`<div class="subj"><span><b>${esc(o.ders)}</b> · ${esc(o.konu)}<br><small style="color:var(--mut)">${o.n} denemede yanlış · toplam ${o.y} yanlış${o.mt?(o.mt.done?" · konuyu bitirmişsin → soru çöz":" · konu takibinde işaretli değil → önce konuyu çalış"):""}</small></span><span>${o.mt?(o.mt.done?"✅":"📖"):""}</span></div>`).join("")}</div>`;
}
function konuTab(){
  ktLoad();if(!KTS.done)return `<p class="empty">Yükleniyor…</p>`;
  const ex=KTS.exam,di=KTS.ders;
  if(di!=null&&KT[ex][di]){
    const d=KT[ex][di],[n,m]=ktCount(ex,di),p=m?Math.round(n*100/m):0;
    return `${stHead(esc(d.n))}
    <div class="card"><div class="rw" style="justify-content:space-between;align-items:center"><b>${n}/${m} konu</b><span style="font:800 20px var(--fd);color:var(--acc)">%${p}</span></div><div class="ktpr"><i style="width:${p}%"></i></div><button class="chip" style="margin-top:12px" data-ktall="${di}">${n===m?"Hepsini kaldır":"Hepsini işaretle"}</button></div>
    ${d.t.map((t,ti)=>{const id=ktId(ex,di,ti),on=KTS.done.has(id);return `<button class="ktt" data-ktt="${id}" aria-pressed="${on}"><span class="ktck">${on?"✓":""}</span><span>${esc(t)}</span></button>`}).join("")}`;
  }
  let T=0,D=0;KT[ex].forEach((_,i)=>{const [n,m]=ktCount(ex,i);D+=n;T+=m});
  return `${stHead("Konu Takibi")}${tekrarCard(ME,KTS.done)}
  <div class="ktseg">${["TYT","AYT"].map(e=>`<button data-kte="${e}" aria-pressed="${ex===e}">${e}</button>`).join("")}</div>
  <p class="sub2" style="margin:10px 2px">${ex} genel ilerleme: <b style="color:var(--ink)">${D}/${T} konu · %${T?Math.round(D*100/T):0}</b></p>
  ${KT[ex].map((d,i)=>{const [n,m]=ktCount(ex,i),p=m?Math.round(n*100/m):0;return `<button class="ktd" data-ktd="${i}"><b>${esc(d.n)}</b><span class="ktpr"><i style="width:${p}%"></i></span><em>%${p}</em><i aria-hidden="true">›</i></button>`}).join("")}`;
}
function ktAct(D){
  if(D.kte){KTS.exam=D.kte;KTS.ders=null;render();return}
  if(D.ktd!=null){KTS.ders=D.ktd==="-1"?null:+D.ktd;render();window.scrollTo(0,0);return}
  if(D.ktt){if(KTS.done.has(D.ktt))KTS.done.delete(D.ktt);else KTS.done.add(D.ktt);ktSave();const y=window.scrollY;render();window.scrollTo(0,y);return}
  if(D.ktall!=null){const di=+D.ktall,ex=KTS.exam,[n,m]=ktCount(ex,di);KT[ex][di].t.forEach((_,ti)=>{const id=ktId(ex,di,ti);if(n===m)KTS.done.delete(id);else KTS.done.add(id)});ktSave();render()}
}

