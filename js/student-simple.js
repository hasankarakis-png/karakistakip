/* Karakış Takip · Sade öğrenci ekranları
   todayTab() ve analizTab() çıktısını sarar. Bilgi silinmez, yalnızca sıra ve yer değişir:
   1) sayaç → bugünün görevleri → soru girişi → gün sonu (öğrencinin günlük akışı)
   2) Yarışma / Konu Takibi / Tercih Robotu gibi uzun yönlendirme kartları küçük "Kısayollar" karolarına iner;
      yapılacak uyarıları (tekrar, deneme haftası, yeni mesaj) ince şerit olarak üstte kalır
   3) Günün sözü, karne, istatistik, seri ve günün akışı katlanır "Daha fazla" bölümüne gider;
      Günlük durum kartı (isteğe bağlı) özetli, kapalı bir satıra iner
   4) Analiz → Özet: tekrar eden sayı kutuları kalkar, yoğunluk haritası katlanır
   Tanınmayan her kart görünür kalır. Yapı beklenenden farklıysa eski ekran aynen çizilir.
   Kapatmak için: SADE_AKTIF=false (ya da index.html'den bu dosyayı kaldır). */
(function(){
  "use strict";
  const SADE_AKTIF=true,KEY="karakis-sade-more";
  let MORE=false;
  try{MORE=localStorage.getItem(KEY)==="1"}catch(e){}
  const baseToday=todayTab,baseAnaliz=analizTab;

  const txt=e=>(e.textContent||"").replace(/\s+/g," ").trim();
  const head=e=>{const h=e.querySelector("h2");return h?txt(h):""};

  // Katlanır kart: içerik her zaman çizilir (alanlar, kayıt ve taslak koruması aynı kalır), yalnızca gizlenir.
  // Açık/kapalı bilgisi tarayıcıda tutulur; varsayılan kapalı.
  const FKEY="karakis-sade-fold";
  let FOLD={};
  try{FOLD=JSON.parse(localStorage.getItem(FKEY)||"{}")||{}}catch(e){}
  function fold(key,title,sub,inner,todo){
    const open=!!FOLD[key];
    return `<button class="sx-fold${todo?" todo":""}" data-sxfold="${key}" aria-expanded="${open}"><span class="tx"><b>${esc(title)}</b><small>${esc(sub)}</small></span><i aria-hidden="true">${open?"▴":"▾"}</i></button><div class="sx-foldb" data-sxfb="${key}"${open?"":" hidden"}>${inner}</div>`;
  }
  const asHTML=e=>typeof e==="string"?e:e.outerHTML;

  function tile(e){
    const ic=e.querySelector(".rg span"),h=e.querySelector("h2"),p=e.querySelector("p,small");
    const at=e.hasAttribute("data-tab")?`data-tab="${esc(e.getAttribute("data-tab"))}"`:`data-qa="${esc(e.getAttribute("data-qa")||"")}"`;
    return `<button class="sx-tile" ${at} aria-label="${esc(e.getAttribute("aria-label")||txt(h||e))}"><span class="ic" aria-hidden="true">${esc(ic?txt(ic):"•")}</span><span class="tx"><b>${esc(h?txt(h):"")}</b>${p?`<small>${esc(txt(p))}</small>`:""}</span></button>`;
  }

  function sade(html){
    const tpl=document.createElement("template");tpl.innerHTML=html;
    const all=[...tpl.content.children];
    const qi=all.findIndex(e=>e.classList.contains("qt"));
    if(qi<0)return html;                       // beklenen yapı yok → eski ekran
    const top=all.slice(0,qi);                 // kurulum, rehber, uzun sayaç, sonraki not… (uyarı kartları)
    const rest=all.slice(qi);
    const take=f=>{const i=rest.findIndex(f);return i<0?null:rest.splice(i,1)[0]};
    const tabBtn=t=>take(e=>e.matches(`button.tr[data-tab="${t}"]`));

    const quote=take(e=>e.classList.contains("qt"));
    const hero=take(e=>e.matches("section.hero"));
    if(!hero)return html;
    const picker=take(e=>e.matches(".card")&&!!e.querySelector("[data-me]"));
    const todays=take(e=>/^Bugünün görevleri/.test(head(e)));
    // Kalan görev kartları (v4.7): dağıtım sonucu, bu hafta kalanlar (yapay zekâyla dağıtılabilir), geçen haftalardan kalanlar
    const overdue=[];for(let e;(e=take(x=>x.matches(".card")&&/Geçen günlerden kalan|Bu hafta kalan görevler|Geçen haftalardan kalan|kalan günlerine dağıtıldı/.test(txt(x))));)overdue.push(e);
    const ring=tabBtn("g");                    // "Bugünkü görevler 0/1": liste varsa tekrar eder; yoksa boş durum mesajı olarak kalır
    const nets=take(e=>e.classList.contains("nets"));
    const count=take(e=>!!e.querySelector(".cdh"));
    const due=tabBtn("w");                     // "Bugün tekrar: N soru" (yalnızca tekrar varsa gelir)
    const exam=take(e=>e.matches('button.tr[data-qa="d"]'));
    const karne=take(e=>e.classList.contains("karne"));
    const ch=tabBtn("y"),msg=tabBtn("m"),konu=tabBtn("c"),terc=tabBtn("t");
    const stats=take(e=>e.classList.contains("stats"));
    const streak=take(e=>e.matches(".card")&&/gün seri/.test(txt(e))&&txt(e).length<90);
    const qcard=take(e=>e.id==="qcard");
    const qs=take(e=>/^Girdiğin sorular/.test(head(e)));
    const day=take(e=>/^Günlük durum/.test(head(e)));
    const endd=take(e=>/^Gün sonu/.test(head(e)));
    const flow=take(e=>/^Bugünün akışı/.test(head(e)));

    const unread=msg&&/yeni mesaj/i.test(txt(msg));     // okunmamış koç mesajı kısayol değil, uyarıdır
    const tiles=[ch,unread?null:msg,konu,terc].filter(Boolean).map(tile);
    [due,exam,unread?msg:null].forEach(e=>e&&e.classList.add("sx-slim"));   // uyarı kartları: aynı içerik, daha az yer
    const tileHTML=tiles.length?`<p class="sx-lbl">Kısayollar</p><div class="sx-tiles">${tiles.join("")}</div>`:"";

    // Katlananlar yalnızca başka yerde de bulunan ya da günlük akış için gerekmeyen kartlar:
    // söz, haftalık karne (Analiz'de var), istatistik, seri (üstteki 🔥 ile aynı), günün akışı
    const more=[quote,karne,stats,streak,flow].filter(Boolean).map(e=>e.outerHTML).join("");
    const moreHTML=`<button class="sx-more" data-sxmore aria-expanded="${MORE}"><b>${MORE?"Daha az göster ▴":"Daha fazla ▾"}</b><small>Günün sözü, karne, istatistik, günün akışı</small></button><div class="sx-moreb"${MORE?"":" hidden"}>${more}</div>`;

    // Günlük durum (uyku, dikkat, enerji, stres, zorlandığım konu): isteğe bağlı olduğu için kapalı gelir,
    // dolu alan sayısı özet olarak görünür; hiç doldurulmadıysa vurgulu çerçeve hatırlatır
    const dn=day?[S.sleep,S.dist,S.en,S.str,S.hard].filter(Boolean).length:0;
    const dayF=day?fold("day","Günlük durum",dn?`${dn}/5 dolu · düzenlemek için dokun`:"İsteğe bağlı · 30 saniye sürer",day.outerHTML,!dn):null;

    // Geri sayım ve "son net" görünür kalır (sınava kalan süre öğrenci için temel bilgi), gün sonundan sonra gelir
    const primary=[hero,picker,todays||ring,...overdue,due,exam,unread?msg:null,qcard,qs,dayF,endd,count,nets]
      .concat(rest);                                     // tanınmayan kartlar kaybolmasın
    return top.concat(primary).filter(Boolean).map(asHTML).join("")+tileHTML+moreHTML;
  }

  // Analiz → Özet: haftalık karne ile aynı sayıları (toplam çalışma, soru, aktif gün) tekrar eden kutular kalkar
  // (iki farklı "toplam çalışma" sayısı kafa karıştırıyordu), 126 küçük kutulu yoğunluk haritası katlanır.
  function sadeAnaliz(html){
    const tpl=document.createElement("template");tpl.innerHTML=html;
    const kids=[...tpl.content.children];
    const heat=kids.find(e=>e.matches(".card")&&/^Yoğunluk Haritası/.test(head(e)));
    if(!heat)return html;                      // yalnızca Özet sekmesinde var
    const am=tpl.content.querySelector(".activity-metrics");if(am)am.remove();
    return kids.map(e=>e===heat?fold("heat","Yoğunluk haritası","Son 18 hafta · hangi gün ne kadar çalıştın",heat.outerHTML):e.outerHTML).join("");
  }
  analizTab=function(){
    const html=baseAnaliz();
    if(!SADE_AKTIF||typeof ROLE==="undefined"||ROLE!=="student")return html;
    try{return sadeAnaliz(html)}catch(e){return html}
  };

  todayTab=function(){
    const html=baseToday();
    if(!SADE_AKTIF||typeof ROLE==="undefined"||ROLE!=="student")return html;
    try{return sade(html)}catch(e){return html}
  };

  document.addEventListener("click",e=>{
    const f=e.target.closest&&e.target.closest("[data-sxfold]");
    if(f){
      const k=f.getAttribute("data-sxfold");FOLD[k]=!FOLD[k];
      try{localStorage.setItem(FKEY,JSON.stringify(FOLD))}catch(x){}
      const body=document.querySelector(`[data-sxfb="${k}"]`);if(body)body.hidden=!FOLD[k];
      f.setAttribute("aria-expanded",String(!!FOLD[k]));
      const ar=f.querySelector("i");if(ar)ar.textContent=FOLD[k]?"▴":"▾";
      return;
    }
    const b=e.target.closest&&e.target.closest("[data-sxmore]");if(!b)return;
    MORE=!MORE;
    try{localStorage.setItem(KEY,MORE?"1":"0")}catch(x){}
    const body=document.querySelector(".sx-moreb");if(body)body.hidden=!MORE;
    b.setAttribute("aria-expanded",String(MORE));
    const t=b.querySelector("b");if(t)t.textContent=MORE?"Daha az göster ▴":"Daha fazla ▾";
  });
})();
