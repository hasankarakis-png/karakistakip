/* Karakış Takip · Öğrenci check-in, müdahale önerileri, kaynak ve görüşme araçları.
   Mevcut günlük kayıtlarını ve Supabase RLS akışını kullanır; hiçbir özel not AI'ya gönderilmez. */
(function(){
  "use strict";
  const escCE = v => typeof esc==="function" ? esc(String(v==null?"":v)) : String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const todayCE = () => typeof day==="function" ? day() : new Date().toISOString().slice(0,10);
  const stateCE = () => typeof S!=="undefined" && S ? S : null;
  const CEX = {resources:{},meetings:{},busy:{},message:"",room:{active:false,started:0,minutes:25}};
  const REASONS = ["Program çok yoğundu","Konuyu anlayamadım","Sorular zordu","Zamanımı yönetemedim","Dikkatim dağıldı","Enerjim/moralim düşüktü","Başlamayı erteledim","Başka bir durum"];
  const safeName = id => {const p=(typeof STU!=="undefined"?STU:[]).find(x=>String(x.id)===String(id));return p?p.name:"Öğrenci"};
  function checkinCard(){
    if(typeof ROLE==="undefined"||ROLE!=="student")return "";
    const s=stateCE(),v=s&&s.checkin&&s.checkin.day===todayCE()?s.checkin:{};
    const isDone=!!v.day;
    return '<details class="ce-panel ce-checkin" '+(!isDone?'open':'')+'><summary><span><b>Haftalık değerlendirme</b><small>Bir dakikada haftanı değerlendir; planın sana göre uyarlansın.</small></span><em>'+ (isDone?'Yanıtlandı ✓':'1 dk') +'</em></summary>'+
      '<div class="ce-form-grid"><label>Program sana ne kadar uygundu? <select id="ce-fit"><option value="">Seç</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(String(v.fit||"")===String(n)?'selected':'')+'>'+n+' / 5</option>').join('')+'</select></label>'+
      '<label>En çok ne zorladı? <select id="ce-reason"><option value="">Seç (isteğe bağlı)</option>'+REASONS.map(x=>'<option '+(v.reason===x?'selected':'')+'>'+escCE(x)+'</option>').join('')+'</select></label>'+
      '<label>Gelecek hafta gerçekçi günlük süre (dk) <input id="ce-minutes" type="number" min="0" max="720" step="15" value="'+(v.minutes==null?'':Number(v.minutes))+'" placeholder="Örn. 180"></label>'+
      '<label>Koçundan ne konuda destek istersin? <textarea id="ce-support" maxlength="250" rows="2" placeholder="İsteğe bağlı">'+escCE(v.support||'')+'</textarea></label></div>'+
      '<div class="ce-actions"><button class="ce-primary" data-ce-save-checkin="1">Değerlendirmeyi kaydet</button><span class="ce-help">Yanıtın koçunun planı sana göre uyarlamasına yardımcı olur.</span></div></details>';
  }
  function getRecentCheckin(id){
    const rows=(typeof ROWS!=="undefined"?ROWS:[]).filter(r=>String(r.student_id)===String(id)).sort((a,b)=>String(b.day).localeCompare(String(a.day)));
    for(const r of rows){const c=r.state&&r.state.checkin;if(c&&c.day)return c;}
    return null;
  }
  function recommendation(x){
    const reasons=[];
    if(x.late>=3)reasons.push("Görevleri önceliklendirip günlük yükü azaltmayı değerlendir.");
    else if(x.late>0)reasons.push("Geciken görevleri küçük parçalara böl.");
    if(x.flags.some(f=>/Süre son|çalışma kaydı yok|çalışma kaydı/i.test(f)))reasons.push("Öğrenciyle gerçekçi çalışma süresini netleştir.");
    if(x.flags.some(f=>/program tamamlanmadı/i.test(f)))reasons.push("Programın yoğunluğunu ve görevlerin zorluk düzeyini konuş.");
    if(x.checkin&&x.checkin.reason){
      const m={
        "Program çok yoğundu":"Önümüzdeki haftanın görev yükünü öğrenciyle birlikte azaltıp önceliklendir.",
        "Konuyu anlayamadım":"İlgili konuda temel anlatım ve kolay sorularla destek planla.",
        "Sorular zordu":"Kaynağın zorluk düzeyini kontrol et; basamaklı soru seti hazırla.",
        "Zamanımı yönetemedim":"Görevleri 25–45 dakikalık bloklara böl.",
        "Dikkatim dağıldı":"Kısa odak oturumları ve bildirimleri azaltma deneyi öner.",
        "Enerjim/moralim düşüktü":"Yargılamadan nasıl olduğunu sor; yükü birlikte gerçekçi ayarla.",
        "Başlamayı erteledim":"İlk görevi 10 dakikalık başlangıç adımına küçült."
      };
      if(m[x.checkin.reason])reasons.unshift(m[x.checkin.reason]);
    }
    if(x.checkin&&Number(x.checkin.fit)>0&&Number(x.checkin.fit)<=2)reasons.unshift("Öğrenci programın kendisine az uyduğunu bildirdi; nedenini görüş.");
    if(!reasons.length)reasons.push("Öğrenciyle haftalık hedefini ve işe yarayan çalışma yöntemini gözden geçir.");
    return [...new Set(reasons)].slice(0,3);
  }
  function interventionCard(){
    if(typeof ROLE==="undefined"||ROLE!=="coach"||typeof CPG==="undefined"||CPG!=="o"||(typeof sel!=="undefined"&&sel))return "";
    let students=[];try{students=(typeof roster==="function"?roster():[])}catch(e){}
    const tasks=typeof TKALL!=="undefined"&&Array.isArray(TKALL)?TKALL:[];
    const doneTasks=tasks.filter(t=>t.done).length;
    const completion=tasks.length?Math.round(doneTasks/tasks.length*100):null;
    const checked=students.filter(x=>getRecentCheckin(x.id)).length;
    const statsHtml='<div class="ce-overview-stats"><div><small>Öğrenci</small><b>'+students.length+'</b></div><div><small>Haftalık görev</small><b>'+(completion==null?"–":"%"+completion)+'</b></div><div><small>Check-in yanıtı</small><b>'+checked+' / '+students.length+'</b></div></div>';
    const items=students.map(x=>{
      let late=[];try{late=overdue(x.id)||[]}catch(e){}
      let flagsNow=[];try{flagsNow=flags(x.hist||[])||[]}catch(e){}
      const checkin=getRecentCheckin(x.id);
      const score=late.length*3+flagsNow.length*2+(checkin&&Number(checkin.fit)<=2?3:0)+(checkin&&checkin.reason?1:0);
      return {id:x.id,name:safeName(x.id),late:late.length,flags:flagsNow,checkin,score,recs:recommendation({late:late.length,flags:flagsNow,checkin})};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
    return '<section class="ce-panel ce-interventions"><div class="ce-heading"><div><p class="ce-eyebrow">KARAKIŞ · AKILLI MÜDAHALE</p><h2>Öğrenciye göre sonraki adım</h2><p>Uyarılar tanı değildir; koçun değerlendirmesi için karar desteğidir.</p></div><span class="ce-icon" aria-hidden="true">✦</span></div>'+statsHtml+
      (items.length?'<div class="ce-intervention-list">'+items.map(x=>'<article class="ce-intervention"><div class="ce-personline"><b>'+escCE(x.name)+'</b><span>'+x.late+' geciken görev · '+x.flags.length+' uyarı'+(x.checkin&&x.checkin.reason?' · check-in yanıtı var':'')+'</span></div><ul>'+x.recs.map(r=>'<li>'+escCE(r)+'</li>').join('')+'</ul>'+(x.checkin&&x.checkin.support?'<p class="ce-student-note"><b>Öğrencinin destek isteği:</b> '+escCE(x.checkin.support)+'</p>':'')+'<button class="ce-secondary" data-i="'+escCE(x.id)+'">Öğrenciyi aç <span aria-hidden="true">→</span></button></article>').join('')+'</div>':'<div class="ce-empty">Şu anda belirgin bir müdahale sinyali yok. Yeni kayıtlar geldikçe bu alan güncellenir.</div>')+
      '<p class="ce-help">Öneriler yalnızca görünen çalışma ve görev verilerine dayanır. Psikolojik tanı veya otomatik öğrenci puanlaması yapılmaz.</p></section>';
  }
  async function loadResources(id){
    const key=String(id);
    if(CEX.resources[key]!==undefined)return CEX.resources[key];
    CEX.resources[key]=null;
    try{const r=await sb.from("student_resources").select("*").eq("student_id",id).order("created_at",{ascending:false}).limit(100);if(r.error)throw r.error;CEX.resources[key]=r.data||[];}
    catch(e){CEX.resources[key]=[];CEX.resources[key].error=e&&e.message||"Kaynaklar yüklenemedi."}
    return CEX.resources[key];
  }
  function resourceCard(id,coach){
    const key=String(id),L=CEX.resources[key];
    if(L===undefined||L===null){loadResources(id).then(()=>render());return '<details class="ce-panel"><summary><span><b>Kaynak takibi</b><small>Kitap ve test ilerlemesi</small></span><em>Yükleniyor…</em></summary></details>'}
    const err=L.error||"";
    return '<details class="ce-panel ce-resources"><summary><span><b>Kaynak ve kitap takibi</b><small>'+(L.length||0)+' kayıt · tamamlanan test/sayfa miktarı</small></span><em>Detaylar</em></summary>'+
      (err?'<p class="ce-error">Kaynak tablosu henüz hazır değil veya yüklenemedi: '+escCE(err)+'</p>':'')+
      (L.length?'<div class="ce-resource-list">'+L.map(r=>'<article class="ce-resource"><div><b>'+escCE(r.title)+'</b><small>'+escCE(r.subject)+(r.publisher?' · '+escCE(r.publisher):'')+'</small></div><div class="ce-progress"><span>'+Number(r.completed_units||0)+' / '+Number(r.total_units||0)+' '+escCE(r.unit_label||'test')+'</span><div><i style="width:'+Math.max(0,Math.min(100,Number(r.total_units)?Number(r.completed_units||0)/Number(r.total_units)*100:0))+'%"></i></div></div>'+
        '<div class="ce-resource-actions"><button class="ce-secondary" data-ce-resource-step="'+escCE(r.id)+'" data-ce-resource-next="'+Math.min(Number(r.total_units||0),Number(r.completed_units||0)+1)+'">+1 ilerlet</button><button class="ce-secondary" data-ce-resource-del="'+escCE(r.id)+'">Sil</button></div></article>').join('')+'</div>':'<div class="ce-empty">Henüz kaynak eklenmedi. İlk kitabını ekleyerek ilerlemeni takip et.</div>')+
      '<form class="ce-resource-form" data-ce-resource-form="1"><label>Kitap/kaynak adı <input id="ce-res-title" maxlength="120" required placeholder="Örn. TYT Matematik soru bankası"></label><div class="ce-form-grid"><label>Ders <input id="ce-res-subject" maxlength="40" required placeholder="Matematik"></label><label>Yayınevi <input id="ce-res-publisher" maxlength="80" placeholder="İsteğe bağlı"></label><label>Toplam test/sayfa <input id="ce-res-total" type="number" min="1" max="10000" required value="100"></label><label>Birim <select id="ce-res-unit"><option>test</option><option>sayfa</option><option>soru</option><option>konu</option></select></label></div><button class="ce-primary" type="submit">Kaynağı ekle</button></form></details>';
  }
  async function saveResource(id){
    const get=k=>(document.getElementById(k)||{}).value||"";
    const title=get("ce-res-title").trim(),subject=get("ce-res-subject").trim(),publisher=get("ce-res-publisher").trim(),total=Number(get("ce-res-total")),unit=get("ce-res-unit");
    if(title.length<2||!subject||!Number.isInteger(total)||total<1||total>10000){alert("Kitap adı, ders ve toplam miktarı kontrol et.");return}
    const r=await sb.from("student_resources").insert({student_id:id,title:title.slice(0,120),subject:subject.slice(0,40),publisher:publisher.slice(0,80)||null,total_units:total,completed_units:0,unit_label:unit});
    if(r.error){alert("Kaynak kaydedilemedi: "+r.error.message);return}
    delete CEX.resources[String(id)];await loadResources(id);render();
  }
  async function updateResource(id,next){
    const key=String(id),L=CEX.resources[key]||[],r=L.find(x=>String(x.id)===String(id));if(!r)return;
    const completed=Math.max(0,Math.min(Number(r.total_units||0),Number(next)||0));
    const q=await sb.from("student_resources").update({completed_units:completed,updated_at:new Date().toISOString()}).eq("id",r.id).eq("student_id",typeof ROLE!=="undefined"&&ROLE==="student"?ME:sel);
    if(q.error){alert("İlerleme kaydedilemedi: "+q.error.message);return}
    delete CEX.resources[key];await loadResources(key);render();
  }
  async function deleteResource(id){
    const target=typeof ROLE!=="undefined"&&ROLE==="student"?ME:sel;if(!target||!confirm("Bu kaynak kaydı silinsin mi?"))return;
    const q=await sb.from("student_resources").delete().eq("id",id).eq("student_id",target);
    if(q.error){alert("Silinemedi: "+q.error.message);return}
    delete CEX.resources[String(target)];await loadResources(target);render();
  }
  function meetingCard(id){
    const key=String(id),L=CEX.meetings[key];
    if(L===undefined){CEX.meetings[key]=null;sb.from("meetings").select("id,student_id,met_on,who,summary,decisions,created_at").eq("student_id",id).order("met_on",{ascending:false}).limit(8).then(r=>{CEX.meetings[key]=r.error?[]:(r.data||[]);render()});return '<details class="ce-panel"><summary><span><b>Koç görüşme günlüğü</b><small>Görüşmeler ve takip kararları</small></span><em>Yükleniyor…</em></summary></details>'}
    return '<details class="ce-panel ce-meetings"><summary><span><b>Görüşme ve takip ajandası</b><small>'+L.length+' kayıt · kararları ve sonraki adımları izle</small></span><em>Görüşme ekle</em></summary>'+
      '<button type="button" class="ce-secondary" data-ce-prep="1">AI ile görüşmeye hazırlan</button><form class="ce-meeting-form" data-ce-meeting-form="1"><div class="ce-form-grid"><label>Tarih <input id="ce-meet-date" type="date" value="'+todayCE()+'" required></label><label>Katılım <select id="ce-meet-who"><option>öğrenci</option><option>veli</option><option>öğrenci+veli</option></select></label></div><label>Görüşme özeti <textarea id="ce-meet-summary" maxlength="2000" rows="3" required placeholder="Bu görüşmede neler konuşuldu?"></textarea></label><label>Kararlar / sonraki adım <textarea id="ce-meet-decisions" maxlength="1000" rows="2" placeholder="Örn. cuma günü deneme analizi yapılacak."></textarea></label><button class="ce-primary" type="submit">Görüşmeyi kaydet</button></form>'+
      (L.length?'<div class="ce-meeting-list">'+L.map(m=>'<article><div class="ce-meeting-meta"><b>'+escCE(m.met_on)+'</b><span>'+escCE(m.who)+'</span></div><p>'+escCE(m.summary)+'</p>'+(m.decisions?'<small><b>Sonraki adım:</b> '+escCE(m.decisions)+'</small>':'')+'</article>').join('')+'</div>':'<div class="ce-empty">Henüz görüşme kaydı yok.</div>')+'</details>';
  }
  async function saveMeeting(id){
    const get=k=>(document.getElementById(k)||{}).value||"";
    const date=get("ce-meet-date"),who=get("ce-meet-who"),summary=get("ce-meet-summary").trim(),decisions=get("ce-meet-decisions").trim();
    if(!date||summary.length<3){alert("Görüşme tarihi ve özetini doldur.");return}
    const r=await sb.from("meetings").insert({student_id:id,met_on:date,who,summary:summary.slice(0,2000),decisions:decisions.slice(0,1000)||null});
    if(r.error){alert("Görüşme kaydedilemedi: "+r.error.message);return}
    delete CEX.meetings[String(id)];render();
  }
  function focusCard(){
    if(typeof ROLE==="undefined"||ROLE!=="student")return "";
    const key="karakis-focus-v1-"+ME;let saved=null;try{saved=JSON.parse(localStorage.getItem(key)||"null")}catch(e){}
    const active=saved&&saved.end>Date.now();
    const mins=active?Math.max(0,Math.ceil((saved.end-Date.now())/60000)):CEX.room.minutes;
    return '<details class="ce-panel ce-focus"><summary><span><b>Odak oturumu</b><small>Kısa ve sürdürülebilir çalışma blokları</small></span><em>'+(active?'Devam ediyor':'Başlat')+'</em></summary>'+
      '<p class="ce-help">Bildirimleri sessize al, tek bir hedef seç ve süre bitince kısa mola ver. Bu kişisel odak oturumudur; diğer öğrencilerle ortak oda değildir.</p><div class="ce-focus-controls"><label>Süre <select id="ce-focus-min">'+[25,45,60].map(n=>'<option value="'+n+'" '+(Number(CEX.room.minutes)===n?'selected':'')+'>'+n+' dakika</option>').join('')+'</select></label><button class="ce-primary" data-ce-focus-start="1">'+(active?'Oturumu yeniden başlat':'Odaklanmaya başla')+'</button>'+(active?'<button class="ce-secondary" data-ce-focus-stop="1">Bitir</button>':'')+'</div>'+
      (active?'<div class="ce-focus-timer" data-ce-focus-end="'+saved.end+'">'+mins+':00</div>':'')+'</details>';
  }
  function addCheckin(){
    const s=stateCE();if(!s)return;
    const fit=Number((document.getElementById("ce-fit")||{}).value||0),reason=(document.getElementById("ce-reason")||{}).value||"",minutes=Number((document.getElementById("ce-minutes")||{}).value||0),support=((document.getElementById("ce-support")||{}).value||"").trim();
    if(fit<1||fit>5){alert("Program uygunluğu için 1–5 arasında bir puan seç.");return}
    if(minutes<0||minutes>720){alert("Günlük süre 0–720 dakika arasında olmalı.");return}
    s.checkin={day:todayCE(),fit,reason,minutes,support:support.slice(0,250),createdAt:new Date().toISOString()};
    save();render();
  }
  function ceUi(t){
    const d=t&&t.dataset||{};
    if(d.ceSaveCheckin!==undefined){addCheckin();return true}
    if(d.cePrep!==undefined){if(typeof rptRun==="function"&&sel)rptRun(sel);else alert("AI görüşme özeti şu anda kullanılamıyor.");return true}
    if(d.ceResourceStep){updateResource(d.ceResourceStep,d.ceResourceNext);return true}
    if(d.ceResourceDel){deleteResource(d.ceResourceDel);return true}
    if(d.ceFocusStart!==undefined){
      const n=Number((document.getElementById("ce-focus-min")||{}).value||25),mins=[25,45,60].includes(n)?n:25,key="karakis-focus-v1-"+ME;
      CEX.room.minutes=mins;try{localStorage.setItem(key,JSON.stringify({start:Date.now(),end:Date.now()+mins*60000,minutes:mins}))}catch(e){}
      render();return true;
    }
    if(d.ceFocusStop!==undefined){try{localStorage.removeItem("karakis-focus-v1-"+ME)}catch(e){}render();return true}
    return false;
  }
  const baseUi=ui;
  ui=function(t){
    if(ceUi(t))return true;
    if(t&&t.closest&&t.closest("form[data-ce-resource-form]"))return true;
    if(t&&t.closest&&t.closest("form[data-ce-meeting-form]"))return true;
    return baseUi.apply(this,arguments);
  };
  document.addEventListener("submit",function(e){
    const f=e.target;if(!f||!f.matches)return;
    if(f.matches("form[data-ce-resource-form]")){e.preventDefault();saveResource(typeof ROLE!=="undefined"&&ROLE==="student"?ME:sel);return}
    if(f.matches("form[data-ce-meeting-form]")){e.preventDefault();saveMeeting(sel);return}
  });
  const baseTodayTab=todayTab;
  todayTab=function(){const h=baseTodayTab.apply(this,arguments);return h+checkinCard()+resourceCard(ME,false)+focusCard()};
  const baseCoachView=coachView;
  coachView=function(){
    let h=baseCoachView.apply(this,arguments);
    try{
      if(typeof ROLE!=="undefined"&&ROLE==="coach"&&typeof CPG!=="undefined"&&CPG==="o"&&!(typeof sel!=="undefined"&&sel))h=h.replace(/<\/section>(?![\s\S]*<\/section>)/,interventionCard()+"</section>");
      if(typeof ROLE!=="undefined"&&ROLE==="coach"&&typeof sel!=="undefined"&&sel)h+=meetingCard(sel)+resourceCard(sel,true);
    }catch(e){}
    return h;
  };
  setInterval(function(){
    const el=document.querySelector(".ce-focus-timer");if(!el)return;
    const end=Number(el.dataset.ceFocusEnd),left=Math.max(0,Math.ceil((end-Date.now())/1000));
    el.textContent=Math.floor(left/60)+":"+String(left%60).padStart(2,"0");
    if(left===0){el.textContent="Süre tamamlandı";try{localStorage.removeItem("karakis-focus-v1-"+ME)}catch(e){}}
  },1000);
})();