/* Haftalık veli raporu (PDF): koç panelinden, seçilen 7 günün çalışma, soru, ders, görev ve deneme verisini
   grafiklerle A4 sayfada açar; geçen 7 günle ve son 4 haftayla karşılaştırır. "PDF olarak kaydet" yazdırma penceresinden yapılır.
   Çizim vp-charts.js'te (veli sayfasıyla ortak). Gizlilik: uyku, ruh hali, stres ve gizli koç notları rapora girmez. */

/* Logo, yazdırma penceresinde de görünsün diye veri adresine çevrilir (yeni pencerede resim yüklenmesini beklemez). */
let VPLOGO=null;
async function vpLogo(){
  if(VPLOGO)return VPLOGO;
  try{const r=await fetch("logo.png",{cache:"force-cache"});const bl=await r.blob();VPLOGO=await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(bl)})}catch(e){VPLOGO=location.origin+"/logo.png"}
  return VPLOGO;
}
/* ---- veri: 28 gün (son 4 hafta grafiği için) ---- */
async function vpData(sid,end){
  const s28=vpAdd(end,-27),s7=vpAdd(end,-6);
  const [d,t]=await Promise.all([
    sb.from("daily").select("day,state,snap").eq("student_id",sid).gte("day",s28).lte("day",end),
    sb.from("weekly_tasks").select("title,subject,task_date,done").eq("student_id",sid).gte("task_date",s7).lte("task_date",end).order("task_date")
  ]);
  if(d&&d.error)throw new Error("Günlük kayıtlar okunamadı");
  if(!(sid in EX)||!EX[sid])await loadExams(sid);
  if(typeof loadTarget==="function"&&!(sid in TG))await loadTarget(sid);
  const today=day(),now=Date.now(),days={};
  ((d&&d.data)||[]).forEach(r=>{
    const k=String(r.day).slice(0,10),s=r.state||{},a=r.snap||{},qs=Array.isArray(s.qs)?s.qs:[];
    let m=num(a.m);
    if(k===today&&s.day===k){const c=s.cur,net=num(s.done)+(c?(s.status==="break"?num(c.bs):now)-num(c.start)-num(c.brk):0);m=Math.max(m,Math.round(Math.max(0,net)/60000))}
    else m=Math.max(m,Math.round(num(s.done)/60000));
    const subt={};if(s.subt&&typeof s.subt==="object")Object.keys(s.subt).forEach(n=>{subt[n]=num(s.subt[n])/60000});
    days[k]={m,q:Math.max(num(a.q),qs.reduce((x,y)=>x+num(y.n),0)),c:Math.max(num(a.c),qs.reduce((x,y)=>x+num(y.c),0)),subt,qs};
  });
  const st=STU.find(p=>p.id===sid)||{};
  return vpBuild({name:st.name,end,days,tasks:(t&&t.data)||[],ex:EX[sid]||[],tg:typeof tgPick==="function"?tgPick(sid):null,norm:subjNorm});
}
function vpHtml(D,note,warn){
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${vpX(D.name)} – Haftalık Rapor (${vpX(vpFmt(D.s7,{day:"numeric",month:"short"}))}–${vpX(vpFmt(D.end,{day:"numeric",month:"short"}))})</title><style>${vpCss()}</style></head><body>
<div class="bar"><label>Hafta sonu <input type="date" id="vpEnd" value="${D.end}" max="${day()}"></label><button id="vpPrint">📄 PDF olarak kaydet / Yazdır</button></div>${warn?`<div class="warn">${vpX(warn)}</div>`:""}
${vpBody(D,{logo:VPLOGO||location.origin+"/logo.png",note,editable:true})}</body></html>`;
}
const VPN={};// pencere açıkken koçun yazdığı not (hafta değişince korunur)
async function vpOpen(sid,end,w){
  if(!w)delete VPN[sid];
  w=w||window.open("","_blank");if(!w){alert("Pop-up engellendi. Tarayıcıda bu site için açılır pencereye izin ver.");return}
  if(!w.document.body||!w.document.getElementById("vpEnd")){w.document.open();w.document.write("<p style='font-family:sans-serif;padding:20px'>Haftalık rapor hazırlanıyor…</p>");w.document.close()}
  try{
    end=end&&/^\d{4}-\d{2}-\d{2}$/.test(end)&&end<=day()?end:day();
    const [D]=await Promise.all([vpData(sid,end),vpLogo()]);
    const ta=document.getElementById("rpt"),R=RPT[sid],nn=((C.notes[sid]||[]).filter(n=>!n.p).slice(-1)[0]||{}).x||"";
    const note=ta&&ta.value.trim()?ta.value.trim():R&&R.res&&R.res.veli?R.res.veli:nn;
    const c=typeof consLast==="function"&&CONS[sid]?consLast(sid,"veli_riza"):undefined;
    const warn=CONS[sid]&&(!c||!c.granted)?"Bu öğrenci için veli rızası kayıtlı değil. Raporu göndermeden önce KVKK izinlerini kaydetmen önerilir (Diğer → KVKK ve veli bağlantısı).":"";
    w.document.open();w.document.write(vpHtml(D,sid in VPN?VPN[sid]:note,warn));w.document.close();
    const g=id=>w.document.getElementById(id);
    g("vpPrint").addEventListener("click",()=>w.print());
    g("vpNote").addEventListener("input",e=>{const n=e.target;VPN[sid]=n.innerText.trim();if(!VPN[sid])n.innerHTML=""});
    g("vpEnd").addEventListener("change",e=>vpOpen(sid,e.target.value,w));
  }catch(e){w.document.body.textContent="Rapor oluşturulamadı: "+(e&&e.message||e)}
}

/* ---- bağlantılar: Haftalık rapor kartına düğme ---- */
(function(){
  const pr=reportCard;
  reportCard=function(x){
    if(typeof consLoad==="function")consLoad(x.id);
    return pr.apply(this,arguments).replace(`<button class="chip" data-rpdf="${x.id}">`,`<button class="chip vpgo" data-vpdf="${x.id}">📊 Haftalık veli raporu (PDF)</button><button class="chip" data-rpdf="${x.id}">`);
  };
  const pu=ui;
  ui=function(t){const D=t.dataset||{};if(D.vpdf){vpOpen(D.vpdf);return true}return pu.apply(this,arguments)};
})();
