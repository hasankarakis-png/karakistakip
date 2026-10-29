const SUPABASE_URL="https://ramcghaefbbwgwtgtdtt.supabase.co",SUPABASE_KEY="sb_publishable_MC44S4rXUNLDClD0RgNbaw_1unO3NAI";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const SUBJ=["Matematik","Geometri","Türkçe","Fizik","Kimya","Biyoloji","Tarih","Coğrafya","Edebiyat","Diğer"];
const KEY="karakis-takip-v1";
const METH=["Soru çözme","Konu çalışma","Tekrar","Kendini test","Video izleme"],ACT=["Soru çözme","Tekrar","Kendini test"],CAUSE=["Bilgi eksiği","Dikkat hatası","Süre yetmedi","Yanlış okuma","Heyecan"];
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const day=()=>ymd(new Date());
const dayN=n=>{const d=new Date();d.setDate(d.getDate()+n);return ymd(d)};
const fresh=()=>({day:day(),status:"idle",cur:null,done:0,log:[],qs:[],prog:false,mood:0,sleep:0,dist:0,en:0,str:0,hard:"",meth:{}});
let S=fresh();
let view="s",subj=SUBJ[0],meth=METH[0];
const snap=()=>({m:Math.min(1440,Math.max(0,Math.round(total()/60000)||0)),q:Math.min(3000,Math.max(0,Math.round(solved())||0)),prog:S.prog?1:0,mood:S.mood,sleep:S.sleep,dist:S.dist,en:S.en,str:S.str,act:actPct(),c:correct(),b:S.qs.reduce((a,q)=>a+(q.b||0),0)});
let pend;
let DIRTY=false,rtry;
const dayRow=s=>({student_id:ME,day:s.day,state:s,snap:snap(),updated_at:new Date().toISOString()});
// Gece yarısı geçildiyse dünün oturumunu 00:00'da kapatır, yeni gün için temiz durum kurar (açık ders sürüyorsa devam ettirir).
function rollover(){
  if(!ME||ROLE!=="student"||S.day===day())return false;
  const old=S,m=new Date();m.setHours(0,0,0,0);const mid=m.getTime(),oc=old.cur,was=oc&&(old.status==="study"||old.status==="break");
  if(oc){const v=Math.max(0,mid-oc.start-oc.brk-(old.status==="break"?mid-oc.bs:0));old.done+=v;old.meth[oc.meth]=(old.meth[oc.meth]||0)+v;old.cur=null;old.status="stopped";old.log.push({t:mid-1,m:"Gece yarısı: oturum otomatik bölündü"})}
  delete old.undo;delete old.rbk;
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
  if(a==="undo"){undoRun();return}
  if(a==="rbk"){rbkRun();return}
  if(a==="rbkx"){if(confirm("Sıfırlamadan önceki kayıt kalıcı olarak silinsin mi? Bundan sonra geri getirilemez.")){S.rbk=null;save();render()}return}
  // Yeni bir ders hareketi, kapatma/noktalama geri alma hakkını bitirir (sıfırlama yedeği gün boyu kalır).
  if(["wake","start","break","back"].includes(a)&&S.undo&&S.undo.k!=="qdel")S.undo=null;
  const u=a==="stop"||a==="close"?undoMark(a):null;
  if(a==="reopen"){if(S.status!=="closed")return;S.status="stopped";S.undo=null;log("↩ Günü yeniden açtım")}
  if(a==="wake"){S.status="awake";log("Uyandım")}
  if(a==="start"){S.cur={start:n,brk:0,bs:0,subj,meth};S.status="study";log("Derse başladım: "+subj+" ("+meth+")")}
  if(a==="break"){S.cur.bs=n;S.status="break";log("Mola verdim")}
  if(a==="back"){S.cur.brk+=n-S.cur.bs;S.status="study";log("Moladan döndüm")}
  if(a==="stop"){const v=curNet();S.done+=v;S.meth[S.cur.meth]=(S.meth[S.cur.meth]||0)+v;log("Çalışmayı noktaladım ("+short(v)+", "+S.cur.subj+")");BUMP={m:Math.max(1,Math.round(v/60000))};S.cur=null;S.status="stopped"}
  if(a==="prog"){S.prog=!S.prog;log(S.prog?"Programımı bitirdim":"Program işaretini kaldırdım")}
  if(a==="close"){if(S.cur){const v=curNet();S.done+=v;S.meth[S.cur.meth]=(S.meth[S.cur.meth]||0)+v;S.cur=null}S.status="closed";log("Günü kapattım")}
  if(u){S.undo=u;undoToast()}
  save();render();
}
/* ===== İkinci şans =====
   "Günü kapat", "Çalışmayı noktala" ve soru silme 10 dakika içinde geri alınabilir; kapatılan gün her zaman yeniden açılabilir.
   "Bugünü sıfırla" öncesi günün kopyası gün boyu saklanır ve "Geri getir" ile sıfırlamadan sonra yapılanlarla birleştirilir.
   Kopyalar günün kaydında (S.undo, S.rbk) durur ve sunucuya da yazılır; telefon değişse de kaybolmaz. Gece yarısı silinir. */
const UNDO_WIN=10*60e3,TOAST_MS=12000;
const UNDO_TXT={close:"Günü kapattın",stop:"Çalışmayı noktaladın",qdel:"Soru kaydını sildin"};
let RSTASK=false;
const clone=o=>JSON.parse(JSON.stringify(o));
const bare=()=>{const c=clone(S);delete c.undo;delete c.rbk;return c};
function undoMark(k){return {k,t:Date.now(),s:bare()}}
function undoOf(){const u=S.undo;if(!u||!UNDO_TXT[u.k]||Date.now()-u.t>UNDO_WIN)return null;if(u.s&&u.s.day!==S.day)return null;return u}
function undoToast(){setTimeout(()=>{if(!busy())render()},TOAST_MS+150)}
const KEEPF=["mood","sleep","dist","en","str","hard"];
function undoRun(){
  const u=undoOf();if(!u){S.undo=null;render();return}
  const cur=S;
  if(u.k==="qdel"){S.qs.splice(Math.min(u.i,S.qs.length),0,u.q);S.undo=null;log("↩ Silinen soru kaydı geri alındı ("+u.q.s+", "+u.q.n+" soru)")}
  else{
    // Kapatmadan/noktalamadan önceki hâline dön; ders açıksa kaldığı yerden sürer. Sonradan girilen puan ve günlük durum korunur.
    const b=Object.assign(fresh(),clone(u.s));
    b.log=b.log.concat(cur.log.slice(u.s.log.length+1));b.qs=cur.qs;b.prog=cur.prog;KEEPF.forEach(k=>{if(cur[k])b[k]=cur[k]});b.rbk=cur.rbk||null;
    S=b;S.undo=null;log("↩ Geri aldım: "+(u.k==="close"?"Günü kapat":"Çalışmayı noktala"));
  }
  save();render();
}
// Sıfırlama yedeği + sıfırlamadan sonra yapılanlar = birleşik gün
function rbkMerge(bk,cur){
  const b=Object.assign(fresh(),clone(bk.s));
  if(b.cur){const n=bk.t,c=b.cur,v=Math.max(0,n-c.start-c.brk-(b.status==="break"?n-c.bs:0));b.done+=v;b.meth[c.meth]=(b.meth[c.meth]||0)+v;b.cur=null;if(b.status==="study"||b.status==="break")b.status="stopped"}
  b.log=b.log.concat(cur.log).sort((x,y)=>x.t-y.t);b.qs=b.qs.concat(cur.qs||[]);b.done+=num(cur.done);
  Object.entries(cur.meth||{}).forEach(([k,v])=>b.meth[k]=(b.meth[k]||0)+v);
  if(cur.cur||cur.status!=="idle"){b.cur=cur.cur;b.status=cur.status}
  b.prog=b.prog||cur.prog;KEEPF.forEach(k=>{if(cur[k])b[k]=cur[k]});
  delete b.undo;delete b.rbk;return b;
}
function rbkRun(){
  const bk=S.rbk;if(!bk||!bk.s||bk.s.day!==S.day){S.rbk=null;render();return}
  S=rbkMerge(bk,S);log("↩ Sıfırlanan gün geri getirildi");save();render();window.scrollTo(0,0);
}
function resetDay(){
  const had=S.log.length||S.qs.length||S.done||S.cur;
  const snap0=S.rbk&&S.rbk.s&&S.rbk.s.day===S.day?rbkMerge(S.rbk,bare()):bare();
  S=fresh();if(had||S.rbk)S.rbk={t:Date.now(),s:snap0};log("Günü sıfırladım");
  RSTASK=false;tab="b";save();render();window.scrollTo(0,0);undoToast();
}
const lostTxt=s=>{const m=Math.round((num(s.done)+(s.cur?Math.max(0,Date.now()-s.cur.start-s.cur.brk):0))/60000),q=(s.qs||[]).reduce((a,x)=>a+num(x.n),0);return (m?(m>=60?Math.floor(m/60)+" sa "+(m%60)+" dk":m+" dk")+" çalışma":"")+(m&&q?", ":"")+(q?q+" soru":"")+(!m&&!q?(s.log||[]).length+" kayıt":"")};
function undoCards(){
  const u=undoOf(),bk=S.rbk&&S.rbk.s&&S.rbk.s.day===S.day?S.rbk:null;let o="";
  if(u)o+=`<div class="card undo"><div><b>↩ ${UNDO_TXT[u.k]}</b><small>Saat ${hm(u.t)} · 10 dakika içinde geri alabilirsin${u.k!=="qdel"&&u.s.cur?" · ders kaldığı yerden devam eder":""}</small></div><button class="btn" data-a="undo">Geri al</button></div>`;
  if(bk)o+=`<div class="card undo warn"><div><b>Bugünü sıfırladın (saat ${hm(bk.t)})</b><small>Önceki kayıt (${lostTxt(bk.s)}) saklı. Yanlışlıkla olduysa geri getir; sonradan girdiklerin de korunur.</small></div><div class="undo-acts"><button class="btn" data-a="rbk">↩ Geri getir</button><button class="chip" data-a="rbkx">Kalıcı sil</button></div></div>`;
  return o;
}
function undoToastHTML(){
  const u=undoOf(),bk=S.rbk;const now=Date.now();
  if(u&&now-u.t<TOAST_MS)return `<div class="undo-toast" role="status"><span>${UNDO_TXT[u.k]}</span><button data-a="undo">Geri al</button></div>`;
  if(bk&&now-bk.t<TOAST_MS)return `<div class="undo-toast" role="status"><span>Gün sıfırlandı</span><button data-a="rbk">Geri getir</button></div>`;
  return "";
}
function resetCard(){
  if(!RSTASK)return `<div class="row" style="margin-top:10px"><button class="chip danger" id="rstask">🗑 Bugünü sıfırla</button></div>`;
  return `<div class="card undo warn" style="margin:12px 0 0"><div><b>Bugünün kaydı silinecek</b><small>${S.log.length||S.qs.length?lostTxt(S)+" ve bugünün akışı silinir.":"Bugün henüz kayıt yok."} Gün boyunca ana sayfadan “Geri getir” ile geri alabilirsin.</small></div><div class="undo-acts"><button class="btn danger" id="rstok">Evet, sıfırla</button><button class="chip" id="rstno">Vazgeç</button></div></div>`;
}
function addQ(){
  const g=id=>Math.max(0,Math.floor(+document.getElementById(id).value||0)),n=g("qn"),c=g("qc"),b=g("qb"),s=document.getElementById("qs").value;
  const err=m=>{const e=document.getElementById("qerr");if(e)e.textContent=m;return false};
  // Yanlış girişleri kaydetmeden önce yakala
  if(n<1)return err("Çözdüğün soru sayısını yaz.");
  if(n>400)return err("Tek seferde en fazla 400 soru girilebilir. Sayıyı kontrol et.");
  if(c+b>n)return err("Doğru + boş ("+(c+b)+"), çözülen soru sayısından ("+n+") fazla olamaz.");
  if(n>=150&&!confirm(n+" soru tek kayıtta girilecek. Doğru mu?"))return;
  const k=document.getElementById("qk").value.trim().slice(0,40);S.qs.push({s,n,c,b,k});BUMP={q:n};log(n+" soru çözdüm ("+s+(k?", "+k:"")+")");save();render();
}
function dailyActivityCard(){
  const hist=HIST[ME]||{},today=day();
  const days=Array.from({length:7},(_,i)=>dayN(i-6));
  const rows=days.map(d=>{const z=d===today?{m:Math.round(total()/60000),q:solved()}:hist[d]||{};return {d,m:num(z.m),q:num(z.q)}});
  const maxM=Math.max(30,...rows.map(r=>r.m)),sumM=rows.reduce((a,r)=>a+r.m,0),sumQ=rows.reduce((a,r)=>a+r.q,0);
  return `<section class="activity-card"><div class="activity-top"><div><div class="eyebrow">SON 7 GÜN</div><h2>İstikrar grafiğin</h2><p>Çalışma ritmini takip et, gelişimini gör.</p></div><span class="activity-icon">↗</span></div><div class="activity-metrics"><div><small>Toplam çalışma</small><b>${hmin(sumM)}</b></div><div><small>Çözülen soru</small><b>${sumQ}</b></div><div><small>Aktif gün</small><b>${rows.filter(r=>r.m>0||r.q>0).length}<small> / 7</small></b></div></div><div class="week-bars" role="img" aria-label="Son yedi günün çalışma süresi grafiği">${rows.map(r=>`<div class="week-col" title="${fd(r.d)}: ${hmin(r.m)}, ${r.q} soru"><div class="week-track"><i style="height:${Math.max(r.m?7:2,Math.round(r.m/maxM*100))}%"></i></div><small>${new Date(r.d+"T12:00:00").toLocaleDateString("tr-TR",{weekday:"short"}).replace(".","")}</small></div>`).join("")}</div><div class="activity-legend"><span><i></i> Net çalışma süresi</span><span>Her gün bir adım daha.</span></div></section>`;
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
  return `${undoCards()}${guideCard()}${live&&curNet()>4*3600e3?`<div class="card" style="border-color:var(--warn)"><p style="margin:0">⏰ Sayaç 4 saatten uzun süredir açık. Çalışmayı bitirdiysen <b>Çalışmayı noktala</b>'ya bas, yoksa süren fazla görünür.</p></div>`:""}
  ${quoteCard()}<section class="hero"><div class="st"><span class="dot ${DOT[st]}"></span>${LBL[st]}</div>
  <div class="big" id="clock">${dur(clockMs())}</div><div class="sub" id="clocksub">${clockSub()}</div>
  ${st!=="closed"?`<div class="acts">${b}</div>`:`<div class="acts"><button class="btn full alt" data-a="reopen">↩ Günü yeniden aç</button></div>`}${live?pomoChip():""}</section>
  ${picker}${overdueCard(ME,false)}${tasksRing()}${countdownCard()}${chHomeCard()}${msgHomeCard()}<button class="card tr" data-tab="c" aria-label="Konu takibini aç"><span class="rg" style="--p:0"><span style="font-size:30px">📚</span></span><span><h2>Konu Takibi</h2><p style="font-size:15px">Bitirdiğin konuları işaretle</p></span></button><button class="card tr" data-tab="t" aria-label="Tercih robotunu aç"><span class="rg" style="--p:0"><span style="font-size:30px">🎓</span></span><span><h2>Tercih Robotu</h2><p style="font-size:15px">Sıranla bölümleri karşılaştır</p></span></button>
  <div class="stats"><div class="stat"><b>${solvedT}</b><span>çözülen soru</span></div><div class="stat"><b>${solvedT?"%"+acc:"–"}</b><span>doğruluk</span></div><div class="stat"><b>${S.prog?"✓":"–"}</b><span>program</span></div></div>
  ${coachForMe()}${streakCard()}${(TK[ME]||[]).some(t=>t.task_date===day())?todayTasks():""}
  ${qa?`<div class="card" id="qcard"><h2>Soru girişi</h2><div class="row">
  <label>Ders<select id="qs">${SUBJ.map(x=>`<option${x===subj?" selected":""}>${x}</option>`).join("")}</select></label>
  <label>Çözülen<input id="qn" type="number" min="1" inputmode="numeric"></label>
  <label>Doğru<input id="qc" type="number" min="0" inputmode="numeric"></label><label>Boş<input id="qb" type="number" min="0" inputmode="numeric"></label><label>Konu<input id="qk" type="text" maxlength="40" style="width:140px"></label>
  <button class="btn" style="padding:11px 16px" id="addq">Ekle</button></div><p id="qerr" class="qerr" role="alert"></p></div>`:""}
  ${qsCard()}
  ${st!=="idle"?dayCard():""}
  ${st!=="idle"?`<div class="card"><h2>Gün sonu</h2><div class="chips">
  <button class="chip" data-a="prog" aria-pressed="${S.prog}">✅ Programımı bitirdim</button>
  ${st!=="closed"?`<button class="chip" data-a="close">🌙 Günü kapat</button>`:`<button class="chip" data-a="reopen">↩ Günü yeniden aç</button>`}</div>
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
    const brk=s.status==="break"&&cur&&num(cur.bs)?Math.max(0,Math.round((now-num(cur.bs))/60000)):0;
    return {id:p.id,n:esc(p.name),st:LBL[s.status]?s.status:"idle",m,q:qn,brk,p:s.prog?1:(cur?.5:0),L:(s.log||[]).map(l=>({t:hm(num(l.t)),m:esc(l.m)})),qs,mood:num(s.mood),sleep:num(s.sleep),dist:num(s.dist),en:num(s.en),str:num(s.str),hard:String(s.hard||""),act:num(td&&td.snap?td.snap.act:0),hist,rbk:s.rbk&&s.rbk.s&&s.rbk.s.day===t?{t:num(s.rbk.t),txt:lostTxt(s.rbk.s)}:null};
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

/* Haftalık rapor taslağı (yapay zekâ, yalnızca koç) */
const RPT={};
function rptFacts(x){
  const h=x.hist,n=h.length||1,sum=k=>h.reduce((a,d)=>a+(d[k]||0),0),ex=(EX[x.id]||[]),E=ex[ex.length-1],P=ex[ex.length-2],tg=tgPick(x.id),note=(C.notes[x.id]||[]).slice(-1)[0];
  const tk=(TK[x.id]||[]).filter(t=>t.task_date>=dayN(-6)&&t.task_date<=day());
  return {gun:n,ort_dk:Math.round(sum("m")/n),calisilan:h.filter(d=>d.m>0).length,soru:sum("q"),prog:sum("prog"),gorev_ok:tk.filter(t=>t.done).length,gorev_top:tk.length,geciken:overdue(x.id).length,
    son_deneme:E?(E.exam_name||E.exam_type||""):"",son_net:E&&E.total_net!=null?+E.total_net:null,onceki_net:P&&P.total_net!=null?+P.total_net:null,
    hedef:tg?[tg.university,tg.department].filter(Boolean).join(" – "):"",tekrar:tekrarList(x.id,new Set()).slice(0,5).map(o=>o.ders+" · "+o.konu+" ("+o.n+" denemede yanlış)"),not:note?note.x:""};
}
async function rptRun(id){
  const x=roster().find(r=>r.id===id);if(!x||(RPT[id]&&RPT[id].busy))return;
  RPT[id]={busy:true};render();
  const r=await callFn("weekly-report",{ad:(STU.find(p=>p.id===id)||{}).name||x.n,veri:rptFacts(x)});
  RPT[id]=r.veli?{res:r}:{err:r.error||"Rapor hazırlanamadı."};render();
}
function reportCard(x){
  const R=RPT[x.id]||{};
  const out=R.res?`<div class="card" style="border-color:var(--acc);margin:12px 0 0"><h2>Koç değerlendirmesi</h2><p class="empty" style="margin:0 0 8px">${esc(R.res.degerlendirme||"")}</p>${(R.res.oneriler||[]).map(o=>`<div class="subj"><span>• ${esc(o)}</span></div>`).join("")}<h2 style="margin-top:14px">Veli mesajı taslağı</h2><textarea id="rpt" style="min-height:170px">${esc(R.res.veli)}</textarea><div class="row"><button class="btn" style="padding:11px 16px" id="rptcp">Kopyala</button><button class="chip" id="rptwa">WhatsApp'ta gönder</button></div><p class="empty" style="font-size:13px;margin:8px 0 0">Bu bir taslaktır; göndermeden önce oku ve düzenle.</p></div>`:"";
  return `<div class="card"><h2>🤖 Haftalık rapor taslağı</h2><p class="empty" style="margin:0 0 8px;font-size:14px">Son 7 günün verisinden koç değerlendirmesi ve veliye gidecek mesaj taslağı hazırlar.</p><div class="row" style="margin-top:0"><button class="btn" style="padding:11px 16px" data-rpt="${x.id}"${R.busy?" disabled":""}>${R.busy?"Hazırlanıyor…":"Taslak hazırla"}</button><button class="chip" data-rpdf="${x.id}">📄 Kurumsal PDF rapor</button></div>${R.err?`<p style="color:var(--warn);margin:8px 0 0">${esc(R.err)}</p>`:""}${out}</div>`;
}
function parentCard(x){
  const h=x.hist,n=h.length,sum=k=>h.reduce((a,d)=>a+(d[k]||0),0),am=Math.round(sum("m")/n),sl=h.filter(d=>d.sleep>0),note=(C.notes[x.id]||[]).slice(-1)[0];
  const E=(EX[x.id]||[]).slice(-1)[0],tg=tgPick(x.id),tk=(TK[x.id]||[]).filter(t=>t.task_date>=dayN(-6)&&t.task_date<=day()),tkd=tk.filter(t=>t.done).length;
  const extra=(E?`• Son deneme: ${E.exam_name||E.exam_type}${E.total_net!=null?" — "+E.total_net+" net":""}\n`:"")+(tg&&tg.target_net!=null?`• Hedef net: ${tg.target_net}${tg.university?" ("+[tg.university,tg.department].filter(Boolean).join(" – ")+")":""}\n`:"")+(tk.length?`• Haftalık görev tamamlama: ${tkd}/${tk.length}\n`:"");
  const tx=`Sayın veli,\n${(STU.find(p=>p.id===x.id)||{}).name||x.n} için son ${n} günün özeti:\n• Günlük ortalama net çalışma: ${Math.floor(am/60)} sa ${am%60} dk\n• Çalışılan gün: ${h.filter(d=>d.m>0).length}/${n}\n• Çözülen soru: ${sum("q")}\n• Programı tamamlanan gün: ${sum("prog")}/${n}\n`+(sl.length?`• Ortalama uyku: yaklaşık ${(sl.reduce((a,d)=>a+d.sleep,0)/sl.length).toFixed(1)} saat\n`:"")+extra+(note?`• Koç notu: ${note.x}\n`:"")+`Saygılarımla,\nHasan Karakış · Karakış Eğitim & Danışmanlık`;
  return `<div class="card"><h2>Veli özeti</h2><textarea id="pt" readonly style="min-height:150px">${esc(tx)}</textarea><div class="row"><button class="btn" style="padding:11px 16px" id="cp">Metni kopyala</button><button class="chip" id="pwa">WhatsApp'ta gönder</button><button class="chip" id="psh">Paylaş…</button></div></div>`;
}

