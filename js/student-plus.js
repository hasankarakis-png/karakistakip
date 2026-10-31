/* ===== Öğrenci özellikleri (v3.8) =====
   Yanlış defteri (fotoğraf, ders, konu, neden; 3 / 14 / 30 gün sonra tekrar), haftalık karne, deneme haftası kartı,
   yarışma ayarları (katılmama, takma ad), mesajda koçun çalışma saatleri bilgisi. Koç: öğrencinin yanlış defteri özeti. */
let WB=null,WBF={img:null,err:"",busy:false},WBV="due",WBC={},CHP=null,CHPMSG="";
const WB_STEP=[3,14,30];
async function wbLoad(){if(WB!==null)return;WB=[];try{const r=await sb.from("wrong_book").select("*").eq("student_id",ME).order("created_at",{ascending:false}).limit(300);WB=(r&&r.data)||[]}catch(e){}if(tab==="w"||tab==="b")render()}
const wbDue=()=>(WB||[]).filter(w=>w.stage<3&&w.next_review&&w.next_review<=day());
function wbPick(f){
  WBF.err="";if(!f)return;if(!/^image\//.test(f.type)){WBF.err="Lütfen bir fotoğraf seç.";render();return}
  const u=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{const enc=(mx,q)=>{const s=Math.min(1,mx/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);return c.toDataURL("image/jpeg",q)};
    let d=enc(1100,.72);if(d.length>440000)d=enc(900,.6);if(d.length>440000)d=enc(700,.5);URL.revokeObjectURL(u);
    if(d.length>440000){WBF.err="Fotoğraf çok büyük, daha yakından çekmeyi dene.";render();return}WBF.img=d;render()};
  im.onerror=()=>{URL.revokeObjectURL(u);WBF.err="Fotoğraf açılamadı.";render()};im.src=u;
}
function wrongTab(){
  wbLoad();const due=wbDue(),L=WBV==="due"?due:(WB||[]),g=k=>esc((document.getElementById(k)||{}).value||"");
  const item=w=>`<div class="card wb"><div class="wb-h"><b>${esc(w.subject)}${w.topic?" · "+esc(w.topic):""}</b>${w.cause?`<span class="wb-c">${esc(w.cause)}</span>`:""}</div>${w.img?`<img class="wb-img" src="${w.img}" alt="Soru fotoğrafı" loading="lazy">`:""}${w.note?`<p class="wb-n">${esc(w.note)}</p>`:""}<div class="wb-f"><small>${w.stage>=3?"✓ Tamamlandı":w.next_review?(w.next_review<=day()?"Tekrar zamanı geldi":"Sonraki tekrar: "+fd(w.next_review)):""} · ${w.stage}/3 tekrar</small><span>${w.stage<3?`<button class="chip" data-wbok="${w.id}">✓ Tekrar ettim</button>`:""}<button class="chip" data-wbdel="${w.id}" aria-label="Sil">🗑</button></span></div></div>`;
  return `${stHead("Yanlış defteri")}<details class="card"${WBF.img||WBF.err?" open":""}><summary style="cursor:pointer;font-weight:700">＋ Yanlış soru ekle</summary>
  <p class="empty" style="margin:8px 0;font-size:14px">Yanlış yaptığın sorunun fotoğrafını çek, nedenini yaz. 3, 14 ve 30 gün sonra tekrar karşına çıkar.</p>
  <label class="btn alt" style="display:inline-flex;padding:11px 16px;cursor:pointer">📷 Fotoğraf seç<input id="wbimg" type="file" accept="image/*" capture="environment" hidden></label>${WBF.img?`<img class="wb-img" src="${WBF.img}" alt="Seçilen fotoğraf"><button class="chip" id="wbimx">Fotoğrafı kaldır</button>`:""}
  <div class="row"><label>Ders<select id="wbs">${SUBJ.map(s=>`<option>${esc(s)}</option>`).join("")}</select></label><label>Konu<input id="wbk" maxlength="80" autocomplete="off" style="width:160px"></label><label>Neden<select id="wbc">${CAUSE.map(c=>`<option>${c}</option>`).join("")}</select></label></div>
  <textarea id="wbn" maxlength="500" placeholder="Doğru çözüm ya da kendine ipucu (isteğe bağlı)" style="min-height:70px"></textarea>
  ${WBF.err?`<p class="qerr" role="alert">${esc(WBF.err)}</p>`:""}<div class="row"><button class="btn" style="padding:11px 16px" id="wbsave"${WBF.busy?" disabled":""}>Kaydet</button></div></details>
  <div class="ktseg" style="margin:0 0 12px"><button data-wbv="due" aria-pressed="${WBV==="due"}">Bugün tekrar (${due.length})</button><button data-wbv="all" aria-pressed="${WBV==="all"}">Tümü (${(WB||[]).length})</button></div>
  ${WB===null?`<p class="empty">Yükleniyor…</p>`:L.length?L.map(item).join(""):`<div class="card"><p class="empty" style="margin:0">${WBV==="due"?"Bugün tekrar edilecek soru yok 👏":"Henüz kayıt yok. İlk yanlış sorunu ekleyerek başla."}</p></div>`}`;
}
async function wbSave(){
  const v=k=>((document.getElementById(k)||{}).value||"").trim(),s=v("wbs"),k=v("wbk"),c=v("wbc"),n=v("wbn");
  if(!WBF.img&&!k&&!n){WBF.err="Fotoğraf ekle ya da konu/not yaz.";render();return}
  WBF.busy=true;render();
  const r=await dbw(sb.from("wrong_book").insert({student_id:ME,subject:s||"Diğer",topic:k.slice(0,80)||null,cause:c||null,note:n.slice(0,500)||null,img:WBF.img,stage:0,next_review:dayN(3)}).select().single());
  WBF.busy=false;if(r&&r.error){WBF.err="Kaydedilemedi: "+r.error.message;render();return}
  (WB=WB||[]).unshift(r.data);WBF={img:null,err:"",busy:false};WBV="all";["wbk","wbn"].forEach(i=>{const e=document.getElementById(i);if(e){e.value="";e.defaultValue=""}});log("Yanlış defterine soru ekledim ("+s+")");save();render();
}
async function wbOk(id){
  const w=(WB||[]).find(z=>String(z.id)===String(id));if(!w)return;const st=Math.min(3,w.stage+1),nr=st>=3?null:dayN(WB_STEP[st]);
  const r=await dbw(sb.from("wrong_book").update({stage:st,next_review:nr}).eq("id",w.id));if(r&&r.error)return;w.stage=st;w.next_review=nr;render();
}
async function wbDel(id){if(!confirm("Bu kayıt silinsin mi?"))return;const r=await dbw(sb.from("wrong_book").delete().eq("id",+id));if(!(r&&r.error))WB=(WB||[]).filter(z=>String(z.id)!==String(id));render()}
function wbCoachCard(id){
  if(!(id in WBC)){WBC[id]=null;Promise.resolve(sb.from("wrong_book").select("id,subject,topic,cause,stage,next_review,created_at").eq("student_id",id).order("created_at",{ascending:false}).limit(200)).then(r=>{WBC[id]=(r&&r.data)||[];if(sel===id)render()},()=>{WBC[id]=[]})}
  const L=WBC[id];if(L===null)return "";if(!L.length)return `<div class="card"><h2>📕 Yanlış defteri</h2><p class="empty" style="margin:0">Öğrenci henüz kayıt eklemedi.</p></div>`;
  const cnt=k=>{const o={};L.forEach(w=>{const v=w[k]||"—";o[v]=(o[v]||0)+1});return Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([a,n])=>esc(a)+" "+n).join(" · ")};
  return `<div class="card"><h2>📕 Yanlış defteri</h2><div class="subj"><span>Toplam</span><span>${L.length} soru · ${L.filter(w=>w.stage>=3).length} tamamlandı · ${L.filter(w=>w.stage<3&&w.next_review&&w.next_review<=day()).length} bekleyen tekrar</span></div><div class="subj"><span>Derse göre</span><span>${cnt("subject")}</span></div><div class="subj"><span>Nedene göre</span><span>${cnt("cause")}</span></div>${L.slice(0,5).map(w=>`<div class="nt"><time>${ntime(Date.parse(w.created_at))}</time>${esc(w.subject)}${w.topic?" · "+esc(w.topic):""}${w.cause?" · "+esc(w.cause):""}</div>`).join("")}</div>`;
}

/* ---- haftalık karne ---- */
function wkStats(a,b){let m=0,q=0,act=0;for(let d=a;d<=b;d=addD(d,1)){const z=d===day()?{m:Math.round(total()/60000),q:solved()}:(HIST[ME]||{})[d]||{};m+=num(z.m);q+=num(z.q);if(num(z.m)>0||num(z.q)>0)act++}
  const T=(TK[ME]||[]).filter(t=>t.task_date>=a&&t.task_date<=b&&t.task_date<=day());return {m,q,act,t:T.length?Math.round(T.filter(t=>t.done).length/T.length*100):null}}
function karneCard(){
  const ws=wkMon(0),lw=wkMon(-1),k=dowOf(day()),A=wkStats(ws,day()),B=wkStats(lw,addD(lw,k));
  const df=(a,b,u)=>{if(b==null||a==null)return "";const d=a-b;return d===0?`<em class="kd">=</em>`:`<em class="kd ${d>0?"up":"dn"}">${d>0?"▲":"▼"} ${Math.abs(d)}${u||""}</em>`};
  return `<div class="card karne"><div class="cdh"><h2>📊 Haftalık karnen</h2><small>${DOWS[0]}–${DOWS[k]} · geçen haftanın aynı günlerine göre</small></div><div class="kgrid">
  <div><small>Çalışma</small><b>${hmin(A.m)}</b>${df(Math.round(A.m/60),Math.round(B.m/60)," sa")}</div><div><small>Soru</small><b>${A.q}</b>${df(A.q,B.q)}</div><div><small>Aktif gün</small><b>${A.act}/${k+1}</b>${df(A.act,B.act)}</div><div><small>Görev</small><b>${A.t==null?"–":"%"+A.t}</b>${df(A.t,B.t,"%")}</div></div></div>`;
}
// Ana sayfa: tekrar bekleyen yanlışlar, bu haftaki deneme, Pazartesi/Pazar karnesi
function weekHomeCards(){
  if(ROLE!=="student")return "";wbLoad();let h="";const due=wbDue();
  if(due.length)h+=`<button class="card tr" data-tab="w" aria-label="Yanlış defterini aç"><span class="rg" style="--p:0"><span style="font-size:28px">📕</span></span><span><h2>Bugün tekrar: ${due.length} soru</h2><p style="font-size:15px">Yanlış defterindeki soruları yeniden çöz</p></span></button>`;
  const ev=(EXCAL||[]).find(r=>r.scope==="deneme"&&(r.exam_type==="LGS")===isLGS(ME)&&r.exam_date<=day()&&addD(r.exam_date,6)>=day());
  if(ev)h+=`<button class="card tr" data-qa="d" aria-label="Deneme sonucunu yükle"><span class="rg" style="--p:0"><span style="font-size:28px">📝</span></span><span><h2>Bu hafta deneme haftası</h2><p style="font-size:15px">${esc(ev.title)} · çözünce sonucu yükle</p></span></button>`;
  if([0,1].includes(new Date().getDay()))h+=karneCard();
  return h;
}

/* ---- yarışma ayarları ---- */
function chPrefCard(){
  if(CHP===null){CHP={};Promise.resolve(sb.from("challenge_prefs").select("*").eq("student_id",ME).maybeSingle()).then(r=>{CHP=(r&&r.data)||{};if(tab==="y")render()},()=>{})}
  return `<details class="card"${CHPMSG?" open":""}><summary style="cursor:pointer;font-weight:700">⚙️ Yarışma ayarlarım</summary>
  <div class="row"><label>Takma ad (isteğe bağlı)<input id="chpa" maxlength="20" autocomplete="off" placeholder="ör. Kartal" value="${esc(CHP.alias||"")}" style="width:160px"></label><button class="btn" style="padding:11px 16px" id="chpsave">Kaydet</button></div><p class="empty" style="font-size:12px;margin:6px 0 0">Arkadaşların “şu an çalışıyor” bilgini görmez; bunu yalnızca koçun görür.</p>${CHPMSG?`<p class="empty" style="font-size:13px;margin:6px 0 0">${esc(CHPMSG)}</p>`:""}</details>`;
}
async function chPrefSave(){
  const a=((document.getElementById("chpa")||{}).value||"").trim();
  if(a&&!/^[0-9A-Za-zÇĞİÖŞÜçğıöşü ._-]{2,20}$/.test(a)){CHPMSG="Takma ad 2–20 harf/rakam olmalı.";render();return}
  /* hidden gönderilmez: yarışmaya katılım yalnızca koçun yetkisinde (sunucu da öğrencinin değiştirmesini engeller) */
  const row={student_id:ME,alias:a||null,updated_at:new Date().toISOString()};const r=await dbw(sb.from("challenge_prefs").upsert(row));
  CHPMSG=r&&r.error?"Kaydedilemedi: "+r.error.message:"Kaydedildi ✓";if(!(r&&r.error)){CHP=Object.assign({},CHP,row);try{chLoad(true)}catch(e){}}render();
}

/* ---- mesajda çalışma saatleri ---- */
function coachOff(){const d=new Date(),h=d.getHours()+d.getMinutes()/60,we=d.getDay()===0||d.getDay()===6;return we?(h<10||h>=20):(h<17||h>=22)}

/* ---- bağlantılar ---- */
(function(){
  const pv=ui;
  ui=function(t){
    const D=t.dataset||{},id=t.id;
    if(D.wbv){WBV=D.wbv;render();return true}
    if(id==="wbsave"){once("wb",wbSave);return true}
    if(id==="wbimx"){WBF.img=null;render();return true}
    if(D.wbok){once("wbo",()=>wbOk(D.wbok));return true}
    if(D.wbdel){wbDel(D.wbdel);return true}
    if(id==="chpsave"){once("chp",chPrefSave);return true}
    return pv.apply(this,arguments);
  };
  const py=yarisTab;yarisTab=function(){return py.apply(this,arguments)+chPrefCard()};
  const pm=msgTab;msgTab=function(){const h=pm.apply(this,arguments);return coachOff()?h.replace('<div class="mth" id="mth">','<p class="hrs">🕔 Koçun şu an çalışma saatleri dışında (hafta içi 17:00–22:00, hafta sonu 10:00–20:00). Yazabilirsin; çalışma saatinde yanıt verir.</p><div class="mth" id="mth">'):h};
  document.addEventListener("change",e=>{if(e.target.id==="wbimg"){const f=e.target.files&&e.target.files[0];e.target.value="";wbPick(f)}});
})();
