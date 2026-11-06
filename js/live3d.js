// Canlı pano 3B görünümü: "Durum panosu" kartına Liste/3B düğmesi (`localStorage karakis-live3d`, varsayılan Liste).
// 3B: zemin beş durum bölgesine ayrılır (Uyanık, Derste, Molada, Günü bitirdi, Başlamadı), her öğrenci bir sütun;
// yükseklik bugünkü süre ya da soru (Süre/Soru düğmesi). Süreler her karede secs() ile hesaplanır, derste olanlar saniye saniye uzar;
// durum değişince sütun yeni bölgeye kayar. Sütuna dokununca altta öğrenci özeti ve "Kaydı aç" (mevcut data-i düğmesi) çıkar.
// Yeni sorgu yok: roster() + coach-live.js'in `window.lvSecs`'i. coachView() sarılır, hata olursa liste görünür.
// three.js yalnız 3B ilk açılınca yüklenir; WebGL yoksa listeye döner. Tuval render() sonrası yeni kutuya taşınır.
(function(){
  "use strict";
  if(typeof coachView!=="function"||typeof render!=="function"||typeof roster!=="function")return;
  const PREV=coachView,LS="karakis-live3d",ZW=2.3,ZG=.45,TALL=6;
  const L3={on:false,nogl:false,m:"m",sel:null,t:null,l3:null,raf:0};
  try{L3.on=localStorage.getItem(LS)==="3"}catch(e){}
  const light=()=>document.documentElement.getAttribute("data-theme")==="light";
  const ORD=["awake","study","break","done","idle"],LAB={awake:"Uyanık",study:"Derste",break:"Molada",done:"Günü bitirdi",idle:"Başlamadı"};
  const CD=["#6fb7ff","#d9f24a","#ffb347","#b69cff","#7b806c"],CL=["#1c64c4","#5f7300","#b36a00","#6b4fd1","#8b907a"];
  const col=()=>light()?CL:CD;
  const grp=st=>st==="stopped"||st==="closed"?"done":st;
  const pad=n=>String(n).padStart(2,"0");
  const hms=s=>pad(Math.floor(s/3600))+":"+pad(Math.floor(s%3600/60))+":"+pad(s%60);
  const REDUCE=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const isLive=()=>typeof ROLE!=="undefined"&&ROLE==="coach"&&typeof CPG!=="undefined"&&CPG==="v";
  function secs(id){
    if(typeof window.lvSecs==="function")return window.lvSecs(id);
    try{
      const t=day(),r=ROWS.find(x=>x.student_id===id&&x.day===t),s=r&&r.state?r.state:null;if(!s)return 0;
      const cur=s.cur,ms=num(s.done)+(cur?(s.status==="break"?num(cur.bs):Date.now())-num(cur.start)-num(cur.brk):0);
      return Math.max(0,Math.floor(ms/1000));
    }catch(e){return 0}
  }

  const toggle=()=>{
    const three=L3.on&&!L3.nogl;
    return `<span class="h3-tg" role="group" aria-label="Pano görünümü"><button type="button" data-l3="2" aria-pressed="${!three}">Liste</button><button type="button" data-l3="3" aria-pressed="${three}">3B</button></span>`;
  };
  const stageHTML=()=>`<div class="l3-bar"><span class="h3-tg" role="group" aria-label="Yükseklik ölçütü"><button type="button" data-l3m="m" aria-pressed="${L3.m==="m"}">Süre</button><button type="button" data-l3m="q" aria-pressed="${L3.m==="q"}">Soru</button></span><span class="l3-hint">Sütun hangi bölgedeyse öğrenci o durumda</span></div>`+
    `<div class="l3-stage" data-l3s="1" tabindex="0" role="img" aria-label="Öğrencileri durumlarına göre beş bölgede gösteren üç boyutlu pano. Tam liste için Liste görünümüne geç. Ok tuşlarıyla öğrenci değiştirilir."></div><div class="l3-rd" id="l3rd" aria-live="polite"></div>`;

  coachView=function(){
    const html=PREV.apply(this,arguments);
    try{
      if(typeof html!=="string"||html.indexOf('id="coach-live"')<0)return html;
      const tpl=document.createElement("template");tpl.innerHTML=html;
      const h2=[...tpl.content.querySelectorAll(".lv-card .lv-head h2")].find(h=>h.textContent==="Durum panosu");
      if(!h2)return html;
      const card=h2.closest(".lv-card"),head=h2.closest(".lv-head"),scroll=card.querySelector(".lv-scroll");
      head.insertAdjacentHTML("beforeend",toggle());
      if(L3.on&&!L3.nogl&&scroll)scroll.outerHTML=stageHTML();
      return tpl.innerHTML;
    }catch(e){return html}
  };

  document.addEventListener("click",e=>{
    const t=e.target.closest&&e.target.closest("[data-l3]");
    if(t){L3.on=t.getAttribute("data-l3")==="3";L3.nogl=false;try{localStorage.setItem(LS,L3.on?"3":"2")}catch(_){}render();return}
    const m=e.target.closest&&e.target.closest("[data-l3m]");
    if(m){L3.m=m.getAttribute("data-l3m")==="q"?"q":"m";document.querySelectorAll("[data-l3m]").forEach(b=>b.setAttribute("aria-pressed",b.getAttribute("data-l3m")===L3.m))}
  });

  function paintRd(){
    const el=document.getElementById("l3rd"),T=L3.t;if(!el||!T)return;
    const x=T.list.find(s=>s.id===L3.sel)||T.list[0];if(!x){el.innerHTML='<p class="lv-empty">Henüz öğrenci yok.</p>';return}
    L3.sel=x.id;
    const k=grp(x.st),h=x.hist.map(p=>num(p.m)),mx=Math.max(1,...h);
    const bars=h.map((v,i)=>`<rect x="${i*17+1}" y="${36-Math.max(2,v/mx*34)}" width="12" height="${Math.max(2,v/mx*34)}" rx="3" fill="${col()[ORD.indexOf(k)]}" opacity="${i===6?1:.45}"/>`).join("");
    el.innerHTML=`<div class="l3-who"><b>${x.n}</b><span class="l3-st"><i style="background:${col()[ORD.indexOf(k)]}"></i>${LAB[k]}${x.st==="study"?" · canlı":""}${x.st==="break"?" · "+(x.brk||0)+" dk":""}</span></div>`+
      `<div class="l3-nums"><div><small>Bugün süre</small><b data-lv="${x.id}">${hms(secs(x.id))}</b></div><div><small>Soru</small><b>${x.q}</b></div></div>`+
      `<svg viewBox="0 0 120 38" aria-label="Son 7 gün çalışma süresi" role="img">${bars}</svg>`+
      `<button type="button" class="btn l3-open" data-i="${x.id}">Kaydı aç</button>`;
  }

  function load(cb){
    if(window.THREE)return cb(true);
    if(L3.l3){L3.l3.push(cb);return}
    L3.l3=[cb];const s=document.createElement("script");s.src="js/vendor/three.min.js?v=r128";
    s.onload=()=>{const q=L3.l3;L3.l3=null;q.forEach(f=>f(true))};
    s.onerror=()=>{const q=L3.l3;L3.l3=null;q.forEach(f=>f(false))};
    document.head.appendChild(s);
  }

  function make(){
    const TH=window.THREE,TW=5*ZW+4*ZG;
    const renderer=new TH.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.domElement.setAttribute("aria-hidden","true");
    const scene=new TH.Scene(),camera=new TH.PerspectiveCamera(36,1,.1,200);
    scene.add(new TH.AmbientLight(0xffffff,.78));
    const dl=new TH.DirectionalLight(0xffffff,.85);dl.position.set(-6,14,9);scene.add(dl);
    const world=new TH.Group();scene.add(world);
    const geo=new TH.BoxGeometry(.8,1,.8);geo.translate(0,.5,0);
    const T={renderer,scene,camera,world,geo,TW,zd:3.4,zdSized:3.4,host:null,ro:null,list:[],bars:{},plates:[],labels:[],lsig:"",lt:null,
      yaw:.18,pitch:.62,dist:20,drag:false,moved:0,px:0,py:0,touch:0,ray:new TH.Raycaster(),ptr:new TH.Vector2(),maxS:7200,maxQ:30};
    for(let k=0;k<5;k++){
      const p=new TH.Mesh(new TH.PlaneGeometry(ZW,1),new TH.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.2,depthWrite:false}));
      p.rotation.x=-Math.PI/2;p.position.set(-TW/2+ZW/2+k*(ZW+ZG),-.01,0);world.add(p);T.plates.push(p);
    }
    T.mk=new TH.LineSegments(new TH.EdgesGeometry(geo),new TH.LineBasicMaterial({color:0xffffff}));world.add(T.mk);
    T.zx=k=>-TW/2+ZW/2+k*(ZW+ZG);
    const tex=(txt,c,px)=>{
      const cv=document.createElement("canvas"),f="700 "+px+"px \"Space Grotesk\",system-ui,sans-serif";let x=cv.getContext("2d");x.font=f;
      const w=Math.ceil(x.measureText(txt).width)+16;cv.width=w;cv.height=px+14;x=cv.getContext("2d");x.font=f;x.fillStyle=c;x.textBaseline="middle";x.textAlign="center";x.fillText(txt,w/2,cv.height/2);
      const t=new TH.CanvasTexture(cv);t.minFilter=TH.LinearFilter;return {t,w,h:cv.height};
    };
    T.buildLabels=()=>{
      T.labels.forEach(s=>{world.remove(s);s.material.map.dispose();s.material.dispose()});T.labels=[];
      const cnt=T.counts||[0,0,0,0,0];
      ORD.forEach((k,i)=>{const o=tex(LAB[k]+" · "+cnt[i],col()[i],38),sp=new TH.Sprite(new TH.SpriteMaterial({map:o.t,transparent:true,depthTest:false}));
        sp.scale.set(o.w*.0098,o.h*.0098,1);sp.position.set(T.zx(i),.05,T.zd/2+.75);sp.renderOrder=5;world.add(sp);T.labels.push(sp)});
      T.lsig=cnt.join(",")+"|"+light();
    };
    T.recolor=()=>{
      const c=col();T.plates.forEach((p,i)=>p.material.color.set(c[i]));
      Object.keys(T.bars).forEach(id=>{const b=T.bars[id];b.m.material.color.set(c[ORD.indexOf(b.k)])});
      T.mk.material.color.set(light()?0x16180f:0xffffff);T.lt=light();T.buildLabels();
    };
    if(document.fonts&&document.fonts.load)document.fonts.load('700 38px "Space Grotesk"').then(()=>{if(T.renderer)T.buildLabels()}).catch(()=>{});
    return T;
  }

  function sync(T,list){
    T.list=list;const ids={};
    list.forEach(x=>{
      ids[x.id]=1;let b=T.bars[x.id];const k=grp(x.st);
      if(!b){const m=new window.THREE.Mesh(T.geo,new window.THREE.MeshStandardMaterial({color:0xffffff,roughness:.5,metalness:.08}));
        m.scale.y=REDUCE?.3:.02;m.userData.id=x.id;T.world.add(m);b=T.bars[x.id]={m,h:m.scale.y,k:"",px:null,pz:null}}
      if(b.k!==k){b.k=k;b.m.material.color.set(col()[ORD.indexOf(k)])}
    });
    Object.keys(T.bars).forEach(id=>{if(!ids[id]){const b=T.bars[id];T.world.remove(b.m);b.m.material.dispose();delete T.bars[id]}});
  }

  function size(T){
    if(!T||!T.host||!T.renderer)return;
    const w=T.host.clientWidth,h=T.host.clientHeight;if(!w||!h)return;
    T.renderer.setSize(w,h,false);T.camera.aspect=w/h;
    const t=Math.tan(18*Math.PI/180);
    T.dist=Math.max(14,Math.max((T.TW/2+1.2)/(t*Math.min(w/h,1.6)),(T.zd/2+3)/t*.5));T.zdSized=T.zd;T.camera.updateProjectionMatrix();
  }

  function bind(T,host){
    if(host.dataset.l3)return;host.dataset.l3="1";
    host.addEventListener("pointerdown",e=>{T.drag=true;T.moved=0;T.px=e.clientX;T.py=e.clientY;try{host.setPointerCapture(e.pointerId)}catch(_){}});
    host.addEventListener("pointermove",e=>{if(!T.drag)return;const dx=e.clientX-T.px,dy=e.clientY-T.py;T.moved+=Math.abs(dx)+Math.abs(dy);T.yaw-=dx*.006;
      if(e.pointerType==="mouse")T.pitch=Math.max(.2,Math.min(1.3,T.pitch+dy*.006));T.px=e.clientX;T.py=e.clientY});
    const end=e=>{const was=T.drag;T.drag=false;T.touch=performance.now();
      if(was&&e.type==="pointerup"&&T.moved<8){
        const r=T.renderer.domElement.getBoundingClientRect();if(!r.width||!r.height)return;
        T.ptr.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);T.ray.setFromCamera(T.ptr,T.camera);
        const hit=T.ray.intersectObjects(Object.keys(T.bars).map(id=>T.bars[id].m),false)[0];
        if(hit){L3.sel=hit.object.userData.id;paintRd()}
      }};
    host.addEventListener("pointerup",end);host.addEventListener("pointercancel",end);
    host.addEventListener("keydown",e=>{
      if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;e.preventDefault();
      const L=T.list;if(!L.length)return;let i=L.findIndex(s=>s.id===L3.sel);i=(i+(e.key==="ArrowRight"?1:L.length-1))%L.length;L3.sel=L[i].id;paintRd();
    });
  }

  function frame(){
    L3.raf=0;const T=L3.t;
    if(!T||!T.renderer||!T.host||!document.body.contains(T.host))return;
    if(!document.hidden){
      if(T.lt!==light())T.recolor();
      const list=T.list,groups=[[],[],[],[],[]];
      let mxs=7200,mxq=30;
      const sc={};
      list.forEach(x=>{const s=secs(x.id);sc[x.id]=s;if(s>mxs)mxs=s;if(x.q>mxq)mxq=x.q;groups[ORD.indexOf(grp(x.st))].push(x)});
      T.maxS+=(mxs-T.maxS)*.1;T.maxQ+=(mxq-T.maxQ)*.1;
      const rows=Math.max(...groups.map(g=>Math.ceil(g.length/2)),1),zd=Math.max(3.4,rows*1.05+.9);
      T.zd+=(zd-T.zd)*(REDUCE?1:.15);
      const counts=groups.map(g=>g.length);
      if(counts.join(",")+"|"+light()!==T.lsig){T.counts=counts;T.buildLabels()}
      if(Math.abs(T.zd-T.zdSized)>.5)size(T);
      T.plates.forEach(p=>{p.scale.y=T.zd});
      T.labels.forEach(s=>{s.position.z=T.zd/2+.75});
      groups.forEach((g,k)=>g.forEach((x,i)=>{
        const b=T.bars[x.id];if(!b)return;
        const tx=T.zx(k)+(i%2?.55:-.55),tz=T.zd/2-.6-Math.floor(i/2)*1.05;
        if(b.px==null){b.px=tx;b.pz=tz}else{b.px+=(tx-b.px)*(REDUCE?1:.15);b.pz+=(tz-b.pz)*(REDUCE?1:.15)}
        b.m.position.set(b.px,0,b.pz);
        const th=Math.max(.05,L3.m==="m"?sc[x.id]/T.maxS*TALL:x.q/T.maxQ*TALL);
        b.h+=(th-b.h)*(REDUCE?1:.12);b.m.scale.y=b.h;
      }));
      const sb=T.bars[L3.sel];T.mk.visible=!!sb;if(sb){T.mk.position.copy(sb.m.position);T.mk.scale.set(1.16,sb.h+.06,1.16)}
      const idle=!REDUCE&&!T.drag&&performance.now()-T.touch>3000,yaw=T.yaw+(idle?Math.sin(performance.now()/3400)*.14:0);
      T.camera.position.set(Math.sin(yaw)*Math.cos(T.pitch)*T.dist,Math.sin(T.pitch)*T.dist,Math.cos(yaw)*Math.cos(T.pitch)*T.dist);
      T.camera.lookAt(0,1.6,0);T.renderer.render(T.scene,T.camera);
    }
    L3.raf=requestAnimationFrame(frame);
  }

  function fail(){L3.nogl=true;render()}

  function mount(){
    if(!L3.on||L3.nogl||!isLive()||!document.querySelector("[data-l3s]"))return;
    load(ok=>{
      const host=document.querySelector("[data-l3s]");if(!host)return;
      if(!ok)return fail();
      if(!L3.t){try{L3.t=make()}catch(e){L3.t=null}}
      if(!L3.t)return fail();
      const T=L3.t;let list;
      try{list=roster()}catch(e){return fail()}
      sync(T,list);if(!T.lsig)T.recolor();
      if(!list.some(x=>x.id===L3.sel)){const s=list.find(x=>x.st==="study")||list[0];L3.sel=s?s.id:null}
      T.host=host;host.insertBefore(T.renderer.domElement,host.firstChild);
      if(T.ro)T.ro.disconnect();
      if(window.ResizeObserver){T.ro=new ResizeObserver(()=>size(T));T.ro.observe(host)}
      bind(T,host);size(T);paintRd();
      if(!L3.raf)L3.raf=requestAnimationFrame(frame);
    });
  }

  const pr=render;
  render=function(){const out=pr.apply(this,arguments);try{mount()}catch(e){}return out};
})();
