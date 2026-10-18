
const SUPABASE_URL="https://ramcghaefbbwgwtgtdtt.supabase.co",SUPABASE_KEY="sb_publishable_MC44S4rXUNLDClD0RgNbaw_1unO3NAI";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const SUBJ=["Matematik","Geometri","Türkçe","Fizik","Kimya","Biyoloji","Tarih","Coğrafya","Edebiyat","Diğer"];
const KEY="karakis-takip-v1";
const METH=["Soru çözme","Konu çalışma","Tekrar","Kendini test","Video izleme"],ACT=["Soru çözme","Tekrar","Kendini test"],CAUSE=["Bilgi eksiği","Dikkat hatası","Süre yetmedi","Yanlış okuma","Heyecan"];
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const day=()=>ymd(new Date());
const dayN=n=>{const d=new Date();d.setDate(d.getDate()+n);return ymd(d)};
const fresh=()=>({day:day(),status:"idle",cur:null,done:0,log:[],qs:[],prog:false,mood:0,sleep:0,dist:0,en:0,str:0,hard:"",meth:{},subjectTime:{}});
let S=fresh();
let view="s",subj=SUBJ[0],meth=METH[0];
const snap=()=>({m:Math.round(total()/60000),q:solved(),prog:S.prog?1:0,mood:S.mood,sleep:S.sleep,dist:S.dist,en:S.en,str:S.str,act:actPct(),c:correct(),b:S.qs.reduce((a,q)=>a+(q.b||0),0)});
let pend;
let DIRTY=false,rtry;
const dayRow=s=>({student_id:ME,day:s.day,state:s,snap:snap(),updated_at:new Date().toISOString()});
// Gece yarısı geçildiyse dünün oturumunu 00:00'da kapatır, yeni gün için temiz durum kurar (açık ders sürüyorsa devam ettirir).
function rollover(){
  if(!ME||ROLE!=="student"||S.day===day())return false;
  const old=S,m=new Date();m.setHours(0,0,0,0);const mid=m.getTime(),oc=old.cur,was=oc&&(old.status==="study"||old.status==="break");
  if(oc){const v=Math.max(0,mid-oc.start-oc.brk-(old.status==="break"?mid-oc.bs:0));old.done+=v;old.meth[oc.meth]=(old.meth[oc.meth]||0)+v;old.subjectTime=old.subjectTime||{};old.subjectTime[oc.subj]=(old.subjectTime[oc.subj]||0)+v;old.cur=null;old.status="stopped";old.log.push({t:mid-1,m:"Gece yarısı: oturum otomatik bölündü ("+oc.subj+")"})}
  const sn=snap();try{localStorage.setItem(KEY+ME+"-"+old.day,JSON.stringify(old))}catch(e){}
  Promise.resolve(sb.from("daily").upsert({student_id:ME,day:old.day,state:old,snap:sn,updated_at:new Date().toISOString()})).then(r=>{if(r&&r.error)setSync("⚠️ "+r.error.message)},()=>setSync("⚠️ Bağlantı yok"));
  S=fresh();
  if(was){S.cur={start:mid,brk:0,bs:0,subj:oc.subj,meth:oc.meth};S.status="study";S.log.push({t:mid,m:"Yeni gün: derse devam ettim ("+oc.subj+")"})}
  return true;
}
async function flush(){
  if(!ME||ROLE!=="student")return;
  let ok=false;
  try{const r=await sb.from("daily").upsert(dayRow(S));ok=!r.error;if(r.error)setSync("⚠️ "+r.error.message)}catch(e){setSync("⚠️ Bağlantı yok")}
  DIRTY=!ok;document.body.classList.toggle("offl",!ok);
  if(ok)setSync("✓ Kaydedildi");else{clearTimeout(rtry);rtry=setTimeout(flush,8000)}
}
const save=()=>{rollover();try{localStorage.setItem(KEY+ME,JSON.stringify(S))}catch(e){}if(!ME||ROLE!=="student")return;clearTimeout(pend);DIRTY=true;setSync("Kaydediliyor…");pend=setTimeout(flush,300)};
// Uygulama arka plana alınırken bekleyen kaydı hemen gönder; öne dönünce gün değiştiyse yenile.
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){if(DIRTY){clearTimeout(pend);flush()}}else if(ROLE==="student"&&rollover()){save();render()}});
window.addEventListener("pagehide",()=>{if(DIRTY)flush()});
window.addEventListener("online",()=>{if(DIRTY)flush()});
const actPct=()=>{const m={...S.meth};if(S.cur)m[S.cur.meth]=(m[S.cur.meth]||0)+curNet();const t=Object.values(m).reduce((a,b)=>a+b,0);return t?Math.round(ACT.reduce((a,k)=>a+(m[k]||0),0)/t*100):0};
const hm=t=>new Date(t).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
const dur=ms=>{ms=Math.max(0,ms);const s=Math.floor(ms/1000);return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor(s%3600/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};
const short=ms=>{const m=Math.round(Math.max(0,ms)/60000);return Math.floor(m/60)+" sa "+(m%60)+" dk"};
const curNet=()=>{const c=S.cur;if(!c)return 0;const n=Date.now();return n-c.start-c.brk-(S.status==="break"?n-c.bs:0)};
const total=()=>S.done+curNet();
const solved=()=>S.qs.reduce((a,q)=>a+q.n,0);
const correct=()=>S.qs.reduce((a,q)=>a+q.c,0);
const log=m=>S.log.push({t:Date.now(),m});
const LBL={idle:"Henüz başlamadı",awake:"Uyanık, derse hazır",study:"Derste",break:"Molada",stopped:"Çalışmayı noktaladı",closed:"Günü kapattı"};
const DOT={idle:"",awake:"",study:"study",break:"break",stopped:"",closed:"done"};
function act(a){
  const n=Date.now();
  if(a==="wake"){S.status="awake";log("Uyandım")}
  if(a==="start"){S.cur={start:n,brk:0,bs:0,subj,meth};S.status="study";log("Derse başladım: "+subj+" ("+meth+")")}
  if(a==="break"){S.cur.bs=n;S.status="break";log("Mola verdim")}
  if(a==="back"){S.cur.brk+=n-S.cur.bs;S.status="study";log("Moladan döndüm")}
  if(a==="stop"){const v=curNet();S.done+=v;S.meth[S.cur.meth]=(S.meth[S.cur.meth]||0)+v;S.subjectTime=S.subjectTime||{};S.subjectTime[S.cur.subj]=(S.subjectTime[S.cur.subj]||0)+v;log("Çalışmayı noktaladım ("+short(v)+", "+S.cur.subj+")");BUMP={m:Math.max(1,Math.round(v/60000))};S.cur=null;S.status="stopped"}
  if(a==="prog"){S.prog=!S.prog;log(S.prog?"Programımı bitirdim":"Program işaretini kaldırdım")}
  if(a==="close"){if(S.cur){const v=curNet();S.done+=v;S.meth[S.cur.meth]=(S.meth[S.cur.meth]||0)+v;S.subjectTime=S.subjectTime||{};S.subjectTime[S.cur.subj]=(S.subjectTime[S.cur.subj]||0)+v;S.cur=null}S.status="closed";log("Günü kapattım")}
  save();render();
}
function addQ(){
  const n=+document.getElementById("qn").value,c=+document.getElementById("qc").value||0,s=document.getElementById("qs").value;
  if(!n||n<1)return;const b=+document.getElementById("qb").value||0,k=document.getElementById("qk").value.trim().slice(0,40);S.qs.push({s,n,c:Math.min(c,n),b,k});BUMP={q:n};log(n+" soru çözdüm ("+s+(k?", "+k:"")+")");save();render();
}
function dailyActivityCard(){
  const hist=HIST[ME]||{},today=day();
  const days=Array.from({length:7},(_,i)=>dayN(i-6));
  const rows=days.map(d=>{const z=d===today?{m:Math.round(total()/60000),q:solved()}:hist[d]||{};return {d,m:num(z.m),q:num(z.q)}});
  const maxM=Math.max(30,...rows.map(r=>r.m)),sumM=rows.reduce((a,r)=>a+r.m,0),sumQ=rows.reduce((a,r)=>a+r.q,0);
  return `<section class="activity-card"><div class="activity-top"><div><div class="eyebrow">SON 7 GÜN</div><h2>İstikrar grafiğin</h2><p>Çalışma ritmini takip et, gelişimini gör.</p></div><span class="activity-icon">↗</span></div><div class="activity-metrics"><div><small>Toplam çalışma</small><b>${hmin(sumM)}</b></div><div><small>Çözülen soru</small><b>${sumQ}</b></div><div><small>Aktif gün</small><b>${rows.filter(r=>r.m>0||r.q>0).length}<small> / 7</small></b></div></div><div class="week-bars" role="img" aria-label="Son yedi günün çalışma süresi grafiği">${rows.map(r=>`<div class="week-col" title="${fd(r.d)}: ${hmin(r.m)}, ${r.q} soru"><div class="week-track"><i style="height:${Math.max(r.m?7:2,Math.round(r.m/maxM*100))}%"></i></div><small>${new Date(r.d+"T12:00:00").toLocaleDateString("tr-TR",{weekday:"short"}).replace(".","")}</small></div>`).join("")}</div><div class="activity-legend"><span><i></i> Net çalışma süresi</span><span>Her gün bir adım daha.</span></div></section>`;
}

function subjectTimeCard(){
  const today={...(S.subjectTime||{})};
  if(!Object.values(today).some(v=>num(v)>0)){
    (S.log||[]).forEach(e=>{
      const m=String(e.m||"").match(/Çalışmayı noktaladım \((\d+) sa (\d+) dk, ([^)]+)\)/);
      if(m){const k=m[3].trim();today[k]=(today[k]||0)+(Number(m[1])*60+Number(m[2]))*60000}
    });
  }
  if(S.cur&&(S.status==="study"||S.status==="break"))today[S.cur.subj]=(today[S.cur.subj]||0)+curNet();
  const asRows=by=>Object.entries(by||{}).map(([name,ms])=>({name,ms:Math.max(0,num(ms))})).filter(x=>x.ms>=60000).sort((a,b)=>b.ms-a.ms);
  const hist=HIST[ME]||{};
  const dailySubjects=offset=>{
    const out={};
    for(let n=offset-1;n>=0;n--){
      const d=dayN(-n);
      const record=d===day()?today:(hist[d]||{}).subjectTime||{};
      Object.entries(record).forEach(([name,ms])=>{out[name]=(out[name]||0)+Math.max(0,num(ms))});
      if(d!==day()&&!Object.values(record).some(v=>num(v)>0)){
        const state=(hist[d]||{}).state||{};
        (state.log||[]).forEach(e=>{const m=String(e.m||"").match(/Çalışmayı noktaladım \((\d+) sa (\d+) dk, ([^)]+)\)/);if(m){const k=m[3].trim();out[k]=(out[k]||0)+(Number(m[1])*60+Number(m[2]))*60000}});
      }
    }
    return asRows(out);
  };
  const rows=asRows(today),week=dailySubjects(7),month=dailySubjects(30);
  const meth={...(S.meth||{})};if(S.cur&&(S.status==="study"||S.status==="break"))meth[S.cur.meth]=(meth[S.cur.meth]||0)+curNet();
  const methods=asRows(meth);
  const bars=(items,peak)=>items.length?items.map(x=>'<div class="time-row"><div class="time-row-head"><span>'+esc(x.name)+'</span><b>'+hmin(Math.round(x.ms/60000))+'</b></div><div class="time-track"><i style="width:'+Math.max(3,Math.round(x.ms/peak*100))+'%"></i></div></div>').join(''):'<p class="empty">Henüz yeterli çalışma süresi kaydı yok.</p>';
  const ex=(EX[ME]||[]).filter(x=>x.total_net!=null);
  const last=ex.length?ex[ex.length-1]:null;
  const prev=last?ex.slice(0,-1).reverse().find(x=>x.exam_type===last.exam_type):null;
  const examProgress=last?'<div class="time-chart exam-progress"><h3>📈 Deneme netindeki gelişim</h3><div class="time-row-head"><span>'+esc(last.exam_type||"Son deneme")+' · '+esc(last.exam_name||"")+'</span><b>'+num(last.total_net)+' net</b></div>'+(prev?'<p class="time-insight">Önceki aynı tür denemeye göre: <b>'+(num(last.total_net)-num(prev.total_net)>0?"+":"")+num(num(last.total_net)-num(prev.total_net))+' net</b> ('+esc(prev.exam_name||"önceki deneme")+' → '+esc(last.exam_name||"son deneme")+')</p>':'<p class="time-insight">Karşılaştırma için aynı türden en az iki deneme kaydı gerekir.</p>')+'</div>':'';
  return '<section class="card subject-time-card"><div class="section-heading"><div><div class="eyebrow">KENDİ GELİŞİMİN</div><h2>Çalışma zamanın ve gelişimin</h2><p class="empty">Ders sürelerini günlük ve dönemsel olarak karşılaştır.</p></div><span class="time-total">'+hmin(Math.round(total()/60000))+'</span></div><div class="time-chart"><h3>📚 Bugün derslere göre</h3>'+bars(rows,Math.max(1,...rows.map(x=>x.ms)))+(rows.length?'<p class="time-insight">En çok zaman ayırdığın ders: <b>'+esc(rows[0].name)+'</b></p>':'')+'</div><div class="time-chart"><h3>🗓️ Son 7 gün · ders bazında</h3>'+bars(week,Math.max(1,...week.map(x=>x.ms)))+'</div><div class="time-chart"><h3>📆 Son 30 gün · ders bazında</h3>'+bars(month,Math.max(1,...month.map(x=>x.ms)))+'</div><div class="time-chart method-chart"><h3>🧠 Bugün çalışma yöntemlerine göre</h3>'+bars(methods,Math.max(1,...methods.map(x=>x.ms)))+'</div>'+examProgress+'</section>';
}

function todayTab(){
  const st=S.status,live=st==="study"||st==="break";
  let b="";
  if(st==="idle")b=`<button class="btn full" data-a="wake">☀️ Uyandım</button>`;
  else if(st==="awake"||st==="stopped")b=`<button class="btn full" data-a="start">📚 Derse başla: ${subj}</button>`;
  else if(st==="study")b=`<button class="btn alt" data-a="break">☕ Mola verdim</button><button class="btn" data-a="stop">⏹ Çalışmayı noktala</button>`;
  else if(st==="break")b=`<button class="btn full" data-a="back">▶ Moladan döndüm</button>`;
  const picker=(st==="awake"||st==="stopped")?`<div class="card"><h2>Hangi dersle başlıyorsun?</h2><div class="chips">${SUBJ.map(x=>`<button class="chip" data-s="${x}" aria-pressed="${x===subj}">${x}</button>`).join("")}</div><h2 style="margin-top:14px">Nasıl çalışacaksın?</h2><div class="chips">${METH.map(x=>`<button class="chip" data-me="${x}" aria-pressed="${x===meth}">${x}</button>`).join("")}</div></div>`:"";
  const qa=st!=="idle"&&st!=="closed";
  const solvedT=solved(),acc=solvedT?Math.round(correct()/solvedT*100):0;
  return `${guideCard()}${live&&curNet()>4*3600e3?`<div class="card" style="border-color:var(--warn)"><p style="margin:0">⏰ Sayaç 4 saatten uzun süredir açık. Çalışmayı bitirdiysen <b>Çalışmayı noktala</b>'ya bas, yoksa süren fazla görünür.</p></div>`:""}
  <section class="hero"><div class="st"><span class="dot ${DOT[st]}"></span>${LBL[st]}</div>
  <div class="big" id="clock">${dur(clockMs())}</div><div class="sub" id="clocksub">${clockSub()}</div>
  ${st!=="closed"?`<div class="acts">${b}</div>`:""}</section>
  ${picker}
  <div class="stats"><div class="stat"><b>${solvedT}</b><span>çözülen soru</span></div><div class="stat"><b>${solvedT?"%"+acc:"–"}</b><span>doğruluk</span></div><div class="stat"><b>${S.prog?"✓":"–"}</b><span>program</span></div></div>
  ${subjectTimeCard()}${goalRoad(ME)}${coachForMe()}${streakCard()}${todayTasks()}
  ${qa?`<div class="card"><h2>Soru girişi</h2><div class="row">
  <label>Ders<select id="qs">${SUBJ.map(x=>`<option${x===subj?" selected":""}>${x}</option>`).join("")}</select></label>
  <label>Çözülen<input id="qn" type="number" min="1" inputmode="numeric"></label>
  <label>Doğru<input id="qc" type="number" min="0" inputmode="numeric"></label><label>Boş<input id="qb" type="number" min="0" inputmode="numeric"></label><label>Konu<input id="qk" type="text" maxlength="40" style="width:140px"></label>
  <button class="btn" style="padding:11px 16px" id="addq">Ekle</button></div></div>`:""}
  ${qsCard()}
  ${st!=="idle"?dayCard():""}
  ${st!=="idle"?`<div class="card"><h2>Gün sonu</h2><div class="chips">
  <button class="chip" data-a="prog" aria-pressed="${S.prog}">✅ Programımı bitirdim</button>
  ${st!=="closed"?`<button class="chip" data-a="close">🌙 Günü kapat</button>`:""}</div>
  ${st==="closed"?`<div class="row"><label>Bugün nasıldı?</label><div class="mood">${[1,2,3,4,5].map(i=>`<button class="chip" data-m="${i}" aria-pressed="${S.mood===i}">${i}</button>`).join("")}</div></div>`:""}</div>`:""}
  <div class="card"><h2>Bugünün akışı</h2>${S.log.length?`<ul class="tl">${S.log.slice().reverse().map(l=>`<li><time>${hm(l.t)}</time>${esc(l.m)}</li>`).join("")}</ul>`:`<p class="empty">Güne “Uyandım” butonuyla başla.</p>`}</div>`;
}
const clk=m=>String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const num=v=>Number(v)||0;
function roster(){
  const t=day(),now=Date.now();
  return STU.map(p=>{
    const rs=ROWS.filter(r=>r.student_id===p.id),by=Object.fromEntries(rs.map(r=>[r.day,r])),td=by[t],s=td?td.state:{};
    const first=rs.length?rs.map(r=>r.day).sort()[0]:t,days=[-6,-5,-4,-3,-2,-1,0].map(dayN).filter(k=>k>=first);
    const cur=s.cur,net=num(s.done)+(cur?(s.status==="break"?num(cur.bs):now)-num(cur.start)-num(cur.brk):0),m=Math.round(Math.max(0,net)/60000);
    const qs=(s.qs||[]).map(q=>({s:String(q.s),n:num(q.n),c:num(q.c),b:num(q.b),k:q.k?String(q.k):""})),qn=qs.reduce((a,q)=>a+q.n,0);
    const hist=days.map(k=>{const r=by[k],a=r&&r.snap?r.snap:{};return k===t&&td?{m,q:qn,prog:s.prog?1:0,mood:num(s.mood),sleep:num(s.sleep)}:{m:num(a.m),q:num(a.q),prog:num(a.prog),mood:num(a.mood),sleep:num(a.sleep)}});
    return {id:p.id,n:esc(p.name),st:LBL[s.status]?s.status:"idle",m,q:qn,p:s.prog?1:(cur?.5:0),L:(s.log||[]).map(l=>({t:hm(num(l.t)),m:esc(l.m)})),qs,mood:num(s.mood),sleep:num(s.sleep),dist:num(s.dist),en:num(s.en),str:num(s.str),hard:String(s.hard||""),act:num(td&&td.snap?td.snap.act:0),hist};
  });
}

let C={goals:{},notes:{},den:{},th:{sleep:6,drop:60,gap:2,mood:2}};try{Object.assign(C.th,JSON.parse(localStorage.getItem("karakis-th-v1")||"{}"))}catch(e){}
const saveC=()=>{try{localStorage.setItem("karakis-th-v1",JSON.stringify(C.th))}catch(e){}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const goalOf=id=>{const g=C.goals[id];return g&&g.day===day()?g:null};
const pct=(a,b)=>b?Math.min(100,Math.round(a/b*100)):0;
const ntime=t=>new Date(t).toLocaleString("tr-TR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
function goalHTML(g,mins,qn){
  let o="";
  if(g.m)o+=`<div class="gl"><span>Süre</span><span>${mins} / ${g.m} dk</span></div><div class="bar"><i style="width:${pct(mins,g.m)}%"></i></div>`;
  if(g.q)o+=`<div class="gl"><span>Soru</span><span>${qn} / ${g.q}</span></div><div class="bar"><i style="width:${pct(qn,g.q)}%"></i></div>`;
  return o;
}
function coachForMe(){
  const g=goalOf(ME),n=C.notes[ME]||[];
  if(!g&&!n.length)return"";
  return `<div class="card"><h2>Koçundan</h2>${g?`<div class="empty">Bugünün hedefi · odak: ${esc(g.s)}</div>`+goalHTML(g,Math.round(total()/60000),solved()):""}${n.length?`<div class="nt"><time>${ntime(n[n.length-1].t)}</time>${esc(n[n.length-1].x)}</div>`:""}</div>`;
}
function coachCards(x,sn){
  const g=goalOf(x.id),notes=(C.notes[x.id]||[]).slice().reverse();
  const form=`<div class="row"><label>Odak ders<select id="gs">${SUBJ.map(s=>`<option>${s}</option>`).join("")}</select></label><label>Soru<input id="gq" type="number" min="1" inputmode="numeric"></label><label>Süre (dk)<input id="gm" type="number" min="1" inputmode="numeric"></label><button class="btn" style="padding:11px 16px" id="setgoal">Hedefi ata</button></div>`;
  return `<div class="card"><h2>Bugünün hedefi</h2>${g?`<div class="empty">Odak: ${esc(g.s)}</div>`+goalHTML(g,x.m,sn)+`<div class="row"><button class="chip" id="delgoal">Hedefi kaldır</button></div>`:form}</div>
  <div class="card"><h2>Koç notu</h2><textarea id="note" placeholder="Öğrenciye not yaz…"></textarea><div class="row"><button class="btn" style="padding:11px 16px" id="addnote">Notu kaydet</button></div>${notes.map(n=>`<div class="nt"><time>${ntime(n.t)}</time>${esc(n.x)}</div>`).join("")}</div>`;
}
function dayCard(){
  const sc=(f,v,l)=>`<div class="chips">${v.map((a,i)=>`<button class="chip" data-f="${f}" data-v="${a}" aria-pressed="${S[f]===a}">${l?l[i]:a}</button>`).join("")}</div>`;
  const q=t=>`<div class="gl"><span>${t}</span></div>`,n5=[1,2,3,4,5];
  return `<div class="card"><h2>Günlük durum</h2>${q("Dün gece uyku (saat)")}${sc("sleep",[4.5,5.5,6.5,7.5,8.5],["&lt;5","5-6","6-7","7-8","8+"])}${q("Dikkat dağınıklığı (1 az, 5 çok)")}${sc("dist",n5)}${q("Enerji (1 düşük, 5 yüksek)")}${sc("en",n5)}${q("Stres (1 az, 5 çok)")}${sc("str",n5)}${q("Bugün en çok zorlandığım konu")}<input id="hd" type="text" maxlength="60" value="${esc(S.hard)}" style="width:100%;margin-top:6px"></div>`;
}
function flags(h){
  const past=h.slice(0,-1),l2=past.slice(-C.th.gap),l3=past.slice(-3),o=[];
  if(l2.length===C.th.gap&&l2.every(d=>d.m===0))o.push("Son "+C.th.gap+" gündür çalışma kaydı yok");
  if(past.length>=6){const a=l3.reduce((s,d)=>s+d.m,0)/3,b=past.slice(0,-3).reduce((s,d)=>s+d.m,0)/(past.length-3);if(b>0&&a<b*C.th.drop/100)o.push("Süre son 3 günde belirgin düştü")}
  if(l3.length===3&&l3.every(d=>d.mood>0&&d.mood<=C.th.mood))o.push("Gün puanı 3 gündür düşük");
  if(l3.length===3&&l3.every(d=>!d.prog))o.push("3 gündür program tamamlanmadı");
  const sl=l3.filter(d=>d.sleep>0);
  if(sl.length===3&&sl.reduce((s,d)=>s+d.sleep,0)/3<C.th.sleep)o.push("Uyku ortalaması "+C.th.sleep+" saatin altında");
  return o;
}
function trendCard(x){
  const h=x.hist,ms=h.map(d=>d.m),mx=Math.max(1,...ms),avg=ms.reduce((a,b)=>a+b,0)/ms.length;
  const cv=avg?Math.round(Math.sqrt(ms.reduce((a,b)=>a+(b-avg)**2,0)/ms.length)/avg*100):0,fl=flags(h);
  const r=(a,b)=>`<div class="subj"><span>${a}</span><span>${b}</span></div>`,v=(n,u)=>n?n+u:"–";
  return (fl.length?`<div class="card" style="border-color:var(--warn)"><h2>🚩 Dikkat</h2>${fl.map(f=>`<div class="subj"><span>${f}</span></div>`).join("")}<p class="empty" style="margin:8px 0 0;font-size:13px">Eşikleri koç panelindeki "Uyarı eşikleri" bölümünden değiştirebilirsin.</p></div>`:"")+
  `<div class="card"><h2>Eğilim ve bildirimler</h2><div style="display:flex;gap:6px;align-items:end;height:70px">${h.map(d=>`<div title="${d.m} dk" style="flex:1;background:var(--gold);border-radius:4px 4px 0 0;height:${Math.max(4,Math.round(d.m/mx*100))}%"></div>`).join("")}</div>
  <p class="empty" style="font-size:13px;margin:4px 0 10px">Net çalışma süresi, son ${h.length} gün (sağdaki bugün)</p>
  ${r("Süre düzeni",h.length>=3?(cv<=25?"düzenli":"dalgalı")+" (%"+cv+" sapma)":"yetersiz veri")}${r("Uyku",v(x.sleep," sa"))}${r("Dikkat dağınıklığı",v(x.dist," / 5"))}${r("Enerji",v(x.en," / 5"))}${r("Stres",v(x.str," / 5"))}${r("Aktif yöntem oranı",x.act?"%"+x.act:"–")}${r("Zorlandığı konu",esc(x.hard)||"–")}</div>`;
}
function denemeCard(x){
  const L=EX[x.id]||[];
  return `<div class="card"><h2>Deneme ekle (elle)</h2><p class="empty" style="margin:0 0 6px;font-size:14px">${L.length} kayıtlı deneme. Öğrenci görselle de yükleyebilir; ikisi aynı listede görünür.</p>
  <div class="row"><label>Deneme<input id="dad" type="text" maxlength="120" style="width:140px"></label><label>Tür<select id="dtur">${["TYT","AYT","LGS","BRANS"].map(t=>`<option>${t}</option>`).join("")}</select></label><label>Tarih<input id="ddt" type="date" value="${day()}" style="width:150px"></label><label>Toplam net<input id="dnet" type="number" step="0.25" inputmode="decimal" style="width:90px"></label><button class="btn" style="padding:11px 16px" id="adddn">Ekle</button></div></div>`;
}
function thCard(){
  const t=C.th,i=(id,l,v,mn,mx)=>`<label>${l}<input id="${id}" type="number" min="${mn}" max="${mx}" value="${v}" inputmode="numeric"></label>`;
  return `<details class="card"><summary style="cursor:pointer;font-weight:700">⚙️ Uyarı eşikleri</summary><div class="row">${i("th1","Kayıtsız gün",t.gap,1,5)}${i("th2","Süre düşüşü (%)",t.drop,10,95)}${i("th3","Düşük puan ≤",t.mood,1,4)}${i("th4","Uyku (sa) altı",t.sleep,3,9)}<button class="btn" style="padding:11px 16px" id="savth">Kaydet</button></div><div class="row"><button class="chip" id="aiping">Yapay zekâ bağlantısını test et</button></div><p class="empty" id="aipo" style="font-size:13px;margin:6px 0 0"></p></details>`;
}
function parentCard(x){
  const h=x.hist,n=h.length,sum=k=>h.reduce((a,d)=>a+(d[k]||0),0),am=Math.round(sum("m")/n),sl=h.filter(d=>d.sleep>0),note=(C.notes[x.id]||[]).slice(-1)[0];
  const E=(EX[x.id]||[]).slice(-1)[0],tg=tgPick(x.id),tk=(TK[x.id]||[]).filter(t=>t.task_date>=dayN(-6)&&t.task_date<=day()),tkd=tk.filter(t=>t.done).length;
  const extra=(E?`• Son deneme: ${E.exam_name||E.exam_type}${E.total_net!=null?" — "+E.total_net+" net":""}\n`:"")+(tg&&tg.target_net!=null?`• Hedef net: ${tg.target_net}${tg.university?" ("+[tg.university,tg.department].filter(Boolean).join(" – ")+")":""}\n`:"")+(tk.length?`• Haftalık görev tamamlama: ${tkd}/${tk.length}\n`:"");
  const tx=`Sayın veli,\n${(STU.find(p=>p.id===x.id)||{}).name||x.n} için son ${n} günün özeti:\n• Günlük ortalama net çalışma: ${Math.floor(am/60)} sa ${am%60} dk\n• Çalışılan gün: ${h.filter(d=>d.m>0).length}/${n}\n• Çözülen soru: ${sum("q")}\n• Programı tamamlanan gün: ${sum("prog")}/${n}\n`+(sl.length?`• Ortalama uyku: yaklaşık ${(sl.reduce((a,d)=>a+d.sleep,0)/sl.length).toFixed(1)} saat\n`:"")+extra+(note?`• Koç notu: ${note.x}\n`:"")+`Saygılarımla,\nHasan Karakış · Karakış Eğitim & Danışmanlık`;
  return `<div class="card"><h2>Veli özeti</h2><textarea id="pt" readonly style="min-height:150px">${esc(tx)}</textarea><div class="row"><button class="btn" style="padding:11px 16px" id="cp">Metni kopyala</button><button class="chip" id="pwa">WhatsApp'ta gönder</button><button class="chip" id="psh">Paylaş…</button></div></div>`;
}

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
let coachQuery="",coachStatus="all";
function coachView(){
  if(sel)return detailView();
  const all=roster();
  const c=k=>all.filter(x=>k.includes(x.st)).length;
  const order={study:0,break:1,awake:2,stopped:3,closed:4,idle:5};
  all.sort((a,b)=>order[a.st]-order[b.st]);
  const avg=all.length?Math.round(all.reduce((a,x)=>a+x.m,0)/all.length):0;
  const questions=all.reduce((a,x)=>a+x.q,0);
  const alerts=all.filter(x=>flags(x.hist).length).length;
  return `<div class="page-intro coach-intro"><div><div class="eyebrow">KARAKIŞ EĞİTİM & DANIŞMANLIK</div><h1>Koç paneli</h1><p>Öğrencilerin çalışma durumunu, hedeflerini ve gelişimini tek ekrandan takip et.</p></div><span class="status-pill"><i></i> Canlı takip</span></div>
  <section id="coach-overview" class="coach-section"><div class="sum">
  <div class="stat coach-stat coach-stat-study"><b>${c(["study"])}</b><span>Çalışıyor</span><small>Şu anda derste</small></div><div class="stat coach-stat coach-stat-break"><b>${c(["break"])}</b><span>Molada</span><small>Kısa ara veriyor</small></div>
  <div class="stat coach-stat coach-stat-idle"><b>${c(["idle"])}</b><span>Henüz başlamadı</span><small>Bugün oturum yok</small></div><div class="stat coach-stat coach-stat-closed"><b>${c(["closed"])}</b><span>Günü kapattı</span><small>Günlük takibi tamamladı</small></div></div>
  <div class="card coach-summary"><div><div class="eyebrow">SINIFIN GENEL DURUMU</div><h2>Grup performansı</h2><p class="empty">Güncel kayıtlar üzerinden genel görünüm</p></div><div class="coach-summary-metrics"><div><small>Ortalama çalışma</small><b>${Math.floor(avg/60)} sa ${avg%60} dk</b></div><div><small>Çözülen soru</small><b>${questions.toLocaleString("tr-TR")}</b></div><div><small>Takip uyarısı</small><b>${alerts} öğrenci</b></div></div></div></section>
  <section id="coach-students" class="coach-section"><div class="section-heading"><div><div class="eyebrow">ÖĞRENCİ TAKİBİ</div><h2>Öğrenciler</h2></div><span class="count-pill" id="coach-result-count">${all.length} / ${all.length} öğrenci</span></div>
  <div class="coach-toolbar"><label class="coach-search-label">Öğrenci ara<input id="coach-search" type="search" placeholder="İsim yazarak ara…" value="${esc(coachQuery)}" autocomplete="off"></label><label class="coach-filter-label">Çalışma durumu<select id="coach-status"><option value="all" ${coachStatus==="all"?"selected":""}>Tüm durumlar</option><option value="study" ${coachStatus==="study"?"selected":""}>Çalışıyor</option><option value="break" ${coachStatus==="break"?"selected":""}>Molada</option><option value="awake" ${coachStatus==="awake"?"selected":""}>Derse hazır</option><option value="idle" ${coachStatus==="idle"?"selected":""}>Henüz başlamadı</option><option value="stopped" ${coachStatus==="stopped"?"selected":""}>Çalışmayı bitirdi</option><option value="closed" ${coachStatus==="closed"?"selected":""}>Günü kapattı</option></select></label></div>
  ${classCard()}<div class="grid coach-student-grid">${all.map(x=>`<button class="s coach-student-card${x.live?" live":""}" data-i="${x.id}" data-name="${esc((STU.find(p=>p.id===x.id)||{}).name||x.n).toLocaleLowerCase("tr-TR")}" data-status="${x.st}"><div class="h"><span class="dot ${DOT[x.st]}"></span><span class="coach-student-name">${x.n}</span>${flags(x.hist).length?" 🚩":""}</div><div class="sp">${LBL[x.st]}</div>
  <div class="n"><span>${Math.floor(x.m/60)} sa ${x.m%60} dk</span><span>${x.q} soru</span></div><div class="bar"><i style="width:${Math.round(x.p*100)}%"></i></div><div class="coach-card-foot">${flags(x.hist).length?'<span class="coach-alert">Takip gerekli</span>':'<span class="coach-ok">Günlük durum</span>'}<span>Detayları aç →</span></div></button>`).join("")}</div><p class="coach-empty" id="coach-empty" hidden>Bu arama ve filtreyle eşleşen öğrenci bulunamadı.</p></section>
  <section id="coach-tasks" class="coach-section"><div class="section-heading"><div><div class="eyebrow">PLANLAMA</div><h2>Görev yönetimi</h2><p class="empty">Öğrencilere tek tek veya tüm gruba çalışma görevi ata.</p></div></div>${bulkCard()}</section>
  <section id="coach-tools" class="coach-section"><div class="section-heading"><div><div class="eyebrow">YÖNETİM</div><h2>Koç araçları</h2><p class="empty">Öğrenci hesapları, veri yedekleri ve uyarı ayarları.</p></div></div>${addStudentCard()}${backupCard()}${thCard()}</section>`;
}
function filterCoachCards(){
  const cards=Array.from(document.querySelectorAll(".coach-student-card"));
  const query=coachQuery.trim().toLocaleLowerCase("tr-TR");
  let visible=0;
  cards.forEach(card=>{
    const matchName=(card.dataset.name||"").includes(query);
    const matchStatus=coachStatus==="all"||card.dataset.status===coachStatus;
    card.hidden=!(matchName&&matchStatus);
    if(!card.hidden)visible++;
  });
  const count=document.getElementById("coach-result-count");
  if(count)count.textContent=visible+" / "+cards.length+" öğrenci";
  const empty=document.getElementById("coach-empty");
  if(empty){empty.hidden=visible!==0;empty.textContent=cards.length?"Bu arama ve filtreyle eşleşen öğrenci bulunamadı.":"Henüz öğrenci kaydı yok. Öğrenci eklemek için Koç araçları bölümünü kullan."}
}
let selDay=null,per="hw";const HIST={},DSTATE={};
const PER=[["hw","Bu hafta"],["lw","Geçen hafta"],["tm","Bu ay"],["lm","Geçen ay"]];
const fd=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("tr-TR",{weekday:"short",day:"numeric",month:"short"})};
const hmin=m=>Math.floor(m/60)+" sa "+(m%60)+" dk";
async function loadHist(id){try{const {data,error}=await sb.from("daily").select("day,state,snap").eq("student_id",id).gte("day",dayN(-70)).order("day");if(error)throw error;HIST[id]=Object.fromEntries((data||[]).map(r=>[r.day,Object.assign({},r.snap||{},{subjectTime:(r.state||{}).subjectTime||{},state:r.state||{}})]))}catch(e){HIST[id]=HIST[id]||{}}}
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
  <div class="big" style="font-size:34px">${x.n}</div>
  <div class="sub">Net çalışma: ${Math.floor(x.m/60)} sa ${x.m%60} dk</div></section>
  <div class="stats"><div class="stat"><b>${sn}</b><span>çözülen soru</span></div><div class="stat"><b>${sn?"%"+acc:"–"}</b><span>doğruluk</span></div><div class="stat"><b>${x.p>=1?"✓":"–"}</b><span>program</span></div></div>
  ${past?"":`<div id="detail-history">${histCard(x.id,x)+aiCard(x.id)+goalRoad(x.id)+netChartsCard(x.id)}</div>`+targetForm(x.id,false)}<div class="card"><h2>Derslere göre sorular</h2>${Object.keys(by).length?Object.entries(by).map(([k,v])=>`<div class="subj"><span>${esc(k)}${v.k.length?" ("+esc(v.k.join(", "))+")":""}</span><span>${v.n} soru · ${v.c} doğru${v.b?" · "+v.b+" boş":""}</span></div>`).join(""):`<p class="empty">Henüz soru girişi yok.</p>`}</div>
  ${x.mood?`<div class="card"><h2>Gün puanı</h2><p class="empty" style="margin:0">${x.mood} / 5</p></div>`:""}
  ${past?"":`<div id="detail-tasks">${trendCard(x)+coachCards(x,sn)+taskCard(x)}</div>`+denemeCard(x)+parentCard(x)+adminCard(x)}<div class="card"><h2>Günün akışı</h2>${x.L.length?`<ul class="tl">${x.L.slice().reverse().map(l=>`<li><time>${l.t}</time>${l.m}</li>`).join("")}</ul>`:`<p class="empty">${past?"Bu güne ait hareket kaydı yok.":"Bugün henüz bir hareket yok."}</p>`}</div>`;
}
function render(){
    const app=document.getElementById("app");
    if(view==="s")app.innerHTML=studentView();
    else{
      const nav=sel?`<nav class="side-nav coach-side" aria-label="Koç menüsü"><div class="side-brand"><span class="brand-mark">K</span><div><b>KARAKIŞ</b><small>KOÇ PANELİ</small></div></div><div class="side-label">ÖĞRENCİ ÇALIŞMA ALANI</div><button data-backnav="1"><span>👥</span><span class="nav-label">Öğrenci listesi</span></button><button data-cnav="detail-history"><span>📈</span><span class="nav-label">Günlük performans</span></button><button data-cnav="detail-target"><span>🎯</span><span class="nav-label">Hedef analizi</span></button><button data-cnav="detail-tasks"><span>✅</span><span class="nav-label">Görev planı</span></button><div class="side-foot"><span class="side-avatar">K</span><div><b>${esc(NAME||"Koç")}</b><small>Koç paneli</small></div></div></nav>`: `<nav class="side-nav coach-side" aria-label="Koç menüsü"><div class="side-brand"><span class="brand-mark">K</span><div><b>KARAKIŞ</b><small>KOÇ PANELİ</small></div></div><div class="side-label">YÖNETİM</div><button data-cnav="coach-overview" aria-current="true"><span>⌂</span><span class="nav-label">Genel bakış</span></button><button data-cnav="coach-students"><span>👥</span><span class="nav-label">Öğrenciler</span></button><button data-cnav="coach-tasks"><span>✓</span><span class="nav-label">Görev yönetimi</span></button><button data-cnav="coach-tools"><span>⚙</span><span class="nav-label">Koç araçları</span></button><div class="side-foot"><span class="side-avatar">K</span><div><b>${esc(NAME||"Koç")}</b><small>Eğitim koçluğu</small></div></div></nav>`;
      app.innerHTML=`<div class="dashboard-shell">${nav}<div class="dashboard-main">${coachView()}</div></div>`;
    }
    if(view==="c"&&!sel)filterCoachCards();
    const c=document.getElementById("chat");if(c)c.scrollTop=c.scrollHeight;
}
document.addEventListener("input",e=>{if(e.target.id==="coach-search"){coachQuery=e.target.value;filterCoachCards()}});
document.addEventListener("change",e=>{if(e.target.id==="hd"){S.hard=e.target.value.slice(0,60);save()}if(e.target.id==="coach-status"){coachStatus=e.target.value;filterCoachCards()}});
/* ===== Yeni özellikler: sekmeler, görevler, sohbet, rozetler, koç araçları ===== */
let tab="b",FZ=null,CHAT=[],CHATBUSY=false,CHATERR="",PLANBUSY=null,PLANMSG="",ADMMSG=null,EXALL=[],TKALL=[];
const TK={},PD={};
const TABS=[["b","🏠","Bugün"],["g","✅","Görevler"],["d","📝","Denemeler"],["h","🎯","Hedefim"],["k","💬","Asistan"]];

/* ilk giriş rehberi */
const GK=()=>"karakis-rehber-"+ME;
function guideSeen(){try{return !!localStorage.getItem(GK())}catch(e){return true}}
function guideCard(){
  if(guideSeen())return"";
  return `<div class="card" style="border-color:var(--acc)"><h2>Hoş geldin! 👋</h2><ol style="margin:0 0 10px;padding-left:20px;line-height:1.6"><li>Sabah <b>☀️ Uyandım</b>, derse oturunca <b>📚 Derse başla</b> de.</li><li>Çözdüğün soruları <b>Soru girişi</b>ne ekle, <b>Görevler</b> sekmesinden bugünkü işlerini işaretle.</li><li>Akşam <b>🌙 Günü kapat</b> de ve ruh halini seç.</li></ol><p class="empty" style="font-size:14px;margin:0 0 8px">📱 Telefonda kolay açmak için tarayıcı menüsünden <b>Ana ekrana ekle</b>'yi seç. PIN'ini unutursan koçuna yaz.</p><p class="empty" style="font-size:13px;margin:0 0 10px">🔒 Çalışma verilerini koçun görür. Deneme fotoğrafı yüklersen veya asistana yazarsan bu içerik, yapay zekâ için Google'ın Gemini servisine gönderilir. Ad, T.C. kimlik numarası gibi bilgileri paylaşma.</p><button class="btn" id="guideok">Anladım</button></div>`;
}
function qsCard(){
  if(!S.qs.length)return"";
  return `<div class="card"><h2>Girdiğin sorular</h2>${S.qs.map((q,i)=>`<div class="rb" style="cursor:default"><span>${esc(q.s)}${q.k?" · "+esc(q.k):""}: ${q.n} soru, ${q.c} doğru</span><button class="link" data-qdel="${i}" aria-label="Bu soru kaydını sil">Sil</button></div>`).join("")}</div>`;
}
async function logout(){
  const lim=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(r,ms))]);
  try{if(DIRTY)await lim(flush(),3000)}catch(e){}
  try{if(ROLE==="student"&&"serviceWorker" in navigator){const reg=await lim(navigator.serviceWorker.ready,1500),sub=reg&&await reg.pushManager.getSubscription();if(sub){await lim(sb.from("push_subs").delete().eq("endpoint",sub.endpoint),2000);await sub.unsubscribe()}}}catch(e){}
  // Ortak cihazda sonraki kullanıcı görmesin: bekleyen kayıt yoksa yerel verileri temizle
  try{if(!DIRTY)Object.keys(localStorage).filter(k=>k.startsWith(KEY+ME)).forEach(k=>localStorage.removeItem(k))}catch(e){}
  sb.auth.signOut().then(()=>location.reload(),()=>location.reload());
}
const shift=(s,k)=>{const[y,m,d]=s.split("-").map(Number);return ymd(new Date(y,m-1,d+k))};
async function loadTasks(id){try{const {data,error}=await sb.from("weekly_tasks").select("*").eq("student_id",id).gte("task_date",dayN(-7)).lte("task_date",dayN(14)).order("task_date").order("id");if(error)throw error;TK[id]=data||[]}catch(e){TK[id]=TK[id]||[]}}
async function loadPlan(id){try{const {data}=await sb.from("plan_drafts").select("*").eq("student_id",id).maybeSingle();PD[id]=data||null}catch(e){PD[id]=null}}
function taskRow(t,coach){
  const sub=[t.subject,t.amount].filter(Boolean).map(esc).join(" · ")+(t.source==="ai"?" · 🤖 plan":"");
  return `<div class="tk${t.done?" done":""}">${coach?`<span aria-hidden="true">${t.done?"✅":"⬜"}</span>`:`<button class="tkb" data-tk="${t.id}" aria-pressed="${!!t.done}" aria-label="Görevi tamamlandı olarak işaretle">${t.done?"✓":""}</button>`}<span class="tkt"><b>${esc(t.title)}</b>${sub?`<small>${sub}</small>`:""}</span>${coach?`<button class="chip" data-tkdel="${t.id}" aria-label="Görevi sil">Sil</button>`:""}</div>`;
}
function taskList(L,coach){
  const by={};L.forEach(t=>(by[t.task_date]=by[t.task_date]||[]).push(t));
  return Object.keys(by).sort().map(d=>`<div class="tkd">${d===day()?"Bugün":fd(d)}</div>`+by[d].map(t=>taskRow(t,coach)).join("")).join("");
}
async function togTask(id){
  const t=(TK[ME]||[]).find(x=>String(x.id)===String(id));if(!t)return;
  t.done=!t.done;t.done_at=t.done?new Date().toISOString():null;render();
  await dbw(sb.from("weekly_tasks").update({done:t.done,done_at:t.done_at}).eq("id",t.id).eq("student_id",ME));
}
async function delTask(id){if(!confirm("Görev silinsin mi?"))return;await dbw(sb.from("weekly_tasks").delete().eq("id",id).eq("student_id",sel));await loadTasks(sel);render()}
async function addTask(){
  const g=i=>document.getElementById(i).value,title=g("tkt").trim().slice(0,120);if(!title)return;
  await dbw(sb.from("weekly_tasks").insert({student_id:sel,task_date:g("tkd")||day(),title,subject:g("tks")||null,amount:g("tka").trim().slice(0,60)||null,source:"coach",created_by:ME}));
  await loadTasks(sel);render();
}
function taskCard(x){
  const L=(TK[x.id]||[]).filter(t=>t.task_date>=dayN(-3)),d=L.filter(t=>t.done).length,p=PD[x.id];
  const plan=p&&p.content?`<div class="card" style="border-color:var(--acc);margin:12px 0 0"><h2>🤖 Plan taslağı</h2><p class="empty" style="margin:0 0 6px">${esc(p.content.ozet||"")}</p>${p.content.notlar?`<p class="empty" style="margin:0 0 6px;font-size:14px">${esc(p.content.notlar)}</p>`:""}${taskList((p.content.gorevler||[]).map(g=>({...g,id:0,done:false,source:"ai"})),true).replace(/<button[^>]*data-tkdel[^>]*>.*?<\/button>/g,"")}<p class="empty" style="font-size:13px;margin:8px 0">Taslak öğrenciye henüz görünmez. İncele, uygunsa onayla.</p><div class="row"><button class="btn" style="padding:11px 16px" id="planok">Onayla ve öğrenciye ata</button><button class="chip" id="plandel">Taslağı sil</button></div></div>`:"";
  return `<div class="card"><h2>Haftalık görevler</h2>${L.length?`<p class="empty" style="margin:0 0 8px">${d}/${L.length} tamamlandı · %${Math.round(d/L.length*100)}</p><div class="bar"><i style="width:${Math.round(d/L.length*100)}%"></i></div>${taskList(L,true)}`:`<p class="empty">Bu öğrenciye atanmış görev yok.</p>`}
  <div class="row"><label>Tarih<input id="tkd" type="date" value="${day()}" style="width:150px"></label><label>Ders<select id="tks"><option value="">Ders</option>${SUBJ.map(s=>`<option>${s}</option>`).join("")}</select></label><label>Görev<input id="tkt" type="text" maxlength="120" style="width:170px"></label><label>Miktar<input id="tka" type="text" maxlength="60" placeholder="60 soru" style="width:100px"></label><button class="btn" style="padding:11px 16px" id="tkadd">Ekle</button></div>
  <div class="row"><button class="chip" id="planrun"${PLANBUSY?" disabled":""}>🤖 Yapay zekâyla haftalık plan taslağı üret</button></div>
  <p class="empty" style="font-size:14px;margin:6px 0 0">${PLANBUSY===x.id?"Plan hazırlanıyor, yarım dakika sürebilir…":esc(PLANMSG)}</p>${plan}</div>`;
}
async function planRun(){
  const sid=sel;if(!sid||PLANBUSY)return;PLANBUSY=sid;PLANMSG="";render();
  const r=await callFn("exam-insights",{action:"plan",student_id:sid});PLANBUSY=null;
  if(r.plan){PD[sid]={student_id:sid,content:r.plan,created_at:new Date().toISOString()}}else PLANMSG=r.error||"Plan üretilemedi.";
  render();
}
async function planOk(){
  const p=PD[sel];if(!p||!p.content)return;
  const rows=(p.content.gorevler||[]).map(g=>({student_id:sel,task_date:g.task_date,title:g.title,subject:g.subject||null,amount:g.amount||null,source:"ai",created_by:ME}));
  const r=await dbw(sb.from("weekly_tasks").insert(rows));if(!r||r.error)return;
  await dbw(sb.from("plan_drafts").delete().eq("student_id",sel));PD[sel]=null;await loadTasks(sel);render();
}
async function planDel(){if(!confirm("Plan taslağı silinsin mi?"))return;await dbw(sb.from("plan_drafts").delete().eq("student_id",sel));PD[sel]=null;render()}

/* seri, rozet, odak */
function streakInfo(){
  const H=Object.assign({},HIST[ME]||{});H[day()]=snap();
  const ok=k=>H[k]&&num(H[k].m)>0;let cur=0,d=day();if(!ok(d))d=shift(d,-1);while(ok(d)){cur++;d=shift(d,-1)}
  let best=0,run=0,prev=null;Object.keys(H).sort().forEach(k=>{if(ok(k)){run=prev&&shift(prev,1)===k?run+1:1;best=Math.max(best,run);prev=k}else prev=null});
  return {cur,best:Math.max(best,cur),H};
}
function badgeList(){
  const {best,H}=streakInfo(),v=Object.values(H),tot=v.reduce((a,d)=>a+num(d.m),0),dn=(TK[ME]||[]).filter(t=>t.done).length;
  return [["🔥","3 gün seri",best>=3],["⚡","7 gün seri",best>=7],["🏔️","14 gün seri",best>=14],["⏱️","20 saat çalışma",tot>=1200],["✍️","Bir günde 100 soru",v.some(d=>num(d.q)>=100)],["📝","İlk deneme",(EX[ME]||[]).length>=1],["✅","10 görev",dn>=10],["🎯","Hedef belirledin",!!TG[ME]]];
}
function streakCard(){const s=streakInfo();return `<div class="card"><div class="row" style="margin:0;justify-content:space-between;align-items:center"><b style="font-size:18px">🔥 ${s.cur} gün seri</b><span class="empty">En uzun: ${s.best} gün</span></div></div>`}
function badgeCard(){const s=streakInfo(),B=badgeList();return `<div class="card"><h2>Seri ve rozetler</h2><p class="empty" style="margin:0 0 10px">🔥 ${s.cur} gün seri · en uzun ${s.best} gün · ${B.filter(b=>b[2]).length}/${B.length} rozet</p><div class="bdg">${B.map(b=>`<div class="bd${b[2]?" on":""}"><b>${b[0]}</b>${b[1]}</div>`).join("")}</div></div>`}
const FZP=()=>{try{return +localStorage.getItem("karakis-odak-"+day())||0}catch(e){return 0}};
const fzTxt=()=>{const s=Math.max(0,Math.ceil((FZ.end-Date.now())/1000));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};
function focusCard(){
  return `<div class="card"><h2>Odak zamanlayıcı</h2><div class="big" id="fz" style="font-size:44px;text-align:center">${FZ?fzTxt():"25:00"}</div><p class="empty" style="text-align:center;margin:4px 0 10px">${FZ?(FZ.mode==="w"?"Odaklan, telefonu bırak.":"Mola zamanı."):"Bugün tamamlanan odak: "+FZP()}</p><div class="row" style="justify-content:center">${FZ?`<button class="chip" data-fz="stop">Durdur</button>`:`<button class="btn" style="padding:11px 16px" data-fz="w">25 dk odak</button><button class="chip" data-fz="r">5 dk mola</button>`}</div></div>`;
}
setInterval(()=>{if(!FZ)return;if(Date.now()>=FZ.end){const w=FZ.mode==="w";FZ=null;if(w){try{localStorage.setItem("karakis-odak-"+day(),FZP()+1)}catch(x){}}try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(x){}render();return}const e=document.getElementById("fz");if(e)e.textContent=fzTxt()},1000);

/* bildirim (web push) */
const VAPID_PUB="BLxGZLx6y3dW1FClX4OxwHrj1c15zQ5kTn_uWWxSkDOKRKheCIR1M_oCtyvIvryHC6hmnDRsKj1lrACBTmdnK90";let PUSHON=null,PUSHMSG="";
const b64u=t=>{const b=atob((t+"=".repeat((4-t.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(b,c=>c.charCodeAt(0))};
async function pushState(){try{if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){PUSHON="no";return}const reg=await navigator.serviceWorker.ready;PUSHON=!!(await reg.pushManager.getSubscription())}catch(e){PUSHON="no"}}
async function pushEnable(){
  try{
    const p=await Notification.requestPermission();if(p!=="granted"){PUSHMSG="Bildirim izni verilmedi. Tarayıcı ayarlarından açabilirsin.";render();return}
    const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(VAPID_PUB)});
    const j=sub.toJSON();
    await sb.from("push_subs").delete().eq("endpoint",j.endpoint);
    const r=await sb.from("push_subs").insert({student_id:ME,endpoint:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth});
    if(r.error)throw new Error(r.error.message);
    PUSHON=true;PUSHMSG="Hatırlatmalar açık ✓";
  }catch(e){PUSHMSG="Açılamadı: "+(e&&e.message||e)}
  render();
}
async function pushDisable(){
  try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub){await sb.from("push_subs").delete().eq("endpoint",sub.endpoint);await sub.unsubscribe()}PUSHON=false;PUSHMSG="Hatırlatmalar kapatıldı."}catch(e){PUSHMSG="Kapatılamadı."}
  render();
}
function pushCard(){
  const body=PUSHON==="no"?`<p class="empty" style="margin:0">Bu cihazda bildirim desteklenmiyor. iPhone'da önce siteyi “Ana Ekrana Ekle” ile uygulama olarak kur, sonra buradan aç.</p>`
   :PUSHON===null?`<p class="empty" style="margin:0">Kontrol ediliyor…</p>`
   :`<p class="empty" style="margin:0 0 10px">Çalışmaya başlamadığın veya görevin kaldığı günlerde sana hatırlatma gelir.</p><div class="row" style="margin-top:0">${PUSHON?`<button class="chip" id="pushoff">🔕 Hatırlatmaları kapat</button>`:`<button class="btn" style="padding:11px 16px" id="pushon">🔔 Hatırlatmaları aç</button>`}</div>`;
  return `<div class="card"><h2>Hatırlatmalar</h2>${body}${PUSHMSG?`<p class="empty" style="margin:8px 0 0;font-size:14px">${esc(PUSHMSG)}</p>`:""}</div>`;
}
/* sekmeler */
function todayTasks(){
  const L=(TK[ME]||[]).filter(t=>t.task_date===day());if(!L.length)return"";
  return `<div class="card"><h2>Bugünün görevleri · ${L.filter(t=>t.done).length}/${L.length}</h2>${L.map(t=>taskRow(t,false)).join("")}</div>`;
}
function tasksTab(){
  const L=(TK[ME]||[]).filter(t=>t.task_date>=dayN(-3)),d=L.filter(t=>t.done).length;
  return `<div class="card"><h2>Haftalık görevlerim</h2>${L.length?`<p class="empty" style="margin:0 0 8px">${d}/${L.length} tamamlandı</p><div class="bar"><i style="width:${Math.round(d/L.length*100)}%"></i></div>${taskList(L,false)}`:`<p class="empty">Koçun henüz görev atamadı.</p>`}</div>${focusCard()}`;
}
function chatTab(){
  return `<div class="card"><h2>Yapay zekâ asistanın</h2><p class="empty" style="margin:0 0 10px;font-size:14px">Çalışma planı, deneme ve motivasyon konusunda sor. Deneme verilerine bakarak cevap verir. Resmî karar yerine geçmez; önemli konularda koçuna danış.</p>
  <div class="chat" id="chat">${CHAT.length?CHAT.map(m=>`<div class="cm ${m.role==="user"?"me":"ai"}">${esc(m.text)}</div>`).join(""):`<p class="empty">Örnek: “Bu hafta hangi konuya odaklanmalıyım?”</p>`}${CHATBUSY?`<div class="cm ai">Yazıyor…</div>`:""}</div>
  ${CHATERR?`<p style="color:var(--warn);margin:0 0 8px">${esc(CHATERR)}</p>`:""}
  <div class="row" style="margin-top:0"><input id="cin" type="text" maxlength="600" placeholder="Sorunu yaz…" style="flex:1;min-width:0"><button class="btn" style="padding:11px 16px" id="csend"${CHATBUSY?" disabled":""}>Gönder</button></div></div>`;
}
async function chatSend(){
  const el=document.getElementById("cin"),v=el?el.value.trim().slice(0,600):"";if(!v||CHATBUSY)return;
  CHAT.push({role:"user",text:v});CHAT=CHAT.slice(-8);CHATBUSY=true;CHATERR="";render();
  const r=await callFn("exam-insights",{action:"chat",messages:CHAT});
  CHATBUSY=false;if(r.reply)CHAT.push({role:"model",text:r.reply});else CHATERR=r.error||"Cevap alınamadı.";CHAT=CHAT.slice(-8);render();
}
function studentView(){
  const body=tab==="g"?tasksTab():tab==="d"?examCard()+netChartsCard(ME):tab==="h"?goalRoad(ME)+targetForm(ME,true)+badgeCard()+pushCard():tab==="k"?chatTab():todayTab();
  return `<nav class="side-nav bnav" aria-label="Öğrenci sekmeleri"><div class="side-brand"><span class="brand-mark">K</span><div><b>KARAKIŞ</b><small>ÖĞRENCİ PANELİ</small></div></div><div class="side-label">ÇALIŞMA ALANI</div>${TABS.map(([k,i,l])=>`<button data-tab="${k}" aria-current="${tab===k}"><span aria-hidden="true">${i}</span><span class="nav-label">${l}</span>${k==="b"?'<i class="nav-dot"></i>':""}</button>`).join("")}<div class="side-foot"><span class="side-avatar">${esc((NAME||"Ö").slice(0,1).toUpperCase())}</span><div><b>${esc(NAME||"Öğrenci")}</b><small>Gelişim yolculuğun</small></div></div></nav><div class="dashboard-main"><div class="page-intro"><div><div class="eyebrow">${fd(day()).toLocaleUpperCase("tr-TR")}</div><h1>${({"b":"Bugünün planı","g":"Görevlerim","d":"Deneme analizi","h":"Hedef yolculuğum","k":"Çalışma asistanım"})[tab]||"Panelim"}</h1><p>Her gün küçük bir adım, büyük bir değişim.</p></div><span class="status-pill"><i></i> Kişisel panelin</span></div>${tab==="b"?dailyActivityCard(): ""}${body}</div>`;
}

/* deneme: silme, düzeltme, elle ekleme */
async function exDel(id){
  if(!confirm("Bu deneme kaydı silinsin mi?"))return;
  const sid=ROLE==="coach"?sel:ME;
  await dbw(sb.from("exam_results").delete().eq("id",id).eq("student_id",sid));
  delete AIR[sid];await loadExams(sid);render();
}
function exEdit(id){
  const e=(EX[ME]||[]).find(x=>String(x.id)===String(id));if(!e)return;
  PX={editId:e.id,uyarilar:[],exam:{sinav_adi:e.exam_name,tarih:e.exam_date||"",tur:e.exam_type,puan:e.score,siralama:e.rank,konular:e.topics||[],soru_satiri:0,dersler:(e.subjects||[]).map(s=>({ders:s.ders,dogru:s.dogru,yanlis:s.yanlis,bos:s.bos,net:s.net,ogrenci_yuzde:s.ogrenci_yuzde==null?null:s.ogrenci_yuzde,kurum_yuzde:s.kurum_yuzde==null?null:s.kurum_yuzde}))}};
  tab="d";render();window.scrollTo(0,0);
}
async function addExam(){
  const net=parseFloat(document.getElementById("dnet").value);if(isNaN(net))return;
  const name=document.getElementById("dad").value.trim().slice(0,120)||"Deneme",tur=document.getElementById("dtur").value,date=document.getElementById("ddt").value;
  await dbw(sb.from("exam_results").insert({student_id:sel,exam_name:name,exam_date:date||null,exam_type:tur,total_net:net,subjects:[],topics:[],source:"manual",verified:true}));
  delete AIR[sel];await loadExams(sel);render();
}

/* koç: öğrenci yönetimi ve sınıf analizi */
function admMsg(){return ADMMSG?`<div class="card" style="border-color:${ADMMSG.err?"var(--warn)":"var(--acc)"}"><p style="margin:0 0 8px">${ADMMSG.err?esc(ADMMSG.err):esc(ADMMSG.t)}</p>${ADMMSG.err?"":`<p class="empty" style="font-size:13px;margin:0 0 8px">Bu bilgi bir daha gösterilmez; şimdi öğrenciye ilet.</p>`}<button class="chip" id="admok">Tamam</button></div>`:""}
function addStudentCard(){
  return `${admMsg()}<details class="card"><summary style="cursor:pointer;font-weight:700">➕ Yeni öğrenci ekle</summary><div class="row"><label>Ad Soyad<input id="sname" type="text" maxlength="60" style="width:200px"></label><button class="btn" style="padding:11px 16px" id="admadd">Hesap oluştur</button></div><p class="empty" style="font-size:13px;margin:0">Kullanıcı adı ve 6 haneli PIN otomatik üretilir.</p></details>`;
}
function adminCard(x){
  return `<div class="card"><h2>Hesap</h2>${admMsg()}<div class="row"><button class="chip" id="admreset">🔑 PIN sıfırla</button><button class="chip" id="admdel" style="border-color:var(--warn)">🗑 Öğrenciyi sil</button></div></div>`;
}
let ADMBUSY=false;
async function admRun(a){
  if(ADMBUSY)return;ADMBUSY=true;try{await admRun0(a)}finally{ADMBUSY=false}
}
async function admRun0(a){
  const p=STU.find(s=>s.id===sel);
  if(a==="add"){const n=document.getElementById("sname").value.trim();if(n.length<2)return;ADMMSG={t:"Hesap hazır"};const r=await callFn("admin-students",{action:"create",name:n});ADMMSG=r.error?{err:r.error}:{t:r.name+" · kullanıcı adı: "+r.username+" · PIN: "+r.pin}}
  if(a==="reset"){if(!p||!confirm(p.name+" için yeni PIN üretilsin mi? Eski PIN çalışmaz."))return;const r=await callFn("admin-students",{action:"reset",student_id:sel});ADMMSG=r.error?{err:r.error}:{t:r.name+" · kullanıcı adı: "+r.username+" · yeni PIN: "+r.pin}}
  if(a==="del"){if(!p||!confirm(p.name+" ve tüm kayıtları KALICI olarak silinsin mi? Bu geri alınamaz.")||!confirm("Emin misin? Son onay."))return;const r=await callFn("admin-students",{action:"delete",student_id:sel,confirm:true});if(r.error)ADMMSG={err:r.error};else{ADMMSG={t:p.name+" silindi."};sel=null}}
  try{await pullCoach()}catch(e){}render();
}
function classCard(){
  const by={};EXALL.forEach(e=>(by[e.student_id]=by[e.student_id]||[]).push(e));
  const m={};Object.entries(by).forEach(([sid,L])=>L.slice(-3).forEach(e=>(e.topics||[]).forEach(t=>{if(!t||!t.konu||num(t.yanlis)<=0)return;const k=t.ders+"|"+t.konu,o=m[k]=m[k]||{ders:t.ders,konu:t.konu,y:0,s:new Set()};o.y+=num(t.yanlis);o.s.add(sid)})));
  const top=Object.values(m).sort((a,b)=>b.s.size-a.s.size||b.y-a.y).slice(0,8),nm=id=>(STU.find(p=>p.id===id)||{}).name||"";
  const tdn=TKALL.filter(t=>t.done).length,has={},dn={};TKALL.forEach(t=>{has[t.student_id]=1;if(t.done)dn[t.student_id]=1});
  const idle=Object.keys(has).filter(id=>!dn[id]).map(nm).filter(Boolean);
  return `<div class="card"><h2>Sınıf analizi</h2>
  ${top.length?`<p class="empty" style="margin:0 0 6px">En çok yanlış yapılan konular (öğrenci başına son 3 deneme)</p>${top.map(o=>`<div class="subj"><span>${esc(o.ders)} · ${esc(o.konu)}</span><span>${o.s.size} öğrenci · ${o.y} yanlış</span></div>`).join("")}`:`<p class="empty">Konu bazlı veri olan deneme yüklendikçe burada ortak zayıf konular görünür.</p>`}
  <p class="empty" style="margin:10px 0 0">Görev tamamlama (son 7 gün): ${TKALL.length?"%"+Math.round(tdn/TKALL.length*100)+" ("+tdn+"/"+TKALL.length+")":"görev atanmadı"}${idle.length?" · hiç tamamlamayan: "+idle.map(esc).join(", "):""}</p></div>`;
}
function ui(t){
  const D=t.dataset,id=t.id;
  if(D.tab){tab=D.tab;render();window.scrollTo(0,0);return true}
  if(id==="guideok"){try{localStorage.setItem(GK(),"1")}catch(e){}render();return true}
  if(D.qdel!=null){const i=+D.qdel;if(S.qs[i]){const q=S.qs.splice(i,1)[0];log("Soru kaydı silindi ("+q.s+", "+q.n+")");save();render()}return true}
  if(D.tgsel){TGSEL[D.sid||ME]=D.tgsel;TGMSG="";render();return true}
  if(D.tgdel){targetDel(D.sid||ME,D.tgdel);return true}
  if(D.rd){ROADSEL[D.sid||ME]=D.rd;render();return true}
  if(D.csv){csvExport(D.csv);return true}
  if(id==="bkadd"){bulkAdd();return true}
  if(id==="pwa"){const p=document.getElementById("pt");window.open("https://wa.me/?text="+encodeURIComponent(p.value),"_blank","noopener");return true}
  if(id==="psh"){const p=document.getElementById("pt");if(navigator.share)navigator.share({text:p.value}).catch(()=>{});else{const c=document.getElementById("cp");if(c)c.click()}return true}
  if(D.tk){togTask(D.tk);return true}
  if(D.tkdel){delTask(D.tkdel);return true}
  if(D.exdel){exDel(D.exdel);return true}
  if(D.exedit){exEdit(D.exedit);return true}
  if(D.fz){FZ=D.fz==="stop"?null:{mode:D.fz,end:Date.now()+(D.fz==="w"?25:5)*60000};render();return true}
  const m={pushon:pushEnable,pushoff:pushDisable,csend:chatSend,tkadd:addTask,planrun:planRun,planok:planOk,plandel:planDel,adddn:addExam};
  if(m[id]){m[id]();return true}
  if(id==="admadd"){admRun("add");return true}
  if(id==="admreset"){admRun("reset");return true}
  if(id==="admdel"){admRun("del");return true}
  if(id==="admok"){ADMMSG=null;render();return true}
  return false;
}
document.addEventListener("click",e=>{
  const t=e.target.closest("button");if(!t)return;
  rollover();
  if(ui(t))return;
  if(t.id==="t1"){view="s";render()}else if(t.id==="t2"){view="c";sel=null;render()}
  else if(t.dataset.cnav){const el=document.getElementById(t.dataset.cnav);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});document.querySelectorAll(".side-nav [data-cnav]").forEach(b=>b.setAttribute("aria-current",String(b===t)))}else if(t.dataset.backnav){sel=null;selDay=null;render()}else if(t.dataset.me){meth=t.dataset.me;render()}
  else if(t.dataset.f){S[t.dataset.f]=+t.dataset.v;save();render()}
  else if(t.id==="savth"){const g=id=>+document.getElementById(id).value,c=(v,a,b,d)=>isNaN(v)||!v?d:Math.min(b,Math.max(a,v));C.th={gap:c(g("th1"),1,5,2),drop:c(g("th2"),10,95,60),mood:c(g("th3"),1,4,2),sleep:c(g("th4"),3,9,6)};saveC();render()}
  else if(t.id==="cp"){const p=document.getElementById("pt");p.select();try{navigator.clipboard.writeText(p.value).then(()=>{t.textContent="Kopyalandı ✓"},()=>{t.textContent="Metin seçildi, kopyala"})}catch(e){t.textContent="Metin seçildi, kopyala"}}
  else if(t.id==="setgoal"){const q=+document.getElementById("gq").value||0,m=+document.getElementById("gm").value||0;if(!q&&!m)return;const gs=document.getElementById("gs").value;C.goals[sel]={day:day(),s:gs,q,m};render();dbw(sb.from("goals").upsert({student_id:sel,day:day(),subj:gs,q,m}))}
  else if(t.id==="delgoal"){delete C.goals[sel];render();dbw(sb.from("goals").delete().eq("student_id",sel).eq("day",day()))}
  else if(t.id==="addnote"){const v=document.getElementById("note").value.trim();if(!v)return;(C.notes[sel]=C.notes[sel]||[]).push({t:Date.now(),x:v});render();dbw(sb.from("notes").insert({student_id:sel,body:v.slice(0,1000)}))}
  else if(t.id==="tgsave")targetSave(t.dataset.sid||ME);
  else if(t.id==="exgo")examExtract();
  else if(t.id==="exsave")examSave();
  else if(t.id==="excancel"){PX=null;setEx("");render()}
  else if(t.id==="airun"){runInsights(t.dataset.sid||ME,t.dataset.force==="1"||t.dataset.sid===ME)}
  else if(t.id==="aiping")aiPing();
  else if(t.id==="login")doLogin();
  else if(t.id==="out"){logout()}
  else if(t.id==="back"){sel=null;selDay=null;render()}
  else if(t.id==="backhist"){selDay=null;render()}
  else if(t.dataset.per){per=t.dataset.per;render()}
  else if(t.dataset.d){selDay=t.dataset.d===day()?null:t.dataset.d;render();if(selDay&&!DSTATE[sel+"|"+selDay]){const id=sel,d=selDay;loadDay(id,d).then(()=>{if(sel===id&&selDay===d)render()})}}
  else if(t.dataset.i){sel=t.dataset.i;selDay=null;render();const id=sel;Promise.all([loadHist(id),loadExams(id),loadReport(id),loadTarget(id),loadTasks(id),loadPlan(id)]).then(()=>{if(sel===id)render()})}
  else if(t.id==="addq")addQ();
  else if(t.id==="reset"){if(confirm("Bugünün verisi silinsin mi?")){S=fresh();save();render()}}
  else if(t.dataset.s){subj=t.dataset.s;render()}
  else if(t.dataset.m){S.mood=+t.dataset.m;log("Gün puanım: "+S.mood+"/5");save();render()}
  else if(t.dataset.a)act(t.dataset.a);
});
const liveNow=()=>S.status==="study"||S.status==="break";
const clockMs=()=>liveNow()?curNet():total();
const clockSub=()=>liveNow()?`${S.status==="break"?"☕ Mola · süre durdu":"⏱ Bu dersin süresi"} · Bugün toplam ${short(total())}`:"Bugünkü net çalışma süresi";
let WL=null;
async function wakeSync(){try{if(!("wakeLock" in navigator))return;if(S.status==="study"&&document.visibilityState==="visible"){if(!WL){WL=await navigator.wakeLock.request("screen");WL.addEventListener("release",()=>{WL=null})}}else if(WL){await WL.release();WL=null}}catch(e){WL=null}}
function clockTick(){
  const c=document.getElementById("clock");
  if(c&&ROLE==="student"&&view==="s"&&tab==="b"){c.textContent=dur(clockMs());const u=document.getElementById("clocksub");if(u)u.textContent=clockSub()}
  try{document.title=(S&&S.status==="study")?dur(curNet())+" · Karakış Takip":"Karakış Takip"}catch(e){}
}
setInterval(()=>{clockTick();wakeSync()},1000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")wakeSync()});
let ME=null,ROLE=null,NAME="",STU=[],ROWS=[];
let EXMSG="",PX=null,AIBUSY=null;const EX={},AIR={},TG={},TGSEL={},ROADSEL={},ROADSEEN={};let BUMP=null;const GT=["TYT","AYT","LGS"];
const setEx=m=>{EXMSG=m;const e=document.getElementById("exmsg");if(e)e.textContent=m};
async function callFn(n,body){
  try{
    const {data:{session}}=await sb.auth.getSession();
    const r=await fetch(SUPABASE_URL+"/functions/v1/"+n,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+(session&&session.access_token),apikey:SUPABASE_KEY},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    return r.ok?j:{error:j.error||("Sunucu hatası ("+r.status+")")};
  }catch(e){return {error:"Bağlantı kurulamadı."}}
}
async function loadExams(id){try{const {data,error}=await sb.from("exam_results").select("*").eq("student_id",id).order("exam_date",{ascending:true,nullsFirst:true}).order("created_at",{ascending:true});if(error)throw error;EX[id]=data||[]}catch(e){EX[id]=EX[id]||[]}}
async function loadTarget(id){try{const {data,error}=await sb.from("exam_targets").select("*").eq("student_id",id).order("exam_type");if(error)throw error;TG[id]=data||[]}catch(e){if(!(id in TG))TG[id]=[]}}
const tgOf=(sid,tur)=>(TG[sid]||[]).find(g=>g.exam_type===tur)||null;
// Yapay zekâ ile aynı seçim: son denemenin türüne uyan hedef, yoksa ilk hedef.
const tgPick=sid=>{const g=TG[sid]||[],L=EX[sid]||[],l=L[L.length-1];return g.find(x=>l&&x.exam_type===l.exam_type)||g[0]||null};
const tgKey=t=>JSON.stringify(t?[t.exam_type,Number(t.target_net),t.target_score==null?null:Number(t.target_score)]:null);
const goalTxt=g=>g?`${esc(g.exam_type)} · ${num(g.target_net)} net${g.university||g.department?" · "+esc([g.university,g.department].filter(Boolean).join(" – ")):""}`:"";
function targetForm(sid,mine){
  const gl=TG[sid]||[];
  const tur=GT.includes(TGSEL[sid])?TGSEL[sid]:(gl.find(g=>GT.includes(g.exam_type))||{exam_type:"TYT"}).exam_type;
  const t=tgOf(sid,tur)||{};
  const chips=GT.map((x,i)=>`<button class="goal-type${x===tur?" selected":""}" data-tgsel="${x}" data-sid="${sid}" aria-pressed="${x===tur}"><span class="goal-icon">${["✦","↗","◎"][i]}</span><span><b>${x}</b><small>${x==="TYT"?"Temel yeterlilik":x==="AYT"?"Alan yeterlilik":"Liselere geçiş"}</small></span><span class="goal-check">${tgOf(sid,x)?"✓":"+"}</span></button>`).join("");
  const list=gl.length?`<div style="margin:6px 0 10px">${gl.map(g=>`<div class="subj"><span>🎯 ${goalTxt(g)}</span></div>`).join("")}</div>`:"";
  return `<div class="card goal-editor" id="${mine?"student-goal-editor":"detail-target"}"><div class="goal-editor-head"><span class="goal-emblem">🎯</span><div><div class="eyebrow">HEDEF TASARIMI</div><h2>${mine?"Hedeflerini şekillendir":"Öğrencinin hedefleri"}</h2></div></div>
  <p class="empty" style="margin:0 0 8px">${mine?"TYT, AYT ve LGS için hedeflerini ayrı ayrı gir. İstediğin üniversite ve bölümü de yazabilirsin. Çalıştıkça hedefe yaklaşmanı ana ekranda göreceksin.":"Her tür için ayrı hedef girebilirsin; öğrenci de kendi ekranında görür ve değiştirebilir."}</p>
  ${list}
  <div class="goal-grid" role="group" aria-label="Hedef türü">${chips}</div>
  <div class="row"><label>${esc(tur)} hedef net<input id="tgn" type="number" min="1" max="500" step="0.25" inputmode="decimal" style="width:100px" value="${t.target_net==null?"":esc(t.target_net)}"></label>
  <label>Hedef puan (isteğe bağlı)<input id="tgp" type="number" min="0" max="600" step="0.1" inputmode="decimal" style="width:100px" value="${t.target_score==null?"":esc(t.target_score)}"></label></div>
  <div class="row"><label>İstediğim üniversite<input id="tgu" type="text" maxlength="80" style="width:100%;min-width:220px" value="${esc(t.university||"")}"></label></div>
  <div class="row"><label>İstediğim bölüm<input id="tgb" type="text" maxlength="80" style="width:100%;min-width:220px" value="${esc(t.department||"")}"></label></div>
  <div class="row"><label>Not (isteğe bağlı)<input id="tgs" type="text" maxlength="120" style="width:100%;min-width:220px" value="${esc(t.note||"")}"></label></div>
  <p id="tgerr" class="empty" style="margin:6px 0;color:var(--warn)">${esc(TGMSG)}</p>
  <div class="row"><button class="btn" id="tgsave" data-sid="${sid}" style="padding:10px 16px">${esc(tur)} hedefini kaydet</button>${tgOf(sid,tur)?`<button class="chip" data-tgdel="${tur}" data-sid="${sid}">Bu hedefi sil</button>`:""}</div></div>`;
}
let TGMSG="";
async function targetSave(sid){
  const err=m=>{TGMSG=m;const e=document.getElementById("tgerr");if(e)e.textContent=m};
  const tur=GT.includes(TGSEL[sid])?TGSEL[sid]:((TG[sid]||[]).find(g=>GT.includes(g.exam_type))||{exam_type:"TYT"}).exam_type,net=parseFloat(document.getElementById("tgn").value),ps=document.getElementById("tgp").value.trim(),puan=ps===""?null:parseFloat(ps),note=document.getElementById("tgs").value.trim().slice(0,120),uni=document.getElementById("tgu").value.trim().slice(0,80),bol=document.getElementById("tgb").value.trim().slice(0,80);
  if(!GT.includes(tur)){err("Tür seç.");return}
  if(!(net>0&&net<=500)){err("Hedef net 1 ile 500 arasında olmalı.");return}
  if(puan!==null&&!(puan>=0&&puan<=600)){err("Hedef puan 0 ile 600 arasında olmalı.");return}
  const row={student_id:sid,exam_type:tur,target_net:net,target_score:puan,note:note||null,university:uni||null,department:bol||null,updated_at:new Date().toISOString()};
  const {error}=await sb.from("exam_targets").upsert(row);
  if(error){err("Kaydedilemedi: "+error.message);return}
  TG[sid]=(TG[sid]||[]).filter(g=>g.exam_type!==tur).concat([row]);TGSEL[sid]=tur;ROADSEL[sid]=tur;delete ROADSEEN[sid+"|"+tur];
  TGMSG=tur+" hedefi kaydedildi. Analizi yenilersen yapay zekâ hedef farkını da yorumlar.";render();
}
async function targetDel(sid,tur){
  if(!confirm(tur+" hedefi silinsin mi?"))return;
  const {error}=await sb.from("exam_targets").delete().eq("student_id",sid).eq("exam_type",tur);
  if(error){TGMSG="Silinemedi: "+error.message;render();return}
  TG[sid]=(TG[sid]||[]).filter(g=>g.exam_type!==tur);TGMSG=tur+" hedefi silindi.";render();
}
// ---- Hedef yolculuğu: son deneme neti / hedef net oranı yolda ilerler; çalışma ve soru bu kartta görünür.
function weekEff(sid){
  const H=Object.assign({},HIST[sid]||{});if(sid===ME)H[day()]=snap();
  const sum=(a,b)=>{let m=0,q=0;for(let i=a;i<=b;i++){const r=H[dayN(-i)];if(r){m+=num(r.m);q+=num(r.q)}}return {m,q}};
  return {w:sum(0,6),p:sum(7,13)};
}
const hm2=m=>m>=60?Math.floor(m/60)+" sa "+(m%60)+" dk":m+" dk";
function goalRoad(sid){
  const gl=TG[sid]||[],mine=sid===ME;
  if(!gl.length)return mine?`<div class="card"><h2>🎯 Hedef yolculuğum</h2><p class="empty" style="margin:0">Henüz hedefin yok. <b>Hedefim</b> sekmesinden TYT, AYT veya LGS için net, üniversite ve bölüm ekle; her çalıştığında hedefe nasıl yaklaştığını burada göreceksin.</p></div>`:"";
  const sel=ROADSEL[sid],g=(sel&&tgOf(sid,sel))||tgPick(sid)||gl[0],tur=g.exam_type,hn=num(g.target_net);
  const nets=(EX[sid]||[]).filter(e=>e.exam_type===tur&&e.total_net!=null).map(e=>num(e.total_net)),son=nets.length?nets[nets.length-1]:null;
  const p=son==null||hn<=0?0:Math.max(0,Math.min(1,son/hn)),pc=Math.round(p*100),kalan=son==null?null:Math.max(0,Math.round((hn-son)*100)/100);
  const key=sid+"|"+tur,seen=ROADSEEN[key]===pc;ROADSEEN[key]=pc;
  const b=mine&&BUMP?BUMP:null;if(mine)BUMP=null;
  const live=mine&&S&&S.status==="study";
  const {w,p:pv}=weekEff(sid),tr=pv.q+pv.m>0?Math.round(((w.q+w.m)/(pv.q+pv.m)-1)*100):null;
  const today=mine?{q:solved(),m:Math.round(total()/60000)}:null;
  const chips=gl.length>1?`<div class="chips" style="margin-bottom:8px">${gl.map(x=>`<button class="chip" data-rd="${x.exam_type}" data-sid="${sid}" aria-pressed="${x.exam_type===tur}">${esc(x.exam_type)}</button>`).join("")}</div>`:"";
  const msg=son==null?`Bu tür için henüz deneme sonucu yok. Bir ${esc(tur)} denemesi ekle, yolculuk başlasın.`:p>=1?`🎯 Hedefe ulaştın! Yeni bir hedef koymayı düşünebilirsin.`:`Hedefe <b>%${pc}</b> yakınsın · <b>${kalan}</b> net kaldı`;
  return `<div class="card road${seen?" still":""}${live?" live":""}"><h2>🎯 ${mine?"Hedef yolculuğum":"Hedef yolculuğu"}</h2>${chips}
  <div class="rdh">${g.university?`🎓 <b>${esc(g.university)}</b>`:`<b>${esc(tur)} hedefi</b>`}${g.department?` · ${esc(g.department)}`:""}</div>
  <div class="rd" style="--p:${pc}"><div class="rdt"><u style="left:25%"></u><u style="left:50%"></u><u style="left:75%"></u><span class="rdf"></span>
  <span class="rda"><span class="rdi${b?" bump":""}">🚀</span><i class="fl"></i>${b?`<b class="plus">${b.q?"+"+b.q+" soru":"+"+b.m+" dk"}</b>`:""}</span></div>
  <div class="rdm"><span>🏁 ${son==null?"Başlangıç":"Son net: "+son}</span><span>🎓 ${hn} net</span></div></div>
  <p style="margin:10px 0 4px">${msg}</p>
  <p class="empty" style="margin:0;font-size:13px">Yol, son ${esc(tur)} netinin hedef netine oranını gösterir. Çalışmaların bu neti yükseltir.</p>
  <div class="rdc"><span>${mine?"Bugün":"Bu hafta"}: <b>${mine?today.q+" soru · "+hm2(today.m):w.q+" soru · "+hm2(w.m)}</b></span>${mine?`<span>Bu hafta: <b>${w.q} soru · ${hm2(w.m)}</b>${tr==null?"":` <em style="color:${tr>=0?"var(--ok)":"var(--warn)"}">${tr>=0?"▲":"▼"} %${Math.abs(tr)}</em>`}</span>`:""}</div></div>`;
}
function lineSVG(pts,target){
  const W=320,H=130,pl=30,pr=10,pt=12,pb=22;
  const ys=pts.map(q=>q.y).concat(target==null?[]:[target]),lo=Math.floor(Math.min(...ys)-2),hi=Math.ceil(Math.max(...ys)+2),rg=Math.max(1,hi-lo);
  const X=i=>pl+(pts.length>1?i*(W-pl-pr)/(pts.length-1):0),Y=v=>pt+(hi-v)*(H-pt-pb)/rg;
  const path=pts.map((q,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(q.y).toFixed(1)).join(" ");
  const dots=pts.map((q,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(q.y).toFixed(1)}" r="3.5" fill="var(--gold)"/><text x="${X(i).toFixed(1)}" y="${(Y(q.y)-7).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--ink)">${num(q.y)}</text>`).join("");
  const tl=target==null?"":`<line x1="${pl}" x2="${W-pr}" y1="${Y(target).toFixed(1)}" y2="${Y(target).toFixed(1)}" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W-pr}" y="${(Y(target)-4).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--ok)">hedef ${num(target)}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Net grafiği" style="display:block"><line x1="${pl}" x2="${pl}" y1="${pt}" y2="${H-pb}" stroke="var(--line)"/><line x1="${pl}" x2="${W-pr}" y1="${H-pb}" y2="${H-pb}" stroke="var(--line)"/><text x="${pl-4}" y="${pt+4}" text-anchor="end" font-size="10" fill="var(--mute)">${hi}</text><text x="${pl-4}" y="${H-pb}" text-anchor="end" font-size="10" fill="var(--mute)">${lo}</text>${tl}<path d="${path}" fill="none" stroke="var(--navy2)" stroke-width="2"/>${dots}</svg>`;
}
function netChartsCard(sid){
  const L=EX[sid]||[],all=L.filter(e=>e.total_net!=null);
  const turs=[...new Set(all.map(e=>e.exam_type))].filter(t=>all.filter(e=>e.exam_type===t).length>=2);
  if(!turs.length)return `<div class="card"><h2>Net grafiği</h2><p class="empty">Grafik için aynı türden en az 2 deneme sonucu gerekli.</p></div>`;
  return turs.map(tur=>{
  const E=all.filter(e=>e.exam_type===tur),t=tgOf(sid,tur);
  const hedef=t?Number(t.target_net):null;
  const son=num(E[E.length-1].total_net),fark=hedef==null?"":` · hedefe ${Math.round((hedef-son)*100)/100>0?Math.round((hedef-son)*100)/100+" net kaldı":"ulaşıldı 🎯"}`;
  const by={};
  E.forEach((e,i)=>(e.subjects||[]).forEach(d=>{if(typeof d.net==="number")(by[d.ders]=by[d.ders]||[]).push(d.net)}));
  const spark=Object.entries(by).filter(([,a])=>a.length>=2).map(([k,a])=>{
    const dl=Math.round((a[a.length-1]-a[a.length-2])*100)/100,c=dl>0?"var(--ok)":dl<0?"var(--warn)":"var(--mute)";
    return `<div class="subj"><span>${esc(k)}</span><span>${a.map(num).join(" → ")} <b style="color:${c}">${dl>0?"▲ +":dl<0?"▼ ":"= "}${dl}</b></span></div>`}).join("");
  return `<div class="card"><h2>${esc(tur)} toplam net grafiği</h2><p class="empty" style="margin:0 0 6px">Son deneme: ${son} net${fark}</p>
  ${lineSVG(E.map(e=>({y:num(e.total_net)})),hedef)}
  ${spark?`<h2 style="font-size:15px;margin-top:12px">Derslere göre son değişim</h2>${spark}`:""}</div>`}).join("");
}
async function loadReport(id){try{const {data,error}=await sb.from("ai_reports").select("content").eq("student_id",id).maybeSingle();if(error)throw error;AIR[id]=data&&data.content&&data.content.report?data.content:null}catch(e){if(!(id in AIR))AIR[id]=null}}
async function prepImage(file){
  try{
    const bmp=await createImageBitmap(file),sc=Math.min(1,2400/Math.max(bmp.width,bmp.height)),c=document.createElement("canvas");
    c.width=Math.round(bmp.width*sc);c.height=Math.round(bmp.height*sc);c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    return {mime:"image/jpeg",b64:c.toDataURL("image/jpeg",.88).split(",")[1]};
  }catch(e){
    return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({mime:file.type||"image/jpeg",b64:String(r.result).split(",")[1]});r.onerror=rej;r.readAsDataURL(file)});
  }
}
const readB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]||"");r.onerror=rej;r.readAsDataURL(f)});
async function examExtract(){
  const f=document.getElementById("exf").files[0];
  if(!f){setEx("Önce bir görsel veya PDF seç.");return}
  const pdf=f.type==="application/pdf"||/\.pdf$/i.test(f.name||"");
  if(pdf){
    if(f.size>6.5e6){setEx("PDF çok büyük (en fazla yaklaşık 6 MB). Sayfa sayısını azaltıp tekrar dene.");return}
    setEx("PDF okunuyor, 15-30 saniye sürebilir…");
    let b64;try{b64=await readB64(f)}catch(e){setEx("PDF açılamadı.");return}
    const r=await callFn("exam-extract",{image:b64,mime:"application/pdf"});
    if(r.error){setEx(r.error);return}
    PX={exam:r.exam,uyarilar:r.uyarilar||[]};setEx("");render();return;
  }
  if(f.size>15e6){setEx("Görsel çok büyük (en fazla 15 MB).");return}
  setEx("Görsel okunuyor, 10-20 saniye sürebilir…");
  let im;try{im=await prepImage(f)}catch(e){setEx("Görsel açılamadı.");return}
  const r=await callFn("exam-extract",{image:im.b64,mime:im.mime});
  if(r.error){setEx(r.error);return}
  PX={exam:r.exam,uyarilar:r.uyarilar||[]};setEx("");render();
}
const netOf=(d,y,k)=>Math.round((d-y/k)*100)/100;
function recalcExam(){
  if(!PX)return;
  const k=document.getElementById("ext").value==="LGS"?3:4;let tot=0,all=true;
  PX.exam.dersler.forEach((_,i)=>{
    const v=[0,1,2].map(j=>document.querySelector('[data-rx="'+i+'"][data-c="'+j+'"]').value);
    const el=document.getElementById("nt"+i);
    if(v.some(x=>x==="")){el.textContent="–";all=false}else{const n=netOf(+v[0],+v[1],k);tot+=n;el.textContent=n+" net"}
  });
  document.getElementById("extot").textContent="Toplam net: "+(all?Math.round(tot*100)/100:"–");
}
function examForm(){
  const e=PX.exam,tur=e.tur==="BILINMIYOR"?"":e.tur;
  const row=(d,i)=>`<div class="row" style="margin-top:8px;align-items:center"><span style="flex:1;min-width:110px;font-weight:600">${esc(d.ders)}</span>${["dogru","yanlis","bos"].map((c,j)=>`<label>${["D","Y","B"][j]}<input data-rx="${i}" data-c="${j}" type="number" min="0" inputmode="numeric" style="width:64px;${d[c]==null?"border-color:var(--warn)":""}" value="${d[c]==null?"":num(d[c])}"></label>`).join("")}<span id="nt${i}" style="min-width:64px;text-align:right">${d.net==null?"–":num(d.net)+" net"}</span></div>`;
  return `<div class="card"><h2>${PX.editId?"Deneme kaydını düzelt":"Okunan sonucu kontrol et"}</h2>
  ${PX.uyarilar.length?`<div class="card" style="border-color:var(--warn);padding:10px;margin:0 0 10px">${PX.uyarilar.map(u=>`<div style="font-size:14px">⚠️ ${esc(u)}</div>`).join("")}</div>`:""}
  <div class="row" style="margin-top:0"><label>Deneme adı<input id="exn" type="text" maxlength="120" style="width:180px" value="${esc(e.sinav_adi||"")}"></label><label>Tarih<input id="exd" type="date" style="width:150px" value="${esc(e.tarih||"")}"></label><label>Tür<select id="ext">${["","TYT","AYT","LGS","BRANS"].map(t=>`<option value="${t}"${t===tur?" selected":""}>${t||"Seç"}</option>`).join("")}</select></label></div>
  ${(e.dersler||[]).length?e.dersler.map(row).join(""):`<p class="empty">Görselden ders satırı okunamadı. İptal edip daha net bir görsel dene.</p>`}
  <p class="empty" id="extot" style="margin:10px 0 0">Toplam net: ${e.dersler.every(d=>d.net!=null)?Math.round(e.dersler.reduce((a,d)=>a+d.net,0)*100)/100:"–"}</p>
  <p class="empty" style="font-size:13px;margin:4px 0">Turuncu çerçeveli alanlar okunamadı, kendin yaz. Netler yazdığın doğru ve yanlıştan otomatik hesaplanır.${(e.konular||[]).length&&!PX.editId?" Görselde "+(e.soru_satiri||0)+" soru satırı okundu, "+e.konular.length+" konu kaydedilecek.":""}</p>
  <p id="exerr" style="color:var(--warn);margin:4px 0"></p>
  <div class="row"><button class="btn" id="exsave">Onayla ve kaydet</button><button class="chip" id="excancel">İptal</button></div></div>`;
}
async function examSave(){
  const err=m=>{document.getElementById("exerr").textContent=m};
  const e=PX.exam,tur=document.getElementById("ext").value,name=document.getElementById("exn").value.trim().slice(0,120),date=document.getElementById("exd").value;
  if(!tur||!name){err("Deneme adı ve türü gerekli.");return}
  if(!e.dersler.length){err("Kaydedilecek ders satırı yok.");return}
  const k=tur==="LGS"?3:4,subs=[];let okc=0,fixc=0,missc=0;
  for(let i=0;i<e.dersler.length;i++){
    const v=[0,1,2].map(j=>document.querySelector('[data-rx="'+i+'"][data-c="'+j+'"]').value);
    if(v.some(x=>x===""||+x<0)){err("Boş kalan doğru, yanlış ve boş alanlarını doldur.");return}
    const [d,y,b]=v.map(Number);
    [d,y,b].forEach((x,j)=>{const a=e.dersler[i][["dogru","yanlis","bos"][j]];if(a==null)missc++;else if(a===x)okc++;else fixc++});
    subs.push({ders:e.dersler[i].ders,dogru:d,yanlis:y,bos:b,net:netOf(d,y,k),ogrenci_yuzde:e.dersler[i].ogrenci_yuzde??null,kurum_yuzde:e.dersler[i].kurum_yuzde??null});
  }
  if(!PX.editId&&(EX[ME]||[]).some(x=>x.exam_name===name&&(x.exam_date||"")===date)&&!confirm("Aynı adla bir deneme zaten kayıtlı. Yine de kaydedilsin mi?"))return;
  const total=Math.round(subs.reduce((a,s)=>a+s.net,0)*100)/100;
  const rec={exam_name:name,exam_date:date||null,exam_type:tur,total_net:total,score:e.puan,rank:e.siralama,subjects:subs,topics:e.konular||[]};
  const {error}=PX.editId?await sb.from("exam_results").update(rec).eq("id",PX.editId).eq("student_id",ME):await sb.from("exam_results").insert({student_id:ME,...rec,source:"ai_image",verified:true,extraction_meta:{okunan:okc+fixc,dogru_okunan:okc,duzeltilen:fixc,okunamayan:missc,uyari:PX.uyarilar.length,soru_satiri:e.soru_satiri||0}});
  if(error){err("Kaydedilemedi: "+error.message);return}
  PX=null;await loadExams(ME);setEx("Kaydedildi ✓ Analiz hazırlanıyor…");render();runInsights(ME,true);
}
async function runInsights(sid,force){
  AIBUSY=sid;render();
  const r=await callFn("exam-insights",{student_id:sid,force:!!force});
  AIBUSY=null;
  if(r.error)setEx(r.error);else{setEx("");if(r.report)AIR[sid]={report:r.report,stats:r.stats}}
  render();
}
async function aiPing(){
  const el=document.getElementById("aipo");el.textContent="Test ediliyor…";
  const r=await callFn("exam-insights",{ping:true});
  el.textContent=r.error?("Hata: "+r.error):r.ok?(r.model_kullanilabilir?"✓ Bağlantı çalışıyor, model: "+r.model:"Anahtar çalışıyor ama model ("+r.model+") bulunamadı. Kullanılabilir: "+(r.flash_modeller||[]).join(", ")):("Gemini anahtarı kabul edilmedi (kod "+r.status+")");
}
function reportHTML(R,title,sid){
  const r=R.report||{},s=R.stats||{},hd=s.hedef||null,stale=sid!=null&&tgKey(tgPick(sid))!==tgKey(hd&&{exam_type:hd.tur,target_net:hd.hedef_net,target_score:hd.hedef_puan}),lv={YUKSEK:"Yüksek",ORTA:"Orta",DUSUK:"Düşük"};
  const li=a=>(a||[]).map(x=>`<li>${esc(x)}</li>`).join("");
  const ders=(s.dersler||[]).map(d=>`<div class="subj"><span>${esc(d.ders)}</span><span>${d.onceki_net==null?num(d.son_net)+" net":num(d.onceki_net)+" → "+num(d.son_net)+" ("+(num(d.fark)>0?"+":"")+num(d.fark)+")"}${d.egilim?" · "+esc(d.egilim):""}</span></div>`).join("");
  const yor=(r.ders_yorumlari||[]).map(d=>`<div class="empty" style="font-size:14px;margin-top:4px"><b>${esc(d.ders)}:</b> ${esc(d.yorum)}</div>`).join("");
  const pr=(r.oncelikler||[]).map(o=>`<div class="card" style="margin:10px 0 0;padding:12px"><b>${esc(o.ders)}${o.konu?" · "+esc(o.konu):""}</b> <span class="empty">· öncelik: ${esc(lv[o.seviye]||"Orta")}${o.kanit_turu==="DERS_NETI"?" · ders neti temelli":""}</span><div class="empty" style="margin-top:6px">${esc(o.gerekce)}</div><div style="margin-top:6px;font-size:15px"><b>Yöntem:</b> ${esc(o.calisma_yontemi)}<br><b>Miktar:</b> ${esc(o.miktar)}<br><b>Mini test:</b> ${esc(o.mini_test)}</div></div>`).join("");
  const h2=t=>`<h2 style="font-size:15px;margin-top:14px">${t}</h2>`;
  const tek=(s.tekrar_eden_konular||[]).slice(0,8).map(o=>`<div class="subj"><span>${esc(o.ders)} · ${esc(o.konu)}</span><span>${num(o.yanlis_sinav)} denemede yanlış</span></div>`).join("");
  const zay=(s.konular||[]).slice(0,12).map(o=>`<div class="subj"><span>${esc(o.ders)} · ${esc(o.konu)}</span><span>${num(o.yanlis)} yanlış${num(o.bos)?" · "+num(o.bos)+" boş":""}${o.sinav>1?" · "+num(o.sinav)+" denemede":""}</span></div>`).join("");
  const alt=(s.dersler||[]).filter(d=>d.kurumun_altinda===true).map(d=>`<div class="subj"><span>${esc(d.ders)}</span><span>%${num(d.son_ogrenci_yuzde)} (kurum %${num(d.son_kurum_yuzde)})</span></div>`).join("");
  return `<div class="card"><h2>${title||"Yapay zekâ gelişim analizi"}</h2><p style="margin:0 0 6px">${esc(r.ozet)}</p><p class="empty" style="margin:0">${esc(r.egilim)}</p>
  ${ders?h2("Ders bazlı değişim (kayıtlı denemelerden hesaplandı)")+ders+yor:""}
  ${zay?h2(tek?"Yanlış ve boş bırakılan diğer konular":"Yanlış ve boş bırakılan konular (kayıtlı denemelerden hesaplandı)")+zay+((s.deneme_sayisi||0)<2?`<p class="empty" style="font-size:13px;margin:6px 0 0">Tek denemede görülen eksikler “olası eksik”tir; ikinci denemeyle kesinleşir.</p>`:""):""}
  ${tek?h2("Tekrar eden konu eksikleri (birden çok denemede yanlış)")+tek:""}${alt?h2("Kurum ortalamasının altındaki dersler")+alt:""}
  ${(r.guclu_yonler||[]).length?h2("Güçlü yönler")+`<ul class="tl">${li(r.guclu_yonler)}</ul>`:""}
  ${(r.gelistirilecek_alanlar||[]).length?h2("Geliştirilecek alanlar")+`<ul class="tl">${li(r.gelistirilecek_alanlar)}</ul>`:""}
  ${pr?h2("Öncelikli konular ve çalışma önerisi")+pr:""}
  ${hd?h2("Hedef durumu")+`<div class="subj"><span>${esc(hd.tur)} hedefi: ${num(hd.hedef_net)} net${hd.hedef_puan==null?"":" · "+num(hd.hedef_puan)+" puan"}</span><span>${hd.son_net==null?"Henüz deneme yok":"Son: "+num(hd.son_net)+" · "+(num(hd.kalan_net)>0?num(hd.kalan_net)+" net kaldı":"hedefe ulaşıldı")}</span></div>${hd.son_3_ortalama==null?"":`<div class="subj"><span>Son 3 deneme ortalaması</span><span>${num(hd.son_3_ortalama)} net</span></div>`}${hd.not?`<div class="empty" style="font-size:13px;margin-top:4px">Not: ${esc(hd.not)}</div>`:""}${r.hedef_yorumu?`<p class="empty" style="font-size:14px;margin:8px 0 0">${esc(r.hedef_yorumu)}</p>`:""}`:""}
  ${stale?`<p class="empty" style="color:var(--warn);font-size:13px">Hedef değişti. Analizi yenilersen yapay zekâ yeni hedefe göre yorumlar.</p>`:""}
  ${(r.koc_basliklari||[]).length?h2("Görüşme başlıkları (koç)")+`<ul class="tl">${li(r.koc_basliklari)}</ul>`:""}
  ${r.veri_notu?`<p class="empty" style="font-size:13px;margin:12px 0 0">${esc(r.veri_notu)}</p>`:""}
  <p class="empty" style="font-size:12px;margin:8px 0 0">Bu analiz yapay zekâ ile üretilmiştir, kesin bir sonuç değil bir rehberdir.</p></div>`;
}
function aiReportCard(sid,title){
  if(AIBUSY===sid)return `<div class="card"><h2>Yapay zekâ analizi</h2><p class="empty">Analiz hazırlanıyor…</p></div>`;
  return AIR[sid]?reportHTML(AIR[sid],title,sid):"";
}
function examRows(L,mode){return L.slice().reverse().slice(0,mode?12:8).map(e=>`<div class="subj"><span>${esc(e.exam_name)} · ${esc(e.exam_type)}</span><span>${e.total_net==null?"–":num(e.total_net)+" net"}${e.exam_date?" · "+fd(String(e.exam_date)):""}${mode?` <button class="chip" data-exdel="${e.id}" aria-label="Denemeyi sil">Sil</button>`+(mode==="own"?` <button class="chip" data-exedit="${e.id}" aria-label="Denemeyi düzelt">Düzelt</button>`:""):""}</span></div>`).join("")}
function examCard(){
  if(PX)return examForm();
  const L=EX[ME]||[];
  return `<div class="card"><h2>Deneme sonuçlarım</h2>
  <p class="empty" style="margin:0 0 10px">Deneme sonuç görselini ya da PDF'ini yükle, yapay zekâ okusun. Sen kontrol edip onaylarsın. PDF genelde daha hızlı ve net okunur.</p>
  <div class="row" style="margin-top:0"><input id="exf" type="file" accept="image/*,application/pdf,.pdf" style="width:100%"><button class="btn" style="padding:11px 16px" id="exgo">Dosyayı oku</button></div>
  <p class="empty" id="exmsg" style="margin:8px 0 0;font-size:14px">${esc(EXMSG)}</p>
  ${L.length?`<div style="margin-top:10px">${examRows(L,"own")}</div><div class="row"><button class="chip" id="airun" data-sid="${ME}">📈 Gelişim analizimi yenile</button></div>`:""}</div>${aiReportCard(ME)}`;
}
function aiCard(sid){
  const L=EX[sid]||[];
  const M=L.map(x=>x.extraction_meta).filter(Boolean),tot=M.reduce((a,m)=>a+num(m.okunan),0),fix=M.reduce((a,m)=>a+num(m.duzeltilen),0);
  const acc=tot?`<p class="empty" style="font-size:13px;margin:8px 0 0">Yapay zekâ okuma doğruluğu: %${Math.round((tot-fix)/tot*100)} (${tot} alandan ${fix} tanesi öğrenci tarafından düzeltildi)</p>`:"";
  return `<div class="card"><h2>Deneme sonuçları ve yapay zekâ</h2>${L.length?examRows(L,"coach"):`<p class="empty">Öğrenci henüz deneme sonucu yüklemedi.</p>`}
  ${acc}<p class="empty" id="exmsg" style="margin:8px 0 0;font-size:14px">${esc(EXMSG)}</p>
  ${L.length?`<div class="row"><button class="chip" id="airun" data-sid="${sid}" data-force="1">🤖 Yapay zekâ koç raporunu üret</button></div>`:""}</div>${aiReportCard(sid,"Yapay zekâ koç raporu")}`;
}

const setSync=m=>{const e=document.getElementById("sync");if(e)e.textContent=m};
const dbw=p=>Promise.resolve(p).then(r=>{if(r&&r.error)setSync("⚠️ "+r.error.message);return r},()=>setSync("⚠️ Bağlantı yok"));
const busy=()=>/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||"");
const loginView=msg=>`<div class="card" style="max-width:380px;margin:30px auto"><h2>Giriş</h2><div class="row" style="flex-direction:column;align-items:stretch"><label>Kullanıcı adı<input id="lu" autocomplete="username" autocapitalize="none" style="width:100%"></label><label>PIN / şifre<input id="lp" type="password" autocomplete="current-password" style="width:100%"></label><div id="ts"></div><button class="btn" id="login">Giriş yap</button></div>${msg?`<p class="empty" style="color:var(--warn)">${esc(msg)}</p>`:""}</div>`;
/* Cloudflare Turnstile (robot doğrulaması). TS_KEY boşsa kapalıdır; Supabase'de Captcha açılmadan önce anahtar buraya yazılmalıdır. */
const TS_KEY="0x4AAAAAAFZUyqWLetPIf5hy";let TSTOKEN="",TSID=null,TSLOAD=null;
function tsScript(){return TSLOAD||(TSLOAD=new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";s.async=true;s.onload=ok;s.onerror=no;document.head.appendChild(s)}))}
async function tsMount(){
  TSTOKEN="";TSID=null;if(!TS_KEY)return;
  const el=document.getElementById("ts");if(!el)return;
  try{await tsScript();if(window.turnstile&&document.getElementById("ts"))TSID=window.turnstile.render("#ts",{sitekey:TS_KEY,callback:t=>{TSTOKEN=t},"expired-callback":()=>{TSTOKEN=""},"error-callback":()=>{TSTOKEN=""},theme:"auto",language:"tr"})}catch(e){el.textContent="Robot doğrulaması yüklenemedi. İnternetini kontrol edip sayfayı yenile."}
}
const setLoginMsg=m=>{let e=document.getElementById("lmsg");if(!e){e=document.createElement("p");e.id="lmsg";e.className="empty";e.style.color="var(--warn)";const t=document.getElementById("ts");(t?t.parentNode:document.getElementById("app")).appendChild(e)}e.textContent=m};
const showLogin=msg=>{document.getElementById("app").innerHTML=loginView(msg);tsMount()};
async function doLogin(){
  const u=document.getElementById("lu").value.trim().toLowerCase().replace(/[^a-z0-9._-]/g,""),p=document.getElementById("lp").value;
  if(!u||!p)return;
  if(TS_KEY&&!TSTOKEN)return setLoginMsg("Önce robot doğrulamasını tamamla.");
  const r=await sb.auth.signInWithPassword({email:u+"@takip.karakis.app",password:p,options:TS_KEY?{captchaToken:TSTOKEN}:undefined});
  if(r.error){
    const m=String(r.error.message||""),st=r.error.status;
    showLogin(/captcha/i.test(m)?"Robot doğrulaması başarısız, tekrar dene.":st===429||/rate|too many/i.test(m)?"Çok fazla deneme yapıldı, biraz bekleyip tekrar dene.":(st===400||/invalid/i.test(m))?"Kullanıcı adı veya PIN hatalı.":"Giriş yapılamadı. İnternet bağlantını kontrol et.");return}
  start();
}
async function loadStudent(){
  const r=await sb.from("daily").select("state").eq("student_id",ME).eq("day",day()).maybeSingle();
  let loc=null;try{const j=JSON.parse(localStorage.getItem(KEY+ME)||"null");if(j&&j.day===day()&&Array.isArray(j.log))loc=Object.assign(fresh(),j)}catch(e){}
  if(r.error){
    // Okuma başarısızsa boş gün kurup sunucudaki kaydın üstüne yazma: cihazdaki yedeği kullan, yoksa durma.
    if(!loc)throw new Error("Verilerin yüklenemedi. İnternetini kontrol edip sayfayı yenile.");
    S=loc;setSync("⚠️ Sunucuya ulaşılamadı, cihazdaki kayıt gösteriliyor");
  }else{
    const srv=r.data?Object.assign(fresh(),r.data.state):null;
    // Sunucuya henüz gitmemiş yerel kayıt daha ilerideyse onu koru.
    S=srv&&loc?(loc.log.length>srv.log.length?loc:srv):(srv||loc||fresh());
    if(S===loc&&loc.log.length&&(!srv||loc.log.length>srv.log.length))DIRTY=true;
  }
  S.day=day();if(DIRTY)save();
  await pullStudent();await Promise.all([loadExams(ME),loadReport(ME),loadTarget(ME),loadTasks(ME),loadHist(ME)]);
}
async function pullStudent(){
  const [g,n]=await Promise.all([sb.from("goals").select("*").eq("student_id",ME).eq("day",day()).maybeSingle(),sb.from("notes").select("body,created_at").eq("student_id",ME).order("created_at")]);
  C.goals[ME]=g.data?{day:g.data.day,s:g.data.subj,q:g.data.q,m:g.data.m}:undefined;
  C.notes[ME]=(n.data||[]).map(r=>({t:Date.parse(r.created_at),x:r.body}));
}
async function pullCoach(){
  const [p,d,g,n,e,w]=await Promise.all([sb.from("profiles").select("id,name").eq("role","student").order("name"),sb.from("daily").select("student_id,day,state,snap").gte("day",dayN(-6)),sb.from("goals").select("*").eq("day",day()),sb.from("notes").select("student_id,body,created_at").order("created_at"),sb.from("exam_results").select("student_id,topics").order("exam_date").order("created_at"),sb.from("weekly_tasks").select("student_id,done").gte("task_date",dayN(-6)).lte("task_date",day())]);
  STU=p.data||[];ROWS=d.data||[];C.goals={};C.notes={};C.den={};
  (g.data||[]).forEach(r=>C.goals[r.student_id]={day:r.day,s:r.subj,q:r.q,m:r.m});
  (n.data||[]).forEach(r=>(C.notes[r.student_id]=C.notes[r.student_id]||[]).push({t:Date.parse(r.created_at),x:r.body}));
  EXALL=e.data||[];TKALL=w.data||[];
}
let rt;
const refresh=()=>{clearTimeout(rt);rt=setTimeout(async()=>{if(!ME||busy()||PX||AIBUSY||PLANBUSY||CHATBUSY)return;try{if(ROLE==="coach"){await pullCoach();if(sel)await Promise.all([loadHist(sel),loadTasks(sel),loadExams(sel)])}else await Promise.all([pullStudent(),loadTasks(ME)]);render();setSync("Güncellendi "+hm(Date.now()))}catch(e){}},2500)};
async function start(){
  const app=document.getElementById("app");
  const {data:{session}}=await sb.auth.getSession();
  if(!session){showLogin();return}
  ME=session.user.id;
  const {data:p,error:pe}=await sb.from("profiles").select("name,role").eq("id",ME).maybeSingle();
  if(pe){ME=null;showLogin("Sunucuya ulaşılamadı. İnternetini kontrol edip sayfayı yenile.");return}
  if(!p){await sb.auth.signOut();ME=null;showLogin("Profil bulunamadı, koçuna haber ver.");return}
  NAME=p.name;ROLE=p.role;view=ROLE==="coach"?"c":"s";
  document.getElementById("who").textContent=NAME+" · ";document.getElementById("out").hidden=false;document.getElementById("reset").hidden=ROLE==="coach";document.body.classList.toggle("stu",ROLE==="student");
  if(ROLE==="coach"){await pullCoach();["daily","goals","notes","exam_results","weekly_tasks"].reduce((ch,t)=>ch.on("postgres_changes",{event:"*",schema:"public",table:t},refresh),sb.channel("koc")).subscribe();setInterval(refresh,60000)}
  else{await loadStudent();setInterval(refresh,45000);setInterval(()=>{if(rollover()){save();render()}},30000);pushState().then(()=>{if(tab==='h')render()})}
  render();
}
document.addEventListener("input",e=>{if(e.target.dataset&&e.target.dataset.rx!=null||e.target.id==="ext")recalcExam()});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="lp")doLogin();if(e.key==="Enter"&&e.target.id==="cin")chatSend()});
(function(){
  const root=document.documentElement,btn=document.getElementById("theme"),tc=document.getElementById("tc");
  const paint=()=>{const d=root.getAttribute("data-theme")!=="light";btn.textContent=d?"☀ Sabah":"☾ Gece";tc.setAttribute("content",d?"#0B1020":"#C93A20")};
  btn.addEventListener("click",()=>{const n=root.getAttribute("data-theme")==="light"?"dark":"light";root.setAttribute("data-theme",n);try{localStorage.setItem("karakis-tema",n)}catch(e){}paint()});
  paint();setTimeout(()=>document.body.classList.remove("intro"),4050);
})();
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
if(SUPABASE_URL.includes("PROJE-KODU"))document.getElementById("app").innerHTML=`<div class="card"><h2>Kurulum gerekli</h2><p>index.html içindeki SUPABASE_URL ve SUPABASE_KEY değerlerini kendi projenle değiştir (README.md, 4. adım).</p></div>`;
else start().catch(e=>{showLogin("Bağlantı hatası: "+e.message)});
