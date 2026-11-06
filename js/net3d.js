// Net grafiği 3B görünümü "Ders şeritleri": her ders denemeler boyunca akan bir şerit, yüksekliği o denemedeki net.
// Net grafiği kartına (öğrenci Analiz → Denemeler ve koç öğrenci detayı) 2B/3B düğmesi ekler; varsayılan 2B
// (`localStorage karakis-net3d`). Veri yeni değil: netChartsCard()'ın okuduğu EX[sid] (son 8 deneme, aynı tür).
// Kaydırıcı seçili denemeyi belirler, cam kesit o denemeye kayar, altta dersler o denemenin neti ve değişimiyle yazılır.
// three.js yalnız 3B ilk açılınca yüklenir; WebGL yoksa 2B'ye döner. Tuval render() sonrası yeni kutuya taşınır (heat3d.js ile aynı düzen).
(function(){
  if(typeof netChartsCard!=="function"||typeof render!=="function")return;
  const ORIG=netChartsCard,LS="karakis-net3d",GZ=1.9,TALL=6;
  const N3={on:false,nogl:false,l3:null,data:{},idx:{},sc:{},raf:0};
  try{N3.on=localStorage.getItem(LS)==="3"}catch(e){}
  const light=()=>document.documentElement.getAttribute("data-theme")==="light";
  const PD=["#d9f24a","#6fb7ff","#ffb347","#ff7a6b","#b69cff","#4fd1b5"],PL=["#667a00","#1c64c4","#b36a00","#c93a2a","#6b4fd1","#00806a"];
  const pal=()=>light()?PL:PD;
  const fmt=v=>(Math.round(v*100)/100).toLocaleString("tr-TR");
  const REDUCE=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function collect(sid,tur){
    const L=(EX[sid]||[]).filter(e=>e.total_net!=null&&e.exam_type===tur).slice(-8);
    const names=[];
    L.forEach(e=>(e.subjects||[]).forEach(d=>{if(typeof d.net==="number"&&names.indexOf(d.ders)<0)names.push(d.ders)}));
    const ders=names.map(k=>({k,n:L.map(e=>{const d=(e.subjects||[]).find(x=>x.ders===k);return d&&typeof d.net==="number"?d.net:null})}))
      .filter(d=>d.n.filter(v=>v!=null).length>=2);
    const lab=L.map(e=>e.exam_date?new Date(e.exam_date+"T00:00:00").toLocaleDateString("tr-TR",{day:"numeric",month:"short"}):String(e.exam_name||"").slice(0,8));
    return {len:L.length,ders,lab,name:L.map(e=>String(e.exam_name||"")),tot:L.map(e=>num(e.total_net))};
  }

  netChartsCard=function(sid){
    const html=ORIG(sid);
    const all=(EX[sid]||[]).filter(e=>e.total_net!=null);
    const turs=[...new Set(all.map(e=>e.exam_type))].filter(t=>all.filter(e=>e.exam_type===t).length>=2);
    let i=0;
    return html.replace(/<svg viewBox="0 0 320 130"[\s\S]*?<\/svg>/g,svg=>{
      const tur=turs[i++];if(tur==null)return svg;
      const d=collect(sid,tur);if(!d.ders.length)return svg;
      const key=String(sid)+"_"+String(tur).replace(/\W/g,"");
      N3.data[key]=d;
      if(N3.idx[key]==null||N3.idx[key]>d.len-1)N3.idx[key]=d.len-1;
      const three=N3.on&&!N3.nogl;
      const tg=`<div class="n3-hd"><span class="h3-tg" role="group" aria-label="Grafik görünümü"><button type="button" data-n3="2" aria-pressed="${!three}">2B</button><button type="button" data-n3="3" aria-pressed="${three}">3B</button></span></div>`;
      if(!three)return tg+svg;
      const ix=N3.idx[key];
      return tg+`<div class="n3-stage" data-n3s="${key}" role="img" aria-label="Derslerin denemelerdeki netini gösteren üç boyutlu şerit grafik. Aynı bilgi altta yazıyla ve 2B görünümde var."></div>`+
        `<div class="n3-sc"><button type="button" data-n3d="-1" data-n3k="${key}" aria-label="Önceki deneme">‹</button><input type="range" data-n3r="${key}" min="0" max="${d.len-1}" step="1" value="${ix}" aria-label="Deneme seç"><button type="button" data-n3d="1" data-n3k="${key}" aria-label="Sonraki deneme">›</button></div>`+
        `<div class="n3-rd" data-n3o="${key}" aria-live="polite"></div>`;
    });
  };

  function paintRd(key){
    const el=document.querySelector('[data-n3o="'+key+'"]'),d=N3.data[key];if(!el||!d)return;
    const ix=N3.idx[key],c=pal();
    const parts=d.ders.map((x,j)=>{
      const v=x.n[ix];if(v==null)return"";
      let p=null;for(let e=ix-1;e>=0;e--){if(x.n[e]!=null){p=x.n[e];break}}
      const df=p==null?"":Math.round((v-p)*100)/100;
      return `<span class="n3-dr"><i style="background:${c[j%c.length]}"></i>${esc(x.k)} <b>${fmt(v)}</b>${df===""?"":` <em class="${df>=0?"up":"dn"}">${df>=0?"▲ +":"▼ "}${fmt(df)}</em>`}</span>`;
    }).join("");
    el.innerHTML=`<b>${esc(d.name[ix])}</b> · toplam <b>${fmt(d.tot[ix])}</b> net<div class="n3-drs">${parts}</div>`;
  }
  function setIdx(key,v){
    const d=N3.data[key];if(!d)return;
    N3.idx[key]=Math.max(0,Math.min(d.len-1,v));
    const r=document.querySelector('[data-n3r="'+key+'"]');if(r)r.value=N3.idx[key];
    const T=N3.sc[key];if(T)T.go=T.xOf(N3.idx[key]);
    paintRd(key);
  }

  document.addEventListener("click",e=>{
    const t=e.target.closest&&e.target.closest("[data-n3]");
    if(t){N3.on=t.getAttribute("data-n3")==="3";N3.nogl=false;try{localStorage.setItem(LS,N3.on?"3":"2")}catch(_){}render();return}
    const s=e.target.closest&&e.target.closest("[data-n3d]");
    if(s){const k=s.getAttribute("data-n3k");setIdx(k,N3.idx[k]+(+s.getAttribute("data-n3d")))}
  });
  document.addEventListener("input",e=>{
    const r=e.target.closest&&e.target.closest("[data-n3r]");if(r)setIdx(r.getAttribute("data-n3r"),+r.value);
  });

  function load(cb){
    if(window.THREE)return cb(true);
    if(N3.l3){N3.l3.push(cb);return}
    N3.l3=[cb];const s=document.createElement("script");s.src="js/vendor/three.min.js?v=r128";
    s.onload=()=>{const q=N3.l3;N3.l3=null;q.forEach(f=>f(true))};
    s.onerror=()=>{const q=N3.l3;N3.l3=null;q.forEach(f=>f(false))};
    document.head.appendChild(s);
  }

  function make(d,sig){
    const TH=window.THREE,NX=d.len,ND=d.ders.length;
    const GX=Math.min(2,13/Math.max(1,NX-1)),W=(NX-1)*GX,D=(ND-1)*GZ;
    const maxN=Math.max(1,...d.ders.map(x=>Math.max(...x.n.filter(v=>v!=null)))),SC=TALL/maxN;
    const renderer=new TH.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.domElement.setAttribute("aria-hidden","true");
    const scene=new TH.Scene(),camera=new TH.PerspectiveCamera(36,1,.1,200);
    scene.add(new TH.AmbientLight(0xffffff,.8));
    const dl=new TH.DirectionalLight(0xffffff,.8);dl.position.set(-6,12,10);scene.add(dl);
    const world=new TH.Group();scene.add(world);
    const xOf=e=>e*GX-W/2;
    const T={renderer,scene,camera,world,sig,d,host:null,ro:null,yaw:.5,pitch:.42,dist:22,drag:false,px:0,py:0,touch:0,lt:null,go:0,
      walls:[],tubes:[],dots:[],labels:[],xOf,W,D};
    d.ders.forEach((x,i)=>{
      const z=i*GZ-D/2,pts=[],at=[];
      x.n.forEach((v,e)=>{if(v!=null){pts.push(new TH.Vector3(xOf(e),v*SC,z));at.push(e)}});
      const curve=new TH.CatmullRomCurve3(pts,false,"catmullrom",.5),sm=curve.getPoints(60),pos=[],ix=[];
      sm.forEach(p=>pos.push(p.x,p.y,z,p.x,0,z));
      for(let k=0;k<sm.length-1;k++){const a=k*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}
      const g=new TH.BufferGeometry();g.setAttribute("position",new TH.Float32BufferAttribute(pos,3));g.setIndex(ix);
      const wall=new TH.Mesh(g,new TH.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.3,side:TH.DoubleSide,depthWrite:false}));world.add(wall);T.walls.push(wall);
      const tube=new TH.Mesh(new TH.TubeGeometry(curve,80,.07,8,false),new TH.MeshStandardMaterial({color:0xffffff,roughness:.4,metalness:.1}));world.add(tube);T.tubes.push(tube);
      T.dots.push(pts.map((p,j)=>{const s=new TH.Mesh(new TH.SphereGeometry(.17,16,12),tube.material);s.position.copy(p);world.add(s);return {s,e:at[j]}}));
    });
    const floor=new TH.Mesh(new TH.PlaneGeometry(W+2.6,D+2.2),new TH.MeshBasicMaterial({color:0x888888,transparent:true,opacity:.1}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-.01;world.add(floor);T.floor=floor;
    const glass=new TH.Mesh(new TH.PlaneGeometry(D+1.8,TALL+1.2),new TH.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.14,side:TH.DoubleSide,depthWrite:false}));
    glass.rotation.y=Math.PI/2;glass.position.y=(TALL+1.2)/2;world.add(glass);
    const rim=new TH.LineSegments(new TH.EdgesGeometry(glass.geometry),new TH.LineBasicMaterial({color:0xffffff}));rim.rotation.y=Math.PI/2;rim.position.y=glass.position.y;world.add(rim);
    T.glass=glass;T.rim=rim;
    const tex=(txt,col,px)=>{
      const c=document.createElement("canvas"),f="700 "+px+"px \"Space Grotesk\",system-ui,sans-serif";let x=c.getContext("2d");x.font=f;
      const w=Math.ceil(x.measureText(txt).width)+16;c.width=w;c.height=px+14;x=c.getContext("2d");x.font=f;x.fillStyle=col;x.textBaseline="middle";x.textAlign="center";x.fillText(txt,w/2,c.height/2);
      const t=new TH.CanvasTexture(c);t.minFilter=TH.LinearFilter;return {t,w,h:c.height};
    };
    T.buildLabels=()=>{
      T.labels.forEach(s=>{world.remove(s);s.material.map.dispose();s.material.dispose()});T.labels=[];
      const col=getComputedStyle(document.documentElement).getPropertyValue("--mute").trim()||"#999";
      const add=(txt,x,z)=>{const o=tex(txt,col,40),s=new TH.Sprite(new TH.SpriteMaterial({map:o.t,transparent:true,depthTest:false}));s.scale.set(o.w*.0105,o.h*.0105,1);s.position.set(x,.05,z);s.renderOrder=5;world.add(s);T.labels.push(s)};
      d.lab.forEach((t,e)=>add(t,xOf(e),D/2+1.15));
      d.ders.forEach((x,i)=>add(x.k.length>9?x.k.slice(0,8)+"…":x.k,-W/2-1.9,i*GZ-D/2));
    };
    T.recolor=()=>{
      const c=pal();T.walls.forEach((m,i)=>{m.material.color.set(c[i%c.length]);T.tubes[i].material.color.set(c[i%c.length])});
      const g=light()?0x16180f:0xffffff;glass.material.color.set(g);rim.material.color.set(g);floor.material.color.set(g);
      T.lt=light();T.buildLabels();
    };
    T.recolor();
    if(document.fonts&&document.fonts.load)document.fonts.load('700 40px "Space Grotesk"').then(()=>{if(T.renderer)T.buildLabels()}).catch(()=>{});
    return T;
  }

  function dispose(T){
    if(!T)return;if(T.ro)T.ro.disconnect();
    T.world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose()}});
    T.renderer.dispose();if(T.renderer.domElement.parentNode)T.renderer.domElement.parentNode.removeChild(T.renderer.domElement);T.renderer=null;
  }

  function size(T){
    if(!T||!T.host||!T.renderer)return;
    const w=T.host.clientWidth,h=T.host.clientHeight;if(!w||!h)return;
    T.renderer.setSize(w,h,false);T.camera.aspect=w/h;
    const t=Math.tan(18*Math.PI/180),half=Math.max(T.W/2+2,T.D/2+2.6);
    T.dist=Math.max(15,half/(t*Math.min(w/h,1.5))*1.02);T.camera.updateProjectionMatrix();
  }

  function bind(T,host){
    if(host.dataset.n3)return;host.dataset.n3="1";
    host.addEventListener("pointerdown",e=>{T.drag=true;T.px=e.clientX;T.py=e.clientY;try{host.setPointerCapture(e.pointerId)}catch(_){}});
    host.addEventListener("pointermove",e=>{if(!T.drag)return;T.yaw-=(e.clientX-T.px)*.008;if(e.pointerType==="mouse")T.pitch=Math.max(.15,Math.min(1.3,T.pitch+(e.clientY-T.py)*.006));T.px=e.clientX;T.py=e.clientY});
    const end=()=>{T.drag=false;T.touch=performance.now()};
    host.addEventListener("pointerup",end);host.addEventListener("pointercancel",end);
  }

  function frame(){
    N3.raf=0;let live=0;
    Object.keys(N3.sc).forEach(k=>{
      const T=N3.sc[k];if(!T||!T.renderer||!T.host||!document.body.contains(T.host))return;
      live++;if(document.hidden)return;
      if(T.lt!==light())T.recolor();
      const ix=N3.idx[k];
      T.glass.position.x=T.rim.position.x=T.glass.position.x+(T.go-T.glass.position.x)*(REDUCE?1:.14);
      T.dots.forEach(row=>row.forEach(o=>{const on=o.e===ix?1.7:1,s=o.s.scale.x+(on-o.s.scale.x)*(REDUCE?1:.2);o.s.scale.set(s,s,s)}));
      const idle=!REDUCE&&!T.drag&&performance.now()-T.touch>2500,yaw=T.yaw+(idle?Math.sin(performance.now()/3000)*.18:0);
      T.camera.position.set(Math.sin(yaw)*Math.cos(T.pitch)*T.dist,Math.sin(T.pitch)*T.dist,Math.cos(yaw)*Math.cos(T.pitch)*T.dist);
      T.camera.lookAt(0,2.3,0);T.renderer.render(T.scene,T.camera);
    });
    if(live)N3.raf=requestAnimationFrame(frame);
  }

  function fail(){N3.nogl=true;render()}

  function mount(){
    if(!N3.on||N3.nogl||!document.querySelector("[data-n3s]"))return;
    load(ok=>{
      const hosts=[...document.querySelectorAll("[data-n3s]")];if(!hosts.length)return;
      if(!ok)return fail();
      for(const host of hosts){
        const key=host.getAttribute("data-n3s"),d=N3.data[key];if(!d)continue;
        const sig=JSON.stringify([d.ders,d.lab]);let T=N3.sc[key];
        if(!T||T.sig!==sig){
          dispose(T);N3.sc[key]=null;
          try{T=N3.sc[key]=make(d,sig)}catch(e){return fail()}
          T.go=T.xOf(N3.idx[key]);T.glass.position.x=T.rim.position.x=T.go;
        }
        T.host=host;host.insertBefore(T.renderer.domElement,host.firstChild);
        if(T.ro)T.ro.disconnect();
        if(window.ResizeObserver){T.ro=new ResizeObserver(()=>size(T));T.ro.observe(host)}
        bind(T,host);size(T);paintRd(key);
      }
      if(!N3.raf)N3.raf=requestAnimationFrame(frame);
    });
  }

  const pr=render;
  render=function(){const out=pr.apply(this,arguments);try{mount()}catch(e){}return out};
})();
