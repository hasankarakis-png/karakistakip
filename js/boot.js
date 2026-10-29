/* Cloudflare Turnstile (robot doğrulaması). TS_KEY boşsa kapalıdır; Supabase'de Captcha açılmadan önce anahtar buraya yazılmalıdır. */
const TS_KEY="0x4AAAAAAFZUyqWLetPIf5hy";let TSTOKEN="",TSID=null,TSLOAD=null;
function tsScript(){return TSLOAD||(TSLOAD=new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";s.async=true;s.onload=ok;s.onerror=no;document.head.appendChild(s)}))}
async function tsMount(){
  TSTOKEN="";TSID=null;if(!TS_KEY)return;
  const el=document.getElementById("ts");if(!el)return;
  try{await tsScript();if(window.turnstile&&document.getElementById("ts"))TSID=window.turnstile.render("#ts",{sitekey:TS_KEY,callback:t=>{TSTOKEN=t},"expired-callback":()=>{TSTOKEN=""},"error-callback":()=>{TSTOKEN=""},theme:"auto",language:"tr"})}catch(e){el.textContent="Robot doğrulaması yüklenemedi. İnternetini kontrol edip sayfayı yenile."}
}
const setLoginMsg=m=>{let e=document.getElementById("lmsg");if(!e){e=document.createElement("p");e.id="lmsg";e.className="empty";e.style.color="var(--warn)";const t=document.getElementById("ts");(t?t.parentNode:document.getElementById("app")).appendChild(e)}e.textContent=m};
const showLogin=msg=>{document.getElementById("app").innerHTML=loginView(msg);tsMount()};
async function doLogin(){
  const u=document.getElementById("lu").value.trim().toLowerCase().replace(/[^a-z0-9._-]/g,""),p=document.getElementById("lp").value;
  if(!u||!p)return;
  if(TS_KEY&&!TSTOKEN)return setLoginMsg("Önce robot doğrulamasını tamamla.");
  const r=await sb.auth.signInWithPassword({email:u+"@takip.karakis.app",password:p,options:TS_KEY?{captchaToken:TSTOKEN}:undefined});
  if(r.error){
    const m=String(r.error.message||""),st=r.error.status;
    showLogin(/captcha/i.test(m)?"Robot doğrulaması başarısız, tekrar dene.":st===429||/rate|too many/i.test(m)?"Çok fazla deneme yapıldı, biraz bekleyip tekrar dene.":(st===400||/invalid/i.test(m))?"Kullanıcı adı veya PIN hatalı.":"Giriş yapılamadı. İnternet bağlantını kontrol et.");return}
  start();
}
// Önceki 2 günün sunucuya gitmemiş kaydını tamamlar: gece yarısı çevrimdışı kalma, gece yarısından hemen önce
// kapatılan uygulama, uygulama kapalıyken açık kalan oturum. Sunucudaki kayıt daha doluysa ona dokunulmaz.
async function pushPast(){
  const C0=[];
  try{const j=JSON.parse(localStorage.getItem(KEY+ME)||"null");if(j&&j.day&&j.day<day()&&Array.isArray(j.log)&&j.log.length)C0.push({k:null,s:j})}catch(e){}
  for(let n=1;n<=3;n++){const k=KEY+ME+"-"+dayN(-n);try{const j=JSON.parse(localStorage.getItem(k)||"null");if(j&&Array.isArray(j.log))C0.push({k,s:j});else if(n===3)localStorage.removeItem(k)}catch(e){}}
  for(const c of C0){
    const st=Object.assign(fresh(),c.s);
    if(st.day<dayN(-2)){if(c.k)try{localStorage.removeItem(c.k)}catch(e){}continue}
    if(st.cur){ // açık kalan oturum en geç gece yarısında ve en fazla 4 saat sayılır
      const [y,m,d]=st.day.split("-").map(Number),mid=new Date(y,m-1,d+1).getTime(),cu=st.cur;
      const end=Math.min(mid,num(cu.start)+num(cu.brk)+4*3600e3,st.status==="break"?num(cu.bs):Infinity);
      const v=Math.max(0,end-num(cu.start)-num(cu.brk));st.done+=v;st.meth[cu.meth]=(st.meth[cu.meth]||0)+v;st.cur=null;st.status="stopped";st.log.push({t:end,m:"Uygulama kapalıyken açık kalan oturum otomatik kapatıldı"});
    }
    delete st.undo;delete st.rbk;
    try{
      const r=await sb.from("daily").select("state").eq("student_id",ME).eq("day",st.day).maybeSingle();if(r.error)continue;
      const srv=r.data&&r.data.state;
      if(!srv||!Array.isArray(srv.log)||srv.log.length<st.log.length){
        const keep=S;S=st;const sn=snap();S=keep;
        const w=await sb.from("daily").upsert({student_id:ME,day:st.day,state:st,snap:sn,updated_at:new Date().toISOString()});
        if(w.error)continue;
      }
      if(c.k)localStorage.removeItem(c.k);
    }catch(e){}
  }
}
async function loadStudent(){
  try{await pushPast()}catch(e){}
  const r=await sb.from("daily").select("state").eq("student_id",ME).eq("day",day()).maybeSingle();
  let loc=null;try{const j=JSON.parse(localStorage.getItem(KEY+ME)||"null");if(j&&j.day===day()&&Array.isArray(j.log))loc=Object.assign(fresh(),j)}catch(e){}
  if(r.error){
    // Okuma başarısızsa boş gün kurup sunucudaki kaydın üstüne yazma: cihazdaki yedeği kullan, yoksa durma.
    if(!loc)throw new Error("Verilerin yüklenemedi. İnternetini kontrol edip sayfayı yenile.");
    S=loc;setSync("⚠️ Sunucuya ulaşılamadı, cihazdaki kayıt gösteriliyor");
  }else{
    const srv=r.data?Object.assign(fresh(),r.data.state):null;
    // Sunucuya henüz gitmemiş yerel kayıt daha ilerideyse onu koru.
    S=srv&&loc?(loc.log.length>srv.log.length?loc:srv):(srv||loc||fresh());
    if(S===loc&&loc.log.length&&(!srv||loc.log.length>srv.log.length))DIRTY=true;
  }
  S.day=day();if(DIRTY)save();
  await pullStudent();await Promise.all([loadExams(ME),loadReport(ME),loadTarget(ME),loadTasks(ME),loadHist(ME)]);
}
async function pullStudent(){
  const [g,n]=await Promise.all([sb.from("goals").select("*").eq("student_id",ME).eq("day",day()).maybeSingle(),sb.from("notes").select("body,created_at").eq("student_id",ME).order("created_at")]);
  C.goals[ME]=g.data?{day:g.data.day,s:g.data.subj,q:g.data.q,m:g.data.m}:undefined;
  C.notes[ME]=(n.data||[]).map(r=>({t:Date.parse(r.created_at),x:r.body}));
}
async function pullCoach(){
  const [p,d,g,n,e,w]=await Promise.all([sb.from("profiles").select("id,name").eq("role","student").order("name"),sb.from("daily").select("student_id,day,state,snap").gte("day",dayN(-6)),sb.from("goals").select("*").eq("day",day()),sb.from("notes").select("student_id,body,created_at").order("created_at"),sb.from("exam_results").select("student_id,topics").order("exam_date").order("created_at"),sb.from("weekly_tasks").select("student_id,done").gte("task_date",dayN(-6)).lte("task_date",day())]);
  STU=p.data||[];ROWS=d.data||[];C.goals={};C.notes={};C.den={};
  (g.data||[]).forEach(r=>C.goals[r.student_id]={day:r.day,s:r.subj,q:r.q,m:r.m});
  (n.data||[]).forEach(r=>(C.notes[r.student_id]=C.notes[r.student_id]||[]).push({t:Date.parse(r.created_at),x:r.body}));
  EXALL=e.data||[];TKALL=w.data||[];
}
let rt;
// Verileri sayfayı yenilemeden çeker. Otomatik çağrıda yazı yazılıyorsa bekler; "↻ Yenile" düğmesi hemen çalıştırır.
// Telefon uykudan dönünce oturum anahtarının süresi dolmuş olabilir: istekten önce yenile (aksi halde 401 alınır).
async function authFresh(){try{const {data:{session}}=await sb.auth.getSession();if(session&&session.expires_at&&session.expires_at*1000<Date.now()+90e3)await sb.auth.refreshSession()}catch(e){}}
async function refreshRun(manual){
  await authFresh();
  if(!ME||PX||AIBUSY||PLANBUSY||CHATBUSY){if(manual)setSync("Şu an bir işlem sürüyor, birazdan tekrar dene");return}
  try{if(ROLE==="coach"){await pullCoach();await loadOD();await loadUnr();if(MV&&MSEL)await loadMsgs(MSEL);if(sel)await Promise.all([loadHist(sel),loadTasks(sel),loadExams(sel)].concat(manual?[loadTarget(sel),loadReport(sel),loadPlan(sel)]:[]))}else await Promise.all([pullStudent(),loadTasks(ME),loadUnr(),tab==="m"?msgSync():0]);render();setSync("Güncellendi "+hm(Date.now()))}catch(e){setSync("⚠️ Yenilenemedi, bağlantını kontrol et")}
}
// Yazı yazılırken ya da kaydedilmemiş form varken yenileme atlanmaz, ertelenir (sonra yeniden denenir).
const refresh=()=>{clearTimeout(rt);rt=setTimeout(()=>{if(busy()){refresh();return}refreshRun(false)},2500)};
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&ME)authFresh().then(refresh)});
async function start(){
  const app=document.getElementById("app");
  const {data:{session}}=await sb.auth.getSession();
  if(!session){showLogin();return}
  ME=session.user.id;
  let {data:p,error:pe}=await sb.from("profiles").select("name,role").eq("id",ME).maybeSingle();
  // Bağlantı yoksa öğrenci, cihazdaki son bilgilerle çevrimdışı devam edebilir (kayıtlar bağlantı gelince gönderilir).
  const PK="karakis-prof-"+ME;
  if(pe){let c=null;try{c=JSON.parse(localStorage.getItem(PK)||"null")}catch(e){}
    if(c&&c.role==="student"){p=c;setTimeout(()=>setSync("⚠️ Çevrimdışı: kayıtların cihazda tutuluyor, bağlantı gelince gönderilecek"),500)}
    else{ME=null;showLogin("Sunucuya ulaşılamadı. İnternetini kontrol edip sayfayı yenile.");return}}
  else if(p){try{localStorage.setItem(PK,JSON.stringify({name:p.name,role:p.role}))}catch(e){}}
  if(!p){await sb.auth.signOut();ME=null;showLogin("Profil bulunamadı, koçuna haber ver.");return}
  NAME=p.name;ROLE=p.role;view=ROLE==="coach"?"c":"s";
  document.getElementById("who").textContent=NAME+" · ";document.getElementById("out").hidden=false;document.body.classList.toggle("stu",ROLE==="student");document.body.classList.toggle("coach",ROLE==="coach");if(ROLE==="student")setTimeout(()=>{try{tcInit()}catch(e){}},4500);
  if(ROLE==="coach"){await pullCoach();await loadOD();await Promise.all([loadUnr(),loadSettings(),loadWaStatus()]);["daily","goals","notes","exam_results","weekly_tasks"].reduce((ch,t)=>ch.on("postgres_changes",{event:"*",schema:"public",table:t},refresh),sb.channel("koc")).subscribe();
    // Mesajlar anında işlenir (yazılan taslak silinmeden); sayaçlar ayrıca periyodik yenilemede güncellenir.
    try{sb.channel("kocmsg").on("postgres_changes",{event:"*",schema:"public",table:"messages"},msgLive).subscribe()}catch(e){}
    setInterval(refresh,60000)}
  else{await loadStudent();await loadUnr();try{sb.channel("m"+ME).on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:"student_id=eq."+ME},msgLive).subscribe()}catch(e){}setInterval(refresh,45000);setInterval(()=>{if(rollover()){save();render()}},30000);pushState().then(()=>{if(tab==='h')render()})}
  navInit();
  // Bildirime dokunulunca (#mesaj) öğrenci doğrudan Koçum sohbetinde açılır.
  if(ROLE==="student"&&/^#mesaj/.test(location.hash)){tab="m";try{history.replaceState(history.state,"",location.pathname+location.search)}catch(e){}}
  render();
}
if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",e=>{const u=e.data&&e.data.go;if(u&&/#mesaj/.test(u)&&ROLE==="student"){tab="m";QA=false;render();window.scrollTo(0,0)}});
document.addEventListener("input",e=>{if(e.target.dataset&&e.target.dataset.rx!=null||e.target.id==="ext")recalcExam()});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="lp")doLogin();if(e.key==="Enter"&&e.target.id==="cin")aiChatSend()});
(function(){
  const root=document.documentElement,btn=document.getElementById("theme"),tc=document.getElementById("tc");
  const paint=()=>{const d=root.getAttribute("data-theme")!=="light";btn.textContent=d?"☀ Sabah":"☾ Gece";tc.setAttribute("content",d?"#0B1020":"#C93A20")};
  btn.addEventListener("click",()=>{const n=root.getAttribute("data-theme")==="light"?"dark":"light";root.setAttribute("data-theme",n);try{localStorage.setItem("karakis-tema",n)}catch(e){}paint()});
  paint();setTimeout(()=>document.body.classList.remove("intro"),4050);
})();
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
if(SUPABASE_URL.includes("PROJE-KODU"))document.getElementById("app").innerHTML=`<div class="card"><h2>Kurulum gerekli</h2><p>index.html içindeki SUPABASE_URL ve SUPABASE_KEY değerlerini kendi projenle değiştir (README.md, 4. adım).</p></div>`;
else start().catch(e=>{showLogin("Bağlantı hatası: "+e.message)});
