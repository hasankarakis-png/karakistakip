/* Koç: haftalık program PDF'i yükle → yapay zekâ görev taslağı çıkarır → koç onaylar → öğrenciye atanır; haftalık takip tablosu */
const PU={},WK={};const PDAY=["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
const WSEL={};
const MONTR=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const dTR=s=>{const [y,m,d]=s.split("-").map(Number);return {d,m:m-1}};
function wkRange(mon){const a=dTR(mon),b=dTR(shift(mon,6));return a.m===b.m?`${a.d} – ${b.d} ${MONTR[a.m]}`:`${a.d} ${MONTR[a.m]} – ${b.d} ${MONTR[b.m]}`}
function fileWeekName(fn){
  const m=String(fn||"").match(/(\d{1,2})\s*[-–_]\s*(\d{1,2})[\s_.-]*([A-Za-zÇĞİÖŞÜçğıöşü]{2,})/);if(!m)return"";
  const ab=["oc","şu","su","ma","ni","nı","my","ha","te","ağ","ag","ey","ek","ka","ar"],idx={oc:0,şu:1,su:1,ma:2,ni:3,"nı":3,my:4,ha:5,te:6,"ağ":7,ag:7,ey:8,ek:9,ka:10,ar:11};
  const k=m[3].toLocaleLowerCase("tr").slice(0,2);if(!(k in idx)||!ab.includes(k))return"";
  const d1=+m[1],d2=+m[2],m1=idx[k],m2=d2<d1?(m1+1)%12:m1;if(d1<1||d1>31||d2<1||d2>31)return"";
  return m1===m2?`${d1} – ${d2} ${MONTR[m1]}`:`${d1} ${MONTR[m1]} – ${d2} ${MONTR[m2]}`;
}
function weeksOf(id){
  const by={};(TK[id]||[]).forEach(t=>{const m=monOf(t.task_date);(by[m]=by[m]||{mon:m,L:[]}).L.push(t)});
  const cm=monOf(day());if(!by[cm])by[cm]={mon:cm,L:[]};
  return Object.values(by).sort((a,b)=>b.mon.localeCompare(a.mon));
}
function weekName(w){const c={};w.L.forEach(t=>{if(t.week_title)c[t.week_title]=(c[t.week_title]||0)+1});const k=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];return k||wkRange(w.mon)}
function selWeek(id){const W=weeksOf(id),m=WSEL[id];return W.find(w=>w.mon===m)||W.find(w=>w.mon===monOf(day()))||W[0]}
function weekTabs(id,coach){
  const W=weeksOf(id),cur=selWeek(id).mon,cm=monOf(day());
  return `<div class="wtabs" role="tablist" aria-label="Haftalar">${W.map(w=>{const dn=w.L.filter(t=>t.done).length,pc=w.L.length?Math.round(dn*100/w.L.length):0,tag=w.mon===cm?"Bu hafta":w.mon>cm?"Gelecek":"Geçmiş";return `<button class="wtab${w.mon===cur?" on":""}" role="tab" aria-selected="${w.mon===cur}" data-wsel="${w.mon}"><b>${esc(weekName(w))}</b><small>${tag}${w.L.length?" · %"+pc:" · görev yok"}</small></button>`}).join("")}${coach?`<button class="wtab add" data-cnav="detail-plan"><b>+ Yeni hafta</b><small>PDF yükle</small></button>`:""}</div>`;
}
const monOf=s=>{const [y,m,d]=s.split("-").map(Number),w=(new Date(y,m-1,d).getDay()+6)%7;return shift(s,-w)};
const puDefWeek=()=>{const w=(new Date().getDay()+6)%7;return w>=3?shift(monOf(day()),7):monOf(day())};
function puSync(id){const P=PU[id];if(!P||!P.draft)return;const wn=document.getElementById("puwn");if(wn)P.draft.wname=wn.value.slice(0,40);const e=document.getElementById("puwk");if(e&&e.value)P.draft.week=monOf(e.value);const s=document.getElementById("puskip");if(s)P.draft.skip=s.checked}
function planUploadCard(x){
  const P=PU[x.id]||{};const dr=P.draft;
  let body=`<p class="empty" style="margin:0 0 8px;font-size:14px">Hazırladığın haftalık program PDF’ini (veya fotoğrafını) yükle; görevlere çevrilsin. Atamadan önce sen kontrol edersin.</p><div class="row" style="margin-top:0"><input id="puf" type="file" accept="application/pdf,image/*" style="max-width:100%"><button class="btn" style="padding:11px 16px" data-pugo="${x.id}"${P.busy?" disabled":""}>${P.busy?"Okunuyor…":"Planı oku"}</button></div>`;
  if(P.msg)body+=`<p class="empty" style="margin:8px 0 0;font-size:14px;${P.err?"color:var(--warn)":""}">${esc(P.msg)}</p>`;
  if(dr){
    const by={};dr.rows.forEach((r,i)=>(by[r.gun]=by[r.gun]||[]).push([r,i]));
    const sel=dr.rows.filter(r=>r.on).length;
    body+=`<div class="card" style="border-color:var(--acc);margin:12px 0 0"><h2>Plan taslağı${dr.baslik?" · "+esc(dr.baslik):""}</h2>
    <div class="row" style="margin-top:0"><label>Hafta adı (sekmede görünür)<input id="puwn" type="text" maxlength="40" value="${esc(dr.wname||"")}" style="width:220px"></label></div><div class="row" style="margin-top:0"><label>Haftanın pazartesisi<input id="puwk" type="date" value="${dr.week}" style="width:160px"></label><label style="flex-direction:row;align-items:center;gap:6px"><input id="puskip" type="checkbox"${dr.skip?" checked":""} style="width:auto"> Geçmiş günleri atla</label></div>
    ${Object.keys(by).sort().map(g=>`<div class="tkd">${PDAY[g-1]} · ${fd(shift(dr.week,g-1))}</div>${by[g].map(([r,i])=>`<button class="ktt pu" data-putog="${i}" aria-pressed="${r.on}" style="margin:4px 0"><span class="ktck">${r.on?"✓":""}</span><span><b>${esc(r.konu)}</b><small style="display:block;color:var(--mut)">${esc([r.ders,r.kaynak,r.sure,r.soru].filter(Boolean).join(" · "))}</small></span></button>`).join("")}`).join("")}
    ${dr.notlar.length?`<p class="empty" style="font-size:13px;margin:10px 0 0">📝 Programdaki notlar (göreve çevrilmedi): ${dr.notlar.map(esc).join(" · ")}</p>`:""}
    <div class="row"><button class="btn" style="padding:11px 16px" data-puok="${x.id}"${P.busy?" disabled":""}>${sel} görevi ata</button><button class="chip" data-pucancel="${x.id}">Vazgeç</button></div></div>`;
  }
  return `<div class="card" id="detail-plan"><h2>📄 Program PDF'i yükle</h2>${body}</div>${boostCard(x.id,true)}`;
}
async function puRead(id){
  const f=(document.getElementById("puf")||{}).files&&document.getElementById("puf").files[0],P=PU[id]=PU[id]||{};
  if(!f){P.msg="Önce bir PDF veya görsel seç.";P.err=true;render();return}
  const pdf=f.type==="application/pdf"||/\.pdf$/i.test(f.name||"");
  if(pdf&&f.size>6.5e6){P.msg="PDF çok büyük (en fazla yaklaşık 6 MB).";P.err=true;render();return}
  P.busy=true;P.msg="Okunuyor, 15-40 saniye sürebilir…";P.err=false;render();
  let im;try{im=pdf?{mime:"application/pdf",b64:await readB64(f)}:await prepImage(f)}catch(e){P.busy=false;P.msg="Dosya açılamadı.";P.err=true;render();return}
  let r=null;
  if(pdf){P.msg="Tablo okunuyor…";render();const L=await ppFromPdf(f);if(L&&L.gorevler.length>=3)r=L}
  const why=PPWHY||"";
  if(!r)r=await callFn("plan-extract",{image:im.b64,mime:im.mime});
  P.busy=false;
  if(r.error){P.msg=r.error+(pdf&&why?" (Yerel okuma: "+why+")":"");P.err=true;render();return}
  P.msg="";const wk0=puDefWeek();P.draft={week:wk0,wname:(r.tarih||fileWeekName(f.name)||wkRange(wk0)).slice(0,40),skip:true,baslik:r.baslik||"",notlar:r.notlar||[],rows:(r.gorevler||[]).sort((a,b)=>a.gun-b.gun).map(g=>({...g,on:true}))};
  render();
}
async function puAssign(id){
  const P=PU[id];if(!P||!P.draft||P.busy)return;puSync(id);const dr=P.draft;
  const have=new Set((TK[id]||[]).map(t=>t.task_date+"|"+t.subject+"|"+t.title));
  const wt=((dr.wname||"").trim()||wkRange(dr.week)).slice(0,40);
  let skippedPast=0,dup=0;const rows=[];
  dr.rows.filter(r=>r.on).forEach(r=>{
    const d=shift(dr.week,r.gun-1);
    if(dr.skip&&d<day()){skippedPast++;return}
    const subject=subjNorm(r.ders),title=r.konu.slice(0,120);
    if(have.has(d+"|"+subject+"|"+title)){dup++;return}
    rows.push({student_id:id,task_date:d,title,subject,amount:[r.kaynak,r.sure,r.soru].filter(Boolean).join(" · ").slice(0,60)||null,source:"coach",created_by:ME,week_title:wt});
  });
  if(!rows.length){P.msg="Atanacak yeni görev yok"+(skippedPast?` (${skippedPast} geçmiş gün atlandı)`:"")+(dup?` (${dup} zaten var)`:"")+".";P.err=true;render();return}
  const nm=(STU.find(p=>p.id===id)||{}).name||"öğrenci";
  if(!confirm(nm+" için "+rows.length+" görev atansın mı?"))return;
  P.busy=true;render();let err=null;
  for(let i=0;i<rows.length;i+=50){const r=await dbw(sb.from("weekly_tasks").insert(rows.slice(i,i+50)));if(r&&r.error){err=r.error.message;break}}
  P.busy=false;
  if(err){P.msg="Atanamadı: "+err;P.err=true;render();return}
  try{await dbw(sb.from("weekly_tasks").update({week_title:wt}).eq("student_id",id).gte("task_date",dr.week).lte("task_date",shift(dr.week,6)))}catch(e){}
  WSEL[id]=dr.week;P.draft=null;P.err=false;P.msg=rows.length+" görev atandı ✓"+(skippedPast?` · ${skippedPast} geçmiş gün atlandı`:"")+(dup?` · ${dup} zaten vardı`:"");
  WK[id]=0;await loadTasks(id);render();
}
function puAct(D,id){
  if(D.plpick){const id=(document.getElementById("plsel")||{}).value;if(!id)return true;sel=id;selDay=null;DTAB="g";PLV=id;render();window.scrollTo(0,0);Promise.all([loadHist(id),loadExams(id),loadTasks(id),loadTarget(id)]).then(()=>{if(sel===id)render()});return true}
  const sid=sel||ME;if(!sid&&!D.pugo&&!D.puok)return false;
  if(D.plopen){PLV=sid;render();window.scrollTo(0,0);return true}
  if(D.plback){PLV=null;render();window.scrollTo(0,0);return true}
  if(D.pugo){puRead(D.pugo);return true}
  if(D.puok){puAssign(D.puok);return true}
  if(D.pucancel){PU[D.pucancel]={};render();return true}
  if(D.putog!=null){const P=PU[sid];if(P&&P.draft){puSync(sid);const r=P.draft.rows[+D.putog];if(r)r.on=!r.on;const y=window.scrollY;render();window.scrollTo(0,y)}return true}
  if(D.boost){boostGo(D.boost);return true}
  if(D.bmadd){boostManual(D.bmadd);return true}
  if(D.selfdel){selfDel(D.selfdel);return true}
  if(D.wsel){WSEL[sid]=D.wsel;render();return true}
  if(D.wren){const w=selWeek(sid),n=prompt("Hafta adı:",weekName(w));if(n===null)return true;const nm=n.trim().slice(0,40)||null;dbw(sb.from("weekly_tasks").update({week_title:nm}).eq("student_id",sid).gte("task_date",w.mon).lte("task_date",shift(w.mon,6))).then(()=>loadTasks(sid)).then(render);return true}
  if(D.wk!=null){WK[sid]=(WK[sid]||0)+(+D.wk);render();return true}
  return false;
}
/* haftalık takip tablosu */
function weekGrid(x){
  const W0=selWeek(x.id),mon=W0.mon,days=Array.from({length:7},(_,i)=>shift(mon,i));
  const L=(TK[x.id]||[]).filter(t=>t.task_date>=days[0]&&t.task_date<=days[6]);
  const isC=ROLE==="coach",nav=(x.notabs?"":weekTabs(x.id,isC))+`<div class="row" style="margin:0 0 8px;justify-content:space-between;align-items:center"><b>${esc(weekName(W0))} ${weekName(W0)!==wkRange(mon)?`<small style="color:var(--mute);font-weight:500">${wkRange(mon)}</small>`:""}</b>${isC?`<button class="chip" data-wren="1">✎ Adı değiştir</button>`:""}</div>`;
  if(!L.length)return `<div class="card"><h2>📊 Haftalık plan takibi</h2>${nav}<p class="empty">Bu hafta için atanmış görev yok.</p></div>`;
  const subs=[...new Set(L.map(t=>subjNorm(t.subject)))],today=day();
  const cell=(s,d)=>{const c=L.filter(t=>subjNorm(t.subject)===s&&t.task_date===d);if(!c.length)return `<td class="wg0">·</td>`;const dn=c.filter(t=>t.done).length,tip=esc(c.map(t=>t.title+(t.amount?" ("+t.amount+")":"")).join(", "));
    if(dn===c.length)return `<td class="wgok" title="${tip}">✓</td>`;if(d<today)return `<td class="wgbad" title="${tip}">${dn?dn+"/"+c.length:"✗"}</td>`;return `<td class="wgw" title="${tip}">${dn?dn+"/"+c.length:"○"}</td>`};
  const done=L.filter(t=>t.done).length,past=L.filter(t=>t.task_date<today),pm=past.filter(t=>!t.done).length;
  return `<div class="card"><h2>📊 Haftalık plan takibi</h2>${nav}<div style="overflow-x:auto"><table class="wg"><thead><tr><th></th>${days.map((d,i)=>`<th${d===today?` class="wgt"`:""}>${PDAY[i]}</th>`).join("")}</tr></thead><tbody>${subs.map(s=>`<tr><th>${esc(s)}</th>${days.map(d=>cell(s,d)).join("")}</tr>`).join("")}</tbody></table></div>
  <p class="empty" style="margin:10px 0 0;font-size:14px">${done}/${L.length} görev tamamlandı · %${Math.round(done*100/L.length)}${pm?` · <span style="color:var(--warn)">geçmiş günlerde ${pm} görev yapılmadı</span>`:past.length?" · geçmiş günlerin hepsi tamam 👏":""}</p></div>`;
}

let PLV=null;
function planPage(x){
  return `${topBar("<b>📄 Program ver</b>",x.n,refreshBtn())}${planUploadCard(x)}${weekGrid(x)}`;
}

function planPickCard(all){
  return `<div class="card" style="border-color:var(--acc)"><h2>📄 Program ver</h2><p class="empty" style="margin:0 0 8px;font-size:14px">Öğrenci seç, hazırladığın haftalık program PDF'ini yükle. Öğrenci yalnızca hangi gün ne yapacağını görür.</p><div class="row" style="margin-top:0"><select id="plsel" style="flex:1;min-width:0">${all.slice().sort((a,b)=>a.n.localeCompare(b.n,"tr")).map(x=>`<option value="${x.id}">${esc(x.n)}</option>`).join("")}</select><button class="btn" style="padding:11px 16px" data-plpick="1">Devam</button></div></div>`;
}

/* Deneme analizinden öncelikli konuları ödeve ekle (koç: doğrudan; öğrenci: kendi ödevi) */
const BO={};
function boostCard(id,coach){
  const o=BO[id]||(BO[id]={n:3,d:coach?day():dayN(1),msg:""});
  const mine=!coach;
  return `<div class="card"><h2>${mine?"➕ Ödevlerimi artır":"➕ Deneme analizinden ödev ekle"}</h2><p class="empty" style="margin:0 0 8px;font-size:14px">${mine?"Son denemelerinde tekrar eden yanlışlarına göre en önemli konuları ödevine ekleyebilirsin.":"Öğrencinin tekrar eden yanlış konularından önem sırasına göre ekler."}</p>
  <div class="row" style="margin-top:0"><label>Kaç konu<select id="bon">${[1,2,3,4,5].map(i=>`<option${i===o.n?" selected":""}>${i}</option>`).join("")}</select></label><label>Tarih<input id="bod" type="date" value="${o.d}" min="${day()}" style="width:150px"></label><button class="btn" style="padding:11px 16px" data-boost="${id}">Önerilenleri ekle</button></div>
  ${mine?`<h2 style="margin-top:14px;font-size:16px">Kendim ekleyeyim</h2><div class="row" style="margin-top:0"><label>Ders<select id="bms"><option value="">Ders</option>${SUBJ.map(s=>`<option>${s}</option>`).join("")}</select></label><label>Konu<input id="bmt" type="text" maxlength="100" placeholder="ör. Üslü sayılar" style="width:170px"></label><label>Miktar<input id="bma" type="text" maxlength="60" placeholder="30 soru" style="width:100px"></label><button class="chip" data-bmadd="${id}">Ekle</button></div>`:""}
  ${o.msg?`<p class="empty" style="margin:8px 0 0;font-size:14px">${esc(o.msg)}</p>`:""}</div>`;
}
function boostSugg(id,n,date){
  const done=id===ME&&KTS.done?KTS.done:(KTC[id]||new Set()),have=new Set((TK[id]||[]).filter(t=>t.task_date===date).map(t=>(t.subject||"")+"|"+t.title));
  return tekrarList(id,done).filter(o=>!have.has(o.ders.slice(0,40)+"|"+o.konu.slice(0,120))).slice(0,n).map(o=>({d:date,title:o.konu.slice(0,120),subject:o.ders.slice(0,40),amount:(o.mt&&o.mt.done?"30 soru":"konu tekrarı + 30 soru")}));
}
async function boostRun(id,rows,okMsg){
  const o=BO[id]||(BO[id]={});let err=null;
  if(ROLE==="student"){const r=await sb.rpc("task_self_add",{p_rows:rows});if(r.error)err=r.error.message}
  else{const r=await dbw(sb.from("weekly_tasks").insert(rows.map(x=>({student_id:id,task_date:x.d,title:x.title,subject:x.subject,amount:x.amount,source:"coach",created_by:ME}))));if(r&&r.error)err=r.error.message}
  o.msg=err?"Eklenemedi: "+err:okMsg;await loadTasks(id);render();
}
async function boostGo(id){
  const o=BO[id]||(BO[id]={n:3,msg:""});o.n=+(document.getElementById("bon")||{}).value||3;o.d=(document.getElementById("bod")||{}).value||day();
  if(o.d<day()){o.msg="Geçmiş bir tarih seçilemez.";render();return}
  if(ROLE==="coach"&&!(id in KTC)){o.msg="Konu takibi yükleniyor, bir saniye sonra tekrar bas.";render();return}
  const rows=boostSugg(id,o.n,o.d);
  if(!rows.length){o.msg="Önerilecek konu bulunamadı. Yanlış konu verisi olan en az 2 deneme gerekir ya da bu konular o güne zaten eklenmiş.";render();return}
  await boostRun(id,rows,rows.length+" konu eklendi: "+rows.map(r=>r.title).join(", "));
}
async function boostManual(id){
  const g=i=>(document.getElementById(i)||{}).value||"",o=BO[id]||(BO[id]={n:3,msg:""});
  o.d=g("bod")||day();const title=g("bmt").trim();
  if(!title){o.msg="Konu adını yaz.";render();return}
  await boostRun(id,[{d:o.d,title,subject:g("bms"),amount:g("bma").trim()}],"Eklendi: "+title);
}
async function selfDel(id){
  const r=await sb.rpc("task_self_del",{p_id:+id});if(r.error){alert("Silinemedi: "+r.error.message);return}
  await loadTasks(ME);render();
}
