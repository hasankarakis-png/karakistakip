// Koç ↔ öğrenci mesajlaşma
const MSG={},MU={},MUL={};let MNEW=null,MNEWID=null,MDRAFT="",MFIRST={};let MSEL=null,MV=false,MERR="",MLOAD=false,MSENDING=false;
const mtime=t=>{const d=new Date(t),n=new Date(),same=d.toDateString()===n.toDateString();return same?d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}):d.toLocaleDateString("tr-TR",{day:"numeric",month:"short"})+" "+d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})};
async function loadMsgs(id){try{const {data,error}=await sb.from("messages").select("id,from_coach,body,created_at,read_at").eq("student_id",id).order("created_at",{ascending:false}).limit(100);if(error)throw error;MSG[id]=(data||[]).reverse()}catch(e){MSG[id]=MSG[id]||[]}}
async function loadUnr(){try{
  if(ROLE==="coach"){const {data,error}=await sb.from("messages").select("student_id,created_at,body").eq("from_coach",false).is("read_at",null).limit(1000);if(error)throw error;Object.keys(MU).forEach(k=>delete MU[k]);Object.keys(MUL).forEach(k=>delete MUL[k]);MNEW=null;MNEWID=null;(data||[]).forEach(r=>{MU[r.student_id]=(MU[r.student_id]||0)+1;const l=MUL[r.student_id];if(!l||r.created_at>l.t)MUL[r.student_id]={t:r.created_at,b:String(r.body||"")};if(!MNEW||r.created_at>MNEW){MNEW=r.created_at;MNEWID=r.student_id}})}
  else{const {data,error}=await sb.from("messages").select("id").eq("student_id",ME).eq("from_coach",true).is("read_at",null).limit(200);if(error)throw error;MU[ME]=(data||[]).length}
}catch(e){}}
const ago=t=>{if(!t)return "";const m=Math.max(0,Math.round((Date.now()-new Date(t))/60000));return m<1?"az önce":m<60?m+" dk önce":m<1440?Math.floor(m/60)+" sa önce":Math.floor(m/1440)+" gün önce"};
const unrTotal=()=>Object.values(MU).reduce((a,n)=>a+n,0);
async function msgMarkRead(id){try{await sb.rpc("msg_read",{p_student:id});MU[id]=0;delete MUL[id]}catch(e){}}
async function msgOpen(id){MSEL=id;MERR="";MDRAFT="";await loadMsgs(id);await msgMarkRead(id);render();const c=document.getElementById("mth");if(c)c.scrollTop=c.scrollHeight}
async function msgSync(){await loadMsgs(ME);if(MU[ME]){await msgMarkRead(ME)}}
async function msgSend(id){
  const el=document.getElementById("minp");if(!el||MSENDING)return;const body=el.value.trim();if(!body)return;
  MSENDING=true;MERR="";
  try{const {error}=await sb.from("messages").insert({student_id:id,from_coach:ROLE==="coach",body:body.slice(0,1000)});if(error)throw error;el.value="";MDRAFT="";await loadMsgs(id)}
  catch(e){MERR="Mesaj gönderilemedi. Bağlantını kontrol edip tekrar dene."}
  MSENDING=false;render();const c=document.getElementById("mth");if(c)c.scrollTop=c.scrollHeight;const n=document.getElementById("minp");if(n&&!MERR)n.focus();
}
function msgBox(id,coach){
  const L=MSG[id]||[];
  return `<div class="mth" id="mth">${L.length?L.map(m=>{const mine=m.from_coach===coach;return `<div class="mb ${mine?"me":"ot"}"><span>${esc(m.body)}</span><small>${mtime(m.created_at)}${mine&&m.read_at?" · okundu":""}</small></div>`}).join(""):`<p class="empty" style="margin:auto">Henüz mesaj yok. İlk mesajı sen yaz.</p>`}</div>
  ${MERR?`<p style="color:var(--warn);margin:8px 0 0">${esc(MERR)}</p>`:""}
  <div class="mrow"><textarea id="minp" rows="1" maxlength="1000" placeholder="Mesajını yaz…" aria-label="Mesaj">${esc(MDRAFT)}</textarea><button class="cta" id="msend" ${MSENDING?"disabled":""}>Gönder</button></div>`;
}
function msgView(){
  const all=roster().slice().sort((a,b)=>(MU[b.id]||0)-(MU[a.id]||0)||a.n.localeCompare(b.n,"tr"));
  const cur=all.find(x=>x.id===MSEL);
  // Telefonda yazışma açıkken liste gizlenir; üstteki ← listeye döner. "Profili aç" öğrencinin sayfasına geçer.
  return `<section id="coach-msgs" class="coach-section"><div class="page-intro"><div class="pi-t">${backBtn("Geri","pi-back")}<div><p>Öğrencilerinle yazışma</p><h1>Mesajlar</h1></div></div></div>
  <div class="mgrid${cur?" th":""}"><div class="card mlist">${all.map(x=>`<button class="mli${x.id===MSEL?" on":""}" data-mo="${x.id}"><span class="oav">${PH[x.id]?`<img src="${PH[x.id]}" alt="">`:esc(initials(x.n))}</span><b>${x.n}</b>${MU[x.id]?`<span class="bd">${MU[x.id]}</span>`:""}</button>`).join("")||`<p class="empty">Öğrenci yok.</p>`}</div>
  <div class="card mpane">${cur?`<div class="mhd"><button class="ktback mbk" data-navback="1" aria-label="Öğrenci listesine dön">←</button><span class="oav">${PH[cur.id]?`<img src="${PH[cur.id]}" alt="">`:esc(initials(cur.n))}</span><h2>${cur.n}</h2><button class="chip" data-i="${cur.id}">Profili aç</button></div>${msgBox(cur.id,true)}`:`<p class="empty" style="margin:auto">Soldan bir öğrenci seç.</p>`}</div></div></section>`;
}
function msgTab(){
  if(!MFIRST[ME]&&!MLOAD){MLOAD=true;msgSync().then(()=>{MFIRST[ME]=1;MLOAD=false;if(tab==="m"&&!busy())render()}).catch(()=>{MFIRST[ME]=1;MLOAD=false})}
  return `<div class="card mpane"><h2>Koçuma mesaj</h2>${msgBox(ME,false)}</div>`;
}
function msgHomeCard(){
  const n=MU[ME]||0;
  return `<button class="card tr" data-tab="m" aria-label="Koç mesajlarını aç"><span class="rg" style="--p:0"><span style="font-size:26px">💬</span></span><span><h2>Koçunla mesajlaş</h2><p style="font-size:14px;color:var(--mute);margin:2px 0 0">${n?`<b style="color:var(--acc)">${n} yeni mesaj</b>`:"Soru sor, durumunu paylaş"}</p></span></button>`;
}
document.addEventListener("keydown",e=>{if(e.target.id==="minp"&&e.key==="Enter"&&!e.shiftKey){e.preventDefault();const id=ROLE==="coach"?MSEL:ME;if(id)msgSend(id)}});
document.addEventListener("input",e=>{if(e.target.id==="minp")MDRAFT=e.target.value});
