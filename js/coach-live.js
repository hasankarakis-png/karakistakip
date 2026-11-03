/* Karakış Takip · Koç "Canlı pano" sekmesi
   Yeni sekme (CPG="v"): öğrencileri durumuna göre kolonlarda gösterir, süreler saniye saniye akar,
   son 7 günün eğilimi, dikkat gerektirenler ve son hareketler.
   Yeni sorgu ya da tablo YOK: yalnızca roster(), ROWS, C.goals, overdue(), flags() verisini okur.
   Mevcut ekranlar değişmez; bu dosya yüklenemezse ya da hata verirse eski koç ekranı aynen çalışır.
   Kapatmak: aşağıdaki CANLI_PANO_AKTIF=false. */
(function(){
  "use strict";
  const CANLI_PANO_AKTIF=true;
  if(!CANLI_PANO_AKTIF||typeof coachView!=="function"||typeof sideNav!=="function"||typeof ui!=="function")return;
  const baseCoachView=coachView,baseSideNav=sideNav,prevUi=ui;
  let LM="m"; // trend ölçüsü: m = çalışma süresi, q = çözülen soru

  const COLS=[["awake","Uyanık","a"],["study","Derste","s"],["break","Molada","b"],["done","Günü bitirdi","d"],["idle","Başlamadı","i"]];
  const grp=st=>st==="stopped"||st==="closed"?"done":st;
  const pad=n=>String(n).padStart(2,"0");
  const hms=s=>pad(Math.floor(s/3600))+":"+pad(Math.floor(s%3600/60))+":"+pad(s%60);
  const fmt=v=>(+Number(v).toFixed(1)).toLocaleString("tr-TR");
  const isLive=()=>typeof ROLE!=="undefined"&&ROLE==="coach"&&typeof CPG!=="undefined"&&CPG==="v";

  // Bugünkü net çalışma süresi (saniye): roster() ile aynı hesap, ama saniyeye kadar.
  function secs(id){
    const t=day(),r=ROWS.find(x=>x.student_id===id&&x.day===t),s=r&&r.state?r.state:null;
    if(!s)return 0;
    const cur=s.cur,now=Date.now();
    const ms=num(s.done)+(cur?(s.status==="break"?num(cur.bs):now)-num(cur.start)-num(cur.brk):0);
    return Math.max(0,Math.floor(ms/1000));
  }

  function card(x){
    const g=(typeof C!=="undefined"&&C.goals&&C.goals[x.id])||null,gm=g&&num(g.m)>0?num(g.m):0;
    const pc=gm?Math.min(100,Math.round(x.m/gm*100)):null,k=grp(x.st);
    let meta;
    if(x.st==="study")meta="Derste";
    else if(x.st==="break")meta="Molada · "+(x.brk||0)+" dk";
    else if(x.st==="closed")meta="Günü kapattı";
    else if(x.st==="stopped")meta="Çalışmayı noktaladı";
    else if(x.st==="awake")meta="Uyanık, derse hazır";
    else meta="Henüz başlamadı";
    if(x.q&&k!=="idle")meta+=" · "+x.q+" soru";
    const av=PH[x.id]?`<img src="${PH[x.id]}" alt="">`:esc(initials(x.n.replace(/&amp;/g,"&")));
    return `<button class="lv-stu" data-i="${x.id}" aria-label="${x.n}, ${meta}. Ayrıntıyı aç"><span class="lv-r1"><span class="lv-av">${av}</span><span class="lv-nm">${x.n}</span></span><span class="lv-t" data-lv="${x.id}">${hms(secs(x.id))}</span><span class="lv-m">${meta}</span>${pc===null?'<span class="lv-bar lv-nogoal"><i style="width:0"></i></span>':`<span class="lv-bar" title="Günlük süre hedefi: ${gm} dk"><i style="width:${pc}%"></i></span>`}</button>`;
  }

  function attention(all){
    const hr=new Date().getHours(),out=[];
    all.forEach(x=>{
      let od=0,fl=[];
      try{od=overdue(x.id).length}catch(e){}
      try{fl=flags(x.hist)}catch(e){}
      if(x.st==="idle"&&!x.m&&hr>=14)out.push({x,sev:3,tag:"Başlamadı",c:"i",txt:"Bugün henüz çalışma kaydı yok"});
      else if(x.st==="break"&&x.brk>=25)out.push({x,sev:2,tag:"Uzun mola",c:"b",txt:"Mola "+x.brk+" dakikadır sürüyor"});
      else if(fl.length)out.push({x,sev:2,tag:"Takip uyarısı",c:"d",txt:fl[0]});
      else if(od)out.push({x,sev:1,tag:"Kalan görev",c:"a",txt:od+" kalan görev karar bekliyor"});
    });
    return out.sort((a,b)=>b.sev-a.sev).slice(0,6);
  }

  function feed(all){
    return all.flatMap(x=>(x.L||[]).map(l=>({t:l.t,n:x.n,m:l.m,id:x.id}))).sort((a,b)=>a.t<b.t?1:a.t>b.t?-1:0).slice(0,8);
  }

  const nice=v=>{if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v))),f=v/p;return(f<=1?1:f<=2?2:f<=5?5:10)*p};
  const WD=["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
  function series(all){
    return [0,1,2,3,4,5,6].map(i=>{
      const sum=all.reduce((a,x)=>a+(x.hist[i]?(LM==="m"?num(x.hist[i].m):num(x.hist[i].q)):0),0);
      const d=new Date(dayN(-6+i)+"T12:00:00");
      return {v:LM==="m"?sum/60:sum,label:i===6?"Bugün":WD[d.getDay()]};
    });
  }
  function chart(d,w,h,cls){
    const n=d.length,mg={l:42,r:14,t:12,b:28},iw=w-mg.l-mg.r,ih=h-mg.t-mg.b;
    const max=nice(Math.max(...d.map(p=>p.v))*1.08);
    const x=i=>mg.l+iw*i/(n-1),y=v=>mg.t+ih*(1-v/max);
    const unit=LM==="m"?" sa":" soru";
    let g="";
    for(let k=0;k<=4;k++){const v=max*k/4,yy=y(v);g+=`<line class="lv-gl" x1="${mg.l}" x2="${w-mg.r}" y1="${yy}" y2="${yy}"/><text x="${mg.l-8}" y="${yy+4}" text-anchor="end">${fmt(v)}</text>`}
    const xl=d.map((p,i)=>`<text x="${x(i)}" y="${h-8}" text-anchor="${i===0?"start":i===n-1?"end":"middle"}">${p.label}</text>`).join("");
    const done=d.slice(0,n-1),avg=done.reduce((a,p)=>a+p.v,0)/done.length;
    const solid=done.map((p,i)=>(i?"L":"M")+x(i).toFixed(1)+" "+y(p.v).toFixed(1)).join(" ");
    const area=solid+` L${x(n-2).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;
    const last=`M${x(n-2).toFixed(1)} ${y(d[n-2].v).toFixed(1)} L${x(n-1).toFixed(1)} ${y(d[n-1].v).toFixed(1)}`;
    const pts=d.map((p,i)=>`<circle class="lv-hit" cx="${x(i)}" cy="${y(p.v)}" r="11"><title>${p.label}: ${fmt(p.v)}${unit}${i===n-1?" (gün sürüyor)":""}</title></circle>`).join("");
    return `<svg class="lv-svg ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Son 7 gün ${LM==="m"?"toplam çalışma süresi":"çözülen soru"} eğilimi">
      <defs><linearGradient id="lvg${cls}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="lv-s0"/><stop offset="1" class="lv-s1"/></linearGradient></defs>
      ${g}${xl}
      <line class="lv-avg" x1="${mg.l}" x2="${w-mg.r}" y1="${y(avg)}" y2="${y(avg)}"/>
      <path d="${area}" fill="url(#lvg${cls})"/><path class="lv-ln" d="${solid}"/><path class="lv-ln lv-dot" d="${last}"/>
      <circle class="lv-end" cx="${x(n-1)}" cy="${y(d[n-1].v)}" r="5.5"/>${pts}</svg>`;
  }

  function liveView(){
    const all=roster(),total=all.length;
    const bucket=k=>all.filter(x=>grp(x.st)===k).sort((a,b)=>secs(b.id)-secs(a.id));
    const study=all.filter(x=>x.st==="study").length;
    const work=all.filter(x=>x.m>0||x.q>0||x.st==="study"||x.st==="break").length;
    const qsum=all.reduce((a,x)=>a+x.q,0),qn=all.filter(x=>x.q>0).length;
    const sum=all.reduce((a,x)=>a+secs(x.id),0);
    const pips=COLS.flatMap(([k,,c])=>bucket(k).map(x=>`<i class="lv-${c}" title="${x.n}"></i>`)).join("");
    const Cc=2*Math.PI*26,off=Cc*(1-(total?work/total:0));
    const att=attention(all),fd=feed(all),d=series(all);
    const hasTrend=d.some(p=>p.v>0);
    const dateTxt=new Date().toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"});
    const back=typeof backBtn==="function"?backBtn("Geri","pi-back"):"";
    const done=d.slice(0,6),avg=done.reduce((a,p)=>a+p.v,0)/6;
    return `<section id="coach-live" class="coach-section lv">
      <div class="page-intro"><div class="pi-t">${back}<div><p>${esc(dateTxt)}</p><h1>Canlı pano</h1></div></div></div>
      <div class="lv-kpis">
        <article class="lv-kpi"><h3>Şu an derste</h3><div class="lv-big">${study}<small>/ ${total} öğrenci</small></div><div class="lv-pips" role="img" aria-label="Öğrencilerin durum dağılımı">${pips}</div></article>
        <article class="lv-kpi"><h3>Bugün toplam çalışma</h3><div class="lv-big lv-mono" data-lvtot="1">${hms(sum)}</div><p>Öğrenci başına ortalama ${total?Math.floor(sum/total/3600)+" sa "+pad(Math.floor(sum/total%3600/60))+" dk":"–"}</p></article>
        <article class="lv-kpi"><h3>Çözülen soru</h3><div class="lv-big">${qsum}</div><p>${qn} öğrenci soru sayısını girdi</p></article>
        <article class="lv-kpi"><h3>Bugün çalışan</h3><div class="lv-ringrow"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle class="lv-rb" cx="32" cy="32" r="26"/><circle class="lv-rf" cx="32" cy="32" r="26" stroke-dasharray="${Cc.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 32 32)"/></svg><div class="lv-big">${work}<small>/ ${total}</small></div></div></article>
      </div>
      <div class="lv-card"><div class="lv-head"><h2>Durum panosu</h2><p>Süreler saniye saniye akar. Karta basınca öğrencinin kaydı açılır.</p></div>
        <div class="lv-scroll" tabindex="0" aria-label="Durum panosu, yatay kaydırılabilir"><div class="lv-board">${COLS.map(([k,l,c])=>{const L=bucket(k);return `<section class="lv-col lv-${c}" aria-label="${l}"><div class="lv-chd"><span class="lv-dotc"></span><h3>${l}</h3><span class="lv-n">${L.length}</span></div><div class="lv-colb">${L.map(card).join("")||'<p class="lv-empty">Şu an kimse yok</p>'}</div></section>`}).join("")}</div></div></div>
      <div class="lv-lower">
        <div class="lv-card"><div class="lv-head"><h2>Son 7 gün</h2>
          <div class="lv-seg" role="group" aria-label="Ölçü"><button data-lvm="m" aria-pressed="${LM==="m"}">Çalışma süresi</button><button data-lvm="q" aria-pressed="${LM==="q"}">Çözülen soru</button></div></div>
          ${hasTrend?`<div class="lv-leg"><span><i></i>Tüm öğrenciler toplamı</span><span><i class="d"></i>Önceki 6 günün ortalaması</span><span>Birim: ${LM==="m"?"saat":"soru"}</span></div>${chart(d,640,236,"lv-wide")}${chart(d,340,220,"lv-narrow")}<p class="lv-sum">Tamamlanan 6 günde ortalama <b>${fmt(avg)} ${LM==="m"?"sa":"soru"}</b> / gün. Bugünün noktası gün bitmediği için noktalı gösterilir.</p>`:'<p class="lv-empty">Son 7 günde kayıt yok.</p>'}</div>
        <div class="lv-stack">
          <div class="lv-card"><div class="lv-head"><h2>Dikkat gerektirenler</h2></div>${att.length?`<ul class="lv-att">${att.map(a=>`<li><button data-i="${a.x.id}"><span class="lv-tag lv-${a.c}">${a.tag}</span><span><b>${a.x.n}</b><br><small>${esc(a.txt)}</small></span></button></li>`).join("")}</ul>`:'<p class="lv-empty">Şu an dikkat gerektiren öğrenci yok.</p>'}</div>
          <div class="lv-card"><div class="lv-head"><h2>Son hareketler</h2></div>${fd.length?`<ol class="lv-feed">${fd.map(f=>`<li><time>${esc(f.t)}</time><span><b>${f.n}</b> · ${f.m}</span></li>`).join("")}</ol>`:'<p class="lv-empty">Bugün henüz hareket yok.</p>'}</div>
        </div>
      </div></section>`;
  }

  // Yeni sekmeyi geçmişe (geri tuşu) tanıt. nav.js bu dosyadan sonra yüklendiği için tüm betikler hazır olunca yapılır.
  const reg=()=>{try{if(typeof CPL==="object"&&CPL&&!CPL.v)CPL.v="Canlı pano"}catch(e){}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",reg);else reg();

  coachView=function(){
    reg();
    try{
      if(isLive()&&!(typeof sel!=="undefined"&&sel)&&!(typeof MV!=="undefined"&&MV))return liveView();
    }catch(e){
      console.error("Canlı pano çizilemedi, genel bakışa dönüldü:",e);
      CPG="o";
    }
    return baseCoachView.apply(this,arguments);
  };

  sideNav=function(){
    const html=baseSideNav.apply(this,arguments);
    try{
      if(typeof sel!=="undefined"&&sel)return html;
      const on=CPG==="v"&&!(typeof MV!=="undefined"&&MV);
      const btn=`<button data-cp="v"${on?' aria-current="true"':""}>${sic("spark")}<span class="nav-label">Canlı pano</span></button>`;
      return html.includes('<button data-cp="t"')?html.replace('<button data-cp="t"',btn+'<button data-cp="t"'):html;
    }catch(e){return html}
  };

  ui=function(t){
    const D=t.dataset||{};
    if(D.lvm){LM=D.lvm==="q"?"q":"m";render();return true}
    return prevUi.apply(this,arguments);
  };

  // Saniye saniye akış: ekran yeniden çizilmez, yalnızca sayaç metinleri güncellenir.
  setInterval(()=>{
    if(document.hidden||!isLive())return;
    let tot=0;
    document.querySelectorAll("[data-lv]").forEach(el=>{const s=secs(el.dataset.lv);tot+=s;el.textContent=hms(s)});
    const T=document.querySelector("[data-lvtot]");
    if(T&&T.dataset.lvtot&&document.querySelectorAll("[data-lv]").length)T.textContent=hms(ROWS&&typeof STU!=="undefined"?STU.reduce((a,p)=>a+secs(p.id),0):tot);
  },1000);
})();
