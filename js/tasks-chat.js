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
  // Gönderilmemiş günlük kayıt varsa yalnızca o korunur (kaybolmasın); diğer kişisel veriler her durumda silinir.
  try{Object.keys(localStorage).filter(k=>ME&&k.includes(ME)&&!(DIRTY&&k.startsWith(KEY+ME))).forEach(k=>localStorage.removeItem(k))}catch(e){}
  sb.auth.signOut().then(()=>location.reload(),()=>location.reload());
}
const shift=(s,k)=>{const[y,m,d]=s.split("-").map(Number);return ymd(new Date(y,m-1,d+k))};
async function loadTasks(id){try{const {data,error}=await sb.from("weekly_tasks").select("*").eq("student_id",id).gte("task_date",dayN(-98)).lte("task_date",dayN(28)).order("task_date").order("id");if(error)throw error;TK[id]=data||[]}catch(e){TK[id]=TK[id]||[]}}
async function loadPlan(id){try{const {data}=await sb.from("plan_drafts").select("*").eq("student_id",id).maybeSingle();PD[id]=data||null}catch(e){PD[id]=null}}
function taskRow(t,coach){
  const sub=[t.subject,t.amount].filter(Boolean).map(esc).join(" · ")+(t.source==="ai"?" · 🤖 plan":t.source==="student"?" · ✍️ ben ekledim":"");
  return `<div class="tk${t.done?" done":""}">${coach?`<span aria-hidden="true">${t.done?"✅":"⬜"}</span>`:`<button class="tkb" data-tk="${t.id}" aria-pressed="${!!t.done}" aria-label="Görevi tamamlandı olarak işaretle">${t.done?"✓":""}</button>`}<span class="tkt"><b>${esc(t.title)}</b>${sub?`<small>${sub}</small>`:""}</span>${coach?`<button class="chip" data-tkdel="${t.id}" aria-label="Görevi sil">Sil</button>`:(t.source==="student"&&!t.done?`<button class="chip" data-selfdel="${t.id}" aria-label="Görevi sil">Sil</button>`:"")}</div>`;
}
function taskList(L,coach){
  const by={};L.forEach(t=>(by[t.task_date]=by[t.task_date]||[]).push(t));
  return Object.keys(by).sort().map(d=>`<div class="tkd">${d===day()?"Bugün":fd(d)}</div>`+by[d].map(t=>taskRow(t,coach)).join("")).join("");
}

/* geciken görevler */
let ODN=null,ODS=0,ODL=[];
// Koç: son 7 günde tamamlanmamış görevler; bildirim merkezinde öğrenci adıyla listelenir.
async function loadOD(){try{const r=await sb.from("weekly_tasks").select("id,student_id,title,subject,task_date").lt("task_date",day()).gte("task_date",dayN(-7)).eq("done",false).order("task_date").order("id").limit(1000);if(r.error){ODN=null;ODS=0;ODL=[]}else{const L=(r.data||[]).filter(x=>STU.some(p=>p.id===x.student_id));ODL=L;ODN=L.length;ODS=new Set(L.map(x=>x.student_id)).size}}catch(e){ODN=null;ODS=0;ODL=[]}}
// Öğrencinin görevleri henüz açılmadıysa (TK boş) koç için loadOD listesi kullanılır; yoksa genel bakışta gecikmeler 0 görünüyordu.
const overdue=id=>TK[id]?TK[id].filter(t=>t.task_date<day()&&t.task_date>=dayN(-7)&&!t.done):ROLE==="coach"?ODL.filter(t=>t.student_id===id):[];
function overdueCard(id,coach){
  const L=overdue(id);if(!L.length)return"";
  return `<div class="card" style="border-color:var(--warn)"><h2>⏰ Geciken görevler (${L.length})</h2>${taskList(L,coach)}<div class="row"><button class="btn" style="padding:11px 16px" data-rs="${dayN(1)}" data-rsid="${id}">Yarına kaydır</button><button class="chip" data-rs="${day()}" data-rsid="${id}">Bugüne al</button></div>${coach&&ROLE==="coach"?rdCard(id,L):""}</div>`;
}
async function reschedule(id,date){
  const ids=overdue(id).map(t=>t.id);if(!ids.length)return;
  try{const r=await sb.rpc("task_reschedule",{p_ids:ids,p_date:date});if(r.error)throw r.error}catch(e){alert("Kaydırılamadı: "+(e&&e.message||e));return}
  await loadTasks(id);if(ROLE==="coach"){RD[id]=null;try{await loadOD()}catch(e){}}render();
}
async function togTask(id){
  const t=(TK[ME]||[]).find(x=>String(x.id)===String(id));if(!t)return;
  t.done=!t.done;t.done_at=t.done?new Date().toISOString():null;render();
  await dbw(sb.from("weekly_tasks").update({done:t.done,done_at:t.done_at}).eq("id",t.id).eq("student_id",ME));
}
async function delTask(id){if(!confirm("Görev silinsin mi?"))return;await dbw(sb.from("weekly_tasks").delete().eq("id",id).eq("student_id",sel));await loadTasks(sel);render()}
// İşlem sürerken ikinci dokunuş aynı kaydı ikinci kez eklemesin; öğrenci değişse bile doğru öğrenciye yazılsın.
const INFL={};
async function once(k,fn){if(INFL[k])return;INFL[k]=1;try{await fn()}finally{delete INFL[k]}}
// Görev formunun tarih/ders seçimi ekleme sonrası korunur (art arda görev eklemek kolaylaşır).
let TKF={d:null,s:""};
function addTask(){const id=sel;return once("tk"+id,async()=>{
  const g=i=>document.getElementById(i).value,title=g("tkt").trim().slice(0,120);if(!title){alert("Görev adını yaz.");return}
  TKF={d:g("tkd")||day(),s:g("tks")||""};
  const r=await dbw(sb.from("weekly_tasks").insert({student_id:id,task_date:TKF.d,title,subject:TKF.s||null,amount:g("tka").trim().slice(0,60)||null,source:"coach",created_by:ME}));
  if(r&&r.error){alert("Görev eklenemedi, yazdıkların duruyor: "+r.error.message);return}
  ["tkt","tka"].forEach(k=>{const e=document.getElementById(k);if(e){e.value="";e.defaultValue=""}});
  await loadTasks(id);if(sel===id)render();
})}
function taskCard(x){
  if(!(x.id in TK))return `<div class="card"><h2>Haftanın görevleri</h2><p class="empty rd-ld"><span class="spin" aria-hidden="true"></span> Görevler yükleniyor…</p></div>`;
  const L=selWeek(x.id).L,d=L.filter(t=>t.done).length,p=PD[x.id];
  const plan=p&&p.content?`<div class="card" style="border-color:var(--acc);margin:12px 0 0"><h2>🤖 Plan taslağı</h2><p class="empty" style="margin:0 0 6px">${esc(p.content.ozet||"")}</p>${p.content.notlar?`<p class="empty" style="margin:0 0 6px;font-size:14px">${esc(p.content.notlar)}</p>`:""}${taskList((p.content.gorevler||[]).map(g=>({...g,id:0,done:false,source:"ai"})),true).replace(/<button[^>]*data-tkdel[^>]*>.*?<\/button>/g,"")}<p class="empty" style="font-size:13px;margin:8px 0">Taslak öğrenciye henüz görünmez. İncele, uygunsa onayla.</p><div class="row"><button class="btn" style="padding:11px 16px" id="planok">Onayla ve öğrenciye ata</button><button class="chip" id="plandel">Taslağı sil</button></div></div>`:"";
  return rdDoneCard(x.id)+overdueCard(x.id,true)+`<div class="card"><h2>Haftanın görevleri</h2>${L.length?`<p class="empty" style="margin:0 0 8px">${d}/${L.length} tamamlandı · %${Math.round(d/L.length*100)}</p><div class="bar"><i style="width:${Math.round(d/L.length*100)}%"></i></div>${taskList(L,true)}`:`<p class="empty">Bu öğrenciye atanmış görev yok.</p>`}
  <div class="row"><label>Tarih<input id="tkd" type="date" value="${TKF.d&&TKF.d>=day()?TKF.d:day()}" style="width:150px"></label><label>Ders<select id="tks"><option value="">Ders</option>${SUBJ.map(s=>`<option${s===TKF.s?" selected":""}>${s}</option>`).join("")}</select></label><label>Görev<input id="tkt" type="text" maxlength="120" style="width:170px"></label><label>Miktar<input id="tka" type="text" maxlength="60" placeholder="60 soru" style="width:100px"></label><button class="btn" style="padding:11px 16px" id="tkadd">Ekle</button></div>
  <div class="row"><button class="chip" id="planrun"${PLANBUSY?" disabled":""}>🤖 Yapay zekâyla haftalık plan taslağı üret</button></div>
  <p class="empty" style="font-size:14px;margin:6px 0 0">${PLANBUSY===x.id?"Plan hazırlanıyor, yarım dakika sürebilir…":esc(PLANMSG)}</p>${plan}</div>`;
}
async function planRun(){
  const sid=sel;if(!sid||PLANBUSY)return;PLANBUSY=sid;PLANMSG="";render();
  const r=await callFn("exam-insights",{action:"plan",student_id:sid});PLANBUSY=null;
  if(r.plan){PD[sid]={student_id:sid,content:r.plan,created_at:new Date().toISOString()}}else PLANMSG=r.error||"Plan üretilemedi.";
  render();
}
function planOk(){const id=sel;return once("plan"+id,async()=>{
  const p=PD[id];if(!p||!p.content)return;
  const rows=(p.content.gorevler||[]).map(g=>({student_id:id,task_date:g.task_date,title:g.title,subject:g.subject||null,amount:g.amount||null,source:"ai",created_by:ME}));
  const r=await dbw(sb.from("weekly_tasks").insert(rows));if(!r||r.error){alert("Plan atanamadı: "+(r&&r.error?r.error.message:"bağlantı hatası"));return}
  await dbw(sb.from("plan_drafts").delete().eq("student_id",id));PD[id]=null;await loadTasks(id);if(sel===id)render();
})}
async function planDel(){const id=sel;if(!confirm("Plan taslağı silinsin mi?"))return;await dbw(sb.from("plan_drafts").delete().eq("student_id",id));PD[id]=null;if(sel===id)render()}

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
const fzLbl=()=>FZ.mode==="w"?"Odaklan, telefonu bırak.":FZ.mode==="l"?"Uzun mola (15 dk) — dinlen.":"Kısa mola (5 dk).";
const fzStart=m=>{FZ={mode:m,end:Date.now()+(m==="w"?25:m==="l"?15:5)*60000};render();wakeSync()};
function focusCard(){
  return `<div class="card"><h2>🍅 Pomodoro</h2><div class="big" id="fz" style="font-size:44px;text-align:center">${FZ?fzTxt():"25:00"}</div><p class="empty" style="text-align:center;margin:4px 0 10px">${FZ?fzLbl():"25 dk odak, 5 dk mola. Otomatik devam eder. Bugün tamamlanan: "+FZP()+" tur"}</p><div class="row" style="justify-content:center">${FZ?`<button class="chip" data-fz="stop">Durdur</button>`:`<button class="btn" style="padding:11px 16px" data-fz="w">25 dk odak</button><button class="chip" data-fz="b">5 dk mola</button>`}</div></div>`;
}
function pomoChip(){
  if(ROLE!=="student")return"";
  return `<div class="pomo">${FZ?`<span>🍅 <b id="fzh">${fzTxt()}</b> · ${FZ.mode==="w"?"odak":"mola"}</span><button class="chip" data-fz="stop">Durdur</button>`:`<span>🍅 Pomodoro · bugün ${FZP()} tur</span><button class="chip" data-fz="w">25 dk odak başlat</button>`}</div>`;
}
setInterval(()=>{if(!FZ)return;if(Date.now()>=FZ.end){const w=FZ.mode==="w";let n=0;if(w){try{n=FZP()+1;localStorage.setItem("karakis-odak-"+day(),n)}catch(x){}}FZ=w?{mode:n%4===0?"l":"b",end:Date.now()+(n%4===0?15:5)*60000}:null;try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(x){}try{if("Notification" in window&&Notification.permission==="granted")new Notification(w?"Odak bitti 🎉":"Mola bitti",{body:w?"Mola zamanı.":"Yeni tura hazır mısın?"})}catch(x){}render();return}const t=fzTxt();["fz","fzh"].forEach(i=>{const e=document.getElementById(i);if(e)e.textContent=t})},1000);

/* bildirim (web push) */
const VAPID_PUB="BLxGZLx6y3dW1FClX4OxwHrj1c15zQ5kTn_uWWxSkDOKRKheCIR1M_oCtyvIvryHC6hmnDRsKj1lrACBTmdnK90";let PUSHON=null,PUSHMSG="";
const b64u=t=>{const b=atob((t+"=".repeat((4-t.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(b,c=>c.charCodeAt(0))};
async function pushState(){try{if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){PUSHON="no";return}const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,no)=>setTimeout(()=>no(new Error("zaman aşımı")),5000))]);PUSHON=!!(await reg.pushManager.getSubscription())}catch(e){PUSHON="no"}}
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
  const W=selWeek(ME),L=W.L,d=L.filter(t=>t.done).length;
  return overdueCard(ME,false)+weekTabs(ME,false)+`<div class="card"><h2>${esc(weekName(W))}</h2><p class="empty" style="margin:0 0 8px">${weekName(W)!==wkRange(W.mon)?wkRange(W.mon)+(L.length?" · ":""):""}${L.length?`${d}/${L.length} tamamlandı · %${Math.round(d/L.length*100)}`:""}</p>${L.length?`<div class="bar"><i style="width:${Math.round(d/L.length*100)}%"></i></div>${taskList(L,false)}`:`<p class="empty">Bu hafta için görev yok.</p>`}</div>${weekGrid({id:ME,notabs:true})}${boostCard(ME,false)}${focusCard()}`;
}
function chatTab(){
  return `<div class="card"><h2>Yapay zekâ asistanın</h2><p class="empty" style="margin:0 0 10px;font-size:14px">Çalışma planı, deneme ve motivasyon konusunda sor. Deneme verilerine bakarak cevap verir. Resmî karar yerine geçmez; önemli konularda koçuna danış.</p>
  <div class="chat" id="chat">${CHAT.length?CHAT.map(m=>`<div class="cm ${m.role==="user"?"me":"ai"}">${esc(m.text)}</div>`).join(""):`<p class="empty">Örnek: “Bu hafta hangi konuya odaklanmalıyım?”</p>`}${CHATBUSY?`<div class="cm ai">Yazıyor…</div>`:""}</div>
  ${CHATERR?`<p style="color:var(--warn);margin:0 0 8px">${esc(CHATERR)}</p>`:""}
  <div class="row" style="margin-top:0"><input id="cin" type="text" maxlength="600" placeholder="Sorunu yaz…" style="flex:1;min-width:0"><button class="btn" style="padding:11px 16px" id="csend"${CHATBUSY?" disabled":""}>Gönder</button></div></div>`;
}
async function aiChatSend(){
  const el=document.getElementById("cin"),v=el?el.value.trim().slice(0,600):"";if(!v||CHATBUSY)return;
  CHAT.push({role:"user",text:v});CHAT=CHAT.slice(-8);CHATBUSY=true;CHATERR="";render();
  const r=await callFn("exam-insights",{action:"chat",messages:CHAT});
  CHATBUSY=false;if(r.reply)CHAT.push({role:"model",text:r.reply});else CHATERR=r.error||"Cevap alınamadı.";CHAT=CHAT.slice(-8);render();
}

