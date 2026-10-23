/* koç: CSV yedek ve toplu görev */
const csvCell=v=>{let s=v==null?"":String(v);if(typeof v==="string"&&/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
function csvDl(name,rows){
  const t="﻿"+rows.map(r=>r.map(csvCell).join(";")).join("\r\n"),a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([t],{type:"text/csv;charset=utf-8"}));a.download=name+"-"+day()+".csv";
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
}
async function pageAll(mk){let out=[],from=0;for(;;){const {data,error}=await mk().range(from,from+999);if(error)throw error;out=out.concat(data||[]);if(!data||data.length<1000)break;from+=1000}return out}
async function csvExport(kind){
  const msg=m=>{const e=document.getElementById("csvmsg");if(e)e.textContent=m},nm=id=>(STU.find(p=>p.id===id)||{}).name||id;
  msg("Hazırlanıyor…");
  try{
    if(kind==="daily"){const r=await pageAll(()=>sb.from("daily").select("student_id,day,snap").order("day").order("student_id"));
      csvDl("gunluk-calisma",[["Öğrenci","Gün","Net dk","Soru","Doğru","Boş","Program","Ruh hali","Uyku","Dikkat dağınıklığı","Enerji","Stres","Aktif yöntem %"],...r.map(x=>{const s=x.snap||{};return[nm(x.student_id),x.day,s.m,s.q,s.c,s.b,s.prog,s.mood,s.sleep,s.dist,s.en,s.str,s.act]})]);msg(r.length+" satır indirildi.")}
    if(kind==="exam"){const r=await pageAll(()=>sb.from("exam_results").select("student_id,exam_name,exam_date,exam_type,total_net,score,rank").order("exam_date").order("student_id"));
      csvDl("denemeler",[["Öğrenci","Deneme","Tarih","Tür","Toplam net","Puan","Sıralama"],...r.map(x=>[nm(x.student_id),x.exam_name,x.exam_date,x.exam_type,x.total_net,x.score,x.rank])]);msg(r.length+" satır indirildi.")}
    if(kind==="task"){const r=await pageAll(()=>sb.from("weekly_tasks").select("student_id,task_date,subject,title,amount,done,source").order("task_date").order("student_id"));
      csvDl("gorevler",[["Öğrenci","Tarih","Ders","Görev","Miktar","Yapıldı","Kaynak"],...r.map(x=>[nm(x.student_id),x.task_date,x.subject,x.title,x.amount,x.done?"evet":"hayır",x.source])]);msg(r.length+" satır indirildi.")}
  }catch(e){msg("İndirilemedi: "+(e&&e.message||"bağlantı hatası"))}
}
function backupCard(){
  return `<details class="card"><summary style="cursor:pointer;font-weight:700">💾 Yedek / dışa aktar (CSV)</summary><div class="row"><button class="chip" data-csv="daily">Günlük çalışma</button><button class="chip" data-csv="exam">Denemeler</button><button class="chip" data-csv="task">Görevler</button></div><p class="empty" id="csvmsg" style="font-size:13px;margin:6px 0 0">Excel'de açılır. Bir öğrenciyi silmeden önce yedek almanı öneririm.</p></details>`;
}
let BULKMSG="";
function bulkCard(){
  return `<details class="card"${BULKMSG?" open":""}><summary style="cursor:pointer;font-weight:700">📣 Toplu görev ata</summary><div class="row"><label>Tarih<input id="bkd" type="date" value="${day()}" style="width:150px"></label><label>Ders<select id="bks"><option value="">Ders</option>${SUBJ.map(s=>`<option>${s}</option>`).join("")}</select></label><label>Görev<input id="bkt" type="text" maxlength="120" style="width:180px"></label><label>Miktar<input id="bka" type="text" maxlength="60" style="width:90px"></label><button class="btn" style="padding:11px 16px" id="bkadd">Herkese ata</button></div><p class="empty" style="font-size:13px;margin:6px 0 0">${BULKMSG?esc(BULKMSG):"Aynı görev tüm öğrencilere eklenir."}</p></details>`;
}
async function bulkAdd(){
  const g=i=>document.getElementById(i).value,title=g("bkt").trim().slice(0,120);
  if(!title||!STU.length)return;
  if(!confirm(STU.length+" öğrenciye bu görev atansın mı?"))return;
  const rows=STU.map(s=>({student_id:s.id,task_date:g("bkd")||day(),title,subject:g("bks")||null,amount:g("bka").trim().slice(0,60)||null,source:"coach",created_by:ME}));
  const r=await dbw(sb.from("weekly_tasks").insert(rows));
  BULKMSG=r&&r.error?"Atanamadı: "+r.error.message:rows.length+" öğrenciye atandı: "+title;
  try{await pullCoach()}catch(e){}render();
}
let sel=null;
function coachView(){
  if(sel)return detailView();
  const all=roster();
  const c=k=>all.filter(x=>k.includes(x.st)).length;
  const order={study:0,break:1,awake:2,stopped:3,closed:4,idle:5};
  all.sort((a,b)=>order[a.st]-order[b.st]);
  const avg=all.length?Math.round(all.reduce((a,x)=>a+x.m,0)/all.length):0;
  return `<section id="coach-overview" class="coach-section"><div class="sum">
  <div class="stat"><b>${c(["study"])}</b><span>çalışıyor</span></div><div class="stat"><b>${c(["break"])}</b><span>molada</span></div>
  <div class="stat"><b>${c(["idle"])}</b><span>başlamadı</span></div><div class="stat"><b>${c(["closed"])}</b><span>günü kapattı</span></div></div>
  <div class="card"><div class="eyebrow">CANLI SINIF ÖZETİ</div><h2>Grup performansı</h2><p class="empty" style="margin:0">${Math.floor(avg/60)} sa ${avg%60} dk ortalama net çalışma · ${all.reduce((a,x)=>a+x.q,0)} soru · ${all.filter(x=>flags(x.hist).length).length} öğrencide uyarı</p></div></section>
  <section id="coach-students" class="coach-section"><div class="section-heading"><div><div class="eyebrow">ÖĞRENCİ TAKİBİ</div><h2>Öğrenciler</h2></div><span class="count-pill">${all.length} kayıt</span></div>
  ${classCard()}<div class="grid">${all.map(x=>`<button class="s${x.live?" live":""}" data-i="${x.id}"><div class="h">${mav(x.id)}<span class="dot ${DOT[x.st]}"></span>${x.n}${flags(x.hist).length?" 🚩":""}</div><div class="sp">${LBL[x.st]}</div>
  <div class="n"><span>${Math.floor(x.m/60)} sa ${x.m%60} dk</span><span>${x.q} soru</span></div><div class="bar"><i style="width:${Math.round(x.p*100)}%"></i></div></button>`).join("")}</div></section>
  <section id="coach-tasks" class="coach-section"><div class="section-heading"><div><div class="eyebrow">PLANLAMA</div><h2>Görev yönetimi</h2></div></div>${bulkCard()}${chCoachCard()}</section>
  <section id="coach-tools" class="coach-section"><div class="section-heading"><div><div class="eyebrow">YÖNETİM</div><h2>Koç araçları</h2></div></div>${addStudentCard()}${backupCard()}${thCard()}</section>`;
}
let selDay=null,per="hw";const HIST={},DSTATE={};
const PER=[["hw","Bu hafta"],["lw","Geçen hafta"],["tm","Bu ay"],["lm","Geçen ay"]];
const fd=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("tr-TR",{weekday:"short",day:"numeric",month:"short"})};
const hmin=m=>Math.floor(m/60)+" sa "+(m%60)+" dk";
async function loadHist(id){try{const {data,error}=await sb.from("daily").select("day,snap").eq("student_id",id).gte("day",dayN(-130)).order("day");if(error)throw error;HIST[id]=Object.fromEntries((data||[]).map(r=>[r.day,r.snap||{}]))}catch(e){HIST[id]=HIST[id]||{}}}
async function loadDay(id,d){try{const {data}=await sb.from("daily").select("state,snap").eq("student_id",id).eq("day",d).maybeSingle();DSTATE[id+"|"+d]=data||{state:{},snap:{}}}catch(e){DSTATE[id+"|"+d]={state:{},snap:{}}}}
function range(p){
  const t=new Date();t.setHours(0,0,0,0);
  const mon=d=>{const c=new Date(d);c.setDate(c.getDate()-(c.getDay()+6)%7);return c};
  let a,b;
  if(p==="hw"){a=mon(t);b=t}
  else if(p==="lw"){a=mon(t);a.setDate(a.getDate()-7);b=new Date(a);b.setDate(b.getDate()+6)}
  else if(p==="tm"){a=new Date(t.getFullYear(),t.getMonth(),1);b=t}
  else{a=new Date(t.getFullYear(),t.getMonth()-1,1);b=new Date(t.getFullYear(),t.getMonth(),0)}
  const o=[];for(let d=new Date(a);d<=b;d.setDate(d.getDate()+1))o.push(ymd(d));return o;
}
function pastX(p,row){
  const s=row.state||{},sn=row.snap||{},qs=(s.qs||[]).map(q=>({s:String(q.s),n:num(q.n),c:num(q.c),b:num(q.b),k:q.k?String(q.k):""}));
  return {id:p.id,n:esc(p.name),st:LBL[s.status]?s.status:"idle",m:Math.round(sn.m!=null?num(sn.m):num(s.done)/60000),q:qs.reduce((a,q)=>a+q.n,0),p:s.prog?1:0,L:(s.log||[]).map(l=>({t:hm(num(l.t)),m:esc(l.m)})),qs,mood:num(s.mood)};
}
function histCard(id,X){
  const h=HIST[id];
  if(!h)return `<div class="card"><h2>Geçmiş</h2><p class="empty">Yükleniyor…</p></div>`;
  const t=day(),days=range(per).filter(d=>d<=t);
  const R=days.map(d=>{const s=d===t?{m:X.m,q:X.q,c:X.qs.reduce((a,q)=>a+q.c,0),prog:X.p>=1?1:0,mood:X.mood,sleep:X.sleep}:(h[d]||{});return {d,has:d===t||!!h[d],m:num(s.m),q:num(s.q),c:s.c==null?null:num(s.c),prog:num(s.prog),mood:num(s.mood),sleep:num(s.sleep)}});
  const sum=k=>R.reduce((a,r)=>a+r[k],0),tm=sum("m"),tq=sum("q"),worked=R.filter(r=>r.m>0).length;
  const ca=R.filter(r=>r.c!=null),cq=ca.reduce((a,r)=>a+r.q,0),acc=cq?Math.round(ca.reduce((a,r)=>a+r.c,0)/cq*100):null;
  const av=k=>{const v=R.filter(r=>r[k]>0);return v.length?(v.reduce((a,r)=>a+r[k],0)/v.length).toFixed(1):"–"};
  const mx=Math.max(1,...R.map(r=>r.m)),week={};
  if(per==="tm"||per==="lm")R.forEach(r=>{const[y,m,d]=r.d.split("-").map(Number),dt=new Date(y,m-1,d);dt.setDate(dt.getDate()-(dt.getDay()+6)%7);const k=ymd(dt);(week[k]=week[k]||{m:0,q:0}).m+=r.m;week[k].q+=r.q});
  const chips=PER.map(([k,l])=>`<button class="chip" data-per="${k}" aria-pressed="${k===per}">${l}</button>`).join("");
  const dchips=[0,-1,-2,-3,-4,-5,-6].map(n=>{const d=dayN(n);return `<button class="chip" data-d="${d}" aria-pressed="${(selDay||t)===d}">${n===0?"Bugün":n===-1?"Dün":fd(d)}</button>`}).join("");
  const st=(b,s)=>`<div class="stat"><b>${b}</b><span>${s}</span></div>`;
  return `<div class="card"><h2>Geçmiş günler</h2><div class="chips">${dchips}</div></div>
  <div class="card"><h2>Haftalık ve aylık performans</h2><div class="chips">${chips}</div>
  <div class="stats" style="margin-top:12px">${st(hmin(tm),"toplam süre")}${st(hmin(Math.round(tm/Math.max(1,R.length))),"günlük ortalama")}${st(tq,"çözülen soru")}</div>
  <div class="stats">${st(worked+" / "+R.length,"çalışılan gün")}${st(sum("prog")+" / "+R.length,"program bitti")}${st(acc==null?"–":"%"+acc,"doğruluk")}</div>
  <div style="display:flex;gap:3px;align-items:end;height:60px">${R.map(r=>`<div title="${fd(r.d)}: ${r.m} dk" style="flex:1;background:var(--gold);border-radius:3px 3px 0 0;height:${Math.max(3,Math.round(r.m/mx*100))}%"></div>`).join("")}</div>
  <p class="empty" style="font-size:13px;margin:6px 0 10px">Ortalama uyku ${av("sleep")} sa · gün puanı ${av("mood")} / 5</p>
  ${Object.keys(week).sort().map(k=>`<div class="subj"><span>Hafta: ${fd(k)}</span><span>${hmin(week[k].m)} · ${week[k].q} soru</span></div>`).join("")}
  ${R.length?R.slice().reverse().map(r=>`<button class="rb" data-d="${r.d}"><span>${fd(r.d)}</span><span>${r.has?hmin(r.m)+" · "+r.q+" soru"+(r.prog?" · ✓":""):"kayıt yok"}</span></button>`).join(""):`<p class="empty">Bu dönemde gün yok.</p>`}</div>`;
}
let KTC={};
function ktCoachCard(id){
  if(!(id in KTC)){KTC[id]=null;Promise.resolve(sb.from("topic_progress").select("done").eq("student_id",id).maybeSingle()).then(r=>{KTC[id]=new Set(r&&r.data&&Array.isArray(r.data.done)?r.data.done:[]);if(sel===id)render()},()=>{KTC[id]=new Set()})}
  const D=KTC[id];if(!D)return `<div class="card"><h2>Konu takibi</h2><p class="empty">Yükleniyor…</p></div>`;
  const blk=ex=>{let T=0,N=0;const rows=KT[ex].map((d,di)=>{const m=d.t.length;let n=0;d.t.forEach((_,ti)=>{if(D.has(ktId(ex,di,ti)))n++});T+=m;N+=n;const p=Math.round(n*100/m);return `<div class="ktc"><b>${esc(d.n)}</b><span class="ktpr"><i style="width:${p}%"></i></span><em>%${p}</em></div>`}).join("");return `<div class="subj"><span><b>${ex}</b></span><span>${N}/${T} konu · %${T?Math.round(N*100/T):0}</span></div>${rows}`};
  return tekrarCard(id,D)+`<div class="card"><h2>Konu takibi</h2>${D.size?"":`<p class="empty" style="margin:0 0 6px">Öğrenci henüz konu işaretlememiş.</p>`}${blk("TYT")}<div style="height:10px"></div>${blk("AYT")}</div>`;
}
function detailView(){
  const pr=STU.find(r=>r.id===sel);if(!pr){sel=null;return coachView()}
  const past=selDay&&selDay!==day();let x;
  if(past){const ds=DSTATE[sel+"|"+selDay];if(!ds)return `<button class="back" id="backhist">← Geçmişe dön</button><p class="empty">Yükleniyor…</p>`;x=pastX(pr,ds)}else x=roster().find(r=>r.id===sel);
  if(!x){sel=null;return coachView()}
  const sn=x.qs.reduce((a,q)=>a+q.n,0),sc=x.qs.reduce((a,q)=>a+q.c,0),acc=sn?Math.round(sc/sn*100):0;
  const by={};x.qs.forEach(q=>{by[q.s]=by[q.s]||{n:0,c:0,b:0,k:[]};by[q.s].n+=q.n;by[q.s].c+=q.c;by[q.s].b+=q.b||0;if(q.k)by[q.s].k.push(q.k)});
  const head=past?`<button class="back" id="backhist">← Geçmişe dön</button><div class="card" style="border-color:var(--gold)"><b>📅 ${fd(selDay)}</b> · geçmiş gün</div>`:`<button class="back" id="back">← Tüm öğrenciler</button>`;
  return `${head}
  <section class="hero"><div class="st"><span class="dot ${DOT[x.st]}"></span>${LBL[x.st]}</div>
  <div class="big" style="font-size:34px;display:flex;align-items:center;gap:12px">${mav(x.id)}<span>${x.n}</span></div>
  <div class="sub">Net çalışma: ${Math.floor(x.m/60)} sa ${x.m%60} dk</div></section>
  <div class="stats"><div class="stat"><b>${sn}</b><span>çözülen soru</span></div><div class="stat"><b>${sn?"%"+acc:"–"}</b><span>doğruluk</span></div><div class="stat"><b>${x.p>=1?"✓":"–"}</b><span>program</span></div></div>
  <div class="dcols">${past?"":`<div id="detail-history">${histCard(x.id,x)}</div>`+ktCoachCard(x.id)+(past?"":`${aiCard(x.id)+goalRoad(x.id)+netChartsCard(x.id)}`+targetForm(x.id,false))}<div class="card"><h2>Derslere göre sorular</h2>${Object.keys(by).length?Object.entries(by).map(([k,v])=>`<div class="subj"><span>${esc(k)}${v.k.length?" ("+esc(v.k.join(", "))+")":""}</span><span>${v.n} soru · ${v.c} doğru${v.b?" · "+v.b+" boş":""}</span></div>`).join(""):`<p class="empty">Henüz soru girişi yok.</p>`}</div>
  ${x.mood?`<div class="card"><h2>Gün puanı</h2><p class="empty" style="margin:0">${x.mood} / 5</p></div>`:""}
  ${past?"":`<div id="detail-tasks">${trendCard(x)+coachCards(x,sn)+weekGrid(x)+planUploadCard(x)+taskCard(x)}</div>`+`<details class="card fold"><summary>⚙️ Diğer işlemler (deneme ekle, veli özeti, hesap)</summary>${denemeCard(x)+reportCard(x)+parentCard(x)+adminCard(x)}</details>`}<div class="card"><h2>Günün akışı</h2>${x.L.length?`<ul class="tl">${x.L.slice().reverse().map(l=>`<li><time>${l.t}</time>${l.m}</li>`).join("")}</ul>`:`<p class="empty">${past?"Bu güne ait hareket kaydı yok.":"Bugün henüz bir hareket yok."}</p>`}</div></div>`;
}
function render(){
    phEnsure();
    const app=document.getElementById("app");
    if(view==="s")app.innerHTML=studentView();
    else{
      const nav=sel?`<nav class="side-nav coach-side" aria-label="Koç menüsü"><div class="side-brand"><span class="brand-mark">K</span><div><b>KARAKIŞ</b><small>KOÇ PANELİ</small></div></div><div class="side-label">ÖĞRENCİ ÇALIŞMA ALANI</div><button data-backnav="1"><span>👥</span><span class="nav-label">Öğrenci listesi</span></button><button data-cnav="detail-history"><span>📈</span><span class="nav-label">Günlük performans</span></button><button data-cnav="detail-target"><span>🎯</span><span class="nav-label">Hedef analizi</span></button><button data-cnav="detail-tasks"><span>✅</span><span class="nav-label">Görev planı</span></button><div class="side-foot"><span class="side-avatar">K</span><div><b>${esc(NAME||"Koç")}</b><small>Koç paneli</small></div></div></nav>`: `<nav class="side-nav coach-side" aria-label="Koç menüsü"><div class="side-brand"><span class="brand-mark">K</span><div><b>KARAKIŞ</b><small>KOÇ PANELİ</small></div></div><div class="side-label">YÖNETİM</div><button data-cnav="coach-overview" aria-current="true"><span>⌂</span><span class="nav-label">Genel bakış</span></button><button data-cnav="coach-students"><span>👥</span><span class="nav-label">Öğrenciler</span></button><button data-cnav="coach-tasks"><span>✓</span><span class="nav-label">Görev yönetimi</span></button><button data-cnav="coach-tools"><span>⚙</span><span class="nav-label">Koç araçları</span></button><div class="side-foot"><span class="side-avatar">K</span><div><b>${esc(NAME||"Koç")}</b><small>Eğitim koçluğu</small></div></div></nav>`;
      app.innerHTML=`<div class="dashboard-shell">${nav}<div class="dashboard-main">${coachView()}</div></div>`;
    }
    const c=document.getElementById("chat");if(c)c.scrollTop=c.scrollHeight;
}
document.addEventListener("change",e=>{if(e.target.id==="phfile"){const f=e.target.files&&e.target.files[0];e.target.value="";phSet(f);return}if(e.target.id==="hd"){S.hard=e.target.value.slice(0,60);save()}
  const id=e.target.id,v=e.target.value;
  if(id==="taq"){TA.q=v.slice(0,300);return}
  if(id==="tcrank"||id==="tcpt"||id==="tcq"||id==="tcil"||id==="tctur"){
    if(id==="tcrank"){const n=parseFloat(String(v).replace(",","."));TC.rank=n>=100&&n<=560?String(n):""}if(id==="tcpt")TC.pt=v;if(id==="tcq")TC.q=v.slice(0,60);if(id==="tcil")TC.il=v;if(id==="tctur")TC.tur=v;
    TC.lim=40;const o=tcLoadList();o.rank=TC.rank;o.pt=TC.pt;tcSave(o);render();
  }
});
