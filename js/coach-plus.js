/* ===== Koç araçları (v3.8) =====
   Görüşme günlüğü (karar → görev), gruplar ve toplu duyuru, tutarlılık puanı ve sabah özeti, plan araçları
   (geçen haftayı kopyala, şablon, tekrar eden görev), deneme takvimi ve "kim girmedi", KVKK izin kayıtları ve veli bağlantısı,
   paket/yenileme takibi, tanıtım sitesinden gelen ön görüşme başvuruları. Gizli not: core.js coachCards + notes.private. */
let PKG={},LEADS=null,PLT=null,MEET={},CONS={},PLINK={},CPMSG={},TPLMSG="",DYMSG="",MTDONE=new Set();
async function plusPullCoach(){
  const [k,l,t]=await Promise.all([sb.from("packages").select("*"),sb.from("leads").select("*").order("created_at",{ascending:false}).limit(60),sb.from("plan_templates").select("*").order("created_at",{ascending:false})]).catch(()=>[{},{},{}]);
  if(k&&k.data){PKG={};k.data.forEach(r=>PKG[r.student_id]=r)}
  if(l&&l.data)LEADS=l.data;if(t&&t.data)PLT=t.data;
}
const cpm=(id,t,err)=>{CPMSG[id]={t,err:!!err};render()};
const cpMsg=id=>CPMSG[id]?`<p class="empty" style="font-size:13px;margin:6px 0 0;${CPMSG[id].err?"color:var(--warn)":""}">${esc(CPMSG[id].t)}</p>`:"";
const gv=id=>((document.getElementById(id)||{}).value||"").trim();

/* ---- tutarlılık puanı (son 6 tamamlanmış gün) ---- */
function tScore(x){
  const h=(x.hist||[]).slice(0,-1);if(!h.length)return null;
  const act=h.filter(d=>d.m>0||d.q>0).length/h.length,st=h.filter(d=>d.m>=30),qs=st.length?st.filter(d=>d.q>0||d.nq).length/st.length:0;
  const T=(TKALL||[]).filter(t=>t.student_id===x.id&&t.task_date&&t.task_date<day()),tk=T.length?T.filter(t=>t.done).length/T.length:null;
  return Math.round(tk==null?(act*40+qs*30)/70*100:act*40+qs*30+tk*30);
}
const tBand=s=>s>=75?"iyi":s>=50?"orta":"düşük";
function tChip(x){const s=tScore(x);return s==null?"":`<div class="pr-line"><span class="ts ts-${tBand(s)}" title="Son 6 gün: aktif gün %40, soru girişi %30, görev tamamlama %30">Tutarlılık ${s}/100 · ${tBand(s)}</span></div>`}
function morningBlock(){
  const R=roster(),y=dayN(-1),w=R.filter(x=>{const d=x.hist[5]||{};return d.m>0||d.q>0}),mn=R.reduce((a,x)=>a+num((x.hist[5]||{}).m),0),q=R.reduce((a,x)=>a+num((x.hist[5]||{}).q),0);
  const TY=(TKALL||[]).filter(t=>t.task_date===y),td=TY.filter(t=>t.done).length;
  const low=R.map(x=>({id:x.id,s:tScore(x)})).filter(o=>o.s!=null&&o.s<50).sort((a,b)=>a.s-b.s),ren=pkgDue(),nl=(LEADS||[]).filter(l=>l.status==="yeni").length;
  return `<div class="cac-morning"><div class="cac-mh"><b>☀️ Sabah özeti · dün</b><span>${w.length}/${R.length} öğrenci çalıştı · ${Math.floor(mn/60)} sa ${mn%60} dk · ${q} soru${TY.length?" · görev "+td+"/"+TY.length:""}</span></div>
  ${low.length?`<div class="cac-ml"><small>Tutarlılığı düşük (son 6 gün)</small><div>${low.slice(0,8).map(o=>`<button class="chip" data-i="${esc(o.id)}">${esc(stuNm(o.id))} · ${o.s}</button>`).join("")}</div></div>`:""}
  ${ren.length?`<div class="cac-ml"><small>Paket / ödeme</small><div>${ren.map(r=>`<button class="chip" data-i="${esc(r.id)}">${esc(stuNm(r.id))} · ${esc(r.t)}</button>`).join("")}</div></div>`:""}
  ${nl?`<div class="cac-ml"><small>Tanıtım sitesi</small><div><button class="chip" data-cp="s">📥 ${nl} yeni ön görüşme başvurusu</button></div></div>`:""}</div>`;
}

/* ---- görüşme günlüğü ---- */
function meetCard(x){
  const id=x.id;
  if(!(id in MEET)){MEET[id]=null;Promise.resolve(sb.from("meetings").select("*").eq("student_id",id).order("met_on",{ascending:false}).limit(30)).then(r=>{MEET[id]=(r&&r.data)||[];if(sel===id)render()},()=>{MEET[id]=[]})}
  const L=MEET[id];
  return `<div class="card" id="detail-meet"><h2>🗒 Görüşme günlüğü</h2><p class="empty" style="margin:0 0 8px;font-size:13px">Yalnızca sen görürsün. Kararları her satıra bir tane yaz; tek dokunuşla yarına görev olur.</p>
  <div class="row" style="margin-top:0"><label>Tarih<input id="mtd" type="date" value="${day()}"></label><label>Kiminle<select id="mtw">${["öğrenci","veli","öğrenci+veli"].map(o=>`<option>${o}</option>`).join("")}</select></label></div>
  <textarea id="mts" maxlength="2000" placeholder="Görüşmede konuşulanlar…"></textarea><textarea id="mtk" maxlength="1000" placeholder="Kararlar (her satıra bir tane), ör. Her gün 40 paragraf" style="min-height:70px"></textarea>
  <div class="row"><button class="btn" style="padding:11px 16px" data-mtsave="${id}">Görüşmeyi kaydet</button></div>${cpMsg("mt"+id)}
  ${L===null?`<p class="empty">Yükleniyor…</p>`:L.map(m=>`<div class="mt"><div class="mt-h"><b>${fd(m.met_on)}</b><span>${esc(m.who)}</span></div><p>${esc(m.summary)}</p>${String(m.decisions||"").split("\n").map(s=>s.trim()).filter(Boolean).map((d,i)=>`<div class="mt-d"><span>• ${esc(d)}</span>${MTDONE.has(m.id+"|"+i)?`<em>✓ göreve eklendi</em>`:`<button class="chip" data-mtask="${m.id}|${i}">→ Yarına görev</button>`}</div>`).join("")}</div>`).join("")}</div>`;
}
async function meetSave(id){
  const s=gv("mts"),k=gv("mtk"),d=gv("mtd")||day(),w=gv("mtw")||"öğrenci";
  if(!s)return cpm("mt"+id,"Görüşme özetini yaz.",1);
  const r=await dbw(sb.from("meetings").insert({student_id:id,met_on:d,who:w,summary:s.slice(0,2000),decisions:k.slice(0,1000)||null}).select().single());
  if(r&&r.error)return cpm("mt"+id,"Kaydedilemedi: "+r.error.message,1);
  (MEET[id]=MEET[id]||[]).unshift(r.data||{id:Date.now(),met_on:d,who:w,summary:s,decisions:k});MEET[id].sort((a,b)=>a.met_on<b.met_on?1:-1);
  ["mts","mtk"].forEach(i=>{const e=document.getElementById(i);if(e){e.value="";e.defaultValue=""}});cpm("mt"+id,"Kaydedildi ✓");
}
async function meetTask(id,key){
  const [mid,i]=key.split("|"),m=(MEET[id]||[]).find(z=>String(z.id)===mid);if(!m)return;
  const line=String(m.decisions||"").split("\n").map(s=>s.trim()).filter(Boolean)[+i];if(!line)return;
  const r=await dbw(sb.from("weekly_tasks").insert({student_id:id,task_date:dayN(1),title:line.slice(0,120),subject:"Diğer",amount:null,source:"coach",created_by:ME}));
  if(r&&r.error)return cpm("mt"+id,"Görev eklenemedi: "+r.error.message,1);
  MTDONE.add(key);await loadTasks(id);cpm("mt"+id,"Yarına görev olarak eklendi ✓");
}

/* ---- gruplar ve toplu duyuru ---- */
function groupsOf(id){const p=PROF[id]||{},g=[];if(p.exam)g.push(p.exam);if(p.exam!=="LGS"&&p.field)g.push(p.field);if(p.grade)g.push(p.grade==="Mezun"?"Mezun":p.grade+". sınıf");(p.tags||[]).forEach(t=>g.push(t));return g}
function allGroups(){const s=new Map();STU.forEach(p=>groupsOf(p.id).forEach(g=>s.set(g,(s.get(g)||0)+1)));return [...s.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"tr"))}
function bcastCard(){
  return `<details class="card" id="coach-bcast"${DYMSG?" open":""}><summary style="cursor:pointer;font-weight:700">📢 Toplu duyuru</summary><p class="empty" style="font-size:13px;margin:8px 0 0">Seçtiğin gruptaki herkesin Koçum sohbetine aynı mesaj gider. Gruplar profilden (sınav, alan, sınıf) ve öğrenci profilindeki "Gruplar" alanından gelir.</p>
  <div class="row"><label>Kime<select id="dyg"><option value="">Tüm öğrenciler (${STU.length})</option>${allGroups().map(([g,n])=>`<option value="${esc(g)}">${esc(g)} (${n})</option>`).join("")}</select></label></div>
  <textarea id="dyt" maxlength="1000" placeholder="ör. Cumartesi 10:00'da ortak deneme var, kitapçıklarınızı getirin."></textarea><div class="row"><button class="btn" style="padding:11px 16px" id="dysend">Duyuruyu gönder</button></div>${DYMSG?`<p class="empty" style="font-size:13px;margin:6px 0 0">${esc(DYMSG)}</p>`:""}</details>`;
}
async function bcastSend(){
  const g=gv("dyg"),t=gv("dyt");if(!t){DYMSG="Duyuru metnini yaz.";render();return}
  const ids=(g?STU.filter(p=>groupsOf(p.id).includes(g)):STU).map(p=>p.id);if(!ids.length){DYMSG="Bu grupta öğrenci yok.";render();return}
  if(!confirm(ids.length+" öğrenciye duyuru gönderilsin mi?"))return;
  const r=await dbw(sb.from("messages").insert(ids.map(id=>({student_id:id,from_coach:true,body:t.slice(0,1000)}))));
  if(r&&r.error){DYMSG="Gönderilemedi: "+r.error.message;render();return}
  const e=document.getElementById("dyt");if(e){e.value="";e.defaultValue=""}DYMSG=ids.length+" öğrenciye gönderildi ✓"+(g?" ("+g+")":"");try{await loadUnr()}catch(x){}render();
}

/* ---- plan araçları ---- */
async function plWeek(id,ws){const r=await sb.from("weekly_tasks").select("task_date,title,subject,amount").eq("student_id",id).gte("task_date",ws).lte("task_date",addD(ws,6));return (r&&r.data)||[]}
async function plInsert(id,rows,msg){
  if(!rows.length){TPLMSG="Eklenecek görev bulunamadı.";render();return}
  const ds=rows.map(r=>r.task_date).sort(),ex=await sb.from("weekly_tasks").select("task_date,title,subject").eq("student_id",id).gte("task_date",ds[0]).lte("task_date",ds[ds.length-1]);
  const have=new Set(((ex&&ex.data)||[]).map(t=>t.task_date+"|"+subjNorm(t.subject)+"|"+t.title));
  const add=rows.map(r=>({student_id:id,task_date:r.task_date,title:String(r.title||"").slice(0,120),subject:subjNorm(r.subject),amount:r.amount?String(r.amount).slice(0,60):null,source:"coach",created_by:ME})).filter(r=>r.title&&!have.has(r.task_date+"|"+r.subject+"|"+r.title));
  if(!add.length){TPLMSG="Bu görevler zaten var; yeni görev eklenmedi.";render();return}
  const w=await dbw(sb.from("weekly_tasks").insert(add));
  TPLMSG=w&&w.error?"Eklenemedi: "+w.error.message:msg.replace("{n}",add.length)+(rows.length>add.length?" ("+(rows.length-add.length)+" tanesi zaten vardı)":"");
  await loadTasks(id);render();
}
function planToolsCard(x){
  const id=x.id,S2=subjFor(id);
  return `<div class="card" id="detail-pltools"><h2>🗂 Plan araçları</h2>
  <div class="row" style="margin-top:0"><button class="chip" data-plcopy="${id}">⧉ Geçen haftayı bu haftaya kopyala</button></div>
  <h3 class="h3s">Şablon</h3><div class="row" style="margin-top:0"><label>Şablon<select id="pltsel">${(PLT||[]).length?PLT.map(t=>`<option value="${t.id}">${esc(t.name)} (${(t.items||[]).length})</option>`).join(""):`<option value="">Henüz şablon yok</option>`}</select></label><label>Hafta<select id="pltw"><option value="0">Bu hafta</option><option value="1">Gelecek hafta</option></select></label><button class="btn" style="padding:11px 16px" data-plapply="${id}"${(PLT||[]).length?"":" disabled"}>Uygula</button></div>
  <div class="row"><label>Bu haftayı şablon olarak kaydet<input id="pltn" maxlength="60" autocomplete="off" placeholder="ör. 12. sınıf SAY standart hafta" style="width:240px"></label><button class="chip" data-plsave="${id}">Kaydet</button></div>
  <h3 class="h3s">Tekrar eden görev</h3><div class="row" style="margin-top:0"><label>Görev<input id="rgt" maxlength="120" autocomplete="off" placeholder="ör. 40 paragraf" style="width:180px"></label><label>Ders<select id="rgs">${S2.map(s=>`<option>${esc(s)}</option>`).join("")}</select></label><label>Miktar<input id="rga" maxlength="60" autocomplete="off" style="width:90px"></label></div>
  <div class="chips" style="margin-top:8px">${DOWS.map((d,i)=>`<label class="dw"><input type="checkbox" id="rgd${i}"${i<5?" checked":""}><span>${d}</span></label>`).join("")}</div>
  <div class="row"><label>Süre<select id="rgw">${[1,2,3,4].map(n=>`<option value="${n}">${n} hafta</option>`).join("")}</select></label><button class="btn" style="padding:11px 16px" data-rgadd="${id}">Görevleri oluştur</button></div>
  ${TPLMSG?`<p class="empty" style="font-size:13px;margin:6px 0 0">${esc(TPLMSG)}</p>`:""}</div>`;
}
async function plCopy(id){const ws=wkMon(0),L=await plWeek(id,addD(ws,-7));await plInsert(id,L.map(t=>({...t,task_date:addD(t.task_date,7)})),"Geçen haftadan {n} görev bu haftaya kopyalandı ✓")}
async function plSave(id){
  const n=gv("pltn");if(!n){TPLMSG="Şablona bir ad ver.";render();return}
  const L=await plWeek(id,wkMon(0));if(!L.length){TPLMSG="Bu hafta görev yok; önce görev ekle.";render();return}
  const r=await dbw(sb.from("plan_templates").insert({name:n.slice(0,60),items:L.map(t=>({dow:dowOf(t.task_date),title:t.title,subject:t.subject,amount:t.amount}))}).select().single());
  if(r&&r.error){TPLMSG="Kaydedilemedi: "+r.error.message;render();return}
  (PLT=PLT||[]).unshift(r.data);const e=document.getElementById("pltn");if(e){e.value="";e.defaultValue=""}TPLMSG="“"+n+"” şablonu kaydedildi ("+L.length+" görev) ✓";render();
}
async function plApply(id){
  const t=(PLT||[]).find(z=>String(z.id)===gv("pltsel"));if(!t){TPLMSG="Şablon seç.";render();return}
  const ws=wkMon(+gv("pltw")||0);await plInsert(id,(t.items||[]).map(i=>({task_date:addD(ws,Math.max(0,Math.min(6,+i.dow||0))),title:i.title,subject:i.subject,amount:i.amount})),"“"+t.name+"” şablonundan {n} görev eklendi ✓");
}
async function rgAdd(id){
  const t=gv("rgt");if(!t){TPLMSG="Görev adını yaz.";render();return}
  const days=new Set(DOWS.map((_,i)=>(document.getElementById("rgd"+i)||{}).checked?i:-1).filter(i=>i>=0));if(!days.size){TPLMSG="En az bir gün seç.";render();return}
  const n=Math.max(1,Math.min(4,+gv("rgw")||1)),rows=[];
  for(let k=0;k<n*7;k++){const d=dayN(k);if(days.has(dowOf(d)))rows.push({task_date:d,title:t,subject:gv("rgs"),amount:gv("rga")})}
  await plInsert(id,rows,"{n} tekrar eden görev oluşturuldu ✓");const e=document.getElementById("rgt");if(e&&!TPLMSG.startsWith("Ekle")){e.value="";e.defaultValue=""}
}

/* ---- deneme takvimi ve kim girmedi ---- */
function calCard(){
  const D=EXCAL.filter(r=>r.scope==="deneme").slice().sort((a,b)=>a.exam_date<b.exam_date?-1:1),t=day();
  const past=D.filter(r=>addD(r.exam_date,6)<t&&addD(r.exam_date,6)>=dayN(-35)).slice(-2),now=D.filter(r=>r.exam_date<=t&&addD(r.exam_date,6)>=t),next=D.filter(r=>r.exam_date>t).slice(0,3);
  const miss=r=>{const end=addD(r.exam_date,9),pool=STU.filter(p=>r.exam_type==="LGS"?isLGS(p.id):!isLGS(p.id));return pool.filter(p=>!(EXALL||[]).some(e=>e.student_id===p.id&&e.exam_date&&e.exam_date>=r.exam_date&&e.exam_date<=end))};
  const row=(r,st)=>{const M=st==="gelecek"?[]:miss(r);return `<div class="ev"><div class="ev-h"><b>${esc(r.title)}</b><span class="ev-s ev-${st.replace(" ","")}">${st}</span></div>${st==="gelecek"?`<small>${fd(r.exam_date)} haftası</small>`:M.length?`<small>${st==="bu hafta"?"Henüz yüklemeyen":"Deneme yüklemeyen"} (${M.length}):</small><div class="chips">${M.map(p=>`<button class="chip" data-i="${esc(p.id)}">${esc(p.name)}</button>`).join("")}</div>`:`<small>✓ Herkes bu haftanın denemesini yükledi</small>`}</div>`};
  return `<div class="card" id="coach-cal"><h2>🗓 Deneme takvimi</h2><p class="empty" style="margin:0 0 6px;font-size:13px">MEBİ deneme haftaları eklendi. Hafta bitince o hafta deneme sonucu yüklemeyen öğrenciler listelenir (LGS denemesi LGS öğrencileri için).</p>
  ${past.map(r=>row(r,"geçti")).join("")}${now.map(r=>row(r,"bu hafta")).join("")}${next.map(r=>row(r,"gelecek")).join("")}${!D.length?`<p class="empty">Takvimde deneme yok.</p>`:""}
  <details><summary style="cursor:pointer;margin-top:10px;font-weight:700">+ Deneme haftası ekle</summary><div class="row"><label>Hafta başı<input id="evd" type="date" value="${day()}"></label><label>Tür<select id="evy">${["TYT","AYT","LGS","DIGER"].map(o=>`<option>${o}</option>`).join("")}</select></label><label>Başlık<input id="evt" maxlength="120" autocomplete="off" placeholder="ör. Kurum denemesi 3" style="width:200px"></label><button class="btn" style="padding:11px 16px" id="evadd">Ekle</button></div></details>${cpMsg("cal")}</div>`;
}
async function calAdd(){
  const d=gv("evd"),t=gv("evt"),y=gv("evy")||"TYT";if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!t)return cpm("cal","Tarih ve başlık gerekli.",1);
  const r=await dbw(sb.from("exam_calendar").insert({exam_date:d,title:t.slice(0,120),exam_type:y,scope:"deneme"}).select().single());
  if(r&&r.error)return cpm("cal","Eklenemedi: "+r.error.message,1);EXCAL.push(r.data||{exam_date:d,title:t,exam_type:y,scope:"deneme"});cpm("cal","Eklendi ✓");
}

/* ---- paket ve yenileme ---- */
function pkgDue(){const t=day(),lim=dayN(7);return STU.map(p=>{const k=PKG[p.id];if(!k)return null;if(k.ends_on&&k.ends_on<=lim)return {id:p.id,t:k.ends_on<t?"paket bitti":"paket "+fd(k.ends_on)+" bitiyor"};if(!k.paid)return {id:p.id,t:"ödeme bekliyor"};return null}).filter(Boolean)}
function pkgCard(x){
  const k=PKG[x.id]||{};
  return `<div class="card" id="detail-pkg"><h2>📦 Paket ve yenileme</h2><div class="row" style="margin-top:0"><label>Paket<input id="pkn" maxlength="60" autocomplete="off" placeholder="ör. 3 aylık koçluk" value="${esc(k.name||"")}" style="width:180px"></label><label>Bitiş<input id="pke" type="date" value="${esc(k.ends_on||"")}"></label></div>
  <label class="ckl"><input type="checkbox" id="pkp"${k.paid?" checked":""}><span>Ödeme alındı</span></label><input id="pkt" maxlength="300" autocomplete="off" placeholder="Not (isteğe bağlı)" value="${esc(k.note||"")}" style="width:100%;margin-top:8px">
  <div class="row"><button class="btn" style="padding:11px 16px" data-pksave="${x.id}">Kaydet</button></div>${cpMsg("pk"+x.id)}<p class="empty" style="font-size:12px;margin:6px 0 0">Bitişe 7 gün kala ya da ödeme beklerken sabah özetinde görünür.</p></div>`;
}
async function pkgSave(id){
  const e=gv("pke"),row={student_id:id,name:gv("pkn").slice(0,60)||null,ends_on:/^\d{4}-\d{2}-\d{2}$/.test(e)?e:null,paid:!!(document.getElementById("pkp")||{}).checked,note:gv("pkt").slice(0,300)||null,updated_at:new Date().toISOString()};
  const r=await dbw(sb.from("packages").upsert(row));if(r&&r.error)return cpm("pk"+id,"Kaydedilemedi: "+r.error.message,1);PKG[id]=row;cpm("pk"+id,"Kaydedildi ✓");
}

/* ---- KVKK izinleri ve veli bağlantısı ---- */
const CK={aydinlatma:"Aydınlatma metni verildi",veli_riza:"Veli açık rızası (veli sayfası için gerekli)",ai_yurtdisi:"Yapay zekâ ve yurt dışı aktarım rızası",whatsapp:"WhatsApp ile iletişim rızası"};
function consLoad(id){
  if(id in CONS)return;CONS[id]=null;PLINK[id]=null;
  Promise.all([sb.from("consents").select("*").eq("student_id",id).order("created_at",{ascending:false}),sb.from("parent_links").select("*").eq("student_id",id).order("created_at",{ascending:false})]).then(([a,b])=>{CONS[id]=(a&&a.data)||[];PLINK[id]=(b&&b.data)||[];if(sel===id)render()},()=>{CONS[id]=[];PLINK[id]=[]});
}
const consLast=(id,k)=>(CONS[id]||[]).find(c=>c.kind===k)||null;
const plUrl=t=>location.origin+"/veli.html#t="+t;
function kvkkCard(x){
  const id=x.id;consLoad(id);const L=CONS[id];if(L===null)return `<div class="card"><h2>🛡 KVKK ve veli bağlantısı</h2><p class="empty">Yükleniyor…</p></div>`;
  const ok=k=>{const c=consLast(id,k);return c&&c.granted?c:null},act=(PLINK[id]||[]).filter(l=>!l.revoked&&Date.parse(l.expires_at)>Date.now()),pp=(CONTACT[id]||{}).parent_phone;
  return `<div class="card" id="detail-kvkk"><h2>🛡 KVKK ve veli bağlantısı</h2><p class="empty" style="margin:0 0 8px;font-size:13px">İzinleri aldığında kaydet; tarih ve yöntem saklanır. <a href="kvkk.html" target="_blank" rel="noopener">Aydınlatma metni taslağı</a> (avukat onayı bekliyor).</p>
  ${Object.entries(CK).map(([k,n])=>{const c=consLast(id,k);return `<div class="cs"><span><b>${n}</b><small>${c?(c.granted?"✓ ":"✗ geri alındı · ")+ntime(Date.parse(c.created_at))+(c.by_name?" · "+esc(c.by_name):"")+(c.method?" · "+esc(c.method):""):"Kayıt yok"}</small></span><span class="cs-b"><button class="chip" data-csok="${k}">Verildi</button>${c&&c.granted?`<button class="chip" data-csno="${k}">Geri alındı</button>`:""}</span></div>`}).join("")}
  <div class="row"><label>Kim verdi<input id="csn" maxlength="80" autocomplete="off" placeholder="ör. Annesi Ayşe Hanım" style="width:180px"></label><label>Yöntem<select id="csm"><option>yazılı</option><option>sözlü</option><option>elektronik</option></select></label></div>
  <h3 class="h3s">Veli bağlantısı</h3>${ok("veli_riza")?`<p class="empty" style="margin:0 0 6px;font-size:13px">Veli, hesap açmadan son 30 günün çalışma, görev ve deneme özetini görür; uyku ve ruh hali gösterilmez. Bağlantı 30 gün geçerlidir, istediğin an iptal edebilirsin.</p>
  ${act.map(l=>`<div class="pl"><input readonly value="${esc(plUrl(l.token))}" aria-label="Veli bağlantısı"><div class="row" style="margin-top:6px"><button class="chip" data-plcp="${esc(l.token)}">Kopyala</button>${pp?`<a class="chip" href="https://wa.me/${pp}?text=${encodeURIComponent("Merhaba, öğrencimizin çalışma özetini bu bağlantıdan görebilirsiniz: "+plUrl(l.token))}" target="_blank" rel="noopener">📲 Veliye gönder</a>`:""}<button class="chip" data-plrv="${esc(l.token)}">İptal et</button></div><small>${fd(l.expires_at.slice(0,10))} tarihine kadar${l.last_seen?" · son açılış "+ntime(Date.parse(l.last_seen)):" · henüz açılmadı"}</small></div>`).join("")}
  <div class="row"><button class="btn" style="padding:11px 16px" data-plnew="${id}">${act.length?"Yeni bağlantı oluştur":"Veli bağlantısı oluştur"}</button></div>`:`<p class="empty" style="margin:0;font-size:14px">Önce “Veli açık rızası”nı kaydet; bağlantı ondan sonra açılır.</p>`}${cpMsg("cs"+id)}</div>`;
}
async function consSet(id,k,g){
  const row={student_id:id,kind:k,granted:g,by_name:gv("csn").slice(0,80)||null,method:gv("csm")||null};
  const r=await dbw(sb.from("consents").insert(row).select().single());if(r&&r.error)return cpm("cs"+id,"Kaydedilemedi: "+r.error.message,1);
  (CONS[id]=CONS[id]||[]).unshift(r.data||Object.assign({created_at:new Date().toISOString()},row));
  if(k==="veli_riza"&&!g){const L=(PLINK[id]||[]).filter(l=>!l.revoked);if(L.length){await dbw(sb.from("parent_links").update({revoked:true}).eq("student_id",id));L.forEach(l=>l.revoked=true)}}
  cpm("cs"+id,(g?"Kaydedildi ✓":"Geri alındı olarak kaydedildi")+(k==="veli_riza"&&!g?"; veli bağlantıları kapatıldı.":""));
}
async function plNew(id){
  const a=new Uint8Array(24);crypto.getRandomValues(a);const tok=btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const row={token:tok,student_id:id,expires_at:new Date(Date.now()+30*864e5).toISOString()};
  const r=await dbw(sb.from("parent_links").insert(row));if(r&&r.error)return cpm("cs"+id,"Bağlantı oluşturulamadı: "+r.error.message,1);
  (PLINK[id]=PLINK[id]||[]).unshift(Object.assign({revoked:false,last_seen:null,created_at:new Date().toISOString()},row));cpm("cs"+id,"Bağlantı hazır ✓ Kopyalayıp veliye gönderebilirsin.");
}
async function plRevoke(id,tok){
  if(!confirm("Bu veli bağlantısı iptal edilsin mi? Veli artık özeti açamaz."))return;
  const r=await dbw(sb.from("parent_links").update({revoked:true}).eq("token",tok));if(r&&r.error)return cpm("cs"+id,"İptal edilemedi: "+r.error.message,1);
  (PLINK[id]||[]).forEach(l=>{if(l.token===tok)l.revoked=true});cpm("cs"+id,"Bağlantı iptal edildi.");
}

/* ---- ön görüşme başvuruları (tanıtım sitesi) ---- */
const LST=["yeni","arandı","görüşüldü","kayıt oldu","vazgeçti"];
function leadsCard(){
  if(!LEADS||!LEADS.length)return "";const nn=LEADS.filter(l=>l.status==="yeni").length;
  return `<details class="card" id="coach-leads"${nn?" open":""}><summary style="cursor:pointer;font-weight:700">📥 Ön görüşme başvuruları · ${nn} yeni</summary>${LEADS.slice(0,30).map(l=>`<div class="ld"><div><b>${esc(l.name)}</b><small>${ntime(Date.parse(l.created_at))}${l.exam?" · "+esc(l.exam):""}${l.grade?" · "+esc(l.grade):""}</small>${l.note?`<p>${esc(l.note)}</p>`:""}</div><div class="ld-a"><a class="chip" href="tel:+${esc(l.phone)}">📞 ${esc(fmtPhone(l.phone))}</a><a class="chip" href="https://wa.me/${esc(l.phone)}" target="_blank" rel="noopener">📲 WhatsApp</a><select data-ldst="${l.id}" aria-label="Durum">${LST.map(s=>`<option${s===l.status?" selected":""}>${s}</option>`).join("")}</select></div></div>`).join("")}<p class="empty" style="font-size:12px;margin:6px 0 0">hasankarakis.com iletişim formundan gelir. Başvuru sahibi iletişim için onay verdi.</p></details>`;
}
document.addEventListener("change",async e=>{
  const id=e.target.dataset&&e.target.dataset.ldst;if(!id)return;const v=e.target.value,l=(LEADS||[]).find(z=>String(z.id)===id);
  const r=await dbw(sb.from("leads").update({status:v}).eq("id",+id));if(!(r&&r.error)&&l)l.status=v;if(!busy())render();
});

/* ---- bağlantılar ---- */
(function(){
  const prev=ui;
  ui=function(t){
    const D=t.dataset||{},id=t.id;
    if(D.mtsave){once("mt",()=>meetSave(D.mtsave));return true}
    if(D.mtask){once("mtk",()=>meetTask(sel,D.mtask));return true}
    if(id==="dysend"){once("dy",bcastSend);return true}
    if(D.plcopy){once("pl",()=>plCopy(D.plcopy));return true}
    if(D.plsave){once("pl",()=>plSave(D.plsave));return true}
    if(D.plapply){once("pl",()=>plApply(D.plapply));return true}
    if(D.rgadd){once("pl",()=>rgAdd(D.rgadd));return true}
    if(id==="evadd"){once("ev",calAdd);return true}
    if(D.pksave){once("pk",()=>pkgSave(D.pksave));return true}
    if(D.csok||D.csno){once("cs",()=>consSet(sel,D.csok||D.csno,!!D.csok));return true}
    if(D.plnew){once("pln",()=>plNew(D.plnew));return true}
    if(D.plrv){plRevoke(sel,D.plrv);return true}
    if(D.plcp){const u=plUrl(D.plcp);try{navigator.clipboard.writeText(u).then(()=>{t.textContent="Kopyalandı ✓"},()=>{t.textContent="Bağlantıyı seçip kopyala"})}catch(x){t.textContent="Bağlantıyı seçip kopyala"}return true}
    return prev.apply(this,arguments);
  };
})();
