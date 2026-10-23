/* Koç: haftalık program PDF'i yükle → yapay zekâ görev taslağı çıkarır → koç onaylar → öğrenciye atanır; haftalık takip tablosu */
const PU={},WK={};const PDAY=["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
const monOf=s=>{const [y,m,d]=s.split("-").map(Number),w=(new Date(y,m-1,d).getDay()+6)%7;return shift(s,-w)};
const puDefWeek=()=>{const w=(new Date().getDay()+6)%7;return w>=3?shift(monOf(day()),7):monOf(day())};
function puSync(id){const P=PU[id];if(!P||!P.draft)return;const e=document.getElementById("puwk");if(e&&e.value)P.draft.week=monOf(e.value);const s=document.getElementById("puskip");if(s)P.draft.skip=s.checked}
function planUploadCard(x){
  const P=PU[x.id]||{};const dr=P.draft;
  let body=`<p class="empty" style="margin:0 0 8px;font-size:14px">Hazırladığın haftalık program PDF'ini (veya fotoğrafını) yükle; yapay zekâ görevlere çevirsin. Atamadan önce sen kontrol edersin.</p><div class="row" style="margin-top:0"><input id="puf" type="file" accept="application/pdf,image/*" style="max-width:100%"><button class="btn" style="padding:11px 16px" data-pugo="${x.id}"${P.busy?" disabled":""}>${P.busy?"Okunuyor…":"Planı oku"}</button></div>`;
  if(P.msg)body+=`<p class="empty" style="margin:8px 0 0;font-size:14px;${P.err?"color:var(--warn)":""}">${esc(P.msg)}</p>`;
  if(dr){
    const by={};dr.rows.forEach((r,i)=>(by[r.gun]=by[r.gun]||[]).push([r,i]));
    const sel=dr.rows.filter(r=>r.on).length;
    body+=`<div class="card" style="border-color:var(--acc);margin:12px 0 0"><h2>Plan taslağı${dr.baslik?" · "+esc(dr.baslik):""}</h2>
    <div class="row" style="margin-top:0"><label>Haftanın pazartesisi<input id="puwk" type="date" value="${dr.week}" style="width:160px"></label><label style="flex-direction:row;align-items:center;gap:6px"><input id="puskip" type="checkbox"${dr.skip?" checked":""} style="width:auto"> Geçmiş günleri atla</label></div>
    ${Object.keys(by).sort().map(g=>`<div class="tkd">${PDAY[g-1]} · ${fd(shift(dr.week,g-1))}</div>${by[g].map(([r,i])=>`<button class="ktt" data-putog="${i}" aria-pressed="${r.on}" style="margin:4px 0"><span class="ktck">${r.on?"✓":""}</span><span><b>${esc(r.konu)}</b><small style="display:block;color:var(--mut)">${esc([r.ders,r.sure,r.soru].filter(Boolean).join(" · "))}</small></span></button>`).join("")}`).join("")}
    ${dr.notlar.length?`<p class="empty" style="font-size:13px;margin:10px 0 0">📝 Programdaki notlar (göreve çevrilmedi): ${dr.notlar.map(esc).join(" · ")}</p>`:""}
    <div class="row"><button class="btn" style="padding:11px 16px" data-puok="${x.id}"${P.busy?" disabled":""}>${sel} görevi ata</button><button class="chip" data-pucancel="${x.id}">Vazgeç</button></div></div>`;
  }
  return `<div class="card"><h2>📄 Program PDF'i yükle</h2>${body}</div>`;
}
async function puRead(id){
  const f=(document.getElementById("puf")||{}).files&&document.getElementById("puf").files[0],P=PU[id]=PU[id]||{};
  if(!f){P.msg="Önce bir PDF veya görsel seç.";P.err=true;render();return}
  const pdf=f.type==="application/pdf"||/\.pdf$/i.test(f.name||"");
  if(pdf&&f.size>6.5e6){P.msg="PDF çok büyük (en fazla yaklaşık 6 MB).";P.err=true;render();return}
  P.busy=true;P.msg="Okunuyor, 15-40 saniye sürebilir…";P.err=false;render();
  let im;try{im=pdf?{mime:"application/pdf",b64:await readB64(f)}:await prepImage(f)}catch(e){P.busy=false;P.msg="Dosya açılamadı.";P.err=true;render();return}
  const r=await callFn("plan-extract",{image:im.b64,mime:im.mime});
  P.busy=false;
  if(r.error){P.msg=r.error;P.err=true;render();return}
  P.msg="";P.draft={week:puDefWeek(),skip:true,baslik:r.baslik||"",notlar:r.notlar||[],rows:(r.gorevler||[]).sort((a,b)=>a.gun-b.gun).map(g=>({...g,on:true}))};
  render();
}
async function puAssign(id){
  const P=PU[id];if(!P||!P.draft||P.busy)return;puSync(id);const dr=P.draft;
  const have=new Set((TK[id]||[]).map(t=>t.task_date+"|"+t.subject+"|"+t.title));
  let skippedPast=0,dup=0;const rows=[];
  dr.rows.filter(r=>r.on).forEach(r=>{
    const d=shift(dr.week,r.gun-1);
    if(dr.skip&&d<day()){skippedPast++;return}
    const subject=r.ders.slice(0,40),title=r.konu.slice(0,120);
    if(have.has(d+"|"+subject+"|"+title)){dup++;return}
    rows.push({student_id:id,task_date:d,title,subject,amount:[r.sure,r.soru].filter(Boolean).join(" · ").slice(0,60)||null,source:"coach",created_by:ME});
  });
  if(!rows.length){P.msg="Atanacak yeni görev yok"+(skippedPast?` (${skippedPast} geçmiş gün atlandı)`:"")+(dup?` (${dup} zaten var)`:"")+".";P.err=true;render();return}
  const nm=(STU.find(p=>p.id===id)||{}).name||"öğrenci";
  if(!confirm(nm+" için "+rows.length+" görev atansın mı?"))return;
  P.busy=true;render();let err=null;
  for(let i=0;i<rows.length;i+=50){const r=await dbw(sb.from("weekly_tasks").insert(rows.slice(i,i+50)));if(r&&r.error){err=r.error.message;break}}
  P.busy=false;
  if(err){P.msg="Atanamadı: "+err;P.err=true;render();return}
  P.draft=null;P.err=false;P.msg=rows.length+" görev atandı ✓"+(skippedPast?` · ${skippedPast} geçmiş gün atlandı`:"")+(dup?` · ${dup} zaten vardı`:"");
  WK[id]=0;await loadTasks(id);render();
}
function puAct(D,id){
  if(D.plpick){const id=(document.getElementById("plsel")||{}).value;if(!id)return true;sel=id;selDay=null;PLV=id;render();window.scrollTo(0,0);Promise.all([loadHist(id),loadExams(id),loadTasks(id),loadTarget(id)]).then(()=>{if(sel===id)render()});return true}
  const sid=sel;if(!sid&&!D.pugo&&!D.puok)return false;
  if(D.plopen){PLV=sid;render();window.scrollTo(0,0);return true}
  if(D.plback){PLV=null;render();window.scrollTo(0,0);return true}
  if(D.pugo){puRead(D.pugo);return true}
  if(D.puok){puAssign(D.puok);return true}
  if(D.pucancel){PU[D.pucancel]={};render();return true}
  if(D.putog!=null){const P=PU[sid];if(P&&P.draft){puSync(sid);const r=P.draft.rows[+D.putog];if(r)r.on=!r.on;const y=window.scrollY;render();window.scrollTo(0,y)}return true}
  if(D.wk!=null){WK[sid]=(WK[sid]||0)+(+D.wk);render();return true}
  return false;
}
/* haftalık takip tablosu */
function weekGrid(x){
  const off=WK[x.id]||0,mon=shift(monOf(day()),off*7),days=Array.from({length:7},(_,i)=>shift(mon,i));
  const L=(TK[x.id]||[]).filter(t=>t.task_date>=days[0]&&t.task_date<=days[6]);
  const nav=`<div class="row" style="margin:0 0 8px;justify-content:space-between;align-items:center"><button class="chip" data-wk="-1" aria-label="Önceki hafta">‹</button><b>${fd(days[0])} – ${fd(days[6])}${off===0?" (bu hafta)":""}</b><button class="chip" data-wk="1" aria-label="Sonraki hafta">›</button></div>`;
  if(!L.length)return `<div class="card"><h2>📊 Haftalık plan takibi</h2>${nav}<p class="empty">Bu hafta için atanmış görev yok.</p></div>`;
  const subs=[...new Set(L.map(t=>t.subject||"Diğer"))],today=day();
  const cell=(s,d)=>{const c=L.filter(t=>(t.subject||"Diğer")===s&&t.task_date===d);if(!c.length)return `<td class="wg0">·</td>`;const dn=c.filter(t=>t.done).length,tip=esc(c.map(t=>t.title+(t.amount?" ("+t.amount+")":"")).join(", "));
    if(dn===c.length)return `<td class="wgok" title="${tip}">✓</td>`;if(d<today)return `<td class="wgbad" title="${tip}">${dn?dn+"/"+c.length:"✗"}</td>`;return `<td class="wgw" title="${tip}">${dn?dn+"/"+c.length:"○"}</td>`};
  const done=L.filter(t=>t.done).length,past=L.filter(t=>t.task_date<today),pm=past.filter(t=>!t.done).length;
  return `<div class="card"><h2>📊 Haftalık plan takibi</h2>${nav}<div style="overflow-x:auto"><table class="wg"><thead><tr><th></th>${days.map((d,i)=>`<th${d===today?` class="wgt"`:""}>${PDAY[i]}</th>`).join("")}</tr></thead><tbody>${subs.map(s=>`<tr><th>${esc(s)}</th>${days.map(d=>cell(s,d)).join("")}</tr>`).join("")}</tbody></table></div>
  <p class="empty" style="margin:10px 0 0;font-size:14px">${done}/${L.length} görev tamamlandı · %${Math.round(done*100/L.length)}${pm?` · <span style="color:var(--warn)">geçmiş günlerde ${pm} görev yapılmadı</span>`:past.length?" · geçmiş günlerin hepsi tamam 👏":""}</p></div>`;
}

let PLV=null;
function planPage(x){
  return `<button class="back" data-plback="1">← ${esc(x.n)}</button><h1 class="pg" style="margin:6px 0 12px">📄 Program ver</h1>${planUploadCard(x)}${weekGrid(x)}`;
}

function planPickCard(all){
  return `<div class="card" style="border-color:var(--acc)"><h2>📄 Program ver</h2><p class="empty" style="margin:0 0 8px;font-size:14px">Öğrenci seç, hazırladığın haftalık program PDF'ini yükle. Öğrenci yalnızca hangi gün ne yapacağını görür.</p><div class="row" style="margin-top:0"><select id="plsel" style="flex:1;min-width:0">${all.slice().sort((a,b)=>a.n.localeCompare(b.n,"tr")).map(x=>`<option value="${x.id}">${esc(x.n)}</option>`).join("")}</select><button class="btn" style="padding:11px 16px" data-plpick="1">Devam</button></div></div>`;
}
