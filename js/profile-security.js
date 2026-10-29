/* Karakış Takip · Profil > Hesap > Parola */
(function(){
  "use strict";
  let PWP_BUSY=false;
  const rules=[
    ["length",v=>Array.from(v).length>=12,"En az 12 karakter"],
    ["upper",v=>/\p{Lu}/u.test(v),"En az bir büyük harf"],
    ["lower",v=>/\p{Ll}/u.test(v),"En az bir küçük harf"],
    ["number",v=>/\p{N}/u.test(v),"En az bir rakam"],
    ["symbol",v=>/[^\p{L}\p{N}]/u.test(v),"En az bir sembol (!, @, # gibi)"]
  ];
  const shield=`<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg>`;
  function modal(){
    return `<div id="pwp-overlay" class="pwp-overlay" role="presentation">
      <section id="pwp-dialog" class="pwp-dialog" role="dialog" aria-modal="true" aria-labelledby="pwp-title">
        <button type="button" id="pwp-close" class="pwp-close" aria-label="Pencereyi kapat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
        <div class="pwp-mark">${shield}</div>
        <h2 id="pwp-title" class="pwp-title">Parolanı değiştir</h2>
        <p class="pwp-subtitle">Yeni parolanı oluştur. Koşullar tamamlandıkça işaretlenecek.</p>
        <form id="profile-password-form" autocomplete="on">
          <label class="pwp-label">Mevcut parola
            <input class="pwp-input" id="pwp-current" type="password" autocomplete="current-password" required placeholder="Mevcut parolan" />
          </label>
          <label class="pwp-label">Yeni parola
            <input class="pwp-input" id="pwp-new" type="password" autocomplete="new-password" required minlength="12" placeholder="Yeni ve güçlü parolan" aria-describedby="pwp-rules" />
          </label>
          <div id="pwp-rules" class="pwp-rules">
            ${rules.map(([k,_,label])=>`<div class="pwp-rule" data-pwp-rule="${k}"><span class="pwp-rule-mark" aria-hidden="true"></span><span>${label}</span></div>`).join("")}
          </div>
          <label class="pwp-label pwp-confirm-label">Yeni parola tekrar
            <input class="pwp-input" id="pwp-confirm" type="password" autocomplete="new-password" required minlength="12" placeholder="Yeni parolanı tekrar yaz" />
          </label>
          <p id="pwp-match" class="pwp-match" aria-live="polite"></p>
          <button class="btn pwp-submit" id="pwp-submit" type="submit" disabled>Parolamı değiştir</button>
          <p id="pwp-message" class="pwp-message" role="status" aria-live="polite"></p>
        </form>
      </section>
    </div>`;
  }
  function ensureStyles(){
    if(document.getElementById("pwp-styles"))return;
    const s=document.createElement("style");s.id="pwp-styles";
    s.textContent=`
      .account-action-icon{display:inline-block;vertical-align:-3px;margin-right:5px}
      #pw-open{display:inline-flex;align-items:center;gap:1px}
      .pwp-overlay{position:fixed;inset:0;z-index:9999;background:rgba(4,8,20,.64);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:16px;animation:pwpFade .16s ease-out}
      .pwp-dialog{position:relative;width:min(100%,420px);max-height:calc(100dvh - 32px);overflow:auto;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:26px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.28);animation:pwpRise .2s cubic-bezier(.2,.8,.2,1)}
      .pwp-close{position:absolute;right:16px;top:16px;width:36px;height:36px;display:grid;place-items:center;border:1px solid var(--line);border-radius:12px;background:var(--cream);color:var(--mute);cursor:pointer}
      .pwp-mark{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:var(--goldsoft);color:var(--acc);margin-bottom:14px}
      .pwp-title{font:700 21px var(--fd);letter-spacing:-.035em;margin:0 42px 5px 0}
      .pwp-subtitle{font-size:13px;line-height:1.5;color:var(--mute);margin:0 0 18px}
      .pwp-label{display:block;font-size:13px;font-weight:700;color:var(--ink);margin:0 0 13px}
      .pwp-input{display:block!important;width:100%!important;min-height:46px;margin-top:6px;padding:11px 13px!important;border:1.5px solid var(--line)!important;border-radius:13px!important;background:var(--cream)!important;color:var(--ink)!important;font:600 15px var(--fb)!important;box-shadow:none!important}
      .pwp-input:focus{border-color:var(--acc)!important;outline:3px solid var(--goldsoft)!important;outline-offset:1px}
      .pwp-rules{display:grid;gap:8px;margin:-2px 0 16px;font-size:12.5px}
      .pwp-rule{display:flex;align-items:center;gap:9px;color:var(--mute);transition:color .15s ease}
      .pwp-rule-mark{display:grid;place-items:center;flex:0 0 19px;width:19px;height:19px;border:1px solid var(--line);border-radius:50%;font-size:12px;font-weight:800;transition:background .15s ease,border-color .15s ease}
      .pwp-rule.is-valid{color:var(--ink)}
      .pwp-rule.is-valid .pwp-rule-mark{background:var(--acc);border-color:var(--acc);color:var(--acc-ink)}
      .pwp-confirm-label{margin-top:0}
      .pwp-match{min-height:16px;font-size:12px;color:var(--mute);margin:-5px 0 12px}
      .pwp-submit{width:100%;min-height:48px}
      .pwp-submit:disabled{opacity:.45;cursor:not-allowed;transform:none}
      .pwp-message{font-size:13px;color:var(--warn);margin:10px 0 0;line-height:1.45}
      @keyframes pwpFade{from{opacity:0}to{opacity:1}}@keyframes pwpRise{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
      @media(prefers-reduced-motion:reduce){.pwp-overlay,.pwp-dialog{animation:none}}
    `;
    document.head.appendChild(s);
  }
  function setMessage(message,success){
    const el=document.getElementById("pwp-message");
    if(el){el.textContent=message||"";el.style.color=success?"var(--ok)":"var(--warn)";}
  }
  function checkRules(){
    const n=document.getElementById("pwp-new"),c=document.getElementById("pwp-confirm");
    if(!n)return false;
    const value=n.value||"";let all=true;
    rules.forEach(([key,test])=>{
      const el=document.querySelector('[data-pwp-rule="'+key+'"]');
      const ok=test(value);all=all&&ok;
      if(el){const mark=el.querySelector(".pwp-rule-mark");el.classList.toggle("is-valid",ok);if(mark)mark.textContent=ok?"✓":"";}
    });
    const match=!!c&&c.value.length>0&&c.value===value;
    const m=document.getElementById("pwp-match");
    if(m){m.textContent=!c||!c.value?"":match?"✓ Parolalar eşleşiyor":"Parolalar henüz eşleşmiyor";m.style.color=match?"var(--ok)":"var(--mute)";}
    const submit=document.getElementById("pwp-submit");
    if(submit)submit.disabled=PWP_BUSY||!(all&&match&&document.getElementById("pwp-current")?.value);
    return all&&match;
  }
  function closeModal(){document.getElementById("pwp-overlay")?.remove();document.getElementById("pw-open")?.focus();}
  function openModal(){
    if(typeof ROLE==="undefined"||ROLE!=="student"||!ME)return;
    document.getElementById("pwp-overlay")?.remove();ensureStyles();
    document.body.insertAdjacentHTML("beforeend",modal());document.getElementById("pwp-current")?.focus();
  }
  document.addEventListener("click",e=>{
    if(e.target.closest("#pw-open")){e.preventDefault();openModal();return;}
    if(e.target.closest("#pwp-close")||e.target.id==="pwp-overlay"){closeModal();return;}
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("pwp-overlay"))closeModal();});
  document.addEventListener("input",e=>{
    if(e.target&&["pwp-current","pwp-new","pwp-confirm"].includes(e.target.id)){checkRules();if(e.target.id==="pwp-current")setMessage("",false);}
  });
  document.addEventListener("submit",async e=>{
    if(!e.target||e.target.id!=="profile-password-form")return;
    e.preventDefault();if(PWP_BUSY)return;
    const current=document.getElementById("pwp-current")?.value||"",next=document.getElementById("pwp-new")?.value||"",confirmNext=document.getElementById("pwp-confirm")?.value||"";
    if(typeof ROLE==="undefined"||ROLE!=="student"||!ME){setMessage("Oturum doğrulanamadı. Yeniden giriş yap.",false);return;}
    if(!current){setMessage("Mevcut parolanı gir.",false);return;}
    if(!rules.every(([,test])=>test(next))){setMessage("İşaretlenmemiş parola koşullarını tamamla.",false);return;}
    if(next!==confirmNext){setMessage("Yeni parola alanları eşleşmiyor.",false);return;}
    if(next===current){setMessage("Yeni parolan mevcut parolandan farklı olmalı.",false);return;}
    PWP_BUSY=true;const submit=document.getElementById("pwp-submit");
    if(submit){submit.disabled=true;submit.textContent="Güncelleniyor…";}setMessage("",false);
    try{
      const {data,error:userError}=await sb.auth.getUser();
      if(userError||!data?.user?.email)throw new Error("Hesap bilgileri doğrulanamadı. Çıkış yapıp yeniden giriş yap.");
      const verified=await sb.auth.signInWithPassword({email:data.user.email,password:current});
      if(verified.error)throw new Error("Mevcut parola doğru değil.");
      const changed=await sb.auth.updateUser({password:next});
      if(changed.error)throw new Error(changed.error.message||"Parola güncellenemedi.");
      document.getElementById("profile-password-form")?.reset();checkRules();
      setMessage("Parolan güncellendi. Bundan sonra girişte yeni parolanı kullan.",true);
      if(submit){submit.textContent="Parola güncellendi ✓";submit.disabled=true;}
    }catch(err){
      setMessage(err&&err.message==="Invalid login credentials"?"Mevcut parola doğru değil.":(err&&err.message||"Parola değiştirilemedi. Tekrar dene."),false);
    }finally{
      PWP_BUSY=false;checkRules();const button=document.getElementById("pwp-submit");
      if(button&&button.textContent==="Güncelleniyor…")button.textContent="Parolamı değiştir";
    }
  });
})();
