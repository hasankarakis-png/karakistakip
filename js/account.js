/* Öğrenci hesabı: Profilim → Hesap kartında "Şifreni değiştir" ekranı.
   Mevcut şifre sunucuda doğrulanır (pin-change fonksiyonu, 15 dakikada 5 hatalı deneme sınırı).
   Başarılı değişiklikten sonra Auth tüm oturumları kapatır; öğrenci yeni şifresiyle yeniden giriş yapar
   (bildirim aboneliği silinmez, giriş ekranında kullanıcı adı hazır gelir). */
let PWS=null,PWU="";
const PW_COMMON=["password","parola123","sifre123","şifre123","qwerty123","12341234","11223344","123123123","1q2w3e4r","asdf1234","abcd1234","abc12345","iloveyou","karakis1","karakis123","galatasaray","fenerbahce","fenerbahçe","besiktas","beşiktaş","trabzonspor","amedspor","diyarbakir","diyarbakır"];
// Sunucudaki pinRule() ile aynı kurallar (supabase/functions/pin-change). Boş dize = geçerli.
function pwRule(p,user){
  if(!p)return "Yeni şifreyi yaz.";
  if(p.length<8)return "Yeni şifre en az 8 karakter olmalı.";
  if(p.length>64)return "Yeni şifre en fazla 64 karakter olabilir.";
  if(/^\s|\s$/.test(p))return "Şifrenin başında veya sonunda boşluk olmasın.";
  if(/[\u0000-\u001f\u007f]/.test(p))return "Şifrede geçersiz bir karakter var.";
  const l=p.toLocaleLowerCase("tr");
  if(/^(.{1,2})\1+$/.test(l))return "Tekrar eden şifreler (11111111, 12121212) kolay tahmin edilir.";
  if(["01234567890","09876543210","abcdefghijklmnopqrstuvwxyz","zyxwvutsrqponmlkjihgfedcba","qwertyuiopasdfghjklzxcvbnm"].some(r=>r.includes(l)))return "Sıralı karakterler (12345678, abcdefgh) kolay tahmin edilir.";
  if(user&&user.length>=3&&l.includes(user.toLocaleLowerCase("tr")))return "Şifrende kullanıcı adın olmasın.";
  if(PW_COMMON.includes(l))return "Bu şifre çok yaygın, başka bir şifre seç.";
  return "";
}
const pwMix=p=>/[a-zçğıöşü]/i.test(p)&&/\d/.test(p);
function pwScore(p){
  if(!p)return 0;
  let s=(p.length>=8)+(p.length>=11)+pwMix(p)+(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]/.test(p)||(/[A-ZÇĞİÖŞÜ]/.test(p)&&/[a-zçğıöşü]/.test(p)));
  if(pwRule(p,PWU))return 1;
  return s>=3?3:s===2?2:1;
}
const PWL=["","Zayıf","Orta","Güçlü"];
function pwUser(){if(PWU||ROLE!=="student")return;Promise.resolve(sb.auth.getSession()).then(r=>{const e=r&&r.data&&r.data.session&&r.data.session.user&&r.data.session.user.email;if(e){PWU=String(e).split("@")[0];if(tab==="h"&&!PWS)render()}},()=>{})}
function pwOpen(){PWS={busy:false,done:false};render();navOv();setTimeout(()=>{const e=document.getElementById("pwo");if(e)e.focus()},60)}
function pwClose(){if(!PWS||PWS.busy)return;if(PWS.done){pwRelog();return}PWS=null;render()}

const pwEye=id=>`<button type="button" class="pweye" data-pweye="${id}" aria-label="Şifreyi göster" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>`;
function pwSheet(){
  if(PWS.done)return `<button class="qa-bg" id="pwrelog2" aria-label="Giriş ekranına git"></button><div class="qa pws" role="dialog" aria-modal="true" aria-labelledby="pwh"><div class="grab"></div>
  <div class="pwdone" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></div><h2 id="pwh" style="text-align:center">Şifren değişti</h2>
  <p class="empty" style="text-align:center;margin:0 0 6px;font-size:15px">Güvenliğin için tüm cihazlardaki oturumların kapatıldı. Yeni şifrenle bir kez giriş yap; bildirimlerin açık kalır.</p>
  <div class="row" style="justify-content:center"><button class="btn" id="pwrelog" style="padding:12px 22px">Giriş ekranına git</button></div></div>`;
  const b=PWS.busy;
  return `<button class="qa-bg" id="pwx" aria-label="Kapat"></button><div class="qa pws" role="dialog" aria-modal="true" aria-labelledby="pwh"><div class="grab"></div>
  <h2 id="pwh">Şifreni değiştir</h2><p class="empty" style="margin:0 0 4px;font-size:15px">Giriş yaparken kullandığın şifreyi (PIN) yenile.${PWU?` Kullanıcı adın: <b class="pwun">${esc(PWU)}</b>`:""}</p>
  <div class="pwf"><label for="pwo">Mevcut şifre</label><div class="pwi"><input id="pwo" type="password" autocomplete="current-password" maxlength="128" spellcheck="false" autocapitalize="none"${b?" disabled":""}>${pwEye("pwo")}</div></div>
  <div class="pwf"><label for="pwn">Yeni şifre</label><div class="pwi"><input id="pwn" type="password" autocomplete="new-password" maxlength="64" spellcheck="false" autocapitalize="none" aria-describedby="pwms pwr"${b?" disabled":""}>${pwEye("pwn")}</div>
    <div class="pwm" data-s="0" aria-hidden="true"><i></i><i></i><i></i></div><small id="pwms" class="pwms" aria-live="polite">En az 8 karakter; harf ve rakamı karıştır.</small>
    <ul class="pwr" id="pwr"><li data-k="len">En az 8 karakter</li><li data-k="mix">Harf ve rakam birlikte (önerilir)</li><li data-k="ok">Kolay tahmin edilmiyor</li></ul></div>
  <div class="pwf"><label for="pwc">Yeni şifre (tekrar)</label><div class="pwi"><input id="pwc" type="password" autocomplete="new-password" maxlength="64" spellcheck="false" autocapitalize="none" aria-describedby="pwcm"${b?" disabled":""}>${pwEye("pwc")}</div><small id="pwcm" class="pwms" aria-live="polite"></small></div>
  <p class="pwerr" id="pwerr" role="alert"></p>
  <div class="row" style="justify-content:flex-end;margin-top:4px"><button class="chip" id="pwno"${b?" disabled":""}>Vazgeç</button><button class="btn" id="pwok" style="padding:12px 20px"${b?" disabled":""}>${b?"Değiştiriliyor…":"Şifreyi değiştir"}</button></div>
  <p class="empty" style="font-size:13px;margin:10px 0 0">Şifreni unutursan koçun sana yeni bir şifre verebilir. Şifreni kimseyle paylaşma.</p></div>`;
}
/* Yazarken ekranı yeniden çizmeden göstergeleri günceller (alanlar silinmesin diye). */
function pwLive(keepErr){
  const g=id=>document.getElementById(id),n=g("pwn"),c=g("pwc");if(!n)return;
  const p=n.value,s=pwScore(p),r=p?pwRule(p,PWU):"",m=g("pwms"),bar=document.querySelector(".pwm");
  if(bar)bar.dataset.s=String(s);
  if(m)m.textContent=!p?"En az 8 karakter; harf ve rakamı karıştır.":r?r:"Şifre gücü: "+PWL[s];
  const set=(k,ok)=>{const li=document.querySelector('.pwr [data-k="'+k+'"]');if(li)li.classList.toggle("on",!!ok)};
  set("len",p.length>=8);set("mix",pwMix(p));set("ok",p.length>=8&&!r);
  n.setAttribute("aria-invalid",p&&r?"true":"false");
  const cm=g("pwcm");if(c&&cm){const v=c.value;cm.textContent=!v?"":v===p?"✓ Şifreler aynı":"Şifreler aynı değil";cm.className="pwms"+(v?v===p?" ok":" bad":"");c.setAttribute("aria-invalid",v&&v!==p?"true":"false")}
  if(!keepErr){const e=g("pwerr");if(e)e.textContent=""}
}
/* Başka bir yerden gelen render() (ör. bildirim durumu) yazılanları silmesin: alanları, görünürlüğü, odağı ve mesajı korur. */
function pwGrab(){
  const o={f:document.activeElement&&document.activeElement.id,err:(document.getElementById("pwerr")||{}).textContent||""};
  ["pwo","pwn","pwc"].forEach(id=>{const e=document.getElementById(id);if(e)o[id]={v:e.value,t:e.type}});return o;
}
function pwPut(o){
  let any=false;["pwo","pwn","pwc"].forEach(id=>{const e=document.getElementById(id),x=o[id];if(e&&x){e.value=x.v;e.type=x.t;any=true;const eb=document.querySelector('[data-pweye="'+id+'"]');if(eb&&x.t==="text"){eb.classList.add("on");eb.setAttribute("aria-pressed","true")}}});
  if(!any)return;pwLive(true);const er=document.getElementById("pwerr");if(er&&o.err)er.textContent=o.err;
  if(o.f&&/^pw[onc]$/.test(o.f)){const f=document.getElementById(o.f);if(f)f.focus({preventScroll:true})}
}
function pwErr(msg,field){
  const e=document.getElementById("pwerr");if(e)e.textContent=msg;
  const f=field&&document.getElementById(field);if(f){f.setAttribute("aria-invalid","true");f.focus();if(field==="pwo")f.select()}
}
function pwBusy(on){
  PWS.busy=on;["pwo","pwn","pwc","pwno","pwok"].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=on});
  const b=document.getElementById("pwok");if(b)b.textContent=on?"Değiştiriliyor…":"Şifreyi değiştir";
}
async function pwSubmit(){
  if(!PWS||PWS.busy||PWS.done)return;
  const v=id=>(document.getElementById(id)||{}).value||"",o=v("pwo"),n=v("pwn"),c=v("pwc");
  if(!o)return pwErr("Mevcut şifreni yaz.","pwo");
  const r=pwRule(n,PWU);if(r)return pwErr(r,"pwn");
  if(n===o)return pwErr("Yeni şifre mevcut şifrenle aynı olamaz.","pwn");
  if(c!==n)return pwErr("Yeni şifreyi iki kez aynı yaz.","pwc");
  if(!navigator.onLine)return pwErr("İnternet bağlantın yok. Bağlanınca tekrar dene.");
  pwBusy(true);
  let res;
  try{
    const {data:{session}}=await sb.auth.getSession();
    const r=await fetch(SUPABASE_URL+"/functions/v1/pin-change",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+(session&&session.access_token),apikey:SUPABASE_KEY},body:JSON.stringify({old:o,new:n})});
    res=await r.json().catch(()=>({}));if(!r.ok&&!res.error)res.error="Sunucu hatası ("+r.status+")";
  }catch(e){res={error:"Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene."}}
  if(!PWS)return;
  if(res&&res.ok){PWS={busy:false,done:true};render();return}
  pwBusy(false);
  const f=res&&res.field==="old"?"pwo":res&&res.field==="new"?"pwn":null;
  if(f==="pwo"){const e=document.getElementById("pwo");if(e)e.value=""}
  pwErr((res&&res.error)||"Şifre değiştirilemedi, tekrar dene.",f);
}
async function pwRelog(){
  if(!PWS||PWS.relog)return;PWS.relog=true;
  try{sessionStorage.setItem("kt-relog",PWU||"1")}catch(e){}
  const lim=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(r,ms))]);
  try{if(DIRTY)await lim(flush(),3000)}catch(e){}
  try{await lim(sb.auth.signOut({scope:"local"}),2000)}catch(e){}
  location.reload();
}
/* boot.js: oturum yoksa giriş ekranına bu mesajla gelinir ve kullanıcı adı doldurulur. */
function pwAfterMsg(){
  let u=null;try{u=sessionStorage.getItem("kt-relog");sessionStorage.removeItem("kt-relog")}catch(e){}
  if(!u)return undefined;
  if(u!=="1")setTimeout(()=>{const l=document.getElementById("lu"),p=document.getElementById("lp");if(l&&!l.value){l.value=u;if(p)p.focus()}},0);
  return "Şifren değişti ✓ Yeni şifrenle giriş yap.";
}

/* ---- bağlantılar ---- */
(function(){
  DRAFTS.push("pwo","pwn","pwc");
  const pr=render;
  render=function(){const k=PWS&&!PWS.done?pwGrab():null,out=pr.apply(this,arguments);if(k)pwPut(k);return out};
  const pa=accountCard;
  accountCard=function(){
    pwUser();
    const row=`<button class="accrow" id="pwopen"><span class="aci" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="10.5" width="16" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.4"/></svg></span><span class="acx"><b>Şifreni değiştir</b><small>${PWU?"Kullanıcı adın: "+esc(PWU):"Giriş şifreni (PIN) kendin belirle"}</small></span><span class="chev" aria-hidden="true">›</span></button>`;
    return pa.apply(this,arguments).replace("<h2>Hesap</h2>","<h2>Hesap</h2>"+row);
  };
  const pv=studentView;
  studentView=function(){let h=pv.apply(this,arguments);if(PWS)h+=pwSheet();return h};
  const pu=ui;
  ui=function(t){
    const id=t.id,D=t.dataset||{};
    if(id==="pwopen"){pwOpen();return true}
    if(id==="pwx"||id==="pwno"){pwClose();return true}
    if(id==="pwok"){once("pw",pwSubmit);return true}
    if(id==="pwrelog"||id==="pwrelog2"){pwRelog();return true}
    if(D.pweye){const e=document.getElementById(D.pweye);if(e){const show=e.type==="password";e.type=show?"text":"password";t.setAttribute("aria-pressed",String(show));t.setAttribute("aria-label",show?"Şifreyi gizle":"Şifreyi göster");t.classList.toggle("on",show)}return true}
    return pu.apply(this,arguments);
  };
  document.addEventListener("input",e=>{if(PWS&&/^pw[onc]$/.test(e.target.id))pwLive()});
  document.addEventListener("keydown",e=>{
    if(!PWS)return;
    if(e.key==="Escape"){pwClose();return}
    // Enter: alanlar doluysa gönderir, değilse sıradaki boş alana geçer.
    if(e.key==="Enter"&&/^pw[onc]$/.test(e.target.id)){e.preventDefault();const em=["pwo","pwn","pwc"].find(id=>{const x=document.getElementById(id);return x&&!x.value});if(em)document.getElementById(em).focus();else once("pw",pwSubmit)}
  });
})();
