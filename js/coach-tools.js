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
let sel=null,STQ="";
function coachView(){
  if(MV&&!sel)return msgView();
  if(sel)return detailView();
  const all=roster();
  const c=k=>all.filter(x=>k.includes(x.st)).length;
  const order={study:0,break:1,awake:2,stopped:3,closed:4,idle:5};
  all.sort((a,b)=>order[a.st]-order[b.st]);
  const avg=all.length?Math.round(all.reduce((a,x)=>a+x.m,0)/all.length):0;
  const od=ODN!=null?ODN:all.reduce((a,x)=>a+overdue(x.id).length,0),warn=all.filter(x=>flags(x.hist).length).length,work=c(["study","break"]);
  const dt=new Date().toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"});
  const grid=L=>`<div class="grid">${L.map(x=>{const pc=Math.round(x.p*100),col=x.st==="study"||x.st==="closed"?"":x.st==="break"?" w":"";return `<button class="s ocard${x.live?" live":""}" data-i="${x.id}"><span class="oav${col}">${PH[x.id]?`<img src="${PH[x.id]}" alt="">`:esc(initials(x.n))}<i class="dot ${DOT[x.st]}"></i></span><span class="oin"><b>${x.n}${flags(x.hist).length?" 🚩":""}</b><small>${LBL[x.st]} · ${Math.floor(x.m/60)} sa ${x.m%60} dk · ${x.q} soru</small><span class="kbar"><i style="width:${pc}%"></i></span></span><span class="opc">%${pc}</span></button>`}).join("")}</div>`;
  // Alt sayfalarda başlığın solunda geri düğmesi (telefonda menü kapalıyken de dönülebilsin)
  const hd=(t,sub,cta)=>`<div class="page-intro"><div class="pi-t">${CPG!=="o"?backBtn("Geri","pi-back"):""}<div><p>${sub}</p><h1>${t}</h1></div></div>${cta||""}</div>`;
  const rp=RPMODE?`<div class="rpban"><b>Rapor için bir öğrenci seç</b><button id="rpx">Vazgeç</button></div>`:"";
  if(CPG==="s"){const q=STQ.trim().toLocaleLowerCase("tr"),L=q?all.filter(x=>x.n.toLocaleLowerCase("tr").includes(q)):all;
    return `<section id="coach-students" class="coach-section">${hd("Öğrenciler",all.length+" kayıt")}${rp}<div class="stu-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="stq" type="search" placeholder="Öğrenci ara…" aria-label="Öğrenci ara" autocomplete="off" value="${esc(STQ)}"></div>${L.length?grid(L):`<p class="empty">“${esc(STQ)}” ile eşleşen öğrenci yok.</p>`}</section>`}
  if(CPG==="t")return `<section id="coach-tasks" class="coach-section">${hd("Görev yönetimi","Bildirimler, planlama ve toplu işlemler")}${notifCard()}${bulkCard()}${chOverCard()}</section>`;
  if(CPG==="c")return `<section id="coach-challenges" class="coach-section">${hd("Yarışmalar","Oluştur, duyur; sıralamayı ve sohbeti izle")}${chCoachCard(true)}</section>`;
  if(CPG==="p")return `<section id="coach-plan" class="coach-section">${hd("Program ver","Öğrenciye haftalık plan PDF'i yükle")}${planPickCard(all)}</section>`;
  if(CPG==="a")return `<section id="coach-class" class="coach-section">${hd("Deneme analizi","Sınıfın ortak zayıf konuları")}${classCard()}</section>`;
  if(CPG==="y")return `<section id="coach-tools" class="coach-section">${hd("Ayarlar","Otomatik mesajlar, öğrenci ekleme, yedek ve eşikler")}${autoCard()}${addStudentCard()}${backupCard()}${thCard()}</section>`;
  const top=all.slice(0,6),nd=notifData(),odIds=nd.od.map(o=>o[0]),flIds=nd.fl.map(o=>o.id);
  return `<section id="coach-overview" class="coach-section">${hd("Genel bakış",esc(dt),`<button class="cta" data-cp="p"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Program ver</button>`)}<div class="kst">
  <div class="kc"><span>Bugün çalışan</span><b>${work}<em> / ${all.length}</em></b><div class="kbar"><i style="width:${all.length?Math.round(work/all.length*100):0}%"></i></div></div>
  <div class="kc"><span>Ortalama net süre</span><b>${Math.floor(avg/60)}<em> sa </em>${avg%60}<em> dk</em></b><small>${all.reduce((a,x)=>a+x.q,0)} soru çözüldü</small></div>
  <button class="kc" data-cp="t"><span>Geciken görev</span><b>${od}</b><small class="${od?"w":""}">${od?(odIds.length?esc(nameList(odIds))+" · listeyi aç ›":"Tamamlanmayı bekliyor"):"Hepsi güncel"}</small></button>
  <button class="kc" data-msgnav="1"><span>Okunmamış mesaj</span><b>${unrTotal()}</b><small class="${unrTotal()?"w":""}">${unrTotal()?"En yeni: "+(MNEWID?esc(stuNm(MNEWID))+" · ":"")+ago(MNEW):"Hepsi okundu"}</small></button>
  <button class="kc" data-cp="t"><span>Dikkat gereken</span><b>${warn}</b><small class="${warn?"w":""}">${warn?esc(nameList(flIds))+" · nedenini gör ›":"uyarı yok"}</small></button></div>
  ${chOverCard()}<div class="section-heading"><div><h2>Öğrencilerim</h2></div>${all.length>6?`<button class="link" data-cp="s">Tümünü gör (${all.length})</button>`:""}</div>${rp}${grid(top)}</section>`;
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
let DTAB="o";
function detTabs(){return `<div class="ktseg dtseg" role="tablist">${[["o","Özet"],["a","Analiz"],["g","Görevler"],["d","Diğer"]].map(([k,n])=>`<button data-dt="${k}" aria-pressed="${DTAB===k}">${n}</button>`).join("")}</div>`}
function detailView(){
  const pr=STU.find(r=>r.id===sel);if(!pr){sel=null;return coachView()}
  const past=selDay&&selDay!==day();let x;
  // Üstte yapışkan çubuk: geri, öğrenci adı, mesaj, yenile ve sekmeler sayfa kaydırılınca da görünür kalır.
  const ttl=`${stuAv(pr.id,"tb-av")}<b>${esc(pr.name)}</b>`;
  if(past){const ds=DSTATE[sel+"|"+selDay];if(!ds)return topBar(ttl,"📅 "+fd(selDay)+" · yükleniyor…")+`<p class="empty">Yükleniyor…</p>`;x=pastX(pr,ds)}else x=roster().find(r=>r.id===sel);
  if(!x){sel=null;return coachView()}
  const sn=x.qs.reduce((a,q)=>a+q.n,0),sc=x.qs.reduce((a,q)=>a+q.c,0),acc=sn?Math.round(sc/sn*100):0;
  const by={};x.qs.forEach(q=>{by[q.s]=by[q.s]||{n:0,c:0,b:0,k:[]};by[q.s].n+=q.n;by[q.s].c+=q.c;by[q.s].b+=q.b||0;if(q.k)by[q.s].k.push(q.k)});
  const mb=`<button class="tb-ic" data-nmsg="${x.id}" aria-label="${esc(pr.name)} ile mesajlaş" title="Mesaj yaz">💬${MU[x.id]?`<i>${MU[x.id]}</i>`:""}</button>`;
  const head=past?topBar(ttl,"📅 "+fd(selDay)+" · geçmiş gün",refreshBtn()):topBar(ttl,`<span class="dot ${DOT[x.st]}"></span>${LBL[x.st]}`,mb+refreshBtn(),detTabs());
  if(PLV===sel&&!past)return planPage(x);
  return `${head}
  <section class="hero"><div class="st"><span class="dot ${DOT[x.st]}"></span>${LBL[x.st]}</div>
  <div class="big" style="font-size:34px;display:flex;align-items:center;gap:12px">${mav(x.id)}<span>${x.n}</span></div>
  <div class="sub">Net çalışma: ${Math.floor(x.m/60)} sa ${x.m%60} dk</div></section>
  <div class="stats"><div class="stat"><b>${sn}</b><span>çözülen soru</span></div><div class="stat"><b>${sn?"%"+acc:"–"}</b><span>doğruluk</span></div><div class="stat"><b>${x.p>=1?"✓":"–"}</b><span>program</span></div></div>
  <div class="dcols">${past||DTAB==="o"?`<div id="detail-history">${past?"":histCard(x.id,x)}</div>`:""}
  ${past||DTAB==="o"?`<div class="card"><h2>Derslere göre sorular</h2>${Object.keys(by).length?Object.entries(by).map(([k,v])=>`<div class="subj"><span>${esc(k)}${v.k.length?" ("+esc(v.k.join(", "))+")":""}</span><span>${v.n} soru · ${v.c} doğru${v.b?" · "+v.b+" boş":""}</span></div>`).join(""):`<p class="empty">Henüz soru girişi yok.</p>`}</div>
  ${x.mood?`<div class="card"><h2>Gün puanı</h2><p class="empty" style="margin:0">${x.mood} / 5</p></div>`:""}`:""}
  ${!past&&DTAB==="a"?`<div id="detail-target">${aiCard(x.id)+goalRoad(x.id)+netChartsCard(x.id)+trendCard(x)+coachCards(x,sn)+ktCoachCard(x.id)+targetForm(x.id,false)}</div>`:""}
  ${!past&&DTAB==="g"?`<div id="detail-tasks">${weekGrid(x)+taskCard(x)+planUploadCard(x)}</div>`:""}
  ${!past&&DTAB==="d"?`${denemeCard(x)+reportCard(x)+parentCard(x)+contactCard(x)+adminCard(x)}`:""}
  ${past||DTAB==="o"?`<div class="card"><h2>Günün akışı</h2>${!past&&x.rbk?`<p class="empty" style="color:var(--warn);margin:0 0 8px;font-size:14px">⚠️ Öğrenci bugün günü sıfırladı (saat ${hm(x.rbk.t)}). Önceki kayıt (${esc(x.rbk.txt)}) saklı; öğrenci ana sayfadaki “Geri getir” ile geri alabilir.</p>`:""}${x.L.length?`<ul class="tl">${x.L.slice().reverse().map(l=>`<li><time>${l.t}</time>${l.m}</li>`).join("")}</ul>`:`<p class="empty">${past?"Bu güne ait hareket kaydı yok.":"Bugün henüz bir hareket yok."}</p>`}</div>`:""}</div>`;
}
const SIC={
 home:'<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.5 3.5 5.2"/>',
 task:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8.5 9 1.5 1.5L13 7.5M8.5 15l1.5 1.5L13 13.5M15.5 9.5H17M15.5 15.5H17"/>',
 bars:'<path d="M3 20h18M6 16V9M11 16V5M16 16v-5M21 16V8"/>',
 cal:'<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.7a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.7a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"/>',
 chat:'<path d="M4 5h16v11H9l-5 4V5Z"/>',
 bell:'<path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 spark:'<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
 back:'<path d="M15 5 8 12l7 7"/>',
 trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a2.5 2.5 0 0 0 3 4M16 6h3a2.5 2.5 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>'
};
const sic=n=>`<span><svg viewBox="0 0 24 24" aria-hidden="true">${SIC[n]}</svg></span>`;
const initials=n=>String(n||"K").trim().split(/\s+/).map(w=>w[0]||"").slice(0,2).join("").toUpperCase()||"K";
let RPMODE=false,CPG="o",NOTN=0;
function sideNav(){
  const all=roster(),od=ODN!=null?ODN:all.reduce((a,x)=>a+overdue(x.id).length,0),nn=NOTN=notifData().n;
  const top=`<div class="side-top"><div class="side-brand" data-gohome="1" style="cursor:pointer"><span class="brand-mark">K</span><div><b>KARAKIŞ <em>TAKİP</em></b><small>Koç paneli</small></div></div><button class="side-bell" data-cp="t" aria-label="Bildirimler${nn?" ("+nn+" öğrenci)":""}" title="Bildirimler">${sic("bell").replace("<span>","").replace("</span>","")}${nn?'<i></i>':""}</button></div>`;
  const foot=`<div class="side-rep"><b>${sic("spark").replace("<span>","").replace("</span>","")} Haftalık rapor</b><span>Öğrencilerin için yapay zekâ özeti ve veli mesajı taslağı hazırla.</span><button id="rpgo">Raporu hazırla</button></div><div class="side-acts"><button data-nrf="1">↻ Yenile</button><button data-proxy="theme">Tema</button><button data-proxy="out">Çıkış</button></div><div class="side-foot" data-gohome="1" style="cursor:pointer"><span class="side-avatar">${esc(initials(NAME))}</span><div><b>${esc(NAME||"Koç")}</b><small>Koç</small></div><button id="sbmini" class="side-mini" aria-label="Menüyü daralt"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg></button></div>`;
  const b=(ic,l,attr,extra="",on=false)=>`<button ${attr}${on?' aria-current="true"':""}>${sic(ic)}<span class="nav-label">${l}</span>${extra}</button>`;
  if(sel)return `<nav class="side-nav coach-side" aria-label="Koç menüsü">${top}<div class="side-label">${esc(stuNm(sel).toLocaleUpperCase("tr"))}</div>${b("back",'<span class="nbl" data-def="Öğrenci listesi">Öğrenci listesi</span>','data-navback="1"')}${b("home","Özet",'data-dt="o"',"",DTAB==="o"&&!PLV)}${b("bars","Analiz",'data-dt="a"',"",DTAB==="a"&&!PLV)}${b("task","Görevler",'data-dt="g"',"",DTAB==="g"&&!PLV)}${b("cal","Program ver",'data-plopen="1"',"",!!PLV)}${b("list","Diğer",'data-dt="d"',"",DTAB==="d"&&!PLV)}${b("chat","Mesaj yaz",'data-nmsg="'+sel+'"',MU[sel]?`<span class="bd">${MU[sel]}</span>`:"")}${foot}</nav>`;
  return `<nav class="side-nav coach-side" aria-label="Koç menüsü">${top}<div class="side-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="sbq" type="search" placeholder="Öğrenci ara…" aria-label="Öğrenci ara" autocomplete="off"></div><div class="side-label">ANA MENÜ</div>${b("home","Genel bakış",'data-cp="o"',"",CPG==="o"&&!MV)}${b("users","Öğrenciler",'data-cp="s"',`<span class="bd">${all.length}</span>`,CPG==="s"&&!MV)}${b("task","Görev yönetimi",'data-cp="t"',od?`<span class="bd warn">${od}</span>`:"",CPG==="t"&&!MV)}${b("trophy","Yarışmalar",'data-cp="c"',CH.list.some(chActive)?'<span class="bd">aktif</span>':"",CPG==="c"&&!MV)}${b("bars","Deneme analizi",'data-cp="a"',"",CPG==="a"&&!MV)}${b("chat","Mesajlar",'data-msgnav="1"',unrTotal()?`<span class="bd">${unrTotal()}</span>`:"",MV)}<div class="side-label">AYARLAR</div>${b("cal","Program ver",'data-cp="p"',"",CPG==="p"&&!MV)}${b("gear","Ayarlar",'data-cp="y"',"",CPG==="y"&&!MV)}${foot}</nav>`;
}
function render(){
    phEnsure();
    const app=document.getElementById("app");
    // Mesaj akışının kaydırma yeri korunur (sonda ise yeni mesaja iner, eskileri okuyorsa yerinde kalır).
    const t0=document.getElementById("mth"),keep=t0?{end:t0.scrollHeight-t0.scrollTop-t0.clientHeight<90,top:t0.scrollTop,id:ROLE==="coach"?MSEL:ME}:null;
    if(view==="s")app.innerHTML=studentView();
    else{
      const nav=sideNav();
      app.innerHTML=`<div class="dashboard-shell"><button class="sbtog" id="sbtog" aria-label="Menüyü aç${NOTN?", "+NOTN+" bildirim":""}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>${NOTN?'<i class="sbdot"></i>':""}</button><button class="sbov" id="sbov" aria-label="Menüyü kapat"></button>${nav}<div class="dashboard-main">${coachView()}</div></div>`;
    }
    const c=document.getElementById("chat");if(c)c.scrollTop=c.scrollHeight;
    const t1=document.getElementById("mth");if(t1)t1.scrollTop=keep&&!keep.end&&keep.id===(ROLE==="coach"?MSEL:ME)?keep.top:t1.scrollHeight;
    navSync();
}
document.addEventListener("change",e=>{if(e.target.id==="phfile"){const f=e.target.files&&e.target.files[0];e.target.value="";phSet(f);return}if(e.target.id==="hd"){S.hard=e.target.value.slice(0,60);save()}
  const id=e.target.id,v=e.target.value;
  if(id==="taq"){TA.q=v.slice(0,300);return}
  if(id==="tcrank"||id==="tcpt"||id==="tcq"||id==="tcil"||id==="tctur"){
    if(id==="tcrank"){const n=parseFloat(String(v).replace(",","."));TC.rank=n>=100&&n<=560?String(n):""}if(id==="tcpt")TC.pt=v;if(id==="tcq")TC.q=v.slice(0,60);if(id==="tcil")TC.il=v;if(id==="tctur")TC.tur=v;
    TC.lim=40;const o=tcLoadList();o.rank=TC.rank;o.pt=TC.pt;tcSave(o);render();
  }
});
