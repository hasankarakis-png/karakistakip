// Koç ↔ öğrenci mesajlaşma — WhatsApp düzeni: son mesajlı sohbet listesi, arama, gün ayraçları, okundu tikleri,
// otomatik (yapay zekâ) mesaj etiketi, hazır yanıtlar ve yazarken silinmeyen canlı güncelleme.
const MSG={},MU={},MUL={},MLAST={},CONTACT={},MWA={};let MNEW=null,MNEWID=null,MDRAFT="",MFIRST={};let MSEL=null,MV=false,MERR="",MLOAD=false,MSENDING=false,MQ="";
try{Object.assign(MWA,JSON.parse(localStorage.getItem("karakis-mwa")||"{}"))}catch(e){}
const MQR=["Harika gidiyorsun, böyle devam! 💪","Bugünkü planını tamamladın mı?","Molayı uzatma, 10 dakika sonra masaya 📚","Deneme sonucunu yüklemeyi unutma.","Takıldığın konuyu yaz, birlikte bakalım.","Akşam kısa bir görüşme yapalım mı?"];
const SENDIC='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/></svg>';
const hhmm=t=>new Date(t).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
const mtime=t=>{const d=new Date(t),n=new Date(),same=d.toDateString()===n.toDateString();return same?hhmm(t):d.toLocaleDateString("tr-TR",{day:"numeric",month:"short"})+" "+hhmm(t)};
function mdayN(t){const a=new Date();a.setHours(0,0,0,0);const b=new Date(t);b.setHours(0,0,0,0);return Math.round((a-b)/864e5)}
function mday(t){const n=mdayN(t),d=new Date(t);return n===0?"Bugün":n===1?"Dün":n>1&&n<7?d.toLocaleDateString("tr-TR",{weekday:"long"}):d.toLocaleDateString("tr-TR",d.getFullYear()===new Date().getFullYear()?{day:"numeric",month:"long"}:{day:"numeric",month:"long",year:"numeric"})}
function mlistTime(t){if(!t)return "";const n=mdayN(t);return n===0?hhmm(t):n===1?"Dün":n<7?new Date(t).toLocaleDateString("tr-TR",{weekday:"short"}):new Date(t).toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"2-digit"})}
const MCOLS="id,from_coach,body,created_at,read_at,kind,wa_status";
async function loadMsgs(id){try{const {data,error}=await sb.from("messages").select(MCOLS).eq("student_id",id).order("created_at",{ascending:false}).limit(150);if(error)throw error;MSG[id]=(data||[]).reverse()}catch(e){MSG[id]=MSG[id]||[]}}
async function loadUnr(){try{
  if(ROLE==="coach"){
    const since=new Date(Date.now()-120*864e5).toISOString();
    const [u,l]=await Promise.all([sb.from("messages").select("student_id,created_at,body").eq("from_coach",false).is("read_at",null).limit(1000),sb.from("messages").select("student_id,body,from_coach,created_at,read_at,kind").gte("created_at",since).order("created_at",{ascending:false}).limit(1500)]);
    if(u.error)throw u.error;
    Object.keys(MU).forEach(k=>delete MU[k]);Object.keys(MUL).forEach(k=>delete MUL[k]);MNEW=null;MNEWID=null;
    (u.data||[]).forEach(r=>{MU[r.student_id]=(MU[r.student_id]||0)+1;const x=MUL[r.student_id];if(!x||r.created_at>x.t)MUL[r.student_id]={t:r.created_at,b:String(r.body||"")};if(!MNEW||r.created_at>MNEW){MNEW=r.created_at;MNEWID=r.student_id}});
    if(!l.error){Object.keys(MLAST).forEach(k=>delete MLAST[k]);(l.data||[]).forEach(r=>{if(!MLAST[r.student_id])MLAST[r.student_id]=r})}
    // Açık sohbetteki yeni mesajlar okunmuş sayılır (rozet takılı kalmasın)
    if(MV&&MSEL&&MU[MSEL]&&document.visibilityState==="visible")msgMarkRead(MSEL);
  }
  else{const {data,error}=await sb.from("messages").select("id").eq("student_id",ME).eq("from_coach",true).is("read_at",null).limit(200);if(error)throw error;MU[ME]=(data||[]).length}
}catch(e){}}
const ago=t=>{if(!t)return "";const m=Math.max(0,Math.round((Date.now()-new Date(t))/60000));return m<1?"az önce":m<60?m+" dk önce":m<1440?Math.floor(m/60)+" sa önce":Math.floor(m/1440)+" gün önce"};
const unrTotal=()=>Object.values(MU).reduce((a,n)=>a+n,0);
async function msgMarkRead(id){try{await sb.rpc("msg_read",{p_student:id});MU[id]=0;delete MUL[id];if(MNEWID===id){MNEWID=null;MNEW=null}}catch(e){}}
async function msgOpen(id){
  MSEL=id;MERR="";MDRAFT="";MV=true;if(busy())msgPaint();else render();
  await Promise.all([loadMsgs(id),ROLE==="coach"&&typeof loadContact==="function"?loadContact(id):0]);
  await msgMarkRead(id);if(MSEL!==id||!MV)return;
  if(busy())msgPaint();else{render();const c=document.getElementById("mth");if(c)c.scrollTop=c.scrollHeight}
}
async function msgSync(){await loadMsgs(ME);if(MU[ME]){await msgMarkRead(ME)}}
async function msgSend(id){
  const el=document.getElementById("minp");if(!el||MSENDING)return;const body=el.value.trim();if(!body)return;
  const coach=ROLE==="coach",c=CONTACT[id]||{};
  // Elle WhatsApp gönderimi: pencere dokunuş anında açılmalı (sonradan açılırsa tarayıcı engeller).
  if(coach&&MWA[id]&&c.phone&&!(typeof waLive==="function"&&waLive()&&c.wa_ok))window.open("https://wa.me/"+c.phone+"?text="+encodeURIComponent(body),"_blank","noopener");
  MSENDING=true;MERR="";
  const tmp={id:"t"+Date.now(),from_coach:coach,body:body.slice(0,1000),created_at:new Date().toISOString(),read_at:null,kind:"chat",pend:1};
  (MSG[id]=MSG[id]||[]).push(tmp);el.value="";MDRAFT="";el.style.height="";msgPaint(true);
  try{
    const {data,error}=await sb.from("messages").insert({student_id:id,from_coach:coach,body:body.slice(0,1000)}).select(MCOLS).single();if(error)throw error;
    const L=MSG[id],i=L.indexOf(tmp);if(i>=0){if(L.some(m=>m.id===data.id))L.splice(i,1);else L[i]=data}
    if(coach)MLAST[id]=data;
  }catch(e){const L=MSG[id],i=L.indexOf(tmp);if(i>=0)L.splice(i,1);MERR="Mesaj gönderilemedi. Bağlantını kontrol edip tekrar dene.";MDRAFT=body}
  MSENDING=false;
  if(MERR){render();const n=document.getElementById("minp");if(n){n.value=MDRAFT;n.focus()}}
  else{msgPaint(true);const n=document.getElementById("minp");if(n)n.focus()}
  // WhatsApp otomatik açıksa gönderim durumu birkaç saniye sonra güncellenir
  if(coach&&!MERR&&typeof waLive==="function"&&waLive()&&c.wa_ok)setTimeout(()=>{if(MSEL===id)loadMsgs(id).then(()=>msgPaint())},6000);
}
/* ---- görünüm parçaları ---- */
function msgThread(id,coach){
  const L=MSG[id];if(!L)return `<div class="mth-e"><p class="empty">Yükleniyor…</p></div>`;
  if(!L.length)return `<div class="mth-e"><span aria-hidden="true">💬</span><p>Henüz mesaj yok. ${coach?"İlk mesajı sen yaz.":"Koçuna soru sor, durumunu paylaş."}</p></div>`;
  let o="",pd="",prev=null;
  L.forEach(m=>{
    const d=mday(m.created_at);if(d!==pd){o+=`<div class="mday"><span>${d}</span></div>`;pd=d;prev=null}
    const mine=m.from_coach===coach,auto=m.kind==="auto",first=!prev||prev.from_coach!==m.from_coach||prev.kind!==m.kind||Date.parse(m.created_at)-Date.parse(prev.created_at)>5*60e3;
    const tk=mine?(m.pend?`<b class="tick" title="Gönderiliyor">🕓</b>`:`<b class="tick${m.read_at?" read":""}" title="${m.read_at?"Okundu · "+mtime(m.read_at):"Gönderildi"}">${m.read_at?"✓✓":"✓"}</b>`):"";
    const ok=/^gönderildi/.test(m.wa_status||""),wa=coach&&m.from_coach&&m.wa_status&&!/^(atlandı|kapalı)/.test(m.wa_status)?`<span class="mwa-s${ok?"":" bad"}" title="WhatsApp: ${esc(m.wa_status)}">📲${ok?"✓":"!"}</span>`:"";
    o+=`<div class="mb ${mine?"me":"ot"}${first?" first":""}${auto?" auto":""}">${auto&&first?`<i class="mb-auto">🤖 Otomatik mesaj · yapay zekâ</i>`:""}<span class="mb-t">${esc(m.body)}</span><small class="mb-m">${wa}${hhmm(m.created_at)}${tk}</small></div>`;
    prev=m});
  return o;
}
function msgComposer(id,coach){
  const c=CONTACT[id]||{},live=typeof waLive==="function"&&waLive(),waAuto=coach&&live&&c.wa_ok&&c.phone,waMan=coach&&!waAuto&&c.phone;
  return `<div class="mcomp">${MERR?`<p class="merr" role="alert">${esc(MERR)}</p>`:""}${coach?`<div class="mqr" aria-label="Hazır yanıtlar">${MQR.map((q,i)=>`<button data-mqr="${i}">${esc(q)}</button>`).join("")}</div>`:""}
  <div class="mrow"><textarea id="minp" rows="1" maxlength="1000" placeholder="Mesaj yaz" aria-label="Mesaj">${esc(MDRAFT)}</textarea><button class="msend" id="msend" aria-label="Gönder" ${MSENDING?"disabled":""}>${SENDIC}</button></div>
  ${waAuto?`<p class="mwa">📲 Mesajların WhatsApp'a da otomatik gider.</p>`:waMan?`<p class="mwa"><button class="chip" data-mwa="${id}" aria-pressed="${!!MWA[id]}">📲 WhatsApp'tan da gönder</button><span>${MWA[id]?"Gönder'e basınca WhatsApp açılır; orada da gönder'e bas.":""}</span></p>`:""}</div>`;
}
function msgSorted(){return roster().slice().sort((a,b)=>{const ta=(MLAST[a.id]||{}).created_at||"",tb=(MLAST[b.id]||{}).created_at||"";return tb.localeCompare(ta)||a.n.localeCompare(b.n,"tr")})}
function msgItem(x){
  const l=MLAST[x.id],u=MU[x.id]||0,mine=l&&l.from_coach,st=x.st==="study"||x.st==="break"?`<i class="dot ${DOT[x.st]}"></i>`:"";
  const pv=l?`${mine&&l.kind!=="auto"?`<b class="tick${l.read_at?" read":""}">${l.read_at?"✓✓":"✓"}</b>`:""}${l.kind==="auto"?"🤖 ":""}${esc(String(l.body).replace(/\s+/g," ").slice(0,90))}`:`<em>Sohbet başlat</em>`;
  return `<button class="mli${x.id===MSEL?" on":""}${u?" un":""}" data-mo="${x.id}"><span class="oav">${PH[x.id]?`<img src="${PH[x.id]}" alt="">`:esc(initials(x.n))}${st}</span><span class="mli-b"><span class="mli-r1"><b>${x.n}</b><time>${l?mlistTime(l.created_at):""}</time></span><span class="mli-r2"><span class="mli-p">${pv}</span>${u?`<span class="bd">${u}</span>`:""}</span></span></button>`;
}
function msgHead(x,coach){
  if(!coach)return `<div class="mhd"><span class="oav">K</span><div class="mhd-t"><b>Koçun</b><small>Karakış Eğitim &amp; Danışmanlık · 🤖 işaretli mesajlar otomatik</small></div></div>`;
  const c=CONTACT[x.id]||{},sub=x.st==="study"?`<i class="dot study"></i>Şu an derste`:x.st==="break"?`<i class="dot break"></i>Molada${x.brk?" · "+x.brk+" dk":""}`:esc(LBL[x.st]||"");
  return `<div class="mhd"><button class="ktback mbk" data-navback="1" aria-label="Sohbet listesine dön">←</button><span class="oav">${PH[x.id]?`<img src="${PH[x.id]}" alt="">`:esc(initials(x.n))}</span><div class="mhd-t"><b>${x.n}</b><small>${sub}</small></div><div class="mhd-a">${c.phone?`<a class="tb-ic" href="https://wa.me/${c.phone}" target="_blank" rel="noopener" title="WhatsApp'ta aç" aria-label="WhatsApp'ta aç">📲</a>`:""}<button class="chip" data-i="${x.id}">Profil</button></div></div>`;
}
function msgView(){
  const all=msgSorted(),cur=all.find(x=>x.id===MSEL);
  return `<section id="coach-msgs" class="coach-section"><div class="page-intro"><div class="pi-t">${backBtn("Geri","pi-back")}<div><p>Öğrencilerinle yazışma</p><h1>Mesajlar</h1></div></div></div>
  <div class="mgrid${cur?" th":""}"><div class="card mlist"><div class="ml-h"><div class="ml-t"><h2>Sohbetler</h2>${unrTotal()?`<span class="bd">${unrTotal()} okunmamış</span>`:""}</div><div class="ml-s"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="mq" type="search" placeholder="Öğrenci ara" aria-label="Sohbetlerde ara" autocomplete="off" value="${esc(MQ)}"></div></div><div class="ml-items" id="mlitems">${all.map(msgItem).join("")||`<p class="empty" style="padding:14px">Öğrenci yok.</p>`}</div></div>
  <div class="card mpane">${cur?msgHead(cur,true)+`<div class="mth" id="mth">${msgThread(cur.id,true)}</div>`+msgComposer(cur.id,true):`<div class="mempty"><span aria-hidden="true">💬</span><h2>Bir sohbet seç</h2><p class="empty">Soldan bir öğrenci seç. 🤖 işaretli mesajları yapay zekâ otomatik gönderir (ör. uzun mola hatırlatması).</p></div>`}</div></div></section>`;
}
function msgTab(){
  if(!MFIRST[ME]&&!MLOAD){MLOAD=true;msgSync().then(()=>{MFIRST[ME]=1;MLOAD=false;if(tab==="m"){if(busy())msgPaint();else render()}}).catch(()=>{MFIRST[ME]=1;MLOAD=false})}
  return `<div class="card mpane stu-chat">${msgHead(null,false)}<div class="mth" id="mth">${msgThread(ME,false)}</div>${msgComposer(ME,false)}</div>`;
}
function msgHomeCard(){
  const n=MU[ME]||0;
  return `<button class="card tr" data-tab="m" aria-label="Koç mesajlarını aç"><span class="rg" style="--p:0"><span style="font-size:26px">💬</span></span><span><h2>Koçunla mesajlaş</h2><p style="font-size:14px;color:var(--mute);margin:2px 0 0">${n?`<b style="color:var(--acc)">${n} yeni mesaj</b>`:"Soru sor, durumunu paylaş"}</p></span></button>`;
}
/* Yazı alanına dokunmadan yalnızca konuşmayı ve listeyi yeniler (koç yazarken yeni mesajlar da görünür). */
function msgFilter(){const q=MQ.trim().toLocaleLowerCase("tr");document.querySelectorAll("#mlitems .mli").forEach(b=>{const n=(b.querySelector("b")||{}).textContent||"";b.style.display=!q||n.toLocaleLowerCase("tr").includes(q)?"":"none"})}
function msgPaint(force){
  const coach=ROLE==="coach",id=coach?MSEL:ME,th=document.getElementById("mth");
  if(th&&id){const end=force||th.scrollHeight-th.scrollTop-th.clientHeight<90;th.innerHTML=msgThread(id,coach);if(end)th.scrollTop=th.scrollHeight}
  const li=document.getElementById("mlitems");if(li&&coach){li.innerHTML=msgSorted().map(msgItem).join("");msgFilter()}
}
/* Canlı güncelleme (Supabase realtime): yeni mesaj ve okundu bilgisi anında işlenir. */
function msgLive(p){
  const r=p&&p.new;if(!r||!r.student_id)return;
  const sid=r.student_id,L=MSG[sid],coach=ROLE==="coach";
  if(p.eventType==="INSERT"){
    if(L&&!L.some(m=>m.id===r.id)){const i=L.findIndex(m=>m.pend&&m.body===r.body&&m.from_coach===r.from_coach);if(i>=0)L[i]=r;else L.push(r)}
    if(coach)MLAST[sid]=r;
    const mine=coach?r.from_coach:!r.from_coach,open=coach?(MV&&MSEL===sid):tab==="m";
    if(!mine){
      if(open&&document.visibilityState==="visible")msgMarkRead(sid);
      else{MU[sid]=(MU[sid]||0)+1;if(coach){MUL[sid]={t:r.created_at,b:String(r.body||"")};MNEW=r.created_at;MNEWID=sid}}
    }
  }else if(p.eventType==="UPDATE"){
    if(L){const i=L.findIndex(m=>m.id===r.id);if(i>=0)L[i]=Object.assign({},L[i],r)}
    if(coach&&MLAST[sid]&&MLAST[sid].id===r.id)MLAST[sid]=Object.assign({},MLAST[sid],r);
  }
  const open=coach?MV:tab==="m";
  if(open&&document.getElementById("mth")||coach&&MV&&document.getElementById("mlitems")){msgPaint();return}
  if(!busy())render();
}
document.addEventListener("keydown",e=>{if(e.target.id==="minp"&&e.key==="Enter"&&!e.shiftKey){e.preventDefault();const id=ROLE==="coach"?MSEL:ME;if(id)msgSend(id)}});
document.addEventListener("input",e=>{
  if(e.target.id==="minp"){MDRAFT=e.target.value;e.target.style.height="auto";e.target.style.height=Math.min(140,e.target.scrollHeight)+"px"}
  if(e.target.id==="mq"){MQ=e.target.value.slice(0,40);msgFilter()}
});
