/* Karakış Takip · Sade öğrenci ana sayfası
   todayTab() çıktısını sarar. Bilgi silinmez, yalnızca sıra ve yer değişir:
   1) sayaç → bugünün görevleri → soru girişi → gün sonu (öğrencinin günlük akışı)
   2) Yarışma / Konu Takibi / Tercih Robotu gibi uzun yönlendirme kartları küçük "Kısayollar" karolarına iner;
      yapılacak uyarıları (tekrar, deneme haftası, yeni mesaj) ince şerit olarak üstte kalır
   3) Günün sözü, geri sayım, karne, istatistik, seri ve günün akışı katlanır "Daha fazla" bölümüne gider
   Tanınmayan her kart görünür kalır. Yapı beklenenden farklıysa eski ekran aynen çizilir.
   Kapatmak için: SADE_AKTIF=false (ya da index.html'den bu dosyayı kaldır). */
(function(){
  "use strict";
  const SADE_AKTIF=true,KEY="karakis-sade-more";
  let MORE=false;
  try{MORE=localStorage.getItem(KEY)==="1"}catch(e){}
  const baseToday=todayTab;

  const txt=e=>(e.textContent||"").replace(/\s+/g," ").trim();
  const head=e=>{const h=e.querySelector("h2");return h?txt(h):""};

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
    const overdue=take(e=>/Geçen günlerden kalan/.test(txt(e))&&e.matches(".card"));
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

    // Geri sayım ve "son net" görünür kalır (sınava kalan süre öğrenci için temel bilgi), gün sonundan sonra gelir
    const primary=[hero,picker,todays||ring,overdue,due,exam,unread?msg:null,qcard,qs,day,endd,count,nets]
      .concat(rest);                                     // tanınmayan kartlar kaybolmasın
    return top.concat(primary).filter(Boolean).map(e=>e.outerHTML).join("")+tileHTML+moreHTML;
  }

  todayTab=function(){
    const html=baseToday();
    if(!SADE_AKTIF||typeof ROLE==="undefined"||ROLE!=="student")return html;
    try{return sade(html)}catch(e){return html}
  };

  document.addEventListener("click",e=>{
    const b=e.target.closest&&e.target.closest("[data-sxmore]");if(!b)return;
    MORE=!MORE;
    try{localStorage.setItem(KEY,MORE?"1":"0")}catch(x){}
    const body=document.querySelector(".sx-moreb");if(body)body.hidden=!MORE;
    b.setAttribute("aria-expanded",String(MORE));
    const t=b.querySelector("b");if(t)t.textContent=MORE?"Daha az göster ▴":"Daha fazla ▾";
  });
})();
