/* ===== Otomasyon (koç): uzun mola hatırlatması, WhatsApp, öğrenci iletişim bilgisi,
   geciken görevleri yapay zekâyla haftanın kalan günlerine dağıtma ===== */
let SET={nudge:{on:true,min:60,quiet_from:0,quiet_to:7},wa:{on:false,chat:true,nudge:true}},SETMSG="",WAST=null,NUDGES=null,CMSG="";
const pad2=n=>String(n).padStart(2,"0");
async function loadSettings(){try{const {data,error}=await sb.from("app_settings").select("key,value");if(error)throw error;(data||[]).forEach(r=>{if(r.key in SET)SET[r.key]=Object.assign({},SET[r.key],r.value||{})})}catch(e){}}
async function saveSetting(k){SETMSG="Kaydediliyor…";render();const r=await dbw(sb.from("app_settings").upsert({key:k,value:SET[k],updated_at:new Date().toISOString()}));SETMSG=r&&r.error?"Kaydedilemedi: "+r.error.message:"Kaydedildi ✓";render()}
async function loadWaStatus(){const r=await callFn("wa-send",{action:"status"});WAST=r&&!r.error?r:{configured:false}}
async function loadNudges(){try{const {data}=await sb.from("break_nudges").select("student_id,break_start,sent_at,push,wa_status").order("sent_at",{ascending:false}).limit(12);NUDGES=data||[]}catch(e){NUDGES=[]}}
const waLive=()=>!!(SET.wa&&SET.wa.on&&WAST&&WAST.configured);

function autoCard(){
  if(NUDGES===null){NUDGES=[];loadNudges().then(()=>{if(CPG==="y"&&!busy())render()})}
  const n=SET.nudge,w=SET.wa,ok=!!(WAST&&WAST.configured);
  return `<div class="card" id="set-nudge"><h2>☕ Uzun mola hatırlatması</h2><p class="empty" style="margin:0 0 10px;font-size:14px">Öğrenci molayı <b>${n.min} dakikadan</b> fazla uzatırsa yapay zekâ ona kısa, teşvik edici bir mesaj yazar. Mesaj öğrencinin “Koçum” sohbetine 🤖 işaretiyle düşer, bildirimleri açıksa telefonuna bildirim gider. Her mola için bir kez, öğrenci başına günde en fazla 3 kez gönderilir; ${pad2(n.quiet_from)}:00–${pad2(n.quiet_to)}:00 arası gönderilmez.</p>
  <div class="row" style="margin-top:0;align-items:end"><button class="chip" data-setnudge="1" aria-pressed="${n.on!==false}">${n.on!==false?"✓ Açık":"Kapalı"}</button><label>Mola süresi<select id="setmin">${[30,45,60,90,120].map(m=>`<option value="${m}"${m===+n.min?" selected":""}>${m} dakika</option>`).join("")}</select></label></div>
  <h3 class="h3s">Son gönderilenler</h3>${NUDGES.length?NUDGES.map(x=>`<div class="subj"><span>${esc(stuNm(x.student_id))}</span><span>${ntime(Date.parse(x.sent_at))} · ${x.push?"🔔 bildirim gitti":"bildirim kapalı"}${x.wa_status&&!/^(atlandı|kapalı)/.test(x.wa_status)?" · 📲 "+esc(x.wa_status):""}</span></div>`).join(""):`<p class="empty" style="font-size:13px;margin:4px 0 0">Henüz gönderilen hatırlatma yok.</p>`}
  ${SETMSG?`<p class="empty" style="font-size:13px;margin:8px 0 0">${esc(SETMSG)}</p>`:""}</div>
  <div class="card" id="set-wa"><h2>📲 WhatsApp otomatik gönderim</h2>
  <p style="margin:0 0 8px">Durum: ${ok?`<b style="color:var(--ok)">Bağlı ✓</b>`:`<b style="color:var(--warn)">Bağlı değil</b> <span class="empty">· Meta'nın resmî WhatsApp Business hesabı kurulunca açılır.</span>`}</p>
  <div class="row" style="margin-top:0"><button class="chip" data-setwa="on" aria-pressed="${!!w.on}"${ok||w.on?"":" disabled"}>${w.on?"✓ Açık":"Kapalı"}</button><button class="chip" data-setwa="chat" aria-pressed="${!!w.chat}">Koç mesajları</button><button class="chip" data-setwa="nudge" aria-pressed="${!!w.nudge}">Mola hatırlatmaları</button></div>
  <p class="empty" style="font-size:13px;margin:8px 0 0">Yalnızca telefonu kayıtlı ve WhatsApp izni işaretli öğrencilere gider (öğrenci sayfası → Diğer → İletişim). Bağlantı kurulana kadar sohbetteki “📲 WhatsApp'tan da gönder” ile mesajı tek dokunuşla WhatsApp'ta açabilirsin.</p>
  <details class="wa-setup"><summary>Kurulum adımları</summary><ol>
  <li><b>business.facebook.com</b>'da Meta Business hesabı aç (işletme doğrulaması önerilir).</li>
  <li><b>developers.facebook.com</b> → Uygulama oluştur → WhatsApp ürününü ekle. Kişisel WhatsApp'ta kullanılmayan bir telefon numarasını işletme numarası olarak ekleyip doğrula.</li>
  <li>WhatsApp Manager → Mesaj şablonları → Yeni şablon: ad <code>koc_mesaji</code>, dil Türkçe, metin örneği: <i>“Merhaba {{1}}, Karakış Takip'te koçundan yeni bir mesaj var: {{2}} Uygulamadan yanıtlayabilirsin.”</i> Meta onaylayınca kullanılabilir; kategoriyi ve ücreti Meta belirler.</li>
  <li>Kalıcı erişim anahtarı (System User, <code>whatsapp_business_messaging</code> izni) oluştur.</li>
  <li>Supabase → Edge Functions → Secrets: <code>WA_TOKEN</code>, <code>WA_PHONE_ID</code> (Phone number ID), <code>WA_TEMPLATE</code> = koc_mesaji.</li>
  <li>Bu sayfayı yenile; durum “Bağlı ✓” olunca <b>Açık</b>'a bas, öğrencilerin telefon ve izinlerini gir.</li></ol>
  <p class="empty" style="font-size:12px">Meta mesaj başına ücret alır (Türkiye'nin kendi tarifesi var). Öğrenci son 24 saatte işletme numarasına yazdıysa şablonsuz mesaj da gider. 18 yaşından küçük öğrenciler için veli izni al.</p></details></div>`;
}

/* ---- öğrenci iletişim bilgisi (yalnız koç) ---- */
async function loadContact(id){if(ROLE!=="coach"||!id)return;try{const {data}=await sb.from("student_contacts").select("phone,parent_phone,wa_ok,wa_ok_at").eq("student_id",id).maybeSingle();CONTACT[id]=data||{}}catch(e){CONTACT[id]=CONTACT[id]||{}}}
// 0532 123 45 67 / 5321234567 / +90 532… → 905321234567. Geçersizse null, boşsa "".
const normPhone=v=>{let d=String(v||"").replace(/\D/g,"");if(!d)return "";if(d.startsWith("00"))d=d.slice(2);if(d.length===11&&d[0]==="0")d="9"+d;else if(d.length===10&&d[0]==="5")d="90"+d;return /^[0-9]{10,15}$/.test(d)?d:null};
const fmtPhone=d=>!d?"":d.length===12&&d.startsWith("90")?"0"+d.slice(2,5)+" "+d.slice(5,8)+" "+d.slice(8,10)+" "+d.slice(10):"+"+d;
function contactCard(x){
  const c=CONTACT[x.id];if(!c)return `<div class="card"><h2>📱 İletişim ve WhatsApp</h2><p class="empty">Yükleniyor…</p></div>`;
  return `<div class="card" id="detail-contact"><h2>📱 İletişim ve WhatsApp</h2><div class="row" style="margin-top:0"><label>Öğrenci telefonu<input id="cph" type="tel" inputmode="tel" autocomplete="off" placeholder="05xx xxx xx xx" value="${esc(fmtPhone(c.phone))}" style="width:170px"></label><label>Veli telefonu<input id="cpp" type="tel" inputmode="tel" autocomplete="off" placeholder="05xx xxx xx xx" value="${esc(fmtPhone(c.parent_phone))}" style="width:170px"></label></div>
  <label class="ckl"><input type="checkbox" id="cwa"${c.wa_ok?" checked":""}><span>Öğrenciye WhatsApp'tan otomatik mesaj gönderilebilir (18 yaşından küçükse veli izni alındı).</span></label>${c.wa_ok&&c.wa_ok_at?`<p class="empty" style="font-size:12px;margin:4px 0 0">İzin kaydı: ${ntime(Date.parse(c.wa_ok_at))}</p>`:""}
  <div class="row"><button class="btn" style="padding:11px 16px" data-csave="${x.id}">Kaydet</button>${c.phone?`<a class="chip" href="https://wa.me/${c.phone}" target="_blank" rel="noopener">📲 Öğrenciye yaz</a>`:""}${c.parent_phone?`<a class="chip" href="https://wa.me/${c.parent_phone}" target="_blank" rel="noopener">📲 Veliye yaz</a>`:""}</div>
  ${CMSG?`<p class="empty" style="font-size:13px;margin:6px 0 0">${esc(CMSG)}</p>`:""}<p class="empty" style="font-size:12px;margin:6px 0 0">Numaraları yalnızca sen görürsün. Veli özeti ve rapor “WhatsApp'ta gönder” düğmeleri veli numarasını kullanır.</p></div>`;
}
async function contactSave(id){
  const g=i=>(document.getElementById(i)||{}).value||"",p=normPhone(g("cph")),pp=normPhone(g("cpp")),wa=!!(document.getElementById("cwa")||{}).checked;
  if(p===null||pp===null){CMSG="Telefon numarasını kontrol et (ör. 0532 123 45 67).";render();return}
  if(wa&&!p){CMSG="WhatsApp izni için öğrenci telefonu gerekli.";render();return}
  const prev=CONTACT[id]||{},row={student_id:id,phone:p||null,parent_phone:pp||null,wa_ok:wa,wa_ok_at:wa?(prev.wa_ok&&prev.wa_ok_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};
  const r=await dbw(sb.from("student_contacts").upsert(row));
  if(r&&r.error)CMSG="Kaydedilemedi: "+r.error.message;else{CONTACT[id]=row;CMSG="Kaydedildi ✓"}
  render();
}

/* ---- geciken görevleri yapay zekâyla kalan günlere dağıtma ---- */
const RD={};
// Kalan günler: saat 15:00'ten önce bugünden, sonra yarından başlar; pazar gününe kadar. 2 günden azsa önümüzdeki günlerle 4'e tamamlanır.
function rdDays(){
  const s=new Date().getHours()<15?0:1,out=[];
  for(let i=s;i<s+7;i++){const d=dayN(i);out.push(d);if(new Date(d+"T12:00:00").getDay()===0)break}
  if(out.length<2)for(let i=s+out.length;out.length<4;i++)out.push(dayN(i));
  return out;
}
const rdSig=(L,days)=>L.map(t=>t.id).sort((a,b)=>a-b).join(",")+"|"+days.join(",");
const rdBox=(inner,days)=>`<div class="rd-ai"><div class="rd-h"><b>🤖 Yapay zekâ ile kalan günlere dağıt</b><small>${days&&days.length?fd(days[0])+(days.length>1?" – "+fd(days[days.length-1]):""):""}</small></div>${inner}</div>`;
function rdCard(id,L){
  const days=rdDays(),sig=rdSig(L,days),R=RD[id];
  const wait=`<p class="empty rd-ld"><span class="spin" aria-hidden="true"></span> Yapay zekâ geciken konuları tarıyor, kalan günlere dağıtım hazırlıyor…</p>`;
  if(!R||(R.sig!==sig&&R.st!=="load"&&R.st!=="apply")){setTimeout(()=>rdPlan(id),0);return rdBox(wait,days)}
  if(R.st==="load")return rdBox(wait,R.days);
  if(R.st==="apply")return rdBox(`<p class="empty rd-ld"><span class="spin" aria-hidden="true"></span> Görevler dağıtılıyor…</p>`,R.days);
  if(R.st==="err")return rdBox(`<p class="empty" style="color:var(--warn);margin:6px 0">${esc(R.msg)}</p><div class="row"><button class="chip" data-rdre="${id}">↻ Tekrar dene</button></div>`,R.days);
  const T=Object.fromEntries((TK[id]||[]).map(t=>[t.id,t])),by={};R.plan.atamalar.forEach(a=>(by[a.tarih]=by[a.tarih]||[]).push(a));
  const had=d=>(TK[id]||[]).filter(t=>t.task_date===d).length;
  return rdBox(`${R.plan.ozet?`<p class="rd-oz">${esc(R.plan.ozet)}</p>`:""}<div class="rd-days">${R.days.map(d=>{const A=by[d]||[];return `<div class="rd-day${A.length?"":" empty"}"><div class="rd-dh"><b>${fd(d)}</b><small>${had(d)} görev var${A.length?` · <em>+${A.length}</em>`:""}</small></div>${A.map(a=>{const t=T[a.id]||{};return `<div class="rd-it"><span>${esc(t.title||"Görev")}${t.subject?` <em>${esc(t.subject)}</em>`:""}</span>${a.neden?`<small>${esc(a.neden)}</small>`:""}</div>`}).join("")}</div>`}).join("")}</div>
  ${R.kaynak==="yedek"?`<p class="empty" style="font-size:12px;margin:6px 0 0">Yapay zekâ şu an yanıt vermedi; günlerin yüküne göre dengeli dağıtım önerildi.</p>`:""}
  <div class="row"><button class="btn" style="padding:11px 16px" data-rdgo="${id}">✓ Kalan günlere dağıt (${R.plan.atamalar.length} görev)</button><button class="chip" data-rdre="${id}">↻ Yeniden öner</button></div>`,R.days);
}
async function rdPlan(id){
  const L=overdue(id),days=rdDays(),sig=rdSig(L,days);if(!L.length||(RD[id]&&RD[id].st==="load"))return;
  RD[id]={st:"load",sig,days};
  const r=await callFn("task-plan",{action:"redistribute",student_id:id,days});
  if(!RD[id]||RD[id].sig!==sig)return;
  if(r.error)RD[id]={st:"err",sig,days,msg:r.error};
  else{const ids=new Set(L.map(t=>t.id)),A=((r.plan||{}).atamalar||[]).filter(a=>ids.has(a.id)&&days.includes(a.tarih));
    RD[id]=A.length?{st:"ok",sig,days,plan:{ozet:(r.plan||{}).ozet||"",atamalar:A},kaynak:r.kaynak}:{st:"err",sig,days,msg:"Dağıtılacak geciken görev bulunamadı."}}
  if(sel===id&&!busy())render();
}
async function rdGo(id){
  const R=RD[id];if(!R||R.st!=="ok")return;
  const A=R.plan.atamalar,prev=A.map(a=>({id:a.id,date:((TK[id]||[]).find(t=>t.id===a.id)||{}).task_date})).filter(p=>p.date);
  RD[id]=Object.assign({},R,{st:"apply"});render();
  const res=await Promise.all(A.map(a=>Promise.resolve(sb.from("weekly_tasks").update({task_date:a.tarih}).eq("id",a.id).eq("student_id",id).eq("done",false)).catch(e=>({error:e}))));
  const bad=res.filter(r=>r&&r.error).length;
  await loadTasks(id);try{await loadOD()}catch(e){}
  RD[id]={st:"done",sig:"",days:R.days,A,prev,bad,ozet:R.plan.ozet};
  setSync(bad?"⚠️ "+bad+" görev taşınamadı":"✓ "+(A.length-bad)+" görev dağıtıldı");render();
}
async function rdUndo(id){
  const R=RD[id];if(!R||R.st!=="done")return;
  await Promise.all(R.prev.map(p=>Promise.resolve(sb.from("weekly_tasks").update({task_date:p.date}).eq("id",p.id).eq("student_id",id)).catch(()=>null)));
  RD[id]=null;await loadTasks(id);try{await loadOD()}catch(e){}
  setSync("↩ Dağıtım geri alındı");render();
}
function rdDoneCard(id){
  const R=RD[id];if(!R||R.st!=="done")return "";
  const by={};R.A.forEach(a=>(by[a.tarih]=by[a.tarih]||0,by[a.tarih]++));
  return `<div class="card undo"><div><b>✓ ${R.A.length-R.bad} geciken görev kalan günlere dağıtıldı</b><small>${Object.keys(by).sort().map(d=>fd(d)+": "+by[d]).join(" · ")}${R.bad?` · ${R.bad} görev taşınamadı`:""}${R.ozet?"<br>"+esc(R.ozet):""}</small></div><div class="undo-acts"><button class="btn" data-rdundo="${id}">↩ Geri al</button><button class="chip" data-rdok="${id}">Tamam</button></div></div>`;
}

/* tıklamalar (coach.js ui() içinden) */
function autoUi(t){
  const D=t.dataset;
  if(D.rdgo){rdGo(D.rdgo);return true}
  if(D.rdre){RD[D.rdre]=null;render();return true}
  if(D.rdundo){rdUndo(D.rdundo);return true}
  if(D.rdok){delete RD[D.rdok];render();return true}
  if(D.csave){contactSave(D.csave);return true}
  if(D.setnudge){SET.nudge.on=SET.nudge.on===false;saveSetting("nudge");return true}
  if(D.setwa){const k=D.setwa;SET.wa[k]=!SET.wa[k];saveSetting("wa");return true}
  if(D.mqr!=null){const e=document.getElementById("minp");if(e){e.value=(e.value.trim()?e.value.trim()+" ":"")+MQR[+D.mqr];MDRAFT=e.value;e.focus();e.dispatchEvent(new Event("input",{bubbles:true}))}return true}
  if(D.mwa){MWA[D.mwa]=!MWA[D.mwa];try{localStorage.setItem("karakis-mwa",JSON.stringify(MWA))}catch(e){}render();return true}
  return false;
}
document.addEventListener("change",e=>{if(e.target.id==="setmin"){SET.nudge.min=+e.target.value||60;saveSetting("nudge")}});
