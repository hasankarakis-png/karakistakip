/* Karakış Takip · Öğrenci profilinde parola yönetimi
   Yalnızca oturum açmış öğrenci kendi Supabase Auth parolasını değiştirebilir. */
(function(){
  "use strict";
  let PWP_MSG="",PWP_BUSY=false;
  const rules=[
    ["length",v=>Array.from(v).length>=12,"En az 12 karakter"],
    ["upper",v=>/\p{Lu}/u.test(v),"En az bir büyük harf"],
    ["lower",v=>/\p{Ll}/u.test(v),"En az bir küçük harf"],
    ["number",v=>/\p{N}/u.test(v),"En az bir rakam"],
    ["symbol",v=>/[^\p{L}\p{N}]/u.test(v),"En az bir sembol (!, @, # gibi)"]
  ];
  function card(){
    return `<section class="card" id="profile-password-card">
      <h2>🔐 Güvenlik ve parola</h2>
      <p class="empty" style="margin:0 0 12px;font-size:14px">Parolanı buradan kendin değiştirebilirsin. Yeni parolan en az 12 karakter olmalı; büyük/küçük harf, rakam ve sembol içermeli.</p>
      <form id="profile-password-form" autocomplete="on">
        <label style="display:block;margin:0 0 10px">Mevcut parola
          <input id="pwp-current" type="password" autocomplete="current-password" required style="width:100%;margin-top:5px" placeholder="Mevcut PIN / parolan" />
        </label>
        <label style="display:block;margin:0 0 10px">Yeni parola
          <input id="pwp-new" type="password" autocomplete="new-password" required minlength="12" style="width:100%;margin-top:5px" placeholder="Güçlü bir parola oluştur" aria-describedby="pwp-rules" />
        </label>
        <div id="pwp-rules" style="display:grid;gap:5px;margin:0 0 12px;font-size:13px">
          ${rules.map(([k,_,label])=>`<div data-pwp-rule="${k}" style="color:var(--muted,#888)">○ ${label}</div>`).join("")}
        </div>
        <label style="display:block;margin:0 0 12px">Yeni parola tekrar
          <input id="pwp-confirm" type="password" autocomplete="new-password" required minlength="12" style="width:100%;margin-top:5px" placeholder="Yeni parolanı tekrar yaz" />
        </label>
        <p id="pwp-match" class="empty" style="margin:0 0 10px;font-size:13px" aria-live="polite"></p>
        <button class="btn" id="pwp-submit" type="submit" ${PWP_BUSY?"disabled":""} style="width:100%">${PWP_BUSY?"Güncelleniyor…":"Parolamı değiştir"}</button>
        <p id="pwp-message" role="status" aria-live="polite" style="margin:10px 0 0;font-size:14px;color:${PWP_MSG.startsWith("Parolan güncellendi")?"var(--acc)":"var(--warn)"}">${esc(PWP_MSG)}</p>
      </form>
    </section>`;
  }
  function checkRules(){
    const n=document.getElementById("pwp-new"),c=document.getElementById("pwp-confirm");
    if(!n)return;
    const value=n.value||"";
    rules.forEach(([key,test,label])=>{
      const el=document.querySelector('[data-pwp-rule="'+key+'"]');
      if(el){const ok=test(value);el.textContent=(ok?"✓ ":"○ ")+label;el.style.color=ok?"var(--acc)":"var(--muted,#888)"}
    });
    const m=document.getElementById("pwp-match");
    if(m&&c&&c.value)m.textContent=c.value===value?"Yeni parolalar eşleşiyor.":"Yeni parolalar eşleşmiyor.";
    else if(m)m.textContent="";
  }
  const baseRender=render;
  render=function(){
    baseRender.apply(this,arguments);
    if(typeof ROLE!=="undefined"&&ROLE==="student"&&typeof tab!=="undefined"&&tab==="h"){
      const app=document.getElementById("app");
      if(app&&!document.getElementById("profile-password-card"))app.insertAdjacentHTML("beforeend",card());
    }
  };
  document.addEventListener("input",e=>{
    if(e.target&&["pwp-new","pwp-confirm"].includes(e.target.id))checkRules();
  });
  document.addEventListener("submit",async e=>{
    if(!e.target||e.target.id!=="profile-password-form")return;
    e.preventDefault();
    if(PWP_BUSY)return;
    const current=document.getElementById("pwp-current")?.value||"";
    const next=document.getElementById("pwp-new")?.value||"";
    const confirmNext=document.getElementById("pwp-confirm")?.value||"";
    const fail=msg=>{PWP_MSG=msg;render()};
    if(typeof ROLE==="undefined"||ROLE!=="student"||!ME){fail("Oturum doğrulanamadı. Lütfen yeniden giriş yap.");return}
    if(!current){fail("Mevcut parolanı gir.");return}
    const unmet=rules.filter(([,test])=>!test(next));
    if(unmet.length){fail("Yeni parola tüm güvenlik koşullarını karşılamalı.");return}
    if(next!==confirmNext){fail("Yeni parola alanları eşleşmiyor.");return}
    if(next===current){fail("Yeni parolan mevcut parolandan farklı olmalı.");return}
    PWP_BUSY=true;PWP_MSG="";render();
    try{
      const {data,error:userError}=await sb.auth.getUser();
      if(userError||!data?.user?.email)throw new Error("Hesap bilgileri doğrulanamadı. Çıkış yapıp yeniden giriş yap.");
      const verified=await sb.auth.signInWithPassword({email:data.user.email,password:current});
      if(verified.error)throw new Error("Mevcut parola doğru değil.");
      const changed=await sb.auth.updateUser({password:next});
      if(changed.error)throw new Error(changed.error.message||"Parola güncellenemedi.");
      PWP_MSG="Parolan güncellendi. Bundan sonra girişte yeni parolanı kullan.";
      const form=document.getElementById("profile-password-form");
      if(form)form.reset();
    }catch(err){
      PWP_MSG=err&&err.message==="Invalid login credentials"?"Mevcut parola doğru değil.":(err&&err.message||"Parola değiştirilemedi. Lütfen tekrar dene.");
    }finally{
      PWP_BUSY=false;
      render();
    }
  });
})();