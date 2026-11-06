// Yoğunluk Haritası 3B görünümü: aynı 18 haftalık veri, çalışılan dakikaya göre yükselen çubuklar.
// Kartın başına 2B/3B düğmesi eklenir (seçim tarayıcıda hatırlanır, varsayılan 2B). Veri/sorgu yeni değil:
// heatCard()'ın kullandığı HIST[ME], snap(), day() okunur; bir çubuğa dokunmak eski ızgaradaki gibi HMSEL'i seçer.
// three.js (js/vendor/three.min.js) yalnız 3B ilk açılınca yüklenir; WebGL yoksa 2B'ye döner.
// Sahne render() çağrılarında yaşar: tuval her çizimde yeni kutuya taşınır (pts-board.js ile aynı düzen).
(function(){
  if(typeof heatCard!=="function"||typeof render!=="function")return;
  const ORIG=heatCard,WK=18,LS="karakis-heat3d";
  const H3={on:false,nogl:false,l3:null,t:null,raf:0};
  try{H3.on=localStorage.getItem(LS)==="3"}catch(e){}
  const light=()=>document.documentElement.getAttribute("data-theme")==="light";
  const COL=()=>light()?["#e6e9d3","#d8e28a","#b3c64a","#8aa21c","#667a00"]:["#2b2b2b","#3d4a14","#7d9420","#aac331","#d9f24a"];
  const lvl=m=>m<=0?0:m<30?1:m<90?2:m<180?3:4;
  const hOf=m=>m<=0?.06:.3+Math.min(m,360)/360*6.7;
  const REDUCE=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Izgara verisi: heatCard ile aynı hafta/gün hesabı (Pzt=0), gelecek günler çizilmez.
  function grid(){
    const Hh=Object.assign({},HIST[ME]||{});Hh[day()]=snap();
    const today=new Date();today.setHours(0,0,0,0);
    const dow=(today.getDay()+6)%7,start=new Date(today);start.setDate(start.getDate()-dow-(WK-1)*7);
    const out=[];
    for(let w=0;w<WK;w++)for(let r=0;r<7;r++){
      const d=new Date(start);d.setDate(start.getDate()+w*7+r);if(d>today)continue;
      const k=ymd(d);out.push({k,w,r,m:num((Hh[k]||{}).m)});
    }
    return out;
  }

  heatCard=function(){
    const base=ORIG();
    const tg=`<span class="h3-tg" role="group" aria-label="Görünüm"><button type="button" data-h3="2" aria-pressed="${!H3.on||H3.nogl}">2B</button><button type="button" data-h3="3" aria-pressed="${H3.on&&!H3.nogl}">3B</button></span>`;
    const head=base.replace("<h2>Yoğunluk Haritası</h2>",`<div class="h3-hd"><h2>Yoğunluk Haritası</h2>${tg}</div>`);
    if(!H3.on||H3.nogl)return head;
    return head.replace(/<div class="hmm"[\s\S]*?<p class="empty" style="margin:4px 0 8px;font-size:14px">/,
      `<div class="h3-stage" id="h3stage" role="img" aria-label="18 haftalık çalışma yoğunluğu, üç boyutlu çubuk grafik. Aynı bilgi 2B görünümde de var."></div><p class="empty" style="margin:4px 0 8px;font-size:14px">`)
      .replace("Dokun: o günün çalışmasını gör","Bir çubuğa dokun: o günün çalışmasını gör · sürükleyerek döndür");
  };

  document.addEventListener("click",e=>{
    const b=e.target.closest&&e.target.closest("[data-h3]");if(!b)return;
    H3.on=b.getAttribute("data-h3")==="3";H3.nogl=false;
    try{localStorage.setItem(LS,H3.on?"3":"2")}catch(_){}
    render();
  });

  function load(cb){
    if(window.THREE)return cb(true);
    if(H3.l3){H3.l3.push(cb);return}
    H3.l3=[cb];const s=document.createElement("script");s.src="js/vendor/three.min.js?v=r128";
    s.onload=()=>{const q=H3.l3;H3.l3=null;q.forEach(f=>f(true))};
    s.onerror=()=>{const q=H3.l3;H3.l3=null;q.forEach(f=>f(false))};
    document.head.appendChild(s);
  }

  function make(){
    const TH=window.THREE;
    const renderer=new TH.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.domElement.setAttribute("aria-hidden","true");
    const scene=new TH.Scene(),camera=new TH.PerspectiveCamera(38,1,.1,200);
    scene.add(new TH.AmbientLight(0xffffff,.7));
    const dl=new TH.DirectionalLight(0xffffff,.9);dl.position.set(-6,14,8);scene.add(dl);
    const world=new TH.Group();scene.add(world);
    const geo=new TH.BoxGeometry(.82,1,.82);geo.translate(0,.5,0);
    const edge=new TH.EdgesGeometry(geo);
    const T={renderer,scene,camera,world,geo,mats:[],bars:{},host:null,yaw:.5,pitch:.62,dist:22,drag:false,moved:0,px:0,py:0,touch:0,ro:null,
      ray:new TH.Raycaster(),ptr:new TH.Vector2(),th:null,sel:null,today:null,lt:null};
    COL().forEach(c=>T.mats.push(new TH.MeshStandardMaterial({color:c,roughness:.55,metalness:.08})));
    const floor=new TH.Mesh(new TH.PlaneGeometry(WK+.6,7.6),new TH.MeshBasicMaterial({color:0x888888,transparent:true,opacity:.12}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-.01;world.add(floor);
    T.mkSel=new TH.LineSegments(edge,new TH.LineBasicMaterial({color:0xffffff}));T.mkSel.visible=false;world.add(T.mkSel);
    T.mkTd=new TH.LineSegments(edge,new TH.LineBasicMaterial({color:0x2f6bff}));T.mkTd.visible=false;world.add(T.mkTd);
    T.update=function(list,sel,today){
      const keep={};
      list.forEach(o=>{
        keep[o.k]=1;let b=T.bars[o.k];
        if(!b){const mesh=new TH.Mesh(geo,T.mats[0]);mesh.position.set(o.w-(WK-1)/2,0,o.r-3);mesh.scale.y=REDUCE?hOf(o.m):.02;mesh.userData.k=o.k;world.add(mesh);b=T.bars[o.k]={mesh,h:mesh.scale.y,th:1}}
        b.th=hOf(o.m);b.mesh.material=T.mats[lvl(o.m)];
      });
      Object.keys(T.bars).forEach(k=>{if(!keep[k]){world.remove(T.bars[k].mesh);delete T.bars[k]}});
      T.sel=sel;T.today=today;
    };
    T.recolor=function(){const c=COL();T.mats.forEach((m,i)=>m.color.set(c[i]));T.lt=light();T.mkTd.material.color.set(light()?0x1b4fd8:0x6fa0ff);T.mkSel.material.color.set(light()?0x111111:0xffffff)};
    T.recolor();
    return T;
  }

  function size(){
    const T=H3.t;if(!T||!T.host)return;
    const w=T.host.clientWidth,h=T.host.clientHeight;if(!w||!h)return;
    T.renderer.setSize(w,h,false);T.camera.aspect=w/h;
    T.dist=Math.max(15,9.4/(Math.tan(19*Math.PI/180)*(w/h)));T.camera.updateProjectionMatrix();
  }

  function mark(T,mk,k){
    const b=k&&T.bars[k];if(!b){mk.visible=false;return}
    mk.visible=true;mk.position.copy(b.mesh.position);mk.scale.set(1.14,b.h+.05,1.14);
  }

  function frame(){
    const T=H3.t;H3.raf=0;
    if(!T||!T.host||!document.body.contains(T.host))return;
    if(!document.hidden){
      if(T.lt!==light())T.recolor();
      Object.keys(T.bars).forEach(k=>{const b=T.bars[k];b.h+=(b.th-b.h)*(REDUCE?1:.14);b.mesh.scale.y=b.h});
      mark(T,T.mkSel,T.sel);mark(T,T.mkTd,T.today);
      const idle=!REDUCE&&!T.drag&&performance.now()-T.touch>2500;
      const yaw=T.yaw+(idle?Math.sin(performance.now()/2600)*.22:0);
      T.camera.position.set(Math.sin(yaw)*Math.cos(T.pitch)*T.dist,Math.sin(T.pitch)*T.dist,Math.cos(yaw)*Math.cos(T.pitch)*T.dist);
      T.camera.lookAt(0,1.2,0);
      T.renderer.render(T.scene,T.camera);
    }
    H3.raf=requestAnimationFrame(frame);
  }

  function pick(e){
    const T=H3.t;if(!T)return;
    const r=T.renderer.domElement.getBoundingClientRect();if(!r.width||!r.height)return;
    T.ptr.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
    T.ray.setFromCamera(T.ptr,T.camera);
    const hit=T.ray.intersectObjects(Object.keys(T.bars).map(k=>T.bars[k].mesh),false)[0];
    if(hit){HMSEL=hit.object.userData.k;render()}
  }

  function bind(host){
    if(host.dataset.h3)return;host.dataset.h3="1";
    const T=H3.t;
    host.addEventListener("pointerdown",e=>{T.drag=true;T.moved=0;T.px=e.clientX;T.py=e.clientY;try{host.setPointerCapture(e.pointerId)}catch(_){}});
    host.addEventListener("pointermove",e=>{
      if(!T.drag)return;const dx=e.clientX-T.px,dy=e.clientY-T.py;T.moved+=Math.abs(dx)+Math.abs(dy);
      T.yaw-=dx*.008;if(e.pointerType==="mouse")T.pitch=Math.max(.2,Math.min(1.3,T.pitch+dy*.006));
      T.px=e.clientX;T.py=e.clientY;
    });
    const end=e=>{const was=T.drag;T.drag=false;T.touch=performance.now();if(was&&e.type==="pointerup"&&T.moved<8)pick(e)};
    host.addEventListener("pointerup",end);host.addEventListener("pointercancel",end);
  }

  function fail(){H3.nogl=true;render()}

  function mount(){
    if(!H3.on||H3.nogl||!document.getElementById("h3stage"))return;
    load(ok=>{
      const host=document.getElementById("h3stage");if(!host)return;
      if(!ok)return fail();
      if(!H3.t){try{H3.t=make()}catch(e){H3.t=null}}
      if(!H3.t)return fail();
      const T=H3.t;
      T.host=host;host.insertBefore(T.renderer.domElement,host.firstChild);
      if(T.ro)T.ro.disconnect();
      if(window.ResizeObserver){T.ro=new ResizeObserver(size);T.ro.observe(host)}
      try{T.update(grid(),HMSEL,day())}catch(e){return fail()}
      bind(host);size();
      if(!H3.raf)H3.raf=requestAnimationFrame(frame);
    });
  }

  const pr=render;
  render=function(){const out=pr.apply(this,arguments);try{mount()}catch(e){}return out};
})();
