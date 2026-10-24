/* Yarışma (challenge): koç oluşturur ve duyurur, herkes sıralamayı görür */
let CH={st:"idle",list:[],sel:null,board:null,busy:false,msg:""};
const chDays=(a,b)=>{const p=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d).getTime()};return Math.round((p(b)-p(a))/864e5)};
const chActive=c=>c&&c.start_day<=day()&&c.end_day>=day();
const chVal=(c,v)=>c.metric==="minutes"?hmin(Math.round(v)):Math.round(v)+" soru";
async function chBoardLoad(){
  const c=CH.list.find(x=>x.id===CH.sel);if(!c){CH.board=null;return}
  try{const r=await sb.rpc("challenge_board",{p_id:c.id});CH.board=r&&!r.error&&Array.isArray(r.data)?{id:c.id,rows:r.data}:{id:c.id,rows:[]}}catch(e){CH.board={id:c.id,rows:[]}}
}
async function chLoad(force){
  if(CH.busy||(CH.st!=="idle"&&!force))return;CH.busy=true;CH.st="load";
  try{
    const r=await sb.from("challenges").select("id,title,metric,start_day,end_day,notified_at,chat_open").order("id",{ascending:false}).limit(8);
    CH.list=r&&Array.isArray(r.data)?r.data:[];
    if(!CH.list.find(x=>x.id===CH.sel)){const a=CH.list.find(chActive);CH.sel=(a||CH.list[0]||{}).id||null}
    await chBoardLoad();
  }catch(e){}
  CH.st="ok";CH.busy=false;if(tab==="y"||ROLE==="coach"||tab==="b")render();
}
/* Yarışma sohbeti: yalnızca sunucu fonksiyonlarıyla çalışır; kısaltılmış isimler, link/telefon engeli, koç görür ve gizleyebilir */
let CHT={id:null,msgs:[],err:"",busy:false,sig:""};
const chErr=m=>/cok_hizli/.test(m)?"Biraz yavaş, birkaç saniye bekle.":/yasak_icerik/.test(m)?"Link, telefon numarası ve sosyal medya adı paylaşılamaz.":/sohbet_kapali/.test(m)?"Sohbet koç tarafından kapatıldı.":/gunluk_sinir/.test(m)?"Bugünlük mesaj sınırına ulaştın.":/mesaj_uzunlugu/.test(m)?"Mesaj 1-300 karakter olmalı.":"Mesaj gönderilemedi, tekrar dene.";
function chMsgsHTML(){
  if(!CHT.msgs.length)return `<p class="empty" style="margin:0">Henüz mesaj yok. İlk mesajı sen yaz!</p>`;
  const coach=ROLE==="coach";
  return CHT.msgs.map(m=>`<div style="display:flex;flex-direction:column;align-items:${m.me?"flex-end":"flex-start"};margin-bottom:8px"><small style="color:var(--mute);margin:0 6px 2px">${esc(m.label)}${m.coach?" 🎓":""} · ${hm(Date.parse(m.created_at))}${coach&&!m.me?` <button class="chip" style="min-height:24px;padding:0 8px;font-size:11px" data-chhide="${m.id}">gizle</button>`:""}</small><div class="cm ${m.me?"me":"ai"}">${esc(m.body)}</div></div>`).join("");
}
async function chatLoad(id){
  if(!id)return;
  try{
    const r=await sb.rpc("challenge_chat",{p_id:id});
    if(!r||r.error||!Array.isArray(r.data))return;
    const sig=id+":"+r.data.map(m=>m.id).join(",");
    CHT.id=id;CHT.msgs=r.data;
    if(sig===CHT.sig)return;CHT.sig=sig;
    const el=document.getElementById("chm");
    if(el){const atEnd=el.scrollHeight-el.scrollTop-el.clientHeight<60;el.innerHTML=chMsgsHTML();if(atEnd||true)el.scrollTop=el.scrollHeight}
  }catch(e){}
}
function chatBox(c){
  if(CHT.id!==c.id){CHT={id:c.id,msgs:[],err:"",busy:false,sig:""};chatLoad(c.id)}
  if(c.chat_open===false&&ROLE!=="coach")return `<div class="card"><h2>💬 Sohbet</h2><p class="empty" style="margin:0">Sohbet koç tarafından kapatıldı.</p></div>`;
  return `<div class="card"><h2>💬 Sohbet${c.chat_open===false?` <span class="bd r">kapalı</span>`:""}</h2>
  <div class="chat" id="chm" style="max-height:300px;min-height:80px;overflow:auto;margin-bottom:10px">${chMsgsHTML()}</div>
  ${CHT.err?`<p style="color:var(--warn);margin:0 0 8px;font-size:14px" id="cherr">${esc(CHT.err)}</p>`:`<p id="cherr" style="margin:0"></p>`}
  <div class="row" style="margin-top:0"><input id="chin" type="text" maxlength="300" placeholder="Arkadaşlarına yaz…" autocomplete="off" style="flex:1;min-width:0"><button class="btn" style="padding:11px 16px" id="chsend">Gönder</button></div>
  <p class="sub2" style="margin:8px 2px 0;font-size:12px">Birbirinize saygılı olun. Link, telefon numarası ve sosyal medya adı paylaşılamaz. Koç mesajları görür.</p></div>`;
}
async function chatSend(){
  const inp=document.getElementById("chin"),t=inp&&inp.value.trim();if(!t||CHT.busy||!CHT.id)return;
  CHT.busy=true;const bt=document.getElementById("chsend");if(bt)bt.disabled=true;
  const r=await sb.rpc("challenge_post",{p_id:CHT.id,p_body:t});
  CHT.busy=false;if(bt)bt.disabled=false;
  const er=document.getElementById("cherr");
  if(r&&r.error){CHT.err=chErr(r.error.message||"");if(er){er.style.cssText="color:var(--warn);margin:0 0 8px;font-size:14px";er.textContent=CHT.err}return}
  CHT.err="";if(er)er.textContent="";inp.value="";CHT.sig="";await chatLoad(CHT.id);
}
setInterval(()=>{if(document.hidden)return;const el=document.getElementById("chm");if(el&&CHT.id)chatLoad(CHT.id)},7000);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target&&e.target.id==="chin"){e.preventDefault();chatSend()}});
function chBoardHTML(c){
  const B=CH.board&&CH.board.id===c.id?CH.board.rows:null;
  if(!B)return `<p class="empty">Yükleniyor…</p>`;
  if(!B.length)return `<p class="empty">Henüz sıralama yok.</p>`;
  const tot=+B[0].total||0;
  return B.map((r,i)=>{const t=+r.total||0,w=tot?Math.max(3,Math.round(t*100/tot)):0,md=["🥇","🥈","🥉"][i]||`<b>${i+1}</b>`;
    return `<div class="chr${r.me?" me":""}"><span class="chk">${md}</span><span class="chn">${esc(r.label)}${r.live?` <i class="chl" title="Şu an çalışıyor"></i>`:""}${r.me?" · sen":""}<span class="ktpr"><i style="width:${w}%"></i></span></span><span class="chv">${chVal(c,t)}${+r.today>0?`<small>bugün +${chVal(c,+r.today)}</small>`:""}</span></div>`}).join("");
}
function chInfo(c){
  const left=chDays(day(),c.end_day),st=day()<c.start_day?`${chDays(day(),c.start_day)} gün sonra başlıyor`:left>=0?(left===0?"son gün":left+" gün kaldı"):"bitti";
  return `${c.metric==="minutes"?"En çok çalışma süresi":"En çok çözülen soru"} · ${fd(c.start_day)} – ${fd(c.end_day)} · ${st}`;
}
function chHomeCard(){
  chLoad();const c=CH.list.find(chActive);if(!c)return "";
  const B=CH.board&&CH.board.id===c.id?CH.board.rows:null,i=B?B.findIndex(r=>r.me):-1;
  return `<button class="card tr" data-tab="y" aria-label="Yarışmayı aç"><span class="rg" style="--p:0"><span style="font-size:30px">🏆</span></span><span><h2>${esc(c.title)}</h2><p style="font-size:15px">${i>=0?`${i+1}. sıradasın · `:""}${chDays(day(),c.end_day)===0?"son gün":chDays(day(),c.end_day)+" gün kaldı"}</p></span></button>`;
}
function yarisTab(){
  chLoad();
  const chips=CH.list.map(c=>`<button class="chip" data-chsel="${c.id}" aria-pressed="${c.id===CH.sel}">${esc(c.title.length>18?c.title.slice(0,17)+"…":c.title)}</button>`).join("");
  const c=CH.list.find(x=>x.id===CH.sel);
  return `<h1 class="pg">Yarışma</h1>${CH.st!=="ok"?`<p class="empty">Yükleniyor…</p>`:!c?`<div class="card"><p class="empty" style="margin:0">Şu an bir yarışma yok. Koçun yarışma başlatınca burada ve bildirimde göreceksin.</p></div>`:`${CH.list.length>1?`<div class="chips" style="margin-bottom:10px">${chips}</div>`:""}<div class="card"><h2>${esc(c.title)}</h2><p class="sub2" style="margin:2px 0 12px">${chInfo(c)}</p>${chBoardHTML(c)}<button class="chip" id="chrf" style="margin-top:12px">↻ Yenile</button></div><p class="sub2" style="margin:10px 4px">Sıralamada isimler kısaltılmış görünür. Yeşil nokta şu an çalışıyor demek.</p>${chatBox(c)}`}`;
}
function chCoachCard(){
  chLoad();
  const rows=CH.list.map(c=>`<div class="chr${c.id===CH.sel?" me":""}" data-chsel="${c.id}" style="cursor:pointer"><span class="chn"><b>${esc(c.title)}</b><small style="display:block;color:var(--mute)">${chInfo(c)}</small></span><span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${c.notified_at?`<span class="bd g">duyuruldu</span>`:`<button class="chip" data-chnot="${c.id}">📣 Duyur</button>`}<button class="chip" data-chdel="${c.id}">Sil</button></span></div>`).join("");
  const sel=CH.list.find(x=>x.id===CH.sel);
  return `<details class="card"${CH.msg||CH.list.length?" open":""}><summary style="cursor:pointer;font-weight:700">🏆 Yarışmalar</summary>
  <div class="row"><label>Başlık<input id="cht" type="text" maxlength="80" placeholder="Hafta şampiyonu" style="width:170px"></label><label>Ölçüt<select id="chm"><option value="minutes">Çalışma süresi</option><option value="questions">Çözülen soru</option></select></label><label>Başlangıç<input id="chs" type="date" value="${day()}" style="width:150px"></label><label>Bitiş<input id="che" type="date" value="${dayN(6)}" style="width:150px"></label><button class="btn" style="padding:11px 16px" id="chmk">Oluştur ve duyur</button></div>
  <p class="empty" style="font-size:13px;margin:6px 0 0">${CH.msg?esc(CH.msg):"Oluşturunca tüm öğrencilere bildirim gider. En fazla 60 gün."}</p>
  ${rows?`<div style="margin-top:10px">${rows}</div>`:""}${sel?`<h3 style="margin:14px 0 6px">${esc(sel.title)} · sıralama</h3>${chBoardHTML(sel)}<div class="row"><button class="chip" data-chtog="${sel.id}">${sel.chat_open===false?"💬 Sohbeti aç":"🔒 Sohbeti kapat"}</button></div>${chatBox(sel)}`:""}</details>`;
}
async function chCreate(){
  const g=i=>document.getElementById(i).value,title=g("cht").trim().slice(0,80),m=g("chm"),a=g("chs"),b=g("che");
  if(title.length<3){CH.msg="Başlık en az 3 harf olmalı.";render();return}
  if(!a||!b||b<a||chDays(a,b)>60){CH.msg="Tarihleri kontrol et (bitiş başlangıçtan önce olamaz, en fazla 60 gün).";render();return}
  if(!confirm("“"+title+"” yarışması oluşturulsun ve tüm öğrencilere bildirim gitsin mi?"))return;
  CH.msg="Oluşturuluyor…";render();
  const r=await sb.from("challenges").insert({title,metric:m,start_day:a,end_day:b,created_by:ME}).select("id");
  if(r&&r.error||!(r&&r.data&&r.data[0])){CH.msg="Oluşturulamadı: "+((r&&r.error&&r.error.message)||"hata");render();return}
  const id=r.data[0].id;CH.sel=id;
  const n=await callFn("challenge-notify",{id});
  CH.msg=n.error?"Yarışma oluşturuldu ama bildirim gitmedi: "+n.error+" (listeden “Duyur” ile tekrar dene)":"Yarışma oluşturuldu. "+n.sent+" öğrenciye bildirim gönderildi.";
  await chLoad(true);
}
async function chAct(D){
  if(D.chsel){CH.sel=+D.chsel;CH.board=null;render();await chBoardLoad();render();return}
  if(D.chnot){const n=await callFn("challenge-notify",{id:+D.chnot});CH.msg=n.error?n.error:"Bildirim gönderildi: "+n.sent+" öğrenci.";await chLoad(true);return}
  if(D.chhide){await sb.rpc("challenge_msg_hide",{p_msg:+D.chhide});CHT.sig="";await chatLoad(CHT.id);return}
  if(D.chtog){const c=CH.list.find(x=>x.id===+D.chtog);if(!c)return;await dbw(sb.from("challenges").update({chat_open:c.chat_open===false}).eq("id",c.id));CH.msg=c.chat_open===false?"Sohbet açıldı.":"Sohbet kapatıldı.";await chLoad(true);return}
  if(D.chdel){if(!confirm("Bu yarışma silinsin mi?"))return;await dbw(sb.from("challenges").delete().eq("id",+D.chdel));CH.msg="Yarışma silindi.";await chLoad(true)}
}
function studentView(){
  const first=esc((NAME||"").trim().split(/\s+/)[0]||"Öğrenci"),st=streakInfo();
  const body=tab==="g"?tasksTab():tab==="d"?analizTab():tab==="h"?`<h1 class="pg">Profilim</h1>${profileCard()}${goalRoad(ME)}${targetForm(ME,true)}${badgeCard()}${pushCard()}${accountCard()}`:tab==="k"?chatTab():tab==="t"?tercihTab():tab==="c"?konuTab():tab==="y"?yarisTab():todayTab();
  const head=tab==="b"?`<div class="sh"><span class="av">${avIn(ME,NAME)}</span><div><h1>Merhaba, ${first}</h1><p>Odaklan ve ilerlemeye devam et.</p></div><span class="fire" aria-label="${st.cur} gün seri">🔥 ${st.cur}</span></div>`:tab==="g"?`<h1 class="pg">Görevlerim</h1>`:tab==="k"?`<h1 class="pg">Asistan</h1>`:"";
  const nb=(k,ic,l)=>`<button class="pn" data-tab="${k}" aria-current="${tab===k}" aria-label="${l}">${IC[ic]}<span>${l.replace("Ana sayfa","Bugün")}</span></button>`;
  return `<div class="stu-main">${head}${body}</div><nav class="pill" aria-label="Öğrenci sekmeleri">${nb("b","home","Ana sayfa")}${nb("g","cal","Görevler")}<button class="fab" id="qaopen" aria-label="Hızlı işlemler">+</button>${nb("d","bars","Analiz")}${nb("h","user","Profil")}</nav>${QA?qaSheet():""}`;
}

