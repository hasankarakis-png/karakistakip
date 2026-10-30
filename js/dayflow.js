/* ===== Öğrencinin günlük akışı =====
   1) Kurulum sihirbazı: ana ekrana ekleme + bildirim izni (bildirimler 18 öğrenciden yalnızca 7'sine gidiyordu).
   2) Gün sonu kapanış ekranı: "Günü kapat"a basınca ders bazında soru, gün puanı ve "yarın ilk iş" tek ekranda.
      Çalışılan günlerin %39'unda soru sayısı girilmiyordu; çalıştıysa ya soru girer ya "Bugün soru çözmedim" der.
   3) Uzun açık sayaç: 3 saati geçince "ne zaman bıraktın?" ile süre düzeltilir (unutulan sayaç günleri şişiriyordu). */
let ONB={open:false,auto:false},BIP=null,DC=null,DCGO=false,LFMSG="";
const ONB_KEY=()=>"karakis-onb-v1-"+ME,NEXT_KEY=()=>"karakis-next-"+ME;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();BIP=e;if(ONB.open)render()});
const isStandalone=()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){return false}};
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

/* ---- 1) kurulum sihirbazı ---- */
function setupCard(){
  if(ROLE!=="student"||PUSHON===true||PUSHON===null)return "";
  const n=(isStandalone()?1:0)+(PUSHON===true?1:0);
  return `<button class="card setup-c" id="onbopen" aria-label="Kurulumu tamamla"><span class="setup-n">${n}/2</span><span><h2>Kurulumu tamamla</h2><p>Koçunun mesajları ve hatırlatmalar telefonuna gelsin. 1 dakika sürer.</p></span><i aria-hidden="true">›</i></button>`;
}
function onbSheet(){
  const inst=isStandalone(),push=PUSHON===true,ios=isIOS();
  const s1=inst?`<p class="onb-ok">✓ Uygulama ana ekranda</p>`
    :ios?`<ol class="onb-ol"><li>Safari'de alttaki <b>Paylaş</b> düğmesine (kare ve yukarı ok) dokun.</li><li><b>Ana Ekrana Ekle</b>'yi seç, sonra <b>Ekle</b>.</li><li>Uygulamayı ana ekrandaki <b>Karakış</b> simgesinden aç ve buraya dön.</li></ol><p class="empty" style="font-size:13px;margin:6px 0 0">iPhone'da bildirimler yalnızca ana ekrandan açılan uygulamada çalışır.</p>`
    :BIP?`<button class="btn" style="padding:11px 16px" id="onbinst">📲 Ana ekrana ekle</button>`
    :`<p class="empty" style="margin:0;font-size:14px">Chrome'da sağ üstteki <b>⋮</b> menüsünden <b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>'yi seç. Bilgisayardaysan bu adımı atlayabilirsin.</p>`;
  const s2=push?`<p class="onb-ok">✓ Bildirimler açık</p>`
    :PUSHON==="no"?`<p class="empty" style="margin:0;font-size:14px">Bu cihazda bildirim için önce 1. adımı tamamla, sonra uygulamayı ana ekrandan açıp bu ekrana dön.</p>`
    :`<button class="btn" style="padding:11px 16px" id="onbpush">🔔 Bildirimleri aç</button><p class="empty" style="font-size:13px;margin:6px 0 0">Telefon izin sorunca <b>İzin ver</b>'e dokun.</p>`;
  return `<button class="qa-bg" id="onbx" aria-label="Kapat"></button><div class="qa onb" role="dialog" aria-modal="true" aria-label="Kurulum"><div class="grab"></div><h2>Kurulum</h2><p class="empty" style="margin:0 0 4px;font-size:15px">Koçunun mesajları, görev ve mola hatırlatmaları telefonuna bildirim olarak gelsin.</p>
  <div class="onb-step${inst?" done":""}"><b>1 · Uygulamayı ana ekrana ekle</b>${s1}</div>
  <div class="onb-step${push?" done":""}"><b>2 · Bildirimleri aç</b>${s2}</div>
  ${PUSHMSG&&!push?`<p class="empty" style="margin:8px 0 0;font-size:14px">${esc(PUSHMSG)}</p>`:""}
  <div class="row" style="justify-content:flex-end"><button class="${push?"btn":"chip"}" id="onbdone" style="${push?"padding:11px 18px":""}">${push?"Bitti ✓":"Daha sonra"}</button></div></div>`;
}
function onbClose(){ONB.open=false;lsSet(ONB_KEY(),{t:Date.now(),done:PUSHON===true});render()}

/* ---- 2) gün sonu kapanış ekranı ---- */
const dcSubjects=()=>{const st=S.subt||{},L=Object.keys(st).filter(k=>st[k]>=60000).sort((a,b)=>st[b]-st[a]);if(S.cur&&S.cur.subj&&!L.includes(S.cur.subj))L.unshift(S.cur.subj);return L};
const qsBy=()=>{const o={};S.qs.forEach(q=>{o[q.s]=(o[q.s]||0)+num(q.n)});return o};
function dcOpen(){DC={v:{},err:""};render();navOv()}
function dcSheet(){
  const L=dcSubjects(),by=qsBy(),st=S.subt||{},v=k=>esc(DC.v[k]==null?"":DC.v[k]),tot=Math.round(total()/60000),sol=solved();
  const others=SUBJ.filter(x=>!L.includes(x));
  const row=(s,i)=>`<div class="dc-r"><span><b>${esc(s)}</b><small>${(ms=>ms>=60000?short(ms)+" çalıştın":"bugün")((st[s]||0)+(S.cur&&S.cur.subj===s?curNet():0))}${by[s]?" · "+by[s]+" soru girdin":""}</small></span><label>Çözülen<input id="dcn${i}" type="number" min="0" inputmode="numeric" value="${v("dcn"+i)}"></label><label>Doğru<input id="dcc${i}" type="number" min="0" inputmode="numeric" value="${v("dcc"+i)}"></label></div>`;
  return `<button class="qa-bg" id="dcx" aria-label="Kapat"></button><div class="qa dc" role="dialog" aria-modal="true" aria-label="Günü kapat"><div class="grab"></div><h2>Günü kapat</h2>
  <p class="empty" style="margin:0 0 6px;font-size:15px">Bugün <b>${Math.floor(tot/60)} sa ${tot%60} dk</b> çalıştın${sol?`, <b>${sol}</b> soru girdin`:""}. ${L.length?"Çalıştığın derslerin soru sayısını ekle:":"Çözdüğün soruları ekle:"}</p>
  ${L.map(row).join("")}
  <div class="dc-r"><span><select id="dcxs" aria-label="Başka ders">${["<option value=\"\">+ Başka ders</option>"].concat(others.map(x=>`<option${DC.v.dcxs===x?" selected":""}>${esc(x)}</option>`)).join("")}</select></span><label>Çözülen<input id="dcxn" type="number" min="0" inputmode="numeric" value="${v("dcxn")}"></label><label>Doğru<input id="dcxc" type="number" min="0" inputmode="numeric" value="${v("dcxc")}"></label></div>
  ${sol?"":`<label class="ckl"><input type="checkbox" id="dcnq"${DC.v.dcnq?" checked":""}><span>Bugün soru çözmedim (konu çalıştım, tekrar yaptım…)</span></label>`}
  <h3 class="dc-h">Bugün nasıldı?</h3><div class="mood">${[1,2,3,4,5].map(i=>`<button class="chip" data-dcm="${i}" aria-pressed="${num(DC.v.m||S.mood)===i}">${i}</button>`).join("")}</div>
  <h3 class="dc-h">Yarın ilk iş</h3><input id="dcnext" type="text" maxlength="80" autocomplete="off" placeholder="ör. 30 paragraf, sonra türev tekrarı" value="${v("dcnext")}" style="width:100%">
  ${DC.err?`<p class="qerr" role="alert">${esc(DC.err)}</p>`:""}
  <div class="row" style="justify-content:flex-end"><button class="chip" id="dcno">Vazgeç</button><button class="btn" style="padding:11px 18px" id="dcok">🌙 Günü kapat</button></div></div>`;
}
function dcApply(){
  const L=dcSubjects(),g=k=>{const x=String(DC.v[k]==null?"":DC.v[k]).trim();return x===""?null:Math.floor(+x)},E=[];
  const take=(s,nk,ck)=>{const n=g(nk),c=g(ck);if(n==null&&c==null)return true;if(!(n>0)){DC.err=s+": çözülen soru sayısını yaz.";return false}if(n>400){DC.err=s+": tek seferde en fazla 400 soru girilebilir.";return false}if(c!=null&&(c<0||c>n)){DC.err=s+": doğru sayısı çözülenden fazla olamaz.";return false}E.push({s,n,c:c||0});return true};
  for(let i=0;i<L.length;i++)if(!take(L[i],"dcn"+i,"dcc"+i)){render();return}
  if(g("dcxn")!=null||g("dcxc")!=null){if(!DC.v.dcxs){DC.err="Eklediğin soruların dersini seç.";render();return}if(!take(DC.v.dcxs,"dcxn","dcxc")){render();return}}
  const noq=!!DC.v.dcnq&&!E.length&&!solved();
  if(total()>=30*60000&&!solved()&&!E.length&&!noq){DC.err="Soru sayılarını gir ya da “Bugün soru çözmedim”i işaretle.";render();return}
  if(E.length){E.forEach(e=>S.qs.push({s:e.s,n:e.n,c:e.c,b:0,k:""}));log("Gün sonu: "+E.reduce((a,e)=>a+e.n,0)+" soru girdim ("+E.map(e=>e.s+" "+e.n).join(", ")+")")}
  S.noq=noq;if(noq)log("Bugün soru çözmedim");
  const m=num(DC.v.m);if(m>=1&&m<=5&&m!==S.mood){S.mood=m;log("Gün puanım: "+m+"/5")}
  const nx=String(DC.v.dcnext||"").trim().slice(0,80);if(nx){S.next=nx;log("Yarın ilk iş: "+nx);lsSet(NEXT_KEY(),{d:day(),t:nx})}
  DC=null;DCGO=true;try{act("close")}finally{DCGO=false}
}
// Dün kendine bıraktığın not, ertesi gün ana sayfada.
function nextNoteCard(){
  if(ROLE!=="student"||S.status==="closed")return "";
  const n=lsGet(NEXT_KEY());if(!n||!n.t||n.x||n.d>=day()||n.d<dayN(-2))return "";
  return `<div class="card nn"><span aria-hidden="true">📝</span><div><small>Dün kendine not bıraktın</small><b>${esc(n.t)}</b></div><button class="chip" id="nnx" aria-label="Notu kapat">Tamam</button></div>`;
}

/* ---- 3) uzun açık sayaç ---- */
const LONG_MS=3*3600e3;
function longCard(){
  if(!(S.status==="study"||S.status==="break")||!S.cur||curNet()<LONG_MS)return "";
  return `<div class="card long-c"><h2>⏰ Sayaç uzun süredir açık · ${short(curNet())}</h2><p class="empty" style="margin:0 0 8px">Hâlâ çalışıyorsan devam et. Çalışmayı bıraktıysan ne zaman bıraktığını seç, süren ona göre düzeltilsin.</p>
  <div class="row" style="margin-top:0"><label>Bıraktığım saat<input id="lfix" type="time" value=""></label><button class="btn" style="padding:11px 16px" id="lfixok">Bu saatte bitir</button></div>${LFMSG?`<p class="qerr" role="alert">${esc(LFMSG)}</p>`:""}</div>`;
}
function fixStop(){
  const c=S.cur,v=(document.getElementById("lfix")||{}).value||"";
  const err=m=>{LFMSG=m;render()};
  if(!c)return;if(!/^\d{2}:\d{2}$/.test(v))return err("Çalışmayı bıraktığın saati seç.");
  const [h,mi]=v.split(":").map(Number),d=new Date();d.setHours(h,mi,0,0);const end=d.getTime();
  if(end>Date.now())return err("İleri bir saat seçilemez.");
  if(end<=c.start)return err("Derse başladığın saatten ("+hm(c.start)+") önce olamaz.");
  let net=S.status==="break"&&end>=c.bs?c.bs-c.start-c.brk:end-c.start-c.brk;net=Math.max(0,net);
  const cut=Math.max(0,curNet()-net),u=undoMark("stop");
  S.done+=net;S.meth[c.meth]=(S.meth[c.meth]||0)+net;subtAdd(S,c.subj,net);S.cur=null;S.status="stopped";
  log("⏱ Süre düzeltildi: "+hm(end)+" itibarıyla bitirdim ("+short(net)+", "+c.subj+"; "+short(cut)+" düşüldü)");
  LFMSG="";S.undo=u;undoToast();save();render();
}

/* ---- bağlantılar ---- */
(function(){
  const prevAct=act;
  act=function(a){if(a==="close"&&ROLE==="student"&&!DCGO&&S.status!=="closed"&&S.status!=="idle"){dcOpen();return}return prevAct.apply(this,arguments)};
  const prevView=studentView;
  studentView=function(){
    // İlk açılışta (ve ertelenmişse 3 gün sonra) bildirimi kapalı öğrenciye sihirbaz bir kez kendiliğinden açılır.
    if(tab==="b"&&!ONB.auto&&!DC&&!QA&&PUSHON!==null&&PUSHON!==true){const s=lsGet(ONB_KEY());ONB.auto=true;if(!s||Date.now()-num(s.t)>3*864e5){ONB.open=true;setTimeout(navOv,0)}}
    let h=prevView.apply(this,arguments);
    if(DC)h+=dcSheet();else if(ONB.open)h+=onbSheet();
    return h;
  };
  const prevUi=ui;
  ui=function(t){
    const id=t.id,D=t.dataset||{};
    if(id==="onbopen"){ONB.open=true;render();navOv();return true}
    if(id==="onbx"||id==="onbdone"){onbClose();return true}
    if(id==="onbpush"){pushEnable().then(()=>{if(PUSHON===true)lsSet(ONB_KEY(),{t:Date.now(),done:true})});return true}
    if(id==="onbinst"&&BIP){const p=BIP;BIP=null;p.prompt();Promise.resolve(p.userChoice).then(()=>render(),()=>render());return true}
    if(id==="dcx"||id==="dcno"){DC=null;render();return true}
    if(id==="dcok"){if(DC)dcApply();return true}
    if(D.dcm&&DC){DC.v.m=+D.dcm;render();return true}
    if(id==="nnx"){const n=lsGet(NEXT_KEY());if(n){n.x=1;lsSet(NEXT_KEY(),n)}render();return true}
    if(id==="lfixok"){fixStop();return true}
    return prevUi.apply(this,arguments);
  };
  document.addEventListener("input",e=>{const id=e.target.id;if(DC&&/^dc/.test(id)&&id!=="dcnq"){DC.v[id]=e.target.value;DC.err=""}});
  document.addEventListener("change",e=>{const id=e.target.id;if(!DC||!/^dc/.test(id))return;DC.v[id]=id==="dcnq"?e.target.checked:e.target.value;DC.err=""});
})();
