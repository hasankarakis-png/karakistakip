// Yarışma sıralaması 3B görünümü (süre ve soru yarışmaları): sıralama kutusuna Liste/3B düğmesi (`localStorage karakis-ch3d`, varsayılan Liste).
// 3B: her öğrenci bir sütun, soldan sağa sırayla dizilir; yükseklik = toplam süre ya da soru. İlk üç madalya rengindedir, çalışanların sütunu parlar,
// "sen" mavi çerçevelidir. Süre yarışmasında çalışanların süresi her karede ilerler, sıra değişince sütunlar yer değiştirir.
// Yeni sorgu yok: challenge.js'in CH.board verisi okunur; 3B açıkken sıralamayı 6 sn'de bir chFetch ile yenileyen küçük bir döngü çalışır.
// Puan yarışması (mode='points') kendi 3B kulesini (pts-board.js) kullanır, buraya karışmaz.
// three.js yalnız 3B ilk açılınca yüklenir; WebGL yoksa listeye döner. Tuval render() sonrası yeni kutuya taşınır.
// 3B açıkken kutu `data-chbd` taşımaz: challenge.js'in 1 sn'lik liste yenilemesi tuvali bozmasın diye.
(function(){
  "use strict";
  if(typeof chBoardHTML!=="function"||typeof render!=="function"||typeof chFetch!=="function"||typeof CH==="undefined")return;
  const PREV=chBoardHTML,LS="karakis-ch3d",GX=1.1,TALL=7;
  const C3={on:false,nogl:false,t:null,l3:null,raf:0,sel:null,fa:0,busy:false,rdAt:0,list:[],cid:null};
  try{C3.on=localStorage.getItem(LS)==="3"}catch(e){}
  const light=()=>document.documentElement.getAttribute("data-theme")==="light";
  const REDUCE=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const MED=["#ffcf4a","#cfd4dc","#d99a5b"],MEDL=["#d49a00","#9aa2ad","#b3743a"];
  const BASED="#6d725e",BASEL="#9aa088",MED_D=MED,LIVE_D="#d9f24a",LIVE_L="#667a00";
  const palette=(rank,me)=>{
    const L=light();
    if(rank<=3)return (L?MEDL:MED_D)[rank-1];
    return me?(L?LIVE_L:LIVE_D):(L?BASEL:BASED);
  };
  const three=()=>C3.on&&!C3.nogl;
  const toggle=()=>`<span class="h3-tg" role="group" aria-label="Sıralama görünümü"><button type="button" data-c3="2" aria-pressed="${!three()}">Liste</button><button type="button" data-c3="3" aria-pressed="${three()}">3B</button></span>`;

  chBoardHTML=function(c){
    if(chPts(c))return PREV(c);
    const bar=`<div class="c3-bar">${three()?'<span class="l3-hint">Sürükle: döndür · Dokun: seç</span>':""}${toggle()}</div>`;
    if(!three())return bar+PREV(c);
    return bar+`<div class="l3-stage c3-stage" data-c3s="${+c.id}" tabindex="0" role="img" aria-label="Yarışma sıralamasını sütunlarla gösteren üç boyutlu grafik. Tam liste için Liste görünümüne geç. Ok tuşlarıyla öğrenci seçilir."></div><div class="l3-rd c3-rd" id="c3rd"></div>`;
  };

  document.addEventListener("click",e=>{
    const b=e.target.closest&&e.target.closest("[data-c3]");if(!b)return;
    C3.on=b.getAttribute("data-c3")==="3";C3.nogl=false;
    try{localStorage.setItem(LS,C3.on?"3":"2")}catch(_){}
    render();
  });

  // Sıralı liste: challenge.js'in chBoardRows'uyla aynı hesap (çalışanın süresi, veri alındığından beri geçen saniye kadar eklenir).
  function vals(c){
    const B=CH.board;if(!B||B.id!==c.id||!Array.isArray(B.rows))return [];
    const mi=c.metric==="minutes",el=Math.max(0,(Date.now()-(B.at||Date.now()))/1000),seen={};
    const L=B.rows.map((r,i)=>{
      let k=String(r.label||"?");seen[k]=(seen[k]||0)+1;if(seen[k]>1)k+="#"+seen[k];
      return {k,r,i,t:mi?(+r.ts||0)+(r.run?el:0):(+r.total||0),d:mi?(+r.td||0)+(r.run?el:0):(+r.today||0)};
    });
    L.sort((a,b)=>b.t-a.t||a.i-b.i);L.forEach((x,i)=>{x.rank=i+1});
    return L;
  }
  const curC=()=>{const h=document.querySelector("[data-c3s]");return h?CH.list.find(x=>x.id===+h.dataset.c3s):null};

  function paintRd(){
    const el=document.getElementById("c3rd"),c=curC();if(!el||!c)return;
    const L=C3.list;
    if(!L.length){el.innerHTML='<p class="empty" style="margin:0">Henüz sıralama yok.</p>';return}
    let x=L.find(s=>s.k===C3.sel);if(!x){x=L.find(s=>s.r.me)||L[0];C3.sel=x.k}
    const mi=c.metric==="minutes",fmt=v=>mi?chSec(v):chVal(c,v),md=["🥇","🥈","🥉"][x.rank-1]||x.rank+".";
    const up=L[x.rank-2],gap=x.rank===1?"Lider":`${x.rank-1}. sıradakiyle fark ${fmt(Math.max(0,up.t-x.t))}`;
    const st=x.r.run?`<i style="background:${light()?LIVE_L:LIVE_D}"></i>Şu an çalışıyor · `:"";
    el.innerHTML=`<div class="l3-who"><b>${md} ${esc(x.r.label||"?")}${x.r.me?" · sen":""}</b><span class="l3-st">${st}${gap}</span></div>`+
      `<div class="l3-nums"><div><small>Toplam</small><b>${fmt(x.t)}</b></div><div><small>Bugün</small><b>+${fmt(x.d)}</b></div></div>`;
  }

  function load(cb){
    if(window.THREE)return cb(true);
    if(C3.l3){C3.l3.push(cb);return}
    C3.l3=[cb];const s=document.createElement("script");s.src="js/vendor/three.min.js?v=r128";
    s.onload=()=>{const q=C3.l3;C3.l3=null;q.forEach(f=>f(true))};
    s.onerror=()=>{const q=C3.l3;C3.l3=null;q.forEach(f=>f(false))};
    document.head.appendChild(s);
  }

  function make(){
    const TH=window.THREE;
    const renderer=new TH.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.domElement.setAttribute("aria-hidden","true");
    const scene=new TH.Scene(),camera=new TH.PerspectiveCamera(36,1,.1,200);
    scene.add(new TH.AmbientLight(0xffffff,.78));
    const dl=new TH.DirectionalLight(0xffffff,.85);dl.position.set(-6,14,9);scene.add(dl);
    const world=new TH.Group();scene.add(world);
    const geo=new TH.BoxGeometry(.82,1,.82);geo.translate(0,.5,0);
    const edge=new TH.EdgesGeometry(geo);
    const floor=new TH.Mesh(new TH.PlaneGeometry(1,3),new TH.MeshBasicMaterial({color:0x888888,transparent:true,opacity:.14,depthWrite:false}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-.01;world.add(floor);
    const T={renderer,scene,camera,world,geo,floor,host:null,ro:null,bars:{},tx:{},n:0,mx:1,lt:null,
      mk:new TH.LineSegments(edge,new TH.LineBasicMaterial({color:0xffffff})),
      mm:new TH.LineSegments(edge,new TH.LineBasicMaterial({color:0x2f6bff})),
      yaw:.12,pitch:.5,dist:20,drag:false,moved:0,px:0,py:0,touch:0,ray:new TH.Raycaster(),ptr:new TH.Vector2()};
    T.mk.visible=false;T.mm.visible=false;world.add(T.mk);world.add(T.mm);
    // Sıra numarası etiketleri: aynı yazı için tek doku, bellekte tutulur.
    T.tex=(txt,c,px)=>{
      const key=txt+"|"+c;if(T.tx[key])return T.tx[key];
      const cv=document.createElement("canvas"),f="700 "+px+"px \"Space Grotesk\",system-ui,sans-serif";let x=cv.getContext("2d");x.font=f;
      const w=Math.ceil(x.measureText(txt).width)+16;cv.width=w;cv.height=px+14;x=cv.getContext("2d");x.font=f;x.fillStyle=c;x.textBaseline="middle";x.textAlign="center";x.fillText(txt,w/2,cv.height/2);
      const t=new TH.CanvasTexture(cv);t.minFilter=TH.LinearFilter;return (T.tx[key]={t,w,h:cv.height});
    };
    T.recolor=()=>{
      Object.keys(T.tx).forEach(k=>{T.tx[k].t.dispose();delete T.tx[k]});
      Object.keys(T.bars).forEach(k=>{T.bars[k].ck="";T.bars[k].lr=-1});
      T.mk.material.color.set(light()?0x16180f:0xffffff);T.mm.material.color.set(light()?0x1b4fd8:0x6fa0ff);
      T.floor.material.color.set(light()?0x666666:0x888888);T.lt=light();
    };
    T.recolor();
    if(document.fonts&&document.fonts.load)document.fonts.load('700 38px "Space Grotesk"').then(()=>{if(T.renderer)T.recolor()}).catch(()=>{});
    return T;
  }

  function sync(T,L){
    const TH=window.THREE,ids={};
    L.forEach(x=>{
      ids[x.k]=1;let b=T.bars[x.k];
      if(!b){
        const m=new TH.Mesh(T.geo,new TH.MeshStandardMaterial({color:0xffffff,roughness:.5,metalness:.08}));
        m.scale.y=REDUCE?.1:.02;m.userData.k=x.k;T.world.add(m);
        const sp=new TH.Sprite(new TH.SpriteMaterial({transparent:true,depthTest:false}));sp.renderOrder=5;T.world.add(sp);
        b=T.bars[x.k]={m,sp,h:m.scale.y,px:null,ck:"",lr:-1,rank:x.rank,me:false,run:false};
      }
      b.rank=x.rank;b.me=!!x.r.me;b.run=!!x.r.run;
    });
    Object.keys(T.bars).forEach(k=>{
      if(!ids[k]){const b=T.bars[k];T.world.remove(b.m);b.m.material.dispose();T.world.remove(b.sp);b.sp.material.dispose();delete T.bars[k]}
    });
  }

  function size(T){
    if(!T||!T.host||!T.renderer)return;
    const w=T.host.clientWidth,h=T.host.clientHeight;if(!w||!h)return;
    T.renderer.setSize(w,h,false);T.camera.aspect=w/h;
    const t=Math.tan(18*Math.PI/180);
    T.dist=Math.max(15,((Math.max(T.n,4)*GX)/2+1.4)/(t*Math.min(w/h,1.7)));
    T.sized=T.n;T.camera.updateProjectionMatrix();
  }

  function pickSel(k){C3.sel=k;paintRd()}

  function bind(T,host){
    if(host.dataset.c3b)return;host.dataset.c3b="1";
    host.addEventListener("pointerdown",e=>{T.drag=true;T.moved=0;T.px=e.clientX;T.py=e.clientY;try{host.setPointerCapture(e.pointerId)}catch(_){}});
    host.addEventListener("pointermove",e=>{
      if(!T.drag)return;const dx=e.clientX-T.px,dy=e.clientY-T.py;T.moved+=Math.abs(dx)+Math.abs(dy);T.yaw-=dx*.006;
      if(e.pointerType==="mouse")T.pitch=Math.max(.2,Math.min(1.3,T.pitch+dy*.006));T.px=e.clientX;T.py=e.clientY;
    });
    const end=e=>{
      const was=T.drag;T.drag=false;T.touch=performance.now();
      if(was&&e.type==="pointerup"&&T.moved<8){
        const r=T.renderer.domElement.getBoundingClientRect();if(!r.width||!r.height)return;
        T.ptr.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);T.ray.setFromCamera(T.ptr,T.camera);
        const hit=T.ray.intersectObjects(Object.keys(T.bars).map(k=>T.bars[k].m),false)[0];
        if(hit)pickSel(hit.object.userData.k);
      }
    };
    host.addEventListener("pointerup",end);host.addEventListener("pointercancel",end);
    host.addEventListener("keydown",e=>{
      if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;e.preventDefault();
      const L=C3.list;if(!L.length)return;let i=L.findIndex(s=>s.k===C3.sel);if(i<0)i=0;
      i=(i+(e.key==="ArrowRight"?1:L.length-1))%L.length;pickSel(L[i].k);
    });
  }

  function frame(){
    C3.raf=0;const T=C3.t;
    if(!T||!T.renderer||!T.host||!document.body.contains(T.host))return;
    if(!document.hidden){
      const c=curC(),L=c?vals(c):[];C3.list=L;
      if(T.lt!==light())T.recolor();
      sync(T,L);
      const n=L.length,now=performance.now();
      if(n!==T.n){T.n=n;size(T)}
      const mx=Math.max(1,n?L[0].t:1);T.mx=T.n&&T.mxInit?T.mx+(mx-T.mx)*(REDUCE?1:.1):mx;T.mxInit=n>0;
      T.floor.scale.x=Math.max(4,n*GX+1.2);
      const pulse=.3+.18*Math.sin(now/260);
      L.forEach(x=>{
        const b=T.bars[x.k];if(!b)return;
        const tx=(x.rank-1-(n-1)/2)*GX;
        b.px=b.px==null?tx:b.px+(tx-b.px)*(REDUCE?1:.15);
        b.m.position.set(b.px,0,0);
        const th=Math.max(.06,x.t/T.mx*TALL);
        b.h+=(th-b.h)*(REDUCE?1:.12);b.m.scale.y=b.h;
        const col=palette(x.rank,x.r.me);
        if(b.ck!==col){b.ck=col;b.m.material.color.set(col);b.m.material.emissive.set(col)}
        b.m.material.emissiveIntensity=x.r.run&&!REDUCE?pulse:x.r.run?.3:0;
        if(b.lr!==x.rank){
          b.lr=x.rank;const o=T.tex(String(x.rank),light()?"#585e4a":"#a0a68a",38);
          b.sp.material.map=o.t;b.sp.material.needsUpdate=true;b.sp.scale.set(o.w*.0098,o.h*.0098,1);
        }
        b.sp.position.set(b.px,.05,1.1);
      });
      const sb=T.bars[C3.sel],me=L.find(s=>s.r.me),mb=me&&T.bars[me.k];
      T.mk.visible=!!sb;if(sb){T.mk.position.copy(sb.m.position);T.mk.scale.set(1.16,sb.h+.06,1.16)}
      T.mm.visible=!!mb&&mb!==sb;if(mb){T.mm.position.copy(mb.m.position);T.mm.scale.set(1.16,mb.h+.06,1.16)}
      if(now-C3.rdAt>1000){C3.rdAt=now;paintRd()}
      const idle=!REDUCE&&!T.drag&&now-T.touch>3000,yaw=T.yaw+(idle?Math.sin(now/3400)*.14:0);
      T.camera.position.set(Math.sin(yaw)*Math.cos(T.pitch)*T.dist,Math.sin(T.pitch)*T.dist,Math.cos(yaw)*Math.cos(T.pitch)*T.dist);
      T.camera.lookAt(0,TALL*.3,0);T.renderer.render(T.scene,T.camera);
    }
    C3.raf=requestAnimationFrame(frame);
  }

  function fail(){C3.nogl=true;render()}

  function mount(){
    if(!three()||!document.querySelector("[data-c3s]"))return;
    load(ok=>{
      const host=document.querySelector("[data-c3s]");if(!host)return;
      if(!ok)return fail();
      if(!C3.t){try{C3.t=make()}catch(e){C3.t=null}}
      if(!C3.t)return fail();
      const T=C3.t;
      T.host=host;host.insertBefore(T.renderer.domElement,host.firstChild);
      if(T.ro)T.ro.disconnect();
      if(window.ResizeObserver){T.ro=new ResizeObserver(()=>size(T));T.ro.observe(host)}
      bind(T,host);T.n=-1;size(T);C3.rdAt=0;paintRd();
      if(!C3.raf)C3.raf=requestAnimationFrame(frame);
    });
  }

  // 3B açıkken sıralamayı sunucudan 6 sn'de bir yeniler (liste görünümündeki chBoardRefresh yalnız data-chbd kutusuna bakar).
  setInterval(()=>{
    if(document.hidden||C3.busy||!three())return;
    const h=document.querySelector("[data-c3s]");if(!h||Date.now()-C3.fa<6000)return;
    const c=CH.list.find(x=>x.id===+h.dataset.c3s);if(!c)return;
    C3.busy=true;C3.fa=Date.now();
    chFetch(c).then(b=>{if(b)CH.board=b}).catch(()=>{}).then(()=>{C3.busy=false});
  },1000);

  const pr=render;
  render=function(){const out=pr.apply(this,arguments);try{mount()}catch(e){}return out};
})();
