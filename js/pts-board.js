/* Puan yarışması ekranı (challenges.mode='points'): puan = çözülen soru + çalışılan dakika.
   3B puan kulesi (three.js, ilk açılışta yüklenir), puan akışı çizgi grafiği, parlayan sıralama çubukları, canlı akış.
   Veri: challenge_board3 (chFetch içinde). Öğrenciye isimler SUNUCUDAN son güne kadar gönderilmez (label=null);
   buradaki bulanık metin rastgele harflerdir, gerçek isim değildir. Ekran render() ile yeniden çizilirse kök boşalır:
   her saniye çalışan zamanlayıcı kökü yeniden kurar (WebGL tuvali ve geçmiş akış bellekte kalır). */
(function(){
"use strict";
const ROW=70,R3=5.4;
const DN=["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
const LET="abcçdefgğhıijklmnoöprsştuüvyz";
const FA='"Chakra Petch","Segoe UI",system-ui,sans-serif',FM='"IBM Plex Mono",ui-monospace,Consolas,monospace';
if(!document.getElementById("pb-fonts")){const l=document.createElement("link");l.id="pb-fonts";l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=DM+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap";document.head.appendChild(l)}
const P={id:null,root:null,els:null,rows:{},feed:[],mask:{},t3:null,fetching:false,fetchAt:0,prev:null,nogl:false,l3:null,pend:false};
const fN=n=>Math.round(n).toLocaleString("tr-TR");
const clk=()=>{const d=new Date();return [d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,"0")).join(":")};
function rnd(){let s="";const n=4+Math.floor(Math.random()*5);for(let i=0;i<n;i++)s+=LET[Math.floor(Math.random()*LET.length)];return s[0].toUpperCase()+s.slice(1)+" "+LET[Math.floor(Math.random()*LET.length)].toUpperCase()+"."}
function mask(rid){return P.mask[rid]||(P.mask[rid]=rnd())}
function hue(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return h}
window.pbIs=c=>!!c&&c.mode==="points";
window.pbRootHTML=c=>`<div class="pb" data-pbroot="${+c.id}"><p class="empty" style="padding:16px">Yükleniyor…</p></div>`;

/* ---------- liste ---------- */
function build(B){
  const el=Math.max(0,(Date.now()-(B.at||Date.now()))/1000);
  return B.rows.map(r=>{const sec=r.sec+(r.run?el:0),tsec=r.tsec+(r.run?el:0);return {r,sec,tsec,p:r.qn+Math.floor(sec/60)}})
    .sort((a,b)=>b.p-a.p||b.sec-a.sec||String(a.r.rid).localeCompare(String(b.r.rid)));
}
function dIdx(c){const t=chDays(c.start_day,day());return t<0?-1:Math.min(t,chDays(c.start_day,c.end_day))}

/* ---------- kurulum ---------- */
function mount(root,c){
  P.root=root;
  root.innerHTML=`<div class="pb-top"><div class="pb-brand"><svg class="pb-logo" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M20 37V12M20 29L10 21M20 29L30 21M20 23L13 15M20 23L27 15"/><circle cx="20" cy="9" r="2.2" fill="currentColor" stroke="none"/><circle cx="10" cy="21" r="2" fill="currentColor" stroke="none"/><circle cx="30" cy="21" r="2" fill="currentColor" stroke="none"/><circle cx="13" cy="15" r="2" fill="currentColor" stroke="none"/><circle cx="27" cy="15" r="2" fill="currentColor" stroke="none"/></svg><div><div class="pb-eyebrow">Karakış Eğitim &amp; Danışmanlık</div><h2 class="pb-h1" data-title></h2></div></div><div class="pb-formula">PUAN = <b>çözülen soru</b> + <b>çalışılan dakika</b></div></div>
<ol class="pb-days" data-days aria-label="Yarışma günleri"></ol>
<div class="pb-banner"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path data-slash d="M4 4l16 16"/></svg><p data-ban></p></div>
<section class="pb-panel pb-hero"><div class="pb-stage"><div class="pb-hud tl"><b>Puan kulesi</b><span>Sütun yüksekliği = puan</span></div><div class="pb-hud leg"><span><i class="c-me"></i>Sen</span><span><i class="c-st"></i>Çalışıyor</span><span><i class="c-br"></i>Molada</span><span><i class="c-of"></i>Çevrimdışı</span></div><div class="pb-hud br">Sürükleyerek döndür</div><p class="pb-nogl">3B görünüm bu cihazda açılamadı. Grafik ve sıralama aşağıda çalışıyor.</p></div></section>
<div class="pb-grid"><div class="pb-col">
<article class="pb-panel pb-me" data-me hidden>
<div><span class="pb-lab">Sıran</span><div class="pb-rr"><b class="pb-big" data-rank>#–</b><svg class="pb-ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="trk" cx="32" cy="32" r="26"/><circle class="val" data-rv cx="32" cy="32" r="26" stroke-dasharray="163.4" stroke-dashoffset="163.4" transform="rotate(-90 32 32)"/><text x="32" y="36" text-anchor="middle" data-rt>0%</text></svg></div><span class="pb-sub" data-rn></span></div>
<div><span class="pb-lab">Toplam puan</span><b class="pb-big" data-pts>0</b><div class="pb-split" aria-hidden="true"><i class="q" data-sq></i><i class="m" data-sm></i></div><div class="pb-leg"><span><u class="q"></u>Soru <b data-q>0</b></span><span><u class="m"></u>Dakika <b data-m>0</b></span></div></div>
<div><span class="pb-lab">Bu yarışmadaki süren</span><b class="pb-mono" data-time>0:00:00</b><p class="pb-gap" data-gap></p></div>
</article>
<section class="pb-panel"><div class="pb-chead"><h3>Puan akışı</h3><div class="pb-key"><span><i class="k1"></i>Sen</span><span><i class="k2"></i>İlk 3</span><span><i class="k3"></i>Diğerleri</span></div></div><canvas class="pb-chart" role="img" aria-label="Öğrencilerin puanlarının günlere göre değişimini gösteren çizgi grafiği"></canvas></section>
<section><div class="pb-bhead"><h3>Sıralama</h3><span class="pb-live"><i></i>Canlı</span><span class="pb-clock" data-clk></span></div><ol class="pb-rows" data-rows></ol></section>
</div><aside class="pb-col">
<section class="pb-panel"><h3>Nasıl işler</h3><ul class="pb-rules"><li>Çözdüğün her soru 1 puan.</li><li>Çalıştığın her dakika 1 puan.</li><li>Süre, durumun “Çalışıyor” iken saniye saniye işler.</li><li>Çubuktaki altın kısım soruyu, mavi kısım süreyi gösterir.</li><li>Herkesin puanı ve süresi anlık görünür, isimleri koçun açtığı anda görürsün.</li></ul></section>
<section class="pb-panel"><h3>Canlı akış</h3><ul class="pb-feed" data-feed></ul></section>
</aside></div>`;
  const q=s=>root.querySelector(s);
  P.els={stage:q(".pb-stage"),ban:q("[data-ban]"),slash:q("[data-slash]"),days:q("[data-days]"),title:q("[data-title]"),me:q("[data-me]"),chart:q(".pb-chart"),rows:q("[data-rows]"),feed:q("[data-feed]"),clk:q("[data-clk]"),
    rank:q("[data-rank]"),rv:q("[data-rv]"),rt:q("[data-rt]"),rn:q("[data-rn]"),pts:q("[data-pts]"),sq:q("[data-sq]"),sm:q("[data-sm]"),q:q("[data-q]"),m:q("[data-m]"),time:q("[data-time]"),gap:q("[data-gap]")};
  P.rows={};P.feedSig="";P.daySig="";
  attach3();
}
function rowEl(rid,i){
  let e=P.rows[rid];if(e)return e;
  const li=document.createElement("li");li.className="pb-row";li.style.transform=`translateY(${i*ROW}px)`;
  li.innerHTML='<span class="pb-rk"></span><span class="pb-av"></span><div class="pb-main"><div class="pb-nm"><span class="pb-nmt"></span><span class="pb-sr"></span></div><div class="pb-meta"><span class="pb-dot"></span><span class="pb-st"></span><span class="pb-tm"></span><span>·</span><span class="pb-qs"></span></div><div class="pb-bar"><div class="pb-fill"><i class="q"></i><i class="m"></i></div></div></div><div class="pb-pts"><b></b><small>puan</small></div>';
  e={li,rk:li.querySelector(".pb-rk"),av:li.querySelector(".pb-av"),nm:li.querySelector(".pb-nmt"),sr:li.querySelector(".pb-sr"),st:li.querySelector(".pb-st"),tm:li.querySelector(".pb-tm"),qs:li.querySelector(".pb-qs"),fill:li.querySelector(".pb-fill"),bq:li.querySelector(".pb-fill .q"),bm:li.querySelector(".pb-fill .m"),pt:li.querySelector(".pb-pts b"),state:""};
  P.els.rows.appendChild(li);P.rows[rid]=e;return e;
}
function paintName(e,r,i){
  if(r.label){
    if(e.state==="r"&&e.lab===r.label)return;
    e.nm.style.transitionDelay=r.me?"0ms":(Math.min(i,40)*60)+"ms";
    e.nm.textContent=r.label;e.nm.classList.remove("pb-mask");e.nm.removeAttribute("aria-hidden");e.sr.textContent="";
    e.av.className="pb-av"+(r.me?" me":"");e.av.style.setProperty("--h",hue(r.label));e.av.textContent=r.label.charAt(0);
    if(r.me&&!e.chip){e.chip=document.createElement("span");e.chip.className="pb-chip";e.chip.textContent="Sen";e.nm.parentNode.appendChild(e.chip)}
    e.state="r";e.lab=r.label;
  }else if(e.state!=="m"){
    e.nm.style.transitionDelay="0ms";
    e.nm.textContent=mask(r.rid);e.nm.classList.add("pb-mask");e.nm.setAttribute("aria-hidden","true");e.sr.textContent="Gizli öğrenci";
    e.av.className="pb-av anon";e.av.textContent="";e.state="m";
  }
}

/* ---------- akış (iki veri çekişi arasındaki farktan) ---------- */
function feedDiff(old,B){
  if(!old||old.id!==B.id)return;
  const m={};old.rows.forEach(r=>{m[r.rid]=r});
  B.rows.forEach(r=>{
    const o=m[r.rid];if(!o||r.me)return;
    const add=(k,n)=>{P.feed.unshift({t:clk(),kind:k,n:n||0,label:r.label||null,mk:rnd()});if(P.feed.length>8)P.feed.pop()};
    if(r.qn>o.qn)add("q",r.qn-o.qn);
    if(r.run&&!o.run)add("start");else if(!r.run&&o.run)add("break");
  });
}
function renderFeed(){
  const sig=P.feed.map(f=>f.t+f.kind+f.n+(f.label||"")).join("|");
  if(sig===P.feedSig)return;P.feedSig=sig;
  P.els.feed.innerHTML=P.feed.length?P.feed.map(f=>{
    const nm=f.label?`<b>${esc(f.label)}</b>`:`<b class="pb-mask" aria-hidden="true">${esc(f.mk)}</b>`;
    const tx=f.kind==="q"?`${nm} ${f.n} soru çözdü`:f.kind==="start"?`${nm} çalışmaya başladı`:`${nm} mola verdi`;
    return `<li><time>${f.t}</time><span>${tx}</span><span class="g">${f.kind==="q"?"+"+f.n+" puan":""}</span></li>`}).join(""):`<li class="e">Arkadaşlarının hareketleri burada akacak.</li>`;
}

/* ---------- çizgi grafiği ---------- */
function chart(list,c){
  const cv=P.els.chart,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
  const x=cv.getContext("2d");x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
  const tn=dIdx(c),rev=list.some(a=>a.r.label&&!a.r.me),L=48,Rm=rev?96:62,T=10,Bm=22,pw=w-L-Rm,ph=h-T-Bm;
  x.font='11px '+FM;x.fillStyle="#8FA2C2";x.textAlign="center";x.textBaseline="middle";
  if(tn<0||pw<40){x.fillText("Yarışma henüz başlamadı",w/2,h/2);return}
  const S=list.map(a=>{const pts=[0];let cum=0;(a.r.days||[]).forEach(d=>{if(d[0]<tn){cum+=(+d[2]||0)+Math.floor((+d[1]||0)/60);pts.push(cum)}});pts.push(a.p);return {a,pts}});
  const nx=Math.max(1,tn+1);let lo=0,hi=1;S.forEach(s=>{s.pts.forEach(v=>{if(v>hi)hi=v})});hi*=1.06;
  const X=i=>L+pw*i/nx,Y=v=>T+ph*(1-(v-lo)/(hi-lo));
  x.textAlign="right";x.lineWidth=1;
  for(let g=0;g<=4;g++){const v=lo+(hi-lo)*g/4,y=Y(v);x.strokeStyle="rgba(127,216,255,.10)";x.beginPath();x.moveTo(L,y);x.lineTo(L+pw,y);x.stroke();x.fillText(fN(v),L-6,y)}
  x.textAlign="center";x.textBaseline="alphabetic";
  const [sy,sm,sd]=c.start_day.split("-").map(Number),step=nx>10?Math.ceil(nx/8):1;
  for(let k=1;k<=nx;k+=step){x.fillText(k===nx?"şimdi":DN[new Date(sy,sm-1,sd+k-1).getDay()],X(k),h-6)}
  const line=(s,col,wd,gl)=>{x.beginPath();s.pts.forEach((v,i)=>{i?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v))});x.strokeStyle=col;x.lineWidth=wd;x.lineJoin="round";x.shadowColor=gl||"transparent";x.shadowBlur=gl?10:0;x.stroke();x.shadowBlur=0};
  S.forEach((s,i)=>{if(!s.a.r.me&&i>=3)line(s,"rgba(127,216,255,.26)",1.2)});
  S.forEach((s,i)=>{if(!s.a.r.me&&i<3)line(s,"rgba(127,216,255,.95)",2,"rgba(127,216,255,.9)")});
  S.forEach(s=>{if(s.a.r.me)line(s,"#E6BC52",2.8,"rgba(230,188,82,.95)")});
  const lab=[];
  S.forEach((s,i)=>{
    const mine=s.a.r.me;if(!mine&&i>=3)return;
    const yy=Y(s.pts[s.pts.length-1]);
    lab.push({y:yy,t:mine?"Sen #"+(i+1):(s.a.r.label||"#"+(i+1)),c:mine?"#E6BC52":"#7FD8FF"});
    x.beginPath();x.arc(L+pw,yy,3.4,0,Math.PI*2);x.fillStyle=mine?"#E6BC52":"#7FD8FF";x.shadowColor=x.fillStyle;x.shadowBlur=10;x.fill();x.shadowBlur=0;
  });
  lab.sort((a,b)=>a.y-b.y);for(let j=1;j<lab.length;j++)if(lab[j].y-lab[j-1].y<13)lab[j].y=lab[j-1].y+13;
  x.textAlign="left";x.textBaseline="middle";x.font='500 11px '+FM;
  lab.forEach(l=>{x.fillStyle=l.c;x.fillText(l.t,L+pw+9,l.y)});
}

/* ---------- 3B kule ---------- */
function load3(cb){
  if(window.THREE)return cb(true);
  if(P.l3){P.l3.push(cb);return}
  P.l3=[cb];const s=document.createElement("script");s.src="js/vendor/three.min.js?v=r128";
  s.onload=()=>{const q=P.l3;P.l3=null;q.forEach(f=>f(true))};
  s.onerror=()=>{const q=P.l3;P.l3=null;q.forEach(f=>f(false))};
  document.head.appendChild(s);
}
function attach3(){
  if(P.nogl){P.els.stage.classList.add("nogl");return}
  if(P.t3){place3();return}
  load3(ok=>{
    if(!ok||P.nogl){P.nogl=true;if(P.els)P.els.stage.classList.add("nogl");return}
    if(!P.t3){try{P.t3=make3()}catch(e){P.t3=null}}
    if(!P.t3){P.nogl=true;if(P.els)P.els.stage.classList.add("nogl");return}
    place3();
  });
}
function place3(){
  const T=P.t3,host=P.els&&P.els.stage;if(!T||!host)return;
  T.host=host;host.insertBefore(T.renderer.domElement,host.firstChild);
  if(T.ro)T.ro.disconnect();
  if(window.ResizeObserver){T.ro=new ResizeObserver(()=>size3());T.ro.observe(host)}
  size3();
  if(host.dataset.pb)return;host.dataset.pb="1";
  host.addEventListener("pointerdown",e=>{T.drag=true;T.px=e.clientX;T.py=e.clientY;try{host.setPointerCapture(e.pointerId)}catch(_){}});
  host.addEventListener("pointermove",e=>{if(!T.drag)return;T.yaw-=(e.clientX-T.px)*.008;if(e.pointerType==="mouse")T.pitch=Math.max(.15,Math.min(1.25,T.pitch+(e.clientY-T.py)*.006));T.px=e.clientX;T.py=e.clientY;T.touch=performance.now()});
  const end=()=>{T.drag=false;T.touch=performance.now()};
  host.addEventListener("pointerup",end);host.addEventListener("pointercancel",end);
}
function size3(){
  const T=P.t3;if(!T||!T.host)return;const w=T.host.clientWidth,h=T.host.clientHeight;if(!w||!h)return;
  T.renderer.setSize(w,h,false);T.camera.aspect=w/h;T.dist=18+Math.max(0,1.3-w/h)*9;T.camera.updateProjectionMatrix();
}
function make3(){
  const TH=window.THREE;
  const renderer=new TH.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.domElement.setAttribute("aria-hidden","true");
  const scene=new TH.Scene(),camera=new TH.PerspectiveCamera(40,1,.1,120);
  scene.add(new TH.AmbientLight(0x7a97c4,.85));
  const l1=new TH.PointLight(0x7fd8ff,1.3,50);l1.position.set(0,14,0);scene.add(l1);
  const l2=new TH.PointLight(0xe6bc52,.9,40);l2.position.set(9,6,9);scene.add(l2);
  const world=new TH.Group();scene.add(world);
  const disc=new TH.Mesh(new TH.CircleGeometry(10,64),new TH.MeshBasicMaterial({color:0x0A1A35,transparent:true,opacity:.55}));
  disc.rotation.x=-Math.PI/2;disc.position.y=-.02;world.add(disc);
  [[R3*.5,.25],[R3,.5],[R3*1.5,.2],[R3*1.78,.4]].forEach(a=>{
    const p=[];for(let i=0;i<=96;i++){const t=i/96*Math.PI*2;p.push(new TH.Vector3(Math.cos(t)*a[0],0,Math.sin(t)*a[0]))}
    world.add(new TH.Line(new TH.BufferGeometry().setFromPoints(p),new TH.LineBasicMaterial({color:0x7fd8ff,transparent:true,opacity:a[1]})));
  });
  const pivot=new TH.Group();world.add(pivot);
  const sweep=new TH.Mesh(new TH.CircleGeometry(R3*1.78,64,0,.8),new TH.MeshBasicMaterial({color:0x7fd8ff,transparent:true,opacity:.09,side:TH.DoubleSide,depthWrite:false,blending:TH.AdditiveBlending}));
  sweep.rotation.x=-Math.PI/2;sweep.position.y=.02;pivot.add(sweep);
  const FONT=FA,cv=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
  const rankC={},rankT={};
  const paintRank=i=>{const c=rankC[i],x=c.getContext("2d");x.clearRect(0,0,c.width,c.height);x.font="700 64px "+FONT;x.textAlign="center";x.textBaseline="middle";x.shadowColor="rgba(127,216,255,.9)";x.shadowBlur=14;x.fillStyle=i<3?"#E6BC52":"#EEE8D8";x.fillText(String(i+1),c.width/2,c.height/2+4);rankT[i].needsUpdate=true};
  const rankTex=i=>{if(!rankT[i]){rankC[i]=cv(128,96);rankT[i]=new TH.CanvasTexture(rankC[i]);paintRank(i)}return rankT[i]};
  if(document.fonts&&document.fonts.load)document.fonts.load("700 64px \"Chakra Petch\"").then(()=>Object.keys(rankC).forEach(k=>paintRank(+k))).catch(()=>{});
  const maskTex=t=>{const c=cv(512,96),x=c.getContext("2d");x.font="700 44px "+FONT;x.textAlign="center";x.textBaseline="middle";x.fillStyle="#000";x.shadowColor="rgba(220,235,255,.9)";x.shadowBlur=12;x.shadowOffsetX=1200;for(let k=0;k<2;k++)x.fillText(t,c.width/2-1200,c.height/2);return new TH.CanvasTexture(c)};
  const nameTex=(t,gold)=>{const c=cv(512,96),x=c.getContext("2d");x.font="700 44px "+FONT;x.textAlign="center";x.textBaseline="middle";x.shadowColor="rgba(127,216,255,.8)";x.shadowBlur=10;x.fillStyle=gold?"#E6BC52":"#EEE8D8";x.fillText(t,c.width/2,c.height/2);return new TH.CanvasTexture(c)};
  const gc=cv(128,128),gx=gc.getContext("2d"),gr=gx.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.35,"rgba(255,255,255,.35)");gr.addColorStop(1,"rgba(255,255,255,0)");gx.fillStyle=gr;gx.fillRect(0,0,128,128);
  const glowT=new TH.CanvasTexture(gc),colGeo=new TH.BoxGeometry(1,1,1),edgeGeo=new TH.EdgesGeometry(colGeo);
  const T={renderer,scene,camera,objs:{},host:null,yaw:.6,pitch:.5,dist:18,drag:false,px:0,py:0,touch:0,ro:null,
    reduce:!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)};
  const slot=(i,n)=>{const a=-Math.PI/2+i/n*Math.PI*2;return [Math.cos(a)*R3,Math.sin(a)*R3]};
  function obj(rid,i,n){
    let o=T.objs[rid];if(o)return o;
    const grp=new TH.Group(),mat=new TH.MeshStandardMaterial({color:0x0d2347,emissive:0x1b5d92,emissiveIntensity:.55,roughness:.45,metalness:.35,transparent:true,opacity:.8});
    const body=new TH.Mesh(colGeo,mat);body.scale.set(.8,.1,.8);
    const eMat=new TH.LineBasicMaterial({color:0x7fd8ff,transparent:true,opacity:.95});body.add(new TH.LineSegments(edgeGeo,eMat));grp.add(body);
    const glow=new TH.Sprite(new TH.SpriteMaterial({map:glowT,color:0x7fd8ff,transparent:true,opacity:.5,depthWrite:false,blending:TH.AdditiveBlending}));glow.scale.set(2.3,2.3,1);grp.add(glow);
    const rk=new TH.Sprite(new TH.SpriteMaterial({map:rankTex(i),transparent:true,depthTest:false}));rk.scale.set(1.1,.82,1);grp.add(rk);
    const mt=maskTex(mask(rid)),nm=new TH.Sprite(new TH.SpriteMaterial({map:mt,transparent:true,depthTest:false}));nm.scale.set(3,.56,1);grp.add(nm);
    const sl=slot(i,n);grp.position.set(sl[0],0,sl[1]);world.add(grp);
    o=T.objs[rid]={grp,body,mat,eMat,glow,rk,nm,mt,real:null,realFor:"",rankShown:i,h:.1,tx:sl[0],tz:sl[1],th:1,stat:""};return o;
  }
  T.update=function(list){
    const n=list.length||1,maxP=Math.max(1,list.length?list[0].p:1),seen={};
    list.forEach((a,i)=>{
      const r=a.r,o=obj(r.rid,i,n);seen[r.rid]=1;const sl=slot(i,n);
      o.tx=sl[0];o.tz=sl[1];o.th=Math.max(.15,a.p/maxP*6.2);
      if(o.rankShown!==i){o.rankShown=i;o.rk.material.map=rankTex(i);o.rk.material.needsUpdate=true}
      const st=r.me?"me":(r.run?"study":"off");
      if(o.stat!==st){o.stat=st;const c=st==="me"?0xe6bc52:st==="study"?0x7fd8ff:0x4a5a78,em=st==="me"?0x7a5b14:st==="study"?0x1b5d92:0x16213a;o.eMat.color.setHex(c);o.glow.material.color.setHex(c);o.mat.emissive.setHex(em)}
      o.nm.visible=i<5||!!r.me;
      const want=r.label||"";
      if(want!==o.realFor){o.realFor=want;o.nm.material.map=want?(o.real=nameTex(want,!!r.me)):o.mt;o.nm.material.needsUpdate=true}
    });
    Object.keys(T.objs).forEach(k=>{if(!seen[k]){world.remove(T.objs[k].grp);delete T.objs[k]}});
  };
  let last=performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    const dt=Math.min(.05,(now-last)/1000);last=now;
    if(!T.host||!document.body.contains(T.host)||document.hidden)return;
    const k=1-Math.pow(.001,dt);
    Object.keys(T.objs).forEach((key,idx)=>{
      const o=T.objs[key],g=o.grp;
      g.position.x+=(o.tx-g.position.x)*k;g.position.z+=(o.tz-g.position.z)*k;o.h+=(o.th-o.h)*k;
      o.body.scale.y=o.h;o.body.position.y=o.h/2;o.glow.position.y=o.h+.2;o.rk.position.y=o.h+1.05;o.nm.position.y=o.h+1.75;
      o.glow.material.opacity=o.stat==="study"?.55+.35*Math.sin(now/380+idx):(o.stat==="me"?.6:.1);
    });
    if(!T.reduce){pivot.rotation.y-=dt*1.1;if(!T.drag&&now-T.touch>2500)T.yaw+=dt*.12}
    const cp=Math.cos(T.pitch);
    camera.position.set(Math.cos(T.yaw)*cp*T.dist,Math.sin(T.pitch)*T.dist+2.2,Math.sin(T.yaw)*cp*T.dist);camera.lookAt(0,2.2,0);
    renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  return T;
}

/* ---------- gün şeridi ---------- */
function paintDays(c,open){
  const n=Math.min(31,chDays(c.start_day,c.end_day)+1),tn=dIdx(c),[sy,sm,sd]=c.start_day.split("-").map(Number);
  const sig=c.start_day+n+tn+open;if(P.daySig===sig)return;P.daySig=sig;
  P.els.days.style.gridTemplateColumns=n<=7?`repeat(${n},minmax(0,1fr))`:"repeat(auto-fit,minmax(44px,1fr))";
  let h="";
  for(let i=0;i<n;i++){
    const d=new Date(sy,sm-1,sd+i),eye=i===n-1?`<svg class="eye" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>${open?"":'<path d="M4 4l16 16"/>'}</svg>`:'<span class="eye"></span>';
    h+=`<li class="${i<tn?"done":i===tn?"now":""}"${i===tn?' aria-current="date"':""}><span>${DN[d.getDay()]}</span><span class="n">${d.getDate()}</span>${eye}</li>`;
  }
  P.els.days.innerHTML=h;
}

/* ---------- çizim ---------- */
function paint(c,B){
  const E=P.els,list=build(B),n=list.length,max=n?Math.max(1,list[0].p):1,me=list.findIndex(a=>a.r.me);
  const anyName=B.rows.some(r=>r.rev&&!r.me),coach=ROLE==="coach",lead=list[0]&&list[0].r.label;
  E.title.textContent=c.title;
  E.ban.textContent=coach?"Koç görünümü: isimler sana hep açık. Öğrenciler isimleri şu an "+(c.names_open?"GÖRÜYOR.":"göremiyor (sıralamadaki 👁 düğmesiyle açarsın).")
    :anyName?"İsimler açıldı."+(lead?" Şu an lider "+lead+" · "+fN(list[0].p)+" puan.":""):"Rakiplerinin isimleri gizli. Puanlar ve çalışma durumları canlı akıyor, isimleri koç açınca görünür.";
  E.slash.style.display=(coach?c.names_open:anyName)?"none":"";
  paintDays(c,coach?!!c.names_open:anyName);
  E.clk.textContent=chInfo(c);
  E.rows.style.height=(n*ROW)+"px";
  const seen={};
  list.forEach((a,i)=>{
    const r=a.r,e=rowEl(r.rid,i),m=Math.floor(a.sec/60);seen[r.rid]=1;
    e.li.style.transform=`translateY(${i*ROW}px)`;e.li.classList.toggle("me",!!r.me);e.li.dataset.st=r.run?"study":"off";
    e.rk.textContent=i+1;e.rk.classList.toggle("top",i<3);
    paintName(e,r,i);
    e.st.textContent=r.run?"Çalışıyor":"Beklemede";e.tm.textContent=chSec(a.sec);e.qs.textContent=fN(r.qn)+" soru";
    e.pt.textContent=fN(a.p);e.fill.style.width=(a.p/max*100)+"%";
    e.bq.style.width=a.p?(r.qn/a.p*100)+"%":"0";e.bm.style.width=a.p?(m/a.p*100)+"%":"0";
  });
  Object.keys(P.rows).forEach(k=>{if(!seen[k]){P.rows[k].li.remove();delete P.rows[k]}});
  if(me>=0){
    const a=list[me],m=Math.floor(a.sec/60),ratio=Math.min(1,a.p/max);
    E.me.hidden=false;E.rank.textContent="#"+(me+1);E.rn.textContent=n+" kişi içinde. Halka, liderin puanına oranın.";
    E.rv.style.strokeDashoffset=(163.4*(1-ratio)).toFixed(1);E.rt.textContent=Math.round(ratio*100)+"%";
    E.pts.textContent=fN(a.p);E.q.textContent=fN(a.r.qn);E.m.textContent=fN(m);
    const tot=a.r.qn+m||1;E.sq.style.width=(a.r.qn/tot*100)+"%";E.sm.style.width=(m/tot*100)+"%";
    E.time.textContent=chSec(a.sec);
    E.gap.innerHTML=(me>0?`<span>Önündeki <b>${fN(list[me-1].p-a.p)}</b> puan ileride</span>`:`<span>Şu an <b>birincisin</b></span>`)+(me<n-1?`<span>Arkandaki <b>${fN(a.p-list[me+1].p)}</b> puan geride</span>`:"");
  }else E.me.hidden=true;
  renderFeed();chart(list,c);
  if(P.t3)P.t3.update(list);
}

/* ---------- döngü ---------- */
async function fetchB(c){
  if(P.fetching)return;P.fetching=true;
  try{const b=await chFetch(c);if(b&&P.id===c.id){feedDiff(CH.board&&CH.board.id===c.id?CH.board:null,b);CH.board=b}}catch(e){}
  P.fetching=false;P.fetchAt=Date.now();
}
function tick(){
  const root=document.querySelector("[data-pbroot]");
  if(!root){P.root=null;return}
  const c=typeof CH!=="undefined"&&CH.list.find(x=>x.id===+root.dataset.pbroot);if(!c)return;
  if(P.id!==c.id){P.id=c.id;P.feed=[];P.mask={};P.feedSig=""}
  if(root!==P.root)mount(root,c);
  if(!document.hidden&&Date.now()-P.fetchAt>6000)fetchB(c);
  const B=CH.board&&CH.board.id===c.id?CH.board:null;
  if(!B){return}
  if(!B.rows.length){P.els.ban.textContent="Henüz sıralama yok.";return}
  paint(c,B);
}
setInterval(tick,1000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)P.fetchAt=0});
})();
