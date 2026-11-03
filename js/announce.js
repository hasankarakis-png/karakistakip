/* ===== Açılış duyuru paneli (v4.8) =====
   Öğrenci: girişten sonra bugünün duyurusu varsa ÖNCE o gelir ("Okudum, onaylıyorum"); onaylayınca
   Uyandım / Başlıyorum adımı çıkar. Duyurular Bugün sayfasının en üstünde de durur (tekrar okunabilir).
   Koç: bildirimler/görev sayfasında duyuru yazar, hedef grubu ve tarih aralığını seçer, kimin onayladığını görür.
   Tablolar: announcements, announcement_acks (supabase/schema-v48.sql). Tablo yoksa ya da okunamazsa panel hiç çıkmaz. */
let AN={open:false,mode:"flow",step:"ann",list:[],acked:new Set(),idx:0,busy:false,err:"",fail:false,shown:"",ld:""};
let AC={list:[],acks:{},who:{},loading:false,tried:false,msg:""};
const anMine=a=>!a.student_ids||a.student_ids.includes(ME);
const anPending=()=>AN.list.filter(a=>!AN.acked.has(a.id));
const anCur=()=>AN.mode==="view"?AN.list[AN.idx]:anPending()[0];
// Onaydan sonra Uyandım / Başlıyorum adımı yalnızca gün henüz başlamadıysa ya da uyanıldı ama ders başlamadıysa gelir.
const anWakeKind=()=>S.status==="idle"?"wake":S.status==="awake"?"start":"";

/* ---- öğrenci ---- */
async function anLoad(){
  if(ROLE!=="student")return;
  try{
    const d=day();
    const [a,k]=await Promise.all([
      sb.from("announcements").select("id,title,body,starts_on,ends_on,student_ids,created_at").lte("starts_on",d).gte("ends_on",d).order("created_at"),
      sb.from("announcement_acks").select("announcement_id").eq("student_id",ME)]);
    if(a.error||k.error)return;
    AN.ld=d;AN.list=(a.data||[]).filter(anMine);AN.acked=new Set((k.data||[]).map(r=>r.announcement_id));
    // Her gün ilk yüklemede (sayfa açılışı/giriş) onaylanmamış duyuru varsa panel kendiliğinden açılır; kapatılırsa aynı gün yeniden zorlanmaz.
    if(AN.shown!==d&&anPending().length){AN.shown=d;AN.open=true;AN.mode="flow";AN.step="ann";AN.err="";AN.fail=false;ONB.auto=true;ONB.open=false}
  }catch(e){}
}
function anClose(){AN.open=false;AN.err="";AN.fail=false;render()}
async function anOk(){
  if(AN.busy)return;const a=anCur();if(!a)return;
  AN.busy=true;AN.err="";AN.fail=false;render();
  let r;try{r=await sb.from("announcement_acks").insert({announcement_id:a.id,student_id:ME})}catch(e){r={error:{message:"ağ"}}}
  AN.busy=false;
  if(r&&r.error&&r.error.code!=="23505"&&!/duplicate/i.test(r.error.message||"")){AN.err="Onay kaydedilemedi. İnternetini kontrol edip tekrar dene.";AN.fail=true;render();return}
  AN.acked.add(a.id);
  if(AN.mode==="view"){AN.open=false;render();return}
  if(!anPending().length){if(anWakeKind())AN.step="wake";else AN.open=false}
  render();
}
function anWake(){AN.open=false;act("wake");render()}
function anStart(){AN.open=false;tab="b";QA=false;render();window.scrollTo(0,0)}
function anOpenOne(i){if(!AN.list[i])return;AN.mode="view";AN.idx=i;AN.step="ann";AN.err="";AN.fail=false;AN.open=true;render()}
function anSheet(){
  if(AN.step==="wake"){
    const k=anWakeKind();if(!k)return "";
    return `<div class="qa-bg"></div><div class="qa an an-w" role="dialog" aria-modal="true" aria-labelledby="an-wt"><div class="grab"></div>
    <div class="an-sun" aria-hidden="true">${k==="wake"?"☀️":"📚"}</div><h2 id="an-wt" style="text-align:center">Duyuruyu onayladın ✓</h2>
    <p class="empty" style="text-align:center;margin:0 0 14px;font-size:16px">${k==="wake"?"Şimdi güne başlayalım. Uyandıysan bildir, günlük kaydın başlasın.":"Hazırsan derse başlayalım. Dersini seçip sayacı başlatacaksın."}</p>
    <div class="row an-act"><button class="btn full" id="${k==="wake"?"anwake":"anstart"}">${k==="wake"?"☀️ Uyandım":"📚 Başlıyorum"}</button></div>
    <div class="row" style="justify-content:center"><button class="chip" id="anlater">Sonra</button></div></div>`;
  }
  const a=anCur();if(!a)return "";
  const view=AN.mode==="view",acked=AN.acked.has(a.id),all=AN.list,n=all.length,pos=view?AN.idx:all.indexOf(a);
  const dots=n>1?`<div class="an-dots" aria-hidden="true">${all.map((x,i)=>`<i class="${AN.acked.has(x.id)?"ok":""}${i===pos?" on":""}"></i>`).join("")}</div>`:"";
  const bg=view?`<button class="qa-bg" id="anx" aria-label="Kapat"></button>`:`<div class="qa-bg"></div>`;
  const actBtn=acked?`<button class="btn full" id="anx2">Kapat</button>`
    :`<button class="btn full" id="anok"${AN.busy?" disabled":""}>${AN.busy?"Kaydediliyor…":"✅ Okudum, onaylıyorum"}</button>`;
  return `${bg}<div class="qa an" role="dialog" aria-modal="true" aria-labelledby="an-t"><div class="grab"></div>
  <div class="an-top"><span class="an-eyebrow">📢 Duyuru</span>${n>1?`<span class="an-count">${pos+1} / ${n}</span>`:""}</div>
  <div class="an-card"><span class="an-ic" aria-hidden="true">📌</span><div><h2 id="an-t">${esc(a.title)}</h2><small>Koçundan${acked?" · ✓ onayladın":""}</small></div></div>
  <p class="an-body">${esc(a.body)}</p>${dots}
  ${AN.err?`<p class="qerr" role="alert">${esc(AN.err)}</p>`:""}
  <div class="row an-act">${actBtn}</div>
  ${AN.fail?`<div class="row" style="justify-content:center"><button class="chip" id="anlater">Şimdilik geç</button></div>`:(!view&&!acked?`<p class="empty an-hint">Onayladıktan sonra güne başlayabilirsin.</p>`:"")}</div>`;
}
// Bugün sayfasının en üstünde: bugünün duyuruları (onaylananlar da kalır, dokununca yeniden okunur).
function anCard(){
  if(ROLE!=="student"||!AN.list.length)return "";
  const items=AN.list.map((a,i)=>{const ok=AN.acked.has(a.id),t=String(a.body||"").replace(/\s+/g," ");
    return `<button class="an-it" data-anopen="${i}"><span class="an-ic sm" aria-hidden="true">📌</span><span class="an-tx"><b>${esc(a.title)}</b><small>${esc(t.length>80?t.slice(0,80)+"…":t)}</small></span><i class="an-st ${ok?"ok":"new"}">${ok?"✓ Onaylandı":"Yeni"}</i></button>`}).join("");
  return `<section class="card an-home" aria-label="Duyurular"><h2 class="an-hh">📢 Duyurular</h2>${items}</section>`;
}

/* ---- koç ---- */
const anAud=a=>a.student_ids?STU.filter(p=>a.student_ids.includes(p.id)):STU;
async function anCoachLoad(){
  AC.loading=true;
  try{
    const [a,k]=await Promise.all([sb.from("announcements").select("id,title,body,starts_on,ends_on,student_ids,created_at").gte("ends_on",dayN(-14)).order("created_at",{ascending:false}),sb.from("announcement_acks").select("announcement_id,student_id")]);
    if(a.error||k.error){AC.msg="Duyurular okunamadı: "+((a.error||k.error).message||"hata")}
    else{AC.list=a.data||[];AC.acks={};(k.data||[]).forEach(r=>{(AC.acks[r.announcement_id]=AC.acks[r.announcement_id]||new Set()).add(r.student_id)})}
  }catch(e){AC.msg="Duyurular okunamadı."}
  AC.loading=false;render();
}
function annCard(){
  if(ROLE!=="coach")return "";
  if(!AC.tried&&!AC.loading){AC.tried=true;setTimeout(anCoachLoad,0)}
  const d=day(),groups=allGroups();
  const rows=AC.list.map(a=>{
    const aud=anAud(a),ks=AC.acks[a.id]||new Set(),got=aud.filter(p=>ks.has(p.id)),miss=aud.filter(p=>!ks.has(p.id));
    const state=a.starts_on>d?"Planlı":a.ends_on<d?"Bitti":"Yayında";
    return `<div class="an-row"><div class="an-rh"><b>${esc(a.title)}</b><span class="an-pill ${state==="Yayında"?"on":""}">${state}</span></div>
    <small class="an-rm">${esc(a.starts_on===a.ends_on?a.starts_on:a.starts_on+" → "+a.ends_on)} · ${a.student_ids?a.student_ids.length+" öğrenci":"Tüm öğrenciler"} · <b>${got.length}/${aud.length}</b> onayladı</small>
    <p class="an-rb">${esc(a.body)}</p>
    ${miss.length&&state!=="Planlı"?`<button class="chip" data-anwho="${a.id}" aria-expanded="${!!AC.who[a.id]}">${AC.who[a.id]?"Gizle":"Onaylamayanlar ("+miss.length+")"}</button>`:""}
    <button class="chip" data-andel="${a.id}">Sil</button>
    ${AC.who[a.id]&&miss.length?`<p class="empty" style="font-size:13px;margin:6px 0 0">Onaylamayan: ${miss.map(p=>esc(p.name)).join(", ")}</p>`:""}</div>`}).join("");
  return `<section class="card an-co" id="coach-ann"><h2 style="margin:0 0 4px">📌 Açılış duyurusu</h2><p class="empty" style="font-size:13px;margin:0 0 10px">Öğrenci giriş yapınca önce bu duyuruyu görür ve “Okudum” diye onaylar; ardından Uyandım / Başlıyorum adımı gelir. Kimin onayladığını aşağıdan izlersin.</p>
  <label class="an-f">Başlık<input id="ant" type="text" maxlength="80" autocomplete="off" placeholder="ör. Cumartesi ortak deneme"></label>
  <label class="an-f">Duyuru metni<textarea id="anb" maxlength="1000" placeholder="ör. Cumartesi 10:00'da ortak deneme var, kitapçıklarınızı getirin."></textarea></label>
  <div class="row"><label>Kime<select id="ang" style="width:auto;max-width:100%"><option value="">Tüm öğrenciler (${STU.length})</option>${groups.map(([g,n])=>`<option value="${esc(g)}">${esc(g)} (${n})</option>`).join("")}</select></label>
  <label>Başlangıç<input id="ans" type="date" value="${d}" style="width:auto"></label><label>Bitiş<input id="ane" type="date" value="${d}" style="width:auto"></label></div>
  <div class="row"><button class="btn" style="padding:11px 16px" id="anpub">📌 Yayınla</button><button class="chip" id="anrf">↻ Onayları yenile</button></div>
  ${AC.msg?`<p class="empty" style="font-size:13px;margin:6px 0 0" role="status">${esc(AC.msg)}</p>`:""}
  <h3 class="an-sh">Son duyurular</h3>${rows||`<p class="empty" style="margin:0">${AC.loading?"Yükleniyor…":"Henüz duyuru yok."}</p>`}</section>`;
}
async function anPublish(){
  const t=gv("ant"),b=gv("anb"),g=gv("ang"),s=gv("ans"),e=gv("ane"),d=day();
  const bad=m=>{AC.msg=m;render()};
  if(!t)return bad("Başlık yaz.");if(!b)return bad("Duyuru metnini yaz.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!/^\d{4}-\d{2}-\d{2}$/.test(e))return bad("Başlangıç ve bitiş tarihini seç.");
  if(e<s)return bad("Bitiş tarihi başlangıçtan önce olamaz.");if(e<d)return bad("Bitiş tarihi geçmişte olamaz.");
  if(e>addD(s,60))return bad("Bir duyuru en fazla 60 gün gösterilebilir.");
  const ids=g?STU.filter(p=>groupsOf(p.id).includes(g)).map(p=>p.id):null;
  if(g&&!ids.length)return bad("Bu grupta öğrenci yok.");
  if(!confirm((ids?ids.length+" öğrenciye":"Tüm öğrencilere")+" duyuru yayınlansın mı?"))return;
  const r=await dbw(sb.from("announcements").insert({title:t.slice(0,80),body:b.slice(0,1000),starts_on:s,ends_on:e,student_ids:ids,created_by:ME}));
  if(r&&r.error)return bad("Yayınlanamadı: "+r.error.message);
  ["ant","anb"].forEach(id=>{const x=document.getElementById(id);if(x){x.value="";x.defaultValue=""}});
  AC.msg="Yayınlandı ✓ "+(ids?"("+g+")":"(tüm öğrenciler)");await anCoachLoad();
}
async function anDelete(id){
  if(!confirm("Bu duyuru ve onay kayıtları silinsin mi?"))return;
  const r=await dbw(sb.from("announcements").delete().eq("id",id));
  if(r&&r.error){AC.msg="Silinemedi: "+r.error.message;render();return}
  AC.msg="Silindi.";await anCoachLoad();
}

/* ---- bağlantılar ---- */
(function(){
  DRAFTS.push("ant","anb","ans","ane");
  const prevView=studentView;
  studentView=function(){let h=prevView.apply(this,arguments);if(AN.open)h+=anSheet();return h};
  const prevToday=todayTab;
  todayTab=function(){return anCard()+prevToday.apply(this,arguments)};
  const prevBc=bcastCard;
  bcastCard=function(){return prevBc.apply(this,arguments)+annCard()};
  const prevUi=ui;
  ui=function(t){
    const id=t.id,D=t.dataset||{};
    if(id==="anok"){anOk();return true}
    if(id==="anx"||id==="anx2"||id==="anlater"){anClose();return true}
    if(id==="anwake"){anWake();return true}
    if(id==="anstart"){anStart();return true}
    if(D.anopen!=null){anOpenOne(+D.anopen);return true}
    if(id==="anpub"){anPublish();return true}
    if(id==="anrf"){AC.msg="";anCoachLoad();return true}
    if(D.andel){anDelete(+D.andel);return true}
    if(D.anwho){AC.who[D.anwho]=!AC.who[D.anwho];render();return true}
    return prevUi.apply(this,arguments);
  };
  // Uygulama gün değişiminden sonra yeniden öne gelirse yeni günün duyurusu da aynı şekilde sorulur.
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&ROLE==="student"&&ME&&AN.ld&&AN.ld!==day()){authFresh().then(()=>anLoad()).then(()=>{if(AN.open)render()})}});
})();
