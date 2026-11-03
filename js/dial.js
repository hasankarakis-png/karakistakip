// Günlük durum kadranları: uyku, dikkat dağınıklığı, stres, enerji. Yayı çekerek ya da alttaki değerlere dokunarak seçilir.
// Renk ve ışıma değere göre değişir: stres/dikkat arttıkça ısınır, uyku arttıkça maviye döner.
// Veri değişmez: S.sleep (4.5…8.5), S.dist/S.str/S.en (1…5) aynı değerlerle, aynı save()+render() ile yazılır.
// Fikir: 21st.dev "Circular Volume Dial Slider" (MIT) ve "Kokonut Detent Dial" (MIT); kod bu uygulama için sıfırdan, yalnız SVG+CSS.
(function(){
  if(typeof dayCard!=="function")return;
  const ORIG=dayCard;
  const HOT=["#4fc3a1","#a3d65c","#ffd23f","#ff8a3d","#ff3d3d"];
  const M=[
    {f:"sleep",t:"Uyku",q:"Dün gece uyku (saat)",v:[4.5,5.5,6.5,7.5,8.5],s:["<5","5-6","6-7","7-8","8+"],l:["5 saatten az","5–6 saat","6–7 saat","7–8 saat","8+ saat"],c:["#9aa3b5","#7fa6dd","#4f86e0","#2f6bff","#5b3dff"],sub:"dün gece, saat",per:p=>5},
    {f:"dist",t:"Dikkat",q:"Dikkat dağınıklığı (1 az, 5 çok)",v:[1,2,3,4,5],s:["1","2","3","4","5"],l:["Çok az","Az","Orta","Çok","Çok fazla"],c:HOT,sub:"dağınıklık: 1 az · 5 çok",per:p=>2.8-1.8*p},
    {f:"str",t:"Stres",q:"Stres (1 az, 5 çok)",v:[1,2,3,4,5],s:["1","2","3","4","5"],l:["Çok az","Az","Orta","Yüksek","Çok yüksek"],c:HOT,sub:"1 az · 5 çok",per:p=>2.8-1.8*p},
    {f:"en",t:"Enerji",q:"Enerji (1 düşük, 5 yüksek)",v:[1,2,3,4,5],s:["1","2","3","4","5"],l:["Çok düşük","Düşük","Orta","İyi","Yüksek"],c:["#6b7080","#8fa05a","#b5cf45","#d9f24a","#f0ff7a"],sub:"1 düşük · 5 yüksek",per:p=>3.6}
  ];
  const hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const mix=(cs,p)=>{const x=Math.min(0.9999,Math.max(0,p))*(cs.length-1),i=Math.floor(x),a=hx(cs[i]),b=hx(cs[i+1]),t=x-i;return "rgb("+a.map((v,k)=>Math.round(v+(b[k]-v)*t)).join(",")+")"};
  const ARC="M20 100 A80 80 0 0 1 180 100";
  const SHOWN={};           // ekranda en son gösterilen değer: değişince eski yerden yenisine akar
  let FOCUSF=null;
  const idxOf=m=>m.v.indexOf(S[m.f]);
  const look=(m,i)=>{const p=i<0?0:i/4;return {p,col:i<0?"#6b6f78":mix(m.c,p),k:i<0?0:+(0.25+0.75*p).toFixed(2),per:m.per(p).toFixed(2)}};
  function gauge(m){
    const i=idxOf(m),was=SHOWN[m.f],from=(was!==undefined&&was!==i)?was:i;
    SHOWN[m.f]=i;
    const L=look(m,from);
    return `<div class="dl${i<0?" dl-off":""}" data-dial="${m.f}"${from!==i?` data-to="${i}"`:""} style="--c:${L.col};--k:${L.k};--per:${L.per}s">
<div class="dl-hd"><b>${m.t}</b><span class="dl-val">${i<0?"Seç":m.l[i]}</span></div>
<svg class="dl-g" viewBox="0 0 200 118" role="slider" tabindex="0" aria-label="${m.q}" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${i<0?0:i}" aria-valuetext="${i<0?"seçilmedi":m.l[i]}">
<path class="dl-tr" d="${ARC}"/><path class="dl-fi" pathLength="100" d="${ARC}" style="stroke-dasharray:${L.p*100} 200;opacity:${L.p?1:0}"/>
<g class="dl-nd" style="transform:rotate(${-90+L.p*180}deg)"><circle cx="100" cy="20" r="10"/></g></svg>
<div class="dl-ts">${m.v.map((a,j)=>`<button class="dl-t" data-f="${m.f}" data-v="${a}" aria-pressed="${j===i}" aria-label="${m.t}: ${m.l[j]}">${m.s[j]}</button>`).join("")}</div>
<div class="dl-sub">${i<0?"Yayı çek ya da dokun · ":""}${m.sub}</div></div>`;
  }
  dayCard=function(){
    try{
      return `<div class="card"><h2>Günlük durum</h2><div class="dl-grid">${[M[0],M[1],M[2],M[3]].map(gauge).join("")}</div><div class="gl"><span>Bugün en çok zorlandığım konu</span></div><input id="hd" type="text" maxlength="60" value="${esc(S.hard)}" style="width:100%;margin-top:6px"></div>`;
    }catch(e){return ORIG()}
  };
  // Sürükleme sırasında yalnızca bu kadranın görünümü güncellenir; kayıt bırakınca yapılır (arka plan yenilemesi bu sırada bekler: busy())
  function paint(w,m,i){
    const L=look(m,i);SHOWN[m.f]=i;
    w.style.setProperty("--c",L.col);w.style.setProperty("--k",L.k);w.style.setProperty("--per",L.per+"s");
    w.classList.toggle("dl-off",i<0);
    const fi=w.querySelector(".dl-fi"),nd=w.querySelector(".dl-nd"),g=w.querySelector(".dl-g");
    if(fi){fi.style.strokeDasharray=(L.p*100)+" 200";fi.style.opacity=L.p?1:0}
    if(nd)nd.style.transform="rotate("+(-90+L.p*180)+"deg)";
    const vt=w.querySelector(".dl-val");if(vt)vt.textContent=i<0?"Seç":m.l[i];
    if(g){g.setAttribute("aria-valuenow",i<0?0:i);g.setAttribute("aria-valuetext",i<0?"seçilmedi":m.l[i])}
    w.querySelectorAll(".dl-t").forEach((b,j)=>b.setAttribute("aria-pressed",String(j===i)));
  }
  let D=null;
  function move(e){
    const r=D.g.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*(100/118);
    const dx=e.clientX-cx,dy=cy-e.clientY;
    const ang=dy<0?(dx<0?Math.PI:0):Math.atan2(dy,dx);          // yayın altında kalan nokta en yakın uca gider
    const i=Math.round((1-ang/Math.PI)*4);
    if(i!==D.i){D.i=i;paint(D.w,D.m,i);try{navigator.vibrate&&navigator.vibrate(6)}catch(_){}}
  }
  document.addEventListener("pointerdown",e=>{
    const g=e.target.closest&&e.target.closest(".dl-g");if(!g||(e.pointerType==="mouse"&&e.button!==0))return;
    const w=g.closest("[data-dial]"),m=w&&M.find(x=>x.f===w.dataset.dial);if(!m)return;
    e.preventDefault();D={g,w,m,i:-1};window.DIAL_DRAG=true;
    try{g.setPointerCapture(e.pointerId)}catch(_){}
    move(e);
  });
  document.addEventListener("pointermove",e=>{if(D)move(e)});
  const end=(e,ok)=>{
    if(!D)return;const d=D;D=null;window.DIAL_DRAG=false;
    if(ok&&d.i>=0){S[d.m.f]=d.m.v[d.i];save();render()}else render();
  };
  document.addEventListener("pointerup",e=>end(e,true));
  document.addEventListener("pointercancel",e=>end(e,false));
  document.addEventListener("keydown",e=>{
    const g=e.target.closest&&e.target.closest(".dl-g");if(!g)return;
    const w=g.closest("[data-dial]"),m=w&&M.find(x=>x.f===w.dataset.dial);if(!m)return;
    const cur=idxOf(m);let i=cur;
    if(e.key==="ArrowRight"||e.key==="ArrowUp")i=Math.min(4,cur<0?0:cur+1);
    else if(e.key==="ArrowLeft"||e.key==="ArrowDown")i=Math.max(0,cur<0?0:cur-1);
    else if(e.key==="Home")i=0;else if(e.key==="End")i=4;else return;
    e.preventDefault();if(i===cur&&cur>=0)return;
    FOCUSF=m.f;S[m.f]=m.v[i];save();render();
  });
  // Ekran yeniden çizilince: eski değerden yenisine akıt, klavye odağını geri ver
  new MutationObserver(()=>{
    const ws=document.querySelectorAll("[data-dial][data-to]");
    if(ws.length)requestAnimationFrame(()=>requestAnimationFrame(()=>ws.forEach(w=>{
      const m=M.find(x=>x.f===w.dataset.dial);if(m){if(!w.isConnected||!w.hasAttribute("data-to"))return;const to=Number(w.dataset.to);w.removeAttribute("data-to");if(!Number.isInteger(to)||to < -1||to > 4)return;paint(w,m,to)}
    })));
    if(FOCUSF){const g=document.querySelector('[data-dial="'+FOCUSF+'"] .dl-g');if(g){FOCUSF=null;g.focus({preventScroll:true})}}
  }).observe(document.body,{childList:true,subtree:true});
})();
