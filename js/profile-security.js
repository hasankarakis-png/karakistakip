/* Karakış Takip · Profil > Hesap > Parola
   Parola formu yalnızca öğrenci tıkladığında küçük bir modal olarak açılır. */
(function(){
  "use strict";
  let PWP_BUSY=false;
  const rules=[
    ["length",v=>Array.from(v).length>=12,"En az 12 karakter"],
    ["upper",v=>/\\p{Lu}/u.test(v),"En az bir büyük harf"],
    ["lower",v=>/\\p{Ll}/u.test(v),"En az bir küçük harf"],
    ["number",v=>/\\p{N}/u.test(v),"En az bir rakam"],
    ["symbol",v=>/[^\\p{L}\\p{N}]/u.test(v),"En az bir sembol (!, @, # gibi)"]
  ];
  const safe=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function modal(){
    return `<div id="pwp-overlay" style="position:fixed;inset:0;z-index:9999;background:rgba(4,8,20,.62);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:16px" role="presentation">
      <section id="pwp-dialog" role="dialog" aria-modal="true" aria-labelledby="pwp-title" style="position:relative;width:min(100%,440px);max-height:calc(100dvh - 32px);overflow:auto;background:var(--card,#fff);color:var(--text,#111827);border:1px solid var(--line,#ddd);border-radius:24px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.28)">
        <button type="button" id="pwp-close" aria-label="Pencereyi kapat" style="position:absolute;right:14px;top:14px;width:36px;height:36px;border:1px solid var(--line,#ddd);border-radius:50%;background:transparent;color:inherit;font-size:21px;cursor:pointer">×</button>
        <div style="width:44px;height:44px;display:grid;place-items:center;border-radius:15px;background:var(--soft,rgba(150,170,40,.13));font-size:22px;margin-bottom:12px">🔐</div>
        <h2 id="pwp-title" style="font-size:20px;margin:0 42px 5px 0">Parolanı değiştir</h2>
        <p style="font-size:13px;line-height:1.5;color:var(--mute,#777);margin:0 0 16px">Güvenliğin için yeni parolanı belirle. Koşullar tamamlandıkça işaretlenecek.</p>
        <form id="profile-password-form" autocomplete="on">
          <label style="display:block;font-size:13px;font-weight:650;margin-bottom:12px">Mevcut parola
            <input id="pwp-current" type="password" autocomplete="current-password" required style="display:block;width:100%;box-sizing:border-box;margin-top:5px" placeholder="Mevcut parolan" />
          </label>
          <label style="display:block;font-size:13px;font-weight:650;margin-bottom:8px">Yeni parola
            <input id="pwp-new" type="password" autocomplete="new-password" required minlength="12" style="display:block;width:100%;box-sizing:border-box;margin-top:5px" placeholder="Yeni ve güçlü parolan" aria-describedby="pwp-rules" />
          </label>
          <div id="pwp-rules" style="display:grid;grid-template-columns:1fr;gap:7px;margin:0 0 14px;font-size:13px">
            ${rules.map(([k,_,label])=>`<div data-pwp-rule="${k}" style="display:flex;align-items:center;gap:8px;color:var(--mute,#777)"><span aria-hidden="true" style="display:inline-grid;place-items:center;width:19px;height:19px;border:1px solid var(--line,#ddd);border-radius:50%;font-size:12px;flex:0 0 19px"> </span><span>${label}</span></div>`).join("")}
          </div>
          <label style="display:block;font-size:13px;font-weight:650;margin-bottom:10px">Yeni parola tekrar
            <input id="pwp-confirm" type="password" autocomplete="new-password" required minlength="12" style="display:block;width:100%;box-sizing:border-box;margin-top:5px" placeholder="Yeni parolanı tekrar yaz" />
          </label>
          <p id="pwp-match" style="font-size:12px;color:var(--mute,#777);margin:0 0 12px;min-height:16px" aria-live="polite"></p>
          <button class="btn" id="pwp-submit" type="submit" style="width:100%" disabled>Parolamı değiştir</button>
          <p id="pwp-message" role="status" aria-live="polite" style="margin:10px 0 0;font-size:13px"></p>
        </form>
      </section>
    </div>`;
  }
  function setMessage(message,success){
    const el=document.getElementById("pwp-message");
    if(el){el.textContent=message||"";el.style.color=success?"var(--acc,#668000)":"var(--warn,#c2410c)";}
  }
  function checkRules(){
    const n=document.getElementById("pwp-new"),c=document.getElementById("pwp-confirm");
    if(!n)return false;
    const value=n.value||"";
    let all=true;
    rules.forEach(([key,test,label])=>{
      const el=document.querySelector('[data-pwp-rule="'+key+'"]');
      const ok=test(value);all=all&&ok;
      if(el){
        const icon=el.querySelector("span");
        if(icon){icon.textContent=ok?"✓":"";icon.style.background=ok?"var(--acc,#b7d638)":"transparent";icon.style.borderColor=ok?"var(--acc,#b7d638)":"var(--line,#ddd)";icon.style.color="#172000";icon.style.fontWeight="800";}
        el.style.color=ok?"var(--text,#26320a)":"var(--mute,#777)";
      }
    });
    const match=!!c&&c.value.length>0&&c.value===value;
    const m=document.getElementById("pwp-match");
    if(m){m.textContent=!c||!c.value?"":match?"✓ Parolalar eşleşiyor":"Parolalar henüz eşleşmiyor";m.style.color=match?"var(--acc,#668000)":"var(--mute,#777)";}
    const submit=document.getElementById("pwp-submit");
    if(submit)submit.disabled=PWP_BUSY||!(all&&match&&document.getElementById("pwp-current")?.value);
    return all&&match;
  }
  function closeModal(){
    document.getElementById("pwp-overlay")?.remove();
    document.getElementById("pw-open")?.focus();
  }
  function openModal(){
    if(typeof ROLE==="undefined"||ROLE!=="student"||!ME)return;
    document.getElementById("pwp-overlay")?.remove();
    document.body.insertAdjacentHTML("beforeend",modal());
    document.getElementById("pwp-current")?.focus();
  }
  document.addEventListener("click",e=>{
    if(e.target.closest("#pw-open")){e.preventDefault();openModal();return;}
    if(e.target.closest("#pwp-close")||e.target.id==="pwp-overlay"){closeModal();return;}
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&document.getElementById("pwp-overlay"))closeModal();
  });
  document.addEventListener("input",e=>{
    if(e.target&&["pwp-current","pwp-new","pwp-confirm"].includes(e.target.id)){checkRules();if(e.target.id==="pwp-current")setMessage("",false);}
  });
  document.addEventListener("submit",async e=>{
    if(!e.target||e.target.id!=="profile-password-form")return;
    e.preventDefault();
    if(PWP_BUSY)return;
    const current=document.getElementById("pwp-current")?.value||"";
    const next=document.getElementById("pwp-new")?.value||"";
    const confirmNext=document.getElementById("pwp-confirm")?.value||"";
    if(typeof ROLE==="undefined"||ROLE!=="student"||!ME){setMessage("Oturum doğrulanamadı. Yeniden giriş yap.",false);return;}
    if(!current){setMessage("Mevcut parolanı gir.",false);return;}
    if(!rules.every(([,test])=>test(next))){setMessage("İşaretlenmemiş parola koşullarını tamamla.",false);return;}
    if(next!==confirmNext){setMessage("Yeni parola alanları eşleşmiyor.",false);return;}
    if(next===current){setMessage("Yeni parolan mevcut parolandan farklı olmalı.",false);return;}
    PWP_BUSY=true;
    const submit=document.getElementById("pwp-submit");
    if(submit){submit.disabled=true;submit.textContent="Güncelleniyor…";}
    setMessage("",false);
    try{
      const {data,error:userError}=await sb.auth.getUser();
      if(userError||!data?.user?.email)throw new Error("Hesap bilgileri doğrulanamadı. Çıkış yapıp yeniden giriş yap.");
      const verified=await sb.auth.signInWithPassword({email:data.user.email,password:current});
      if(verified.error)throw new Error("Mevcut parola doğru değil.");
      const changed=await sb.auth.updateUser({password:next});
      if(changed.error)throw new Error(changed.error.message||"Parola güncellenemedi.");
      const form=document.getElementById("profile-password-form");
      if(form)form.reset();
      checkRules();
      setMessage("Parolan güncellendi. Bundan sonra girişte yeni parolanı kullan.",true);
      if(submit){submit.textContent="Parola güncellendi ✓";submit.disabled=true;}
    }catch(err){
      setMessage(err&&err.message==="Invalid login credentials"?"Mevcut parola doğru değil.":(err&&err.message||"Parola değiştirilemedi. Tekrar dene."),false);
    }finally{
      PWP_BUSY=false;
      checkRules();
      const button=document.getElementById("pwp-submit");
      if(button&&button.textContent==="Güncelleniyor…")button.textContent="Parolamı değiştir";
    }
  });
})();