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
  if(id==="who"||id==="hdrhome"||D.gohome){PLV=null;CPG="o";MV=false;if(ROLE==="coach"){sel=null;selDay=null;render()}else{tab="b";QA=false;render()}window.scrollTo(0,0);return true}
  if(D.tab){tab=D.tab;QA=false;render();window.scrollTo(0,0);return true}
  if(id==="phdel"){phDel();return true}
  if(id==="taask"){taAsk();return true}
  if(id==="chmk"){chCreate();return true}
  if(id==="chrf"){chLoad(true);return true}
  if(D.chsel||D.chnot||D.chdel||D.chhide||D.chtog){chAct(D);return true}
  if(id==="chsend"){chatSend();return true}
  if(id==="qaopen"){QA=true;render();return true}
  if(id==="qabg"){QA=false;render();return true}
  if(D.qa){QA=false;tab=D.qa;render();window.scrollTo(0,0);if(D.qs)setTimeout(()=>{const e=document.getElementById(D.qs);if(e)e.scrollIntoView({behavior:"smooth",block:"center"})},60);return true}
  if(D.hm){HMSEL=D.hm;render();return true}
  if(D.kte||D.ktd!=null||D.ktt||D.ktall!=null){ktAct(D);return true}
  if(D.tcadd||D.tcrm||D.tcup||D.tcdn){tcAct(D);return true}
  if(D.tcflt!=null){TC.flt=D.tcflt;TC.lim=40;render();return true}
  if(D.tcfc!=null){TC.fc=D.tcfc==="1";TC.lim=40;render();return true}
  if(D.tctr!=null){TC.tr=D.tctr;TC.lim=40;render();return true}
  if(D.tclv){TC.lv=D.tclv;TC.pt=D.tclv==="O"?"TYT":"SAY";TC.il="";TC.tur="";TC.flt="";TC.lim=40;const o=tcLoadList();o.lv=TC.lv;o.pt=TC.pt;tcSave(o);render();return true}
  if(id==="tcmore"){TC.lim+=40;render();return true}
  if(id==="tccopy"){const o=tcLoadList(),by=Object.fromEntries((TC.data.p||[]).map(p=>[p.kod,p]));const t=(o.l||[]).map((k,i)=>by[k]?`${i+1}. ${by[k].uni} - ${by[k].b} (${k})`:"").filter(Boolean).join("\n");try{navigator.clipboard.writeText(tx).then(()=>{t.textContent="Kopyalandı ✓"},()=>{t.textContent="Kopyalanamadı"})}catch(e){t.textContent="Kopyalanamadı"}return true}
  if(id==="theme2"){document.getElementById("theme").click();setTimeout(render,30);return true}
  if(id==="out2"){logout();return true}
  if(id==="guideok"){try{localStorage.setItem(GK(),"1")}catch(e){}render();return true}
  if(D.qdel!=null){const i=+D.qdel;if(S.qs[i]){const q=S.qs.splice(i,1)[0];log("Soru kaydı silindi ("+q.s+", "+q.n+")");save();render()}return true}
  if(D.tgsel){TGSEL[D.sid||ME]=D.tgsel;TGMSG="";render();return true}
  if(D.tgdel){targetDel(D.sid||ME,D.tgdel);return true}
  if(D.rd){ROADSEL[D.sid||ME]=D.rd;render();return true}
  if(D.csv){csvExport(D.csv);return true}
  if(id==="bkadd"){bulkAdd();return true}
  if(id==="pwa"){const p=document.getElementById("pt");window.open("https://wa.me/?text="+encodeURIComponent(p.value),"_blank","noopener");return true}
  if(id==="psh"){const p=document.getElementById("pt");if(navigator.share)navigator.share({text:p.value}).catch(()=>{});else{const c=document.getElementById("cp");if(c)c.click()}return true}
  if((D.pugo||D.puok||D.pucancel||D.putog!=null||D.wk!=null||D.wsel||D.wren||D.plopen||D.plback||D.plpick||D.boost||D.bmadd||D.selfdel)&&puAct(D,id))return true;
  if(D.ant){ANT=D.ant;render();window.scrollTo(0,0);return true}
  if(D.dt){DTAB=D.dt;PLV=null;render();window.scrollTo(0,0);return true}
  if(D.rpt){rptRun(D.rpt);return true}
  if(D.rpdf){pdfReport(D.rpdf);return true}
  if(id==='rptcp'){const e=document.getElementById('rpt');if(e&&navigator.clipboard)navigator.clipboard.writeText(e.value);return true}
  if(id==='rptwa'){const e=document.getElementById('rpt');if(e)window.open('https://wa.me/?text='+encodeURIComponent(e.value),'_blank','noopener');return true}
  if(D.rs){reschedule(D.rsid||ME,D.rs);return true}
  if(D.tk){togTask(D.tk);return true}
  if(D.tkdel){delTask(D.tkdel);return true}
  if(D.exdel){exDel(D.exdel);return true}
  if(D.exedit){exEdit(D.exedit);return true}
  if(D.fz){if(D.fz==="stop"){FZ=null;render()}else fzStart(D.fz);return true}
  const m={pushon:pushEnable,pushoff:pushDisable,csend:aiChatSend,tkadd:addTask,planrun:planRun,planok:planOk,plandel:planDel,adddn:addExam};
  if(m[id]){m[id]();return true}
  if(id==="admadd"){admRun("add");return true}
  if(id==="admreset"){admRun("reset");return true}
  if(id==="admdel"){admRun("del");return true}
  if(id==="admok"){ADMMSG=null;render();return true}
  return false;
}
document.addEventListener("click",e=>{
  const t=e.target.closest("button,[data-gohome],#who,#hdrhome");if(!t)return;
  rollover();
  if(t.id==="sbmini"){e.stopPropagation();const m=document.body.classList.toggle("sbmini");try{localStorage.setItem("sbmini",m?"1":"")}catch(x){}return}
  if(t.dataset.proxy){const el=document.getElementById(t.dataset.proxy);if(el)el.click();return}
  if(t.dataset.cp){CPG=t.dataset.cp;MV=false;MSEL=null;sel=null;PLV=null;render();window.scrollTo(0,0);return}
  if(t.dataset.msgnav){MV=true;sel=null;PLV=null;loadUnr().then(()=>{render();window.scrollTo(0,0)});render();return}
  if(MV&&(t.dataset.cnav||t.dataset.gohome||t.dataset.i||t.id==="who"||t.id==="hdrhome")){MV=false;MSEL=null;if(t.dataset.gohome||t.id==="who"||t.id==="hdrhome")CPG="o";render()}
  if(t.dataset.mo){msgOpen(t.dataset.mo);return}
  if(t.id==="msend"){msgSend(ROLE==="coach"?MSEL:ME);return}
  if(t.id==="rpgo"){RPMODE=true;CPG="s";MV=false;sel=null;render();window.scrollTo(0,0);return}
  if(t.id==="rpx"){RPMODE=false;render();return}
  if(t.id==="sbtog"){document.body.classList.add("sbopen");return}
  if(t.id==="sbov"||t.closest(".side-nav"))document.body.classList.remove("sbopen");
  if(t.id==="sbov")return;
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
  else if(t.id==="lgeye"){const p=document.getElementById("lp");if(p){p.type=p.type==="password"?"text":"password";p.focus()}}
  else if(t.id==="out"){logout()}
  else if(t.id==="back"){PLV=null;sel=null;selDay=null;render()}
  else if(t.id==="backhist"){selDay=null;render()}
  else if(t.dataset.per){per=t.dataset.per;render()}
  else if(t.dataset.d){selDay=t.dataset.d===day()?null:t.dataset.d;render();if(selDay&&!DSTATE[sel+"|"+selDay]){const id=sel,d=selDay;loadDay(id,d).then(()=>{if(sel===id&&selDay===d)render()})}}
  else if(t.dataset.i){sel=t.dataset.i;selDay=null;DTAB=RPMODE?"d":"o";RPMODE=false;PLV=null;render();const id=sel;Promise.all([loadHist(id),loadExams(id),loadReport(id),loadTarget(id),loadTasks(id),loadPlan(id)]).then(()=>{if(sel===id)render()})}
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
async function wakeSync(){try{if(!("wakeLock" in navigator))return;if((S.status==="study"||FZ)&&document.visibilityState==="visible"){if(!WL){WL=await navigator.wakeLock.request("screen");WL.addEventListener("release",()=>{WL=null})}}else if(WL){await WL.release();WL=null}}catch(e){WL=null}}
function clockTick(){
  const c=document.getElementById("clock");
  if(c&&ROLE==="student"&&view==="s"&&tab==="b"){c.textContent=dur(clockMs());const u=document.getElementById("clocksub");if(u)u.textContent=clockSub()}
  if(ROLE==="student"&&tab==="b"){const v=cdParts();v.forEach((x,i)=>{const e=document.getElementById("cd"+i);if(e)e.textContent=i?String(x).padStart(2,"0"):x})}
  try{document.title=FZ?"🍅 "+fzTxt()+" · Karakış Takip":(S&&S.status==="study")?dur(curNet())+" · Karakış Takip":"Karakış Takip"}catch(e){}
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
let EXJS=null;
// PDF sayfalarını JPEG görsele çevirir (en fazla 8 sayfa); böylece her görsel okuyan model PDF'i de okuyabilir.
async function pdfPages(file){
  if(!EXJS){EXJS=await import("/js/vendor/pdf.min.mjs");EXJS.GlobalWorkerOptions.workerSrc="/js/vendor/pdf.worker.min.mjs"}
  const doc=await EXJS.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const n=Math.min(doc.numPages,8),out=[];let total=0;
  for(let i=1;i<=n;i++){
    const pg=await doc.getPage(i),v0=pg.getViewport({scale:1}),sc=Math.min(2.2,1900/Math.max(v0.width,v0.height));
    const v=pg.getViewport({scale:sc}),c=document.createElement("canvas");c.width=Math.round(v.width);c.height=Math.round(v.height);
    await pg.render({canvasContext:c.getContext("2d"),viewport:v}).promise;
    const b=c.toDataURL("image/jpeg",.85).split(",")[1];total+=b.length;
    if(total>8.5e6)break;out.push(b);
  }
  return out;
}
async function examExtract(){
  const f=document.getElementById("exf").files[0];
  if(!f){setEx("Önce bir görsel veya PDF seç.");return}
  const pdf=f.type==="application/pdf"||/\.pdf$/i.test(f.name||"");
  if(pdf){
    if(f.size>6.5e6){setEx("PDF çok büyük (en fazla yaklaşık 6 MB). Sayfa sayısını azaltıp tekrar dene.");return}
    setEx("PDF okunuyor, 15-30 saniye sürebilir…");
    let pages;try{pages=await pdfPages(f)}catch(e){pages=null}
    let r;
    if(pages&&pages.length){r=await callFn("exam-extract",{images:pages,mime:"image/jpeg"})}
    else{
      let b64;try{b64=await readB64(f)}catch(e){setEx("PDF açılamadı.");return}
      r=await callFn("exam-extract",{image:b64,mime:"application/pdf"});
    }
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
const loginView=msg=>`<div class="lgx"><div class="lgx-bg"><i class="o1"></i><i class="o2"></i><i class="o3"></i><i class="gr"></i></div>
<section class="lgx-in"><div class="lgx-left"><div class="lgx-brand lg-u1"><span class="lgx-k">K</span><div><b>KARAKIŞ <em>TAKİP</em></b><small>Eğitim &amp; Danışmanlık</small></div></div>
<h1 class="lg-u2">Çalışmanın her gününü <em>görünür</em> kıl.</h1>
<p class="lg-u3">Günlük çalışma süren, çözdüğün sorular, deneme analizlerin ve koçunun planı tek yerde. Potansiyelini keşfet, geleceğini şekillendir.</p><div class="lgx-wd"><div class="lgx-w lgx-w1"><span class="wi"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg></span><div><small>Bugünkü net çalışma</small><b>04:20:36</b></div></div><div class="lgx-w lgx-w2"><span class="pg"><i></i></span><div><small>12 gün seri</small><b>Bu hafta %86 görev tamam</b></div></div></div></div>
<div class="lgx-card lg-u3"><h2>Tekrar hoş geldin</h2><p class="lgx-sub">Hesabınla giriş yap, kaldığın yerden devam et.</p>
<label for="lu">Kullanıcı adı</label><div class="lgx-f"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/></svg><input id="lu" autocomplete="username" autocapitalize="none" placeholder="kullanıcı adın"></div>
<label for="lp">PIN / şifre</label><div class="lgx-f"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input id="lp" type="password" autocomplete="current-password" placeholder="••••••"><button type="button" id="lgeye" aria-label="Şifreyi göster veya gizle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
<div id="ts"></div><button class="lgx-go" id="login"><i class="lgsh"></i><span>Giriş yap</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
${msg?`<p class="lgx-msg" role="alert">${esc(msg)}</p>`:""}
<div class="lgx-foot"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg><span>Hesabın yok mu? Giriş bilgilerini koçundan alabilirsin.</span></div></div></section></div>`;

try{if(localStorage.getItem("sbmini"))document.body.classList.add("sbmini")}catch(e){}
document.addEventListener("input",e=>{if(e.target.id!=="sbq")return;const q=e.target.value.trim().toLocaleLowerCase("tr");document.querySelectorAll("#app .grid>button.s").forEach(b=>{b.style.display=!q||b.textContent.toLocaleLowerCase("tr").includes(q)?"":"none"})});
