/* ===== Gezinme ve bildirimler =====
   1) Geri tuşu: her ekran değişimi tarayıcı geçmişine yazılır. Telefonun geri tuşu/hareketi, masaüstünde tarayıcının
      geri düğmesi ve uygulamadaki "←" düğmeleri bir önceki ekrana döner; kaydırma konumu korunur.
      Aynı ekrandaki alt sekmeler (Özet/Analiz/Görevler/Diğer) geçmişi şişirmesin diye yeni kayıt açmaz.
   2) Koç bildirim merkezi: geciken görevler, okunmamış mesajlar ve uyarılar öğrenci adıyla listelenir. */

let NAVK=null,NAVD=0,NAVPOP=false,NAVOV=false,NAVSKIP=false,NAVREPL=false,NAVY=0,NAVLAST="";
const CPL={o:"Genel bakış",s:"Öğrenciler",t:"Görev yönetimi",c:"Yarışmalar",a:"Deneme analizi",p:"Program ver",y:"Ayarlar"};
const STL={b:"Bugün",g:"Görevler",d:"Analiz",h:"Profil",k:"Asistan",t:"Tercih Robotu",c:"Konu Takibi",y:"Yarışma",m:"Koçum"};
const stuNm=id=>(STU.find(p=>p.id===id)||{}).name||"Öğrenci";
const stuAv=(id,cls)=>`<span class="${cls||"oav"}">${PH[id]?`<img src="${PH[id]}" alt="">`:esc(initials(stuNm(id)))}</span>`;
const navR=()=>ROLE==="coach"?"c":"s";

function navSnap(){
  if(ROLE==="coach")return {r:"c",cp:CPG,mv:MV?1:0,ms:MV&&MSEL?MSEL:null,sel:sel||null,dt:DTAB,plv:PLV||null,sd:selDay||null,rp:RPMODE?1:0};
  return {r:"s",tab,ant:ANT,ke:KTS.exam,kd:tab==="c"&&KTS.ders!=null?KTS.ders:null};
}
function navKey(s){
  if(s.r==="c")return s.mv?"m"+(s.ms?"/t":""):s.sel?"o/"+s.sel+(s.plv?"/plan":"")+(s.sd?"/"+s.sd:""):"p/"+s.cp;
  return "s/"+s.tab+(s.kd!=null?"/"+s.kd:"");
}
function navLabel(s){
  if(!s)return "Geri";
  if(s.r==="c"){
    if(s.mv)return "Mesajlar";
    if(s.sel)return s.plv?"Program ver":s.sd?fd(s.sd):stuNm(s.sel);
    return CPL[s.cp]||"Geri";
  }
  if(s.tab==="c"&&s.kd!=null&&KT[s.ke||"TYT"]&&KT[s.ke||"TYT"][s.kd])return KT[s.ke||"TYT"][s.kd].n;
  return STL[s.tab]||"Geri";
}
/* render() sonunda çağrılır: ekran değiştiyse yeni geçmiş kaydı açar, değişmediyse mevcut kaydı günceller. */
function navSync(){
  if(!ME||!ROLE)return;
  const s=navSnap(),k=navKey(s);
  try{
    const h=history.state||{};
    if(NAVPOP){NAVK=k;NAVLAST=JSON.stringify(s);navLbl();return}
    if(NAVK===null||NAVREPL){
      const keep=!NAVREPL&&h.r===s.r&&h.k===k?{pk:h.pk,pl:h.pl}:{};
      NAVREPL=false;NAVK=k;NAVLAST=JSON.stringify(s);history.replaceState({...s,k,d:NAVD,y:0,...keep},"");navLbl();return}
    if(k===NAVK){const j=JSON.stringify(s);if(j!==NAVLAST){NAVLAST=j;history.replaceState({...h,...s,k,d:NAVD},"")}navLbl();return}
    const prev={pk:h.k||NAVK,pl:navLabel(h.r?h:null)};
    if(NAVOV){NAVOV=false;history.replaceState({...s,k,d:NAVD,y:0,...prev},"")}
    else{if(h.k)history.replaceState({...h,y:NAVY},"");NAVD++;history.pushState({...s,k,d:NAVD,y:0,...prev},"")}
    NAVK=k;NAVLAST=JSON.stringify(s);NAVY=0;navLbl();
  }catch(e){}
}
/* Geri düğmelerinde gideceği ekranın adını yazar (ör. "← Görev yönetimi"). */
function navLbl(){
  const h=history.state||{},t=h.d>0&&h.pl?h.pl:null;
  document.querySelectorAll("[data-navback] .nbl").forEach(e=>{if(t)e.textContent=t;else if(e.dataset.def)e.textContent=e.dataset.def});
}
function navApply(s){
  if(!s)return;
  if(s.r==="c"){
    const was=sel;
    CPG=CPL[s.cp]?s.cp:"o";MV=!!s.mv;MSEL=s.ms||null;sel=s.sel&&STU.some(p=>p.id===s.sel)?s.sel:null;
    DTAB=s.dt||"o";PLV=sel&&s.plv===sel?s.plv:null;selDay=sel?s.sd||null:null;RPMODE=!!s.rp;
    if(sel&&sel!==was)stuLoad(sel);
    if(sel&&selDay&&!DSTATE[sel+"|"+selDay]){const id=sel,d=selDay;loadDay(id,d).then(()=>{if(sel===id&&selDay===d)render()})}
    if(MV&&MSEL){const id=MSEL;loadMsgs(id).then(()=>msgMarkRead(id)).then(()=>{if(MV&&MSEL===id){render();const c=document.getElementById("mth");if(c)c.scrollTop=c.scrollHeight}})}
    else if(MV)loadUnr().then(()=>{if(MV)render()});
  }else{
    tab=STL[s.tab]?s.tab:"b";ANT=s.ant||"o";if(s.ke)KTS.exam=s.ke;KTS.ders=s.kd==null?null:+s.kd;
  }
}
function navRoot(){
  if(ROLE==="coach"){sel=null;selDay=null;PLV=null;MV=false;MSEL=null;CPG="o"}
  else{tab="b";KTS.ders=null}
}
/* Uygulama açılırken (yenileme dahil) son ekranı geri getirir. */
function navInit(){
  NAVK=null;const h=history.state;
  if(h&&h.r===navR()){NAVD=h.d||0;navApply(h)}else NAVD=0;
}
window.addEventListener("scroll",()=>{NAVY=window.scrollY},{passive:true});
window.addEventListener("popstate",e=>{
  if(!ME||!ROLE)return;
  const st=e.state;
  if(NAVSKIP){NAVSKIP=false;NAVD=st&&st.d||0;return}
  const ov=document.body.classList.contains("sbopen")||QA||!!DC||ONB.open;
  document.body.classList.remove("sbopen");QA=false;DC=null;ONB.open=false;NAVOV=false;
  if(!st||st.r!==navR()){navRoot();NAVREPL=true;render();window.scrollTo(0,0);return}
  NAVD=st.d||0;
  if(ov&&st.k===NAVK){render();return}
  navApply(st);NAVPOP=true;try{render()}finally{NAVPOP=false}
  const y=st.y||0;requestAnimationFrame(()=>window.scrollTo(0,y));
});
/* Görünür "←" düğmeleri: içeride gelinen bir ekran varsa ona döner; yoksa bir üst ekrana çıkar. */
function navBack(){
  const h=history.state;
  if(h&&h.d>0){history.back();return}
  navUp();
}
function navUp(){
  if(ROLE==="coach"){if(PLV)PLV=null;else if(selDay)selDay=null;else if(sel)sel=null;else if(MV&&MSEL)MSEL=null;else if(MV)MV=false;else CPG="o"}
  else{if(tab==="c"&&KTS.ders!=null)KTS.ders=null;else tab="b"}
  NAVREPL=true;render();window.scrollTo(0,0);
}
/* Açılır menü ve hızlı işlem paneli: geri tuşu önce bunları kapatır. */
function navOv(){
  if(NAVOV)return;
  try{const h=history.state||{};NAVD++;history.pushState({...h,d:NAVD,ov:1},"");NAVOV=true}catch(e){}
}
function navOvClosed(){
  if(!NAVOV||document.body.classList.contains("sbopen")||QA||DC||ONB.open)return;
  NAVOV=false;NAVSKIP=true;try{history.back()}catch(e){NAVSKIP=false}
}
document.addEventListener("click",()=>setTimeout(navOvClosed,0));
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape"||!(QA||DC||ONB.open||document.body.classList.contains("sbopen")))return;
  e.preventDefault();if(NAVOV)history.back();else{document.body.classList.remove("sbopen");if(QA||DC||ONB.open){QA=false;DC=null;ONB.open=false;render()}}
});

/* ortak geri düğmeleri */
const backBtn=(def,cls)=>`<button class="${cls||"tb-back"}" data-navback="1" aria-label="Geri">${sic("back")}<span class="nbl" data-def="${esc(def)}">${esc(def)}</span></button>`;
function topBar(title,sub,acts,below){
  return `<div class="tbar-w"><div class="tbar">${backBtn("Geri")}<div class="tb-t">${title}${sub?`<small>${sub}</small>`:""}</div>${acts?`<div class="tb-acts">${acts}</div>`:""}</div>${below||""}</div>`;
}
const stHead=t=>`<div class="ktbar stb"><button class="ktback" data-navback="1" aria-label="Geri">←</button><h1 class="pg" style="margin:0">${t}</h1></div>`;
const refreshBtn=()=>`<button class="tb-ic" data-nrf="1" aria-label="Verileri yenile" title="Yenile">↻</button>`;

/* öğrenci detayını aç (liste, bildirim, mesaj, sınıf analizinden) */
function stuLoad(id){Promise.all([loadHist(id),loadExams(id),loadReport(id),loadTarget(id),loadTasks(id),loadPlan(id),loadContact(id)]).then(()=>{if(sel===id&&!busy())render()})}
function openStu(id,dt){
  if(!STU.some(p=>p.id===id))return;
  ADMMSG=null;TGMSG="";PLANMSG="";CMSG="";try{setEx("")}catch(e){}
  sel=id;selDay=null;DTAB=dt||"o";RPMODE=false;PLV=null;MV=false;MSEL=null;
  render();window.scrollTo(0,0);stuLoad(id);
}
function openMsg(id){MV=true;sel=null;PLV=null;window.scrollTo(0,0);msgOpen(id)}

/* ---- Koç bildirim merkezi ---- */
function notifData(){
  const ok=id=>STU.some(p=>p.id===id),by={};
  (ODL||[]).forEach(t=>{if(ok(t.student_id))(by[t.student_id]=by[t.student_id]||[]).push(t)});
  const od=Object.entries(by).sort((a,b)=>b[1].length-a[1].length||stuNm(a[0]).localeCompare(stuNm(b[0]),"tr"));
  const un=Object.entries(MU).filter(([id,n])=>n>0&&ok(id)).sort((a,b)=>String((MUL[b[0]]||{}).t||"").localeCompare(String((MUL[a[0]]||{}).t||"")));
  const R=roster(),fl=R.map(x=>({id:x.id,f:flags(x.hist)})).filter(o=>o.f.length);
  const lb=R.filter(x=>x.st==="break"&&x.brk>=num(SET.nudge.min||60)).sort((a,b)=>b.brk-a.brk);
  return {od,un,fl,lb,n:od.length+un.length+fl.length+lb.length};
}
const nameList=(ids,max)=>{const n=ids.map(stuNm);return n.slice(0,max||2).join(", ")+(n.length>(max||2)?" +"+(n.length-(max||2)):"")};
const NTFX={};
function notifCard(){
  const {od,un,fl,lb,n}=notifData();
  const who=(id,sub,attr)=>`<button class="ntf-who" ${attr}>${stuAv(id)}<span><b>${esc(stuNm(id))}</b><small>${sub}</small></span><i aria-hidden="true">›</i></button>`;
  // Uzun listede her bölüm ilk 4 öğrenciyle başlar; "Tümünü göster" açar. Böylece alttaki kartlar aşağıda kaybolmaz.
  const LIM=4,cut=(k,L)=>NTFX[k]?L:L.slice(0,LIM),more=(k,L)=>L.length>LIM?`<button class="ntf-more" data-ntfx="${k}">${NTFX[k]?"Daha az göster":"Tümünü göster ("+L.length+")"}</button>`:"";
  const sec=(ic,t,c,body)=>c?`<div class="ntf-sec"><div class="ntf-h"><span>${ic} ${t}</span><span class="bd n">${c}</span></div>${body}</div>`:"";
  const odH=cut("od",od).map(([id,L])=>`<div class="ntf-row">${who(id,L.length+" görev gecikti · en eskisi "+fd(L[0].task_date),`data-ngo="${id}" data-ndt="g"`)}
    <ul class="ntf-list">${L.slice(0,3).map(t=>`<li><span>${esc(t.title)}${t.subject?` <em>${esc(t.subject)}</em>`:""}</span><time>${fd(t.task_date)}</time></li>`).join("")}${L.length>3?`<li class="more">+${L.length-3} görev daha</li>`:""}</ul>
    <div class="ntf-acts"><button class="chip" data-ngo="${id}" data-ndt="g">🤖 Yapay zekâyla dağıt</button><button class="chip" data-nrs="${id}" data-nrd="${day()}">Bugüne al</button><button class="chip" data-nrs="${id}" data-nrd="${dayN(1)}">Yarına kaydır</button></div></div>`).join("")+more("od",od);
  const unH=cut("un",un).map(([id,c])=>{const l=MUL[id]||{};return `<div class="ntf-row">${who(id,c+" okunmamış mesaj"+(l.t?" · "+ago(l.t):""),`data-nmsg="${id}"`)}${l.b?`<p class="ntf-q">“${esc(l.b.length>110?l.b.slice(0,109)+"…":l.b)}”</p>`:""}</div>`}).join("")+more("un",un);
  const flH=cut("fl",fl).map(o=>`<div class="ntf-row">${who(o.id,o.f.map(esc).join(" · "),`data-ngo="${o.id}" data-ndt="a"`)}</div>`).join("")+more("fl",fl);
  return `<div class="card ntf" id="coach-notifs"><div class="ntf-top"><h2>🔔 Bildirimler</h2>${refreshBtn()}</div>
  ${n?`<p class="empty" style="margin:0 0 4px;font-size:14px">Bir öğrenciye dokun, ilgili sekmesi açılır.</p>`+sec("⏰","Geciken görevler (son 7 gün)",od.length,odH)+sec("💬","Okunmamış mesajlar",un.length,unH)+sec("☕","Uzun molada",lb.length,lb.map(x=>`<div class="ntf-row">${who(x.id,x.brk+" dakikadır molada"+(x.brk>=num(SET.nudge.min||60)&&SET.nudge.on!==false?" · 🤖 otomatik hatırlatma gider":""),`data-nmsg="${x.id}"`)}</div>`).join(""))+sec("🚩","Dikkat gereken öğrenciler",fl.length,flH)
  :`<p class="empty" style="margin:0">Şu an bekleyen bildirim yok 🎉 Geciken görev, okunmamış mesaj veya uyarı olduğunda burada öğrenci adıyla görünür.</p>`}</div>`;
}
async function odResched(id,date){
  const ids=(ODL||[]).filter(t=>t.student_id===id).map(t=>t.id);if(!ids.length)return;
  if(!confirm(stuNm(id)+" için "+ids.length+" geciken görev "+(date===day()?"bugüne alınsın mı?":"yarına kaydırılsın mı?")))return;
  try{const r=await sb.rpc("task_reschedule",{p_ids:ids,p_date:date});if(r.error)throw r.error;setSync("✓ "+(r.data??ids.length)+" görev kaydırıldı")}catch(e){alert("Kaydırılamadı: "+(e&&e.message||e));return}
  await loadOD();if(TK[id])await loadTasks(id);render();
}
async function refreshNow(){setSync("Yenileniyor…");await refreshRun(true)}

/* coach.js ui() içinden çağrılır */
function navUi(t){
  const D=t.dataset,id=t.id;
  if(D.navback){navBack();return true}
  if(id==="back"||id==="backhist"||D.backnav||D.plback){navBack();return true}
  if(D.ngo){openStu(D.ngo,D.ndt);return true}
  if(D.nmsg){openMsg(D.nmsg);return true}
  if(D.nrs){odResched(D.nrs,D.nrd);return true}
  if(D.nrf){refreshNow();return true}
  if(D.ntfx){NTFX[D.ntfx]=!NTFX[D.ntfx];const y=window.scrollY;render();window.scrollTo(0,y);return true}
  return false;
}
