/* Haftalık plan takibi (koç → öğrenci detayı → Görevler sekmesi) — v4.9 yeniden tasarım
   Tek ekran, dört alt sekme: Hafta · Kalanlar · Program ekle · Araçlar. Hangi haftada olduğun üstte sabit "hafta gezgini"nde görünür.
   Hafta sekmesi: gün gün kartlar (tamamlanan geçmiş günler daralır), görev düzenleme (ad, ders, miktar, gün, koç notu, koç onayı),
   toplu seçim (taşı / iptal et / sil), günün altından hızlı görev ekleme. İptal = carry_state='closed' (geri alınır, automation.js clIds).
   Koç notu/onayı için weekly_tasks.coach_note/coach_ok sütunları gerekir (supabase/schema-v49.sql); sütun yoksa bu iki özellik gizlenir (WPDB).
   Kendi sayfası yok: coach-tools.js detailView "g" sekmesi wpView(x) varsa onu çizer, yoksa eski dizilimi. Tıklamalar coach.js ui() → wpUi(t). */
const WPS={},WPDN=["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
let WPDB=null,WPF="";
const wpS=id=>WPS[id]||(WPS[id]={tab:"h",sel:false,ids:new Set(),open:{},add:null,edit:null,undo:null});
// Sütunlar canlıda var mı? Bir kez denenir; yoksa koç notu/onayı çizilmez.
function wpProbe(){if(WPDB!==null)return;WPDB="p";
  Promise.resolve(sb.from("weekly_tasks").select("coach_ok").limit(1)).then(r=>{WPDB=!(r&&r.error)},()=>{WPDB=false}).then(()=>{if(!busy())render()})}
const wpDm=s=>{const a=dTR(s);return a.d+" "+MONTR[a.m].slice(0,3)};
const wpTk=(id,i)=>(TK[id]||[]).find(t=>String(t.id)===String(i));
const wpOpenDef=(L,d,today)=>L.length>0&&!(L.every(t=>t.done)&&d<today);
const wpIsOpen=(S,L,d,today)=>S.open[d]===undefined?wpOpenDef(L,d,today):S.open[d];
function wpSub(t){
  return [t.subject,t.amount].filter(Boolean).map(esc).join(" · ")
   +(t.source==="ai"?" · 🤖 plan":t.source==="student"?" · ✍️ öğrenci ekledi":"")
   +(t.carry_state==="carried"&&t.carried_from?" · ↪ "+esc(fd(t.carried_from))+" tarihinden":"")
   +(t.self_from?" · 🔀 öğrenci "+esc(fd(t.self_from))+" gününden kaydırdı":"")
   +(t.coach_ok?" · ✓ Koç onayladı":t.done&&WPDB===true?" · Onay bekliyor":"");
}
function wpRow(t,S,today){
  const late=!t.done&&t.task_date<today,on=S.ids.has(String(t.id)),db=WPDB===true;
  const lead=S.sel?`<button class="wp-ck${on?" on":""}" data-wpsel="${t.id}" aria-pressed="${on}" aria-label="Görevi seç: ${esc(t.title)}">${on?"✓":""}</button>`
    :`<span class="wp-st${t.done?" ok":late?" late":""}" aria-hidden="true">${t.done?"✓":""}</span>`;
  const acts=S.sel?"":`${db&&t.done&&!t.coach_ok?`<button class="chip wp-okb" data-wpok="${t.id}">Onayla</button>`:""}${t.done?"":`<button class="wp-ib" data-wpmv1="${t.id}" aria-label="${late?"Bugüne al":"Ertesi güne taşı"}: ${esc(t.title)}" title="${late?"Bugüne al":"Ertesi güne taşı"}">→</button>`}<button class="wp-ib" data-wpedit="${t.id}" aria-label="Görevi düzenle: ${esc(t.title)}" title="Düzenle">✎</button>`;
  return `<div class="wp-tk${t.done?" done":""}${on?" sel":""}">${lead}<span class="wp-tt"><b>${esc(t.title)}</b><small${late?` class="late"`:""}>${late?"Yapılmadı · ":""}${wpSub(t)}</small>${t.coach_note?`<small class="wp-note">💬 ${esc(t.coach_note)}</small>`:""}</span>${acts}</div>`;
}
function wpAddForm(id,d){
  return `<div class="wp-add"><label>Görev<input id="wpat" type="text" maxlength="120" placeholder="ör. Paragraf 30 soru" autocomplete="off"></label>
  <div class="wp-two"><label>Ders<select id="wpas"><option value="">Ders</option>${subjFor(id).map(s=>`<option${s===WPF?" selected":""}>${esc(s)}</option>`).join("")}</select></label><label>Miktar<input id="wpaa" type="text" maxlength="60" placeholder="60 soru" autocomplete="off"></label></div>
  <div class="wp-two"><button class="btn" data-wpaddgo="${d}">${esc(wpDm(d))} gününe ekle</button><button class="chip" data-wpaddx="1">Kapat</button></div></div>`;
}
function wpDayCard(id,d,i,L,S,today){
  const dn=L.filter(t=>t.done).length,un=L.length-dn,past=d<today,isT=d===today,open=wpIsOpen(S,L,d,today),lateN=past?un:0;
  const head=`<button class="wp-dh" data-wpday="${d}" aria-expanded="${open}"><span class="wp-dn"><b>${WPDN[i]}</b><small>${wpDm(d)}</small></span>${isT?`<i class="wp-today">BUGÜN</i>`:""}${lateN?`<i class="wp-late">${lateN} yapılmadı</i>`:""}<span class="wp-cnt">${L.length?dn+"/"+L.length+(un===0&&past?" tamam":""):"Görev yok"}</span><span class="wp-chev" aria-hidden="true">${open?"▾":"▸"}</span></button>`;
  if(!open)return `<section class="wp-day c${un===0&&L.length?" alldone":""}" data-wpd="${d}">${head}</section>`;
  const add=S.add===d?wpAddForm(id,d):S.sel?"":`<button class="wp-addb" data-wpadd="${d}">+ Görev ekle</button>`;
  return `<section class="wp-day${isT?" today":""}${lateN?" hasLate":""}" data-wpd="${d}">${head}${L.map(t=>wpRow(t,S,today)).join("")}${add}</section>`;
}
function wpUndoCard(id,S){
  const U=S.undo;if(!U)return "";
  return `<div class="card undo"><div><b>✓ ${U.n} görev ${esc(wpDm(U.to))} gününe taşındı</b><small>İstersen eski günlerine geri al.</small></div><div class="undo-acts"><button class="btn" data-wpundo="1">↩ Geri al</button><button class="chip" data-wpundook="1">Tamam</button></div></div>`;
}
function wpBar(id,S,mon,today){
  const n=S.ids.size,days=Array.from({length:7},(_,i)=>shift(mon,i)).filter(d=>d>=today);
  return `<div class="wp-bar" role="region" aria-label="Seçili görevler için işlemler"><div class="wp-barh">${n} görevi taşı</div>
  <div class="wp-chips">${days.map(d=>`<button class="chip" data-wpmvto="${d}">${PDAY[dowOf(d)]} ${dTR(d).d}</button>`).join("")}<span class="wp-dt"><input id="wpmd" type="date" min="${today}" aria-label="Taşınacak tarih"><button class="chip" data-wpmvgo="1">Taşı</button></span></div>
  <div class="wp-two"><button class="btn wp-cx" data-wpcancel="1">İptal et (geri alınır)</button><button class="chip wp-dl" data-wpdel="1">Sil</button></div></div>`;
}
function wpWeek(x,W,S){
  const id=x.id,L=W.L,today=day(),mon=W.mon,dn=L.filter(t=>t.done).length,openN=L.length-dn,pc=L.length?Math.round(dn*100/L.length):0;
  const sum=S.sel?`<div class="wp-selh"><b>${S.ids.size} görev seçildi</b><span><button class="chip" data-wpall="1">Kalanların hepsi</button><button class="chip" data-wpselmode="1">Bitir</button></span></div>`
    :`<div class="wp-sumh"><b>${dn}/${L.length} görev yapıldı</b><span class="wp-pc">%${pc}</span></div><div class="bar"><i style="width:${pc}%"></i></div>
    <div class="wp-sumb"><button class="chip" data-wpselmode="1"${L.length?"":" disabled"}>Seç</button>${openN?`<button class="chip wp-warn" data-clwk="${id}">✕ Haftanın kalanını iptal et · ${openN}</button>`:""}</div>`;
  const days=Array.from({length:7},(_,i)=>{const d=shift(mon,i);return wpDayCard(id,d,i,L.filter(t=>t.task_date===d),S,today)}).join("");
  return `${clDoneCard(id)}${rdDoneCard(id)}${wpUndoCard(id,S)}<div class="card wp-sum">${sum}</div>${days}${S.sel&&S.ids.size?wpBar(id,S,mon,today):""}`;
}
function wpKalan(x){
  const id=x.id,o=overdueCard(id,true);
  return `${rdDoneCard(id)}${clDoneCard(id)}${o||`<div class="card"><h2>Geride kalan görev yok 👏</h2><p class="empty" style="margin:0">Son 4 haftada tamamlanmamış görev görünmüyor.</p></div>`}`;
}
function wpAiCard(x){
  const p=PD[x.id],plan=p&&p.content?`<div class="card" style="border-color:var(--acc);margin:12px 0 0"><h2>🤖 Plan taslağı</h2><p class="empty" style="margin:0 0 6px">${esc(p.content.ozet||"")}</p>${p.content.notlar?`<p class="empty" style="margin:0 0 6px;font-size:14px">${esc(p.content.notlar)}</p>`:""}${taskList((p.content.gorevler||[]).map(g=>({...g,id:0,done:false,source:"ai"})),true).replace(/<button[^>]*data-tkdel[^>]*>.*?<\/button>/g,"")}<p class="empty" style="font-size:13px;margin:8px 0">Taslak öğrenciye henüz görünmez. İncele, uygunsa onayla.</p><div class="row"><button class="btn" style="padding:11px 16px" id="planok">Onayla ve öğrenciye ata</button><button class="chip" id="plandel">Taslağı sil</button></div></div>`:"";
  return `<div class="card"><h2>🤖 Yapay zekâyla haftalık plan</h2><p class="empty" style="margin:0 0 8px;font-size:14px">Öğrencinin verisine göre taslak üretir; sen onaylamadan görünmez.</p><div class="row" style="margin-top:0"><button class="chip" id="planrun"${PLANBUSY?" disabled":""}>Taslak üret</button></div><p class="empty" style="font-size:14px;margin:6px 0 0">${PLANBUSY===x.id?"Plan hazırlanıyor, yarım dakika sürebilir…":esc(PLANMSG)}</p>${plan}</div>`;
}
function wpProgram(x){
  return `<div class="card wp-intro"><h2>Programı nasıl ekleyeceksin?</h2><p class="empty" style="margin:0;font-size:14px">PDF yükle, yapay zekâdan taslak iste ya da deneme analizinden ödev ekle. Tek tek ekleme için Hafta sekmesinde günün altındaki “+ Görev ekle” yeter. Atamadan önce taslağı sen kontrol edersin.</p></div>${planUploadCard(x)}${wpAiCard(x)}`;
}
function wpTools(x){
  const W=selWeek(x.id);
  return `${planToolsCard(x)}<div class="card"><h2>Hafta adı</h2><p class="empty" style="margin:0 0 8px;font-size:14px">Şu an: ${esc(weekName(W))}</p><button class="chip" data-wren="1">✎ Adı değiştir</button></div>`;
}
function wpEditSheet(id,S){
  const t=wpTk(id,S.edit);if(!t){S.edit=null;return ""}
  const subs=subjFor(id).slice();if(t.subject&&!subs.includes(t.subject))subs.unshift(t.subject);
  const db=WPDB===true;
  return `<div class="wp-ov"><div class="wp-sheet" role="dialog" aria-modal="true" aria-label="Görevi düzenle">
  <div class="wp-sh"><div><b>Görevi düzenle</b><small>${esc(fd(t.task_date))}${t.done?" · Yapıldı":""}</small></div><button class="wp-ib" data-wpclose="1" aria-label="Kapat">✕</button></div>
  <label>Görev adı<input id="wpet" type="text" maxlength="120" value="${esc(t.title)}"></label>
  <div class="wp-two"><label>Ders<select id="wpes"><option value="">Ders</option>${subs.map(s=>`<option${s===t.subject?" selected":""}>${esc(s)}</option>`).join("")}</select></label><label>Miktar<input id="wpea" type="text" maxlength="60" value="${esc(t.amount||"")}"></label></div>
  <label>Gün<input id="wped" type="date" value="${esc(t.task_date)}"></label>
  ${db?`<label>Koç notu <small>(öğrenci görevin altında görür)</small><textarea id="wpen" maxlength="300">${esc(t.coach_note||"")}</textarea></label>
  <label class="wp-chk"><input id="wpeok" type="checkbox"${t.coach_ok?" checked":""}${t.done?"":" disabled"}><span>Yapıldı olarak onayla${t.done?"":" <small>(öğrenci işaretleyince)</small>"}</span></label>`:""}
  <div class="wp-sf"><button class="btn" data-wpsave="1">Kaydet</button><div class="wp-two"><button class="chip wp-cx" data-wpcx1="1"${t.done?" disabled":""}>Bu görevi iptal et</button><button class="chip wp-dl" data-wpdel1="1">Sil</button></div></div></div></div>`;
}
function wpView(x){
  const id=x.id;if(!(id in TK))return taskCard(x);
  wpProbe();
  const S=wpS(id),W=selWeek(id),cm=monOf(day()),mon=W.mon,nOd=overdue(id).length;
  const rel=mon===cm?"BU HAFTA":mon===shift(cm,7)?"GELECEK HAFTA":mon>cm?"GELECEK":mon===shift(cm,-7)?"GEÇEN HAFTA":"GEÇMİŞ";
  const nm=weekName(W),tabs=[["h","Hafta",0],["k","Kalanlar",nOd],["p","Program ekle",0],["a","Araçlar",0]];
  const nav=`<div class="wp-nav"><button class="wp-nb" data-wpw="-1" aria-label="Önceki hafta"${mon<=shift(cm,-84)?" disabled":""}>‹</button><div class="wp-wk"><i class="${mon===cm?"cur":""}">${rel}</i><b>${esc(wkRange(mon))}</b>${nm!==wkRange(mon)?`<small>${esc(nm)}</small>`:""}${mon!==cm?`<button class="chip" data-wptoday="1">Bu haftaya dön</button>`:""}</div><button class="wp-nb" data-wpw="1" aria-label="Sonraki hafta"${mon>=shift(cm,28)?" disabled":""}>›</button></div>
  <div class="wp-tabs" role="tablist" aria-label="Görev işlemleri">${tabs.map(([k,l,n])=>`<button role="tab" class="wp-tab${S.tab===k?" on":""}" aria-selected="${S.tab===k}" data-wptab="${k}">${l}${n?`<span class="wp-bd">${n}</span>`:""}</button>`).join("")}</div>`;
  const body=S.tab==="k"?wpKalan(x):S.tab==="p"?wpProgram(x):S.tab==="a"?wpTools(x):wpWeek(x,W,S);
  return `<div class="wp">${nav}${body}</div>${S.edit?wpEditSheet(id,S):""}`;
}

/* ---- işlemler ---- */
function wpAdd(id,d){return once("wpa"+id,async()=>{
  const g=k=>(document.getElementById(k)||{}).value||"",title=g("wpat").trim().slice(0,120);
  if(!title){alert("Görev adını yaz.");return}
  const sub=g("wpas")||null;WPF=sub||"";
  const r=await dbw(sb.from("weekly_tasks").insert({student_id:id,task_date:d,title,subject:sub,amount:g("wpaa").trim().slice(0,60)||null,source:"coach",created_by:ME}));
  if(r&&r.error){alert("Görev eklenemedi, yazdıkların duruyor: "+r.error.message);return}
  ["wpat","wpaa"].forEach(k=>{const e=document.getElementById(k);if(e){e.value="";e.defaultValue=""}});
  await loadTasks(id);if(sel===id)render();
})}
function wpSave(id){return once("wpe"+id,async()=>{
  const S=wpS(id),t=wpTk(id,S.edit);if(!t)return;
  const g=k=>(document.getElementById(k)||{}).value||"",title=g("wpet").trim().slice(0,120);
  if(!title){alert("Görev adını yaz.");return}
  const d=g("wped");if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){alert("Tarihi seç.");return}
  const upd={title,subject:g("wpes")||null,amount:g("wpea").trim().slice(0,60)||null,task_date:d};
  if(WPDB===true){
    upd.coach_note=g("wpen").trim().slice(0,300)||null;
    const ok=!!t.done&&!!(document.getElementById("wpeok")||{}).checked;
    if(ok!==!!t.coach_ok){upd.coach_ok=ok;upd.coach_ok_at=ok?new Date().toISOString():null}
  }
  const r=await dbw(sb.from("weekly_tasks").update(upd).eq("id",t.id).eq("student_id",id));
  if(r&&r.error){alert("Kaydedilemedi: "+r.error.message);return}
  S.edit=null;await loadTasks(id);try{await loadOD()}catch(e){}if(sel===id)render();
})}
async function wpOk(id,tid){
  const k=wpTk(id,tid);if(!k)return;
  const r=await dbw(sb.from("weekly_tasks").update({coach_ok:true,coach_ok_at:new Date().toISOString()}).eq("id",k.id).eq("student_id",id));
  if(r&&r.error){alert("Onaylanamadı: "+r.error.message);return}
  await loadTasks(id);if(sel===id)render();
}
async function wpMove(id,ids,date){
  const S=wpS(id),prev=ids.map(i=>wpTk(id,i)).filter(Boolean).map(t=>({id:t.id,d:t.task_date}));
  if(!prev.length||!date)return;
  const r=await dbw(sb.from("weekly_tasks").update({task_date:date}).in("id",prev.map(p=>p.id)).eq("student_id",id));
  if(r&&r.error){alert("Taşınamadı: "+r.error.message);return}
  S.undo={prev,n:prev.length,to:date};S.sel=false;S.ids=new Set();
  await loadTasks(id);try{await loadOD()}catch(e){}
  setSync("✓ "+prev.length+" görev taşındı");if(sel===id)render();
}
async function wpUndo(id){
  const S=wpS(id),U=S.undo;if(!U)return;
  const by={};U.prev.forEach(p=>(by[p.d]=by[p.d]||[]).push(p.id));
  for(const d of Object.keys(by)){const r=await dbw(sb.from("weekly_tasks").update({task_date:d}).in("id",by[d]).eq("student_id",id));if(r&&r.error){alert("Geri alınamadı: "+r.error.message);return}}
  S.undo=null;await loadTasks(id);try{await loadOD()}catch(e){}
  setSync("↩ Taşıma geri alındı");if(sel===id)render();
}
async function wpDelete(id,ids){
  const L=ids.map(i=>wpTk(id,i)).filter(Boolean);if(!L.length)return false;
  if(!confirm(L.length+" görev KALICI olarak silinecek (iptal gibi geri alınamaz). Devam edilsin mi?"))return false;
  const r=await dbw(sb.from("weekly_tasks").delete().in("id",L.map(t=>t.id)).eq("student_id",id));
  if(r&&r.error){alert("Silinemedi: "+r.error.message);return false}
  await loadTasks(id);try{await loadOD()}catch(e){}
  setSync("✓ "+L.length+" görev silindi");return true;
}
function wpUi(t){
  const D=t.dataset;if(ROLE!=="coach"||!sel)return false;
  const id=sel,S=wpS(id),today=day();
  const reset=()=>{S.sel=false;S.ids=new Set();S.edit=null;S.add=null};
  if(D.wptab){S.tab=D.wptab;reset();render();window.scrollTo(0,0);return true}
  if(D.wpw){reset();WSEL[id]=shift(selWeek(id).mon,7*(+D.wpw));render();return true}
  if(D.wptoday){reset();delete WSEL[id];render();return true}
  if(D.wpday){const d=D.wpday,L=(TK[id]||[]).filter(x=>x.task_date===d);S.open[d]=!wpIsOpen(S,L,d,today);render();return true}
  if(D.wpadd){S.add=D.wpadd;S.open[D.wpadd]=true;render();setTimeout(()=>{const e=document.getElementById("wpat");if(e)e.focus()},30);return true}
  if(D.wpaddx){S.add=null;render();return true}
  if(D.wpaddgo){wpAdd(id,D.wpaddgo);return true}
  if(D.wpselmode){S.sel=!S.sel;S.ids=new Set();S.add=null;render();return true}
  if(D.wpsel){const k=String(D.wpsel);S.ids.has(k)?S.ids.delete(k):S.ids.add(k);render();return true}
  if(D.wpall){const m=selWeek(id).mon,L=(TK[id]||[]).filter(x=>!x.done&&x.task_date>=m&&x.task_date<=shift(m,6)).map(x=>String(x.id));
    S.ids=L.length&&L.every(k=>S.ids.has(k))?new Set():new Set(L);render();return true}
  if(D.wpedit){S.edit=D.wpedit;S.add=null;render();return true}
  if(D.wpclose){S.edit=null;render();return true}
  if(D.wpsave){wpSave(id);return true}
  if(D.wpok){wpOk(id,D.wpok);return true}
  if(D.wpmv1){const k=wpTk(id,D.wpmv1);if(k)wpMove(id,[k.id],k.task_date<today?today:shift(k.task_date,1));return true}
  if(D.wpmvto){wpMove(id,[...S.ids],D.wpmvto);return true}
  if(D.wpmvgo){const v=(document.getElementById("wpmd")||{}).value;if(!v){alert("Taşınacak tarihi seç.");return true}wpMove(id,[...S.ids],v);return true}
  if(D.wpcancel){const ids=[...S.ids];clIds(id,ids,"Seçilen görevler").then(ok=>{if(ok){S.sel=false;S.ids=new Set();if(sel===id)render()}});return true}
  if(D.wpdel){wpDelete(id,[...S.ids]).then(ok=>{if(ok){S.sel=false;S.ids=new Set();if(sel===id)render()}});return true}
  if(D.wpcx1){const k=S.edit;clIds(id,[k],"Tek görev").then(ok=>{if(ok)S.edit=null;if(sel===id)render()});return true}
  if(D.wpdel1){const k=S.edit;wpDelete(id,[k]).then(ok=>{if(ok)S.edit=null;if(sel===id)render()});return true}
  if(D.wpundo){wpUndo(id);return true}
  if(D.wpundook){S.undo=null;render();return true}
  return false;
}
