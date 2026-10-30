/* Haftalık veli raporu (PDF): koç panelinden, seçilen 7 günün çalışma, soru, ders, görev ve deneme verisini
   grafiklerle A4 sayfada açar; geçen 7 günle karşılaştırır. "PDF olarak kaydet" yazdırma penceresinden yapılır.
   Gizlilik: uyku, ruh hali, stres ve gizli koç notları rapora girmez. */
const VP={C:"#C93A20",N:"#1B2A4A",M:"#5C6785",G:"#C9BFAE",L:"#EADFCA",S:"#FFF4E2",OK:"#2F7D57",DN:"#B35F00"};
const vpHm=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60),k=m%60;return h?(k?h+" sa "+k+" dk":h+" sa"):k+" dk"};
const vpShort=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60),k=m%60;return h?h+"s "+String(k).padStart(2,"0")+"d":k+" dk"};
const vpDate=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const vpAdd=(s,k)=>{const d=vpDate(s);d.setDate(d.getDate()+k);return ymd(d)};
const vpFmt=(s,o)=>vpDate(s).toLocaleDateString("tr-TR",o||{day:"numeric",month:"long"});
const vpX=s=>esc(String(s==null?"":s));

/* Logo, yazdırma penceresinde de görünsün diye veri adresine çevrilir (yeni pencerede resim yüklenmesini beklemez). */
let VPLOGO=null;
async function vpLogo(){
  if(VPLOGO)return VPLOGO;
  try{const r=await fetch("logo.png",{cache:"force-cache"});const bl=await r.blob();VPLOGO=await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(bl)})}catch(e){VPLOGO=location.origin+"/logo.png"}
  return VPLOGO;
}
/* ---- veri ---- */
async function vpData(sid,end){
  const s14=vpAdd(end,-13),s7=vpAdd(end,-6);
  const [d,t]=await Promise.all([
    sb.from("daily").select("day,state,snap").eq("student_id",sid).gte("day",s14).lte("day",end),
    sb.from("weekly_tasks").select("title,subject,task_date,done").eq("student_id",sid).gte("task_date",s7).lte("task_date",end).order("task_date")
  ]);
  if(d&&d.error)throw new Error("Günlük kayıtlar okunamadı");
  if(!(sid in EX)||!EX[sid])await loadExams(sid);
  if(typeof loadTarget==="function"&&!(sid in TG))await loadTarget(sid);
  const by={};((d&&d.data)||[]).forEach(r=>by[String(r.day).slice(0,10)]=r);
  const today=day(),now=Date.now();
  const dayOf=k=>{
    const r=by[k],s=(r&&r.state)||{},a=(r&&r.snap)||{},qs=Array.isArray(s.qs)?s.qs:[];
    let m=num(a.m);
    if(k===today&&s.day===k){const c=s.cur,net=num(s.done)+(c?(s.status==="break"?num(c.bs):now)-num(c.start)-num(c.brk):0);m=Math.max(m,Math.round(Math.max(0,net)/60000))}
    else m=Math.max(m,Math.round(num(s.done)/60000));
    m=Math.min(1440,m);
    const q=Math.max(num(a.q),qs.reduce((x,y)=>x+num(y.n),0)),c=Math.max(num(a.c),qs.reduce((x,y)=>x+num(y.c),0));
    return {d:k,m,q,c,subt:s.subt&&typeof s.subt==="object"?s.subt:{},qs};
  };
  const cur=[],prev=[];for(let i=0;i<7;i++){cur.push(dayOf(vpAdd(s7,i)));prev.push(dayOf(vpAdd(s14,i)))}
  // derslere göre süre ve soru (yalnızca seçilen hafta)
  const sub={};
  cur.forEach(x=>{
    Object.keys(x.subt).forEach(k=>{const n=subjNorm(k);(sub[n]=sub[n]||{m:0,q:0,c:0}).m+=num(x.subt[k])/60000});
    x.qs.forEach(q=>{const n=subjNorm(q.s);const o=(sub[n]=sub[n]||{m:0,q:0,c:0});o.q+=num(q.n);o.c+=num(q.c)});
  });
  const subj=Object.entries(sub).map(([n,o])=>({n,m:Math.round(o.m),q:o.q,c:o.c})).filter(o=>o.m>=5||o.q>0).sort((a,b)=>b.m-a.m||b.q-a.q);
  const tasks=(t&&t.data)||[];
  const ex=(EX[sid]||[]).filter(e=>e.total_net!=null&&(!e.exam_date||String(e.exam_date).slice(0,10)<=end)).slice(-8);
  return {cur,prev,subj,tasks,ex,s7,end,tg:typeof tgPick==="function"?tgPick(sid):null};
}

/* ---- grafikler (SVG, baskıya uygun) ---- */
function vpBars(cur,prev,key,fmt,title){
  const W=700,H=196,top=26,bot=38,ch=H-top-bot,sw=W/7,bw=Math.min(58,sw*.56);
  const mx=Math.max(key==="m"?60:10,...cur.map(x=>x[key]),...prev.map(x=>x[key]));
  const y=v=>top+ch-(v/mx)*ch;
  let g=`<line x1="0" y1="${top+ch}" x2="${W}" y2="${top+ch}" stroke="${VP.L}"/>`;
  cur.forEach((x,i)=>{
    const cx=sw*i+sw/2,v=x[key],pv=prev[i][key],h=Math.max(v?3:0,(v/mx)*ch),lab=vpFmt(x.d,{weekday:"short"}),dn=vpDate(x.d).getDate();
    g+=v?`<rect x="${cx-bw/2}" y="${top+ch-h}" width="${bw}" height="${h}" rx="5" fill="${VP.C}"/>`:`<rect x="${cx-bw/2}" y="${top+ch-3}" width="${bw}" height="3" rx="1.5" fill="${VP.L}"/>`;
    if(pv>0)g+=`<line x1="${cx-bw/2-5}" x2="${cx+bw/2+5}" y1="${y(pv)}" y2="${y(pv)}" stroke="${VP.N}" stroke-width="2.2" stroke-dasharray="4 3" opacity=".55"/>`;
    g+=`<text x="${cx}" y="${(v?top+ch-h:top+ch-3)-7}" text-anchor="middle" font-size="12.5" font-weight="800" fill="${v?VP.N:VP.M}">${v?fmt(v):"–"}</text>`;
    g+=`<text x="${cx}" y="${H-18}" text-anchor="middle" font-size="12" font-weight="700" fill="${VP.N}">${vpX(lab)}</text><text x="${cx}" y="${H-4}" text-anchor="middle" font-size="11" fill="${VP.M}">${dn}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${vpX(title)}">${g}</svg>`;
}
function vpSubj(L){
  if(!L.length)return `<p class="nd">Bu hafta derse göre süre veya soru kaydı yok.</p>`;
  L=L.slice(0,8);
  const W=700,rh=34,lw=150,rw=190,bw=W-lw-rw-16,H=L.length*rh+4,mx=Math.max(1,...L.map(o=>o.m)),hasM=L.some(o=>o.m>0),mq=Math.max(1,...L.map(o=>o.q));
  let g="";
  L.forEach((o,i)=>{
    const yy=i*rh+4,v=hasM?o.m:o.q,w=Math.max(v?4:0,(v/(hasM?mx:mq))*bw),acc=o.q&&o.c?Math.round(o.c/o.q*100):null;
    g+=`<text x="0" y="${yy+20}" font-size="13" font-weight="700" fill="${VP.N}">${vpX(o.n.length>20?o.n.slice(0,19)+"…":o.n)}</text>`;
    g+=`<rect x="${lw}" y="${yy+7}" width="${bw}" height="18" rx="9" fill="${VP.S}"/><rect x="${lw}" y="${yy+7}" width="${w}" height="18" rx="9" fill="${i===0?VP.C:VP.N}" opacity="${i===0?1:.78}"/>`;
    g+=`<text x="${lw+bw+12}" y="${yy+20}" font-size="12.5" fill="${VP.N}"><tspan font-weight="800">${hasM?vpHm(o.m):o.q+" soru"}</tspan>${hasM&&o.q?`<tspan fill="${VP.M}"> · ${o.q} soru</tspan>`:""}${acc!=null?`<tspan fill="${VP.M}"> · %${acc}</tspan>`:""}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Derslere göre çalışma">${g}</svg>`;
}
function vpRing(done,total){
  const r=46,c=2*Math.PI*r,p=total?done/total:0;
  return `<svg viewBox="0 0 120 120" width="118" height="118" role="img" aria-label="Görev tamamlama %${Math.round(p*100)}"><circle cx="60" cy="60" r="${r}" fill="none" stroke="${VP.S}" stroke-width="14"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${VP.OK}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(c*p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="58" text-anchor="middle" font-size="24" font-weight="800" fill="${VP.N}">${total?"%"+Math.round(p*100):"–"}</text><text x="60" y="78" text-anchor="middle" font-size="11" fill="${VP.M}">${done}/${total} görev</text></svg>`;
}
function vpExams(L,from,tg){
  if(L.length<2)return L.length?`<p class="nd">Tek deneme kaydı var: <b>${vpX(L[0].exam_name||L[0].exam_type)}</b> · ${Math.round(+L[0].total_net*100)/100} net. Grafik ikinci denemeden sonra çizilir.</p>`:`<p class="nd">Henüz deneme sonucu yüklenmemiş.</p>`;
  const W=700,H=200,px=40,top=24,bot=36,P=L.map(e=>({v:Math.round(+e.total_net*100)/100,d:String(e.exam_date||"").slice(0,10),n:e.exam_name||e.exam_type||"Deneme"}));
  const tn=tg&&tg.target_net!=null?+tg.target_net:null,vals=P.map(p=>p.v).concat(tn!=null?[tn]:[]);
  const lo=Math.max(0,Math.floor(Math.min(...vals)-5)),hi=Math.ceil(Math.max(...vals)+5),sx=i=>px+i*(W-px-24)/(P.length-1),sy=v=>top+(H-top-bot)-(v-lo)/(hi-lo||1)*(H-top-bot);
  let g=`<line x1="${px}" y1="${H-bot}" x2="${W-8}" y2="${H-bot}" stroke="${VP.L}"/>`;
  if(tn!=null)g+=`<line x1="${px}" x2="${W-8}" y1="${sy(tn)}" y2="${sy(tn)}" stroke="${VP.OK}" stroke-width="1.6" stroke-dasharray="6 4"/><text x="${W-10}" y="${sy(tn)-6}" text-anchor="end" font-size="11" font-weight="700" fill="${VP.OK}">Hedef ${tn}</text>`;
  g+=`<polyline fill="none" stroke="${VP.N}" stroke-width="2.6" points="${P.map((p,i)=>sx(i)+","+sy(p.v)).join(" ")}"/>`;
  P.forEach((p,i)=>{const nw=p.d&&p.d>=from;g+=`<circle cx="${sx(i)}" cy="${sy(p.v)}" r="${nw?6.5:4.5}" fill="${nw?VP.C:VP.N}" stroke="#fff" stroke-width="2"/><text x="${sx(i)}" y="${sy(p.v)-11}" text-anchor="middle" font-size="12" font-weight="800" fill="${nw?VP.C:VP.N}">${p.v}</text><text x="${sx(i)}" y="${H-bot+16}" text-anchor="middle" font-size="10.5" fill="${VP.M}">${p.d?vpX(vpFmt(p.d,{day:"numeric",month:"short"})):"–"}</text>`});
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Deneme netleri">${g}</svg>`;
}

/* ---- sayfa ---- */
function vpDelta(a,b,fmt){
  const d=a-b;if(!b&&!a)return `<i class="z">geçen hafta da kayıt yok</i>`;
  if(!b)return `<i class="up">geçen hafta kayıt yoktu</i>`;
  if(!d)return `<i class="z">geçen haftayla aynı</i>`;
  return `<i class="${d>0?"up":"dn"}">${d>0?"▲ +":"▼ −"}${fmt(Math.abs(d))} geçen haftaya göre</i>`;
}
function vpHtml(sid,D,note,warn){
  const st=STU.find(p=>p.id===sid)||{},ad=st.name||"Öğrencimiz",first=ad.trim().split(/\s+/)[0];
  const sum=(L,k)=>L.reduce((a,x)=>a+x[k],0),cm=sum(D.cur,"m"),pm=sum(D.prev,"m"),cq=sum(D.cur,"q"),pq=sum(D.prev,"q"),cc=sum(D.cur,"c");
  const ca=D.cur.filter(x=>x.m>0||x.q>0).length,pa=D.prev.filter(x=>x.m>0||x.q>0).length;
  const tt=D.tasks.length,td=D.tasks.filter(t=>t.done).length,open=D.tasks.filter(t=>!t.done);
  const best=D.cur.reduce((a,x)=>x.m>a.m?x:a,D.cur[0]),top=D.subj[0],acc=cq&&cc?Math.round(cc/cq*100):null;
  const exW=D.ex.filter(e=>String(e.exam_date||"").slice(0,10)>=D.s7),lastE=D.ex[D.ex.length-1],prevE=D.ex[D.ex.length-2];
  const head=cm||cq?`${vpX(first)} bu hafta <b>${ca} gün</b> çalıştı; toplam <b>${vpHm(cm)}</b> çalışma ve <b>${cq}</b> soru.${pm||pq?` Geçen hafta: ${vpHm(pm)} ve ${pq} soru.`:""}`:`${vpX(first)} için bu hafta uygulamaya çalışma kaydı girilmedi.`;
  const hl=[];
  if(best&&best.m)hl.push(`En verimli gün <b>${vpX(vpFmt(best.d,{weekday:"long"}))}</b>: ${vpHm(best.m)}${best.q?", "+best.q+" soru":""}.`);
  if(top)hl.push(`En çok çalışılan ders <b>${vpX(top.n)}</b>${top.m?": "+vpHm(top.m):""}${top.q?" ("+top.q+" soru)":""}.`);
  if(acc!=null)hl.push(`Çözülen sorularda doğru oranı <b>%${acc}</b> (${cc} doğru / ${cq} soru).`);
  if(exW.length&&lastE)hl.push(`Bu hafta <b>${exW.length}</b> deneme: son net <b>${Math.round(+lastE.total_net*100)/100}</b>${prevE?` (önceki ${Math.round(+prevE.total_net*100)/100})`:""}.`);
  const kpi=(v,l,dl)=>`<div class="k"><span>${l}</span><b>${v}</b>${dl||""}</div>`;
  const css=`@page{size:A4;margin:11mm}*{box-sizing:border-box}body{margin:0;font:13px/1.5 "Nunito",system-ui,Arial,sans-serif;color:${VP.N};background:#e9e6df;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bar{position:sticky;top:0;z-index:5;background:${VP.N};color:#fff;padding:10px 12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;font:600 13px Arial,sans-serif}
.bar button{font:700 14px Arial,sans-serif;padding:9px 16px;border:0;border-radius:10px;background:${VP.C};color:#fff;cursor:pointer}.bar label{display:flex;gap:6px;align-items:center}.bar input{font:600 13px Arial,sans-serif;padding:6px 8px;border-radius:8px;border:0}
.warn{background:#FFE7C2;color:#6B3A00;padding:8px 12px;text-align:center;font:600 13px Arial,sans-serif}
.pg{max-width:794px;margin:14px auto;background:#fff;padding:26px 30px 22px;box-shadow:0 4px 18px rgba(0,0,0,.08)}
.top{display:flex;align-items:center;gap:14px;border-bottom:4px solid ${VP.C};padding-bottom:12px}.top img{width:64px;height:64px;border-radius:14px}.top h1{margin:0;font-size:18px;letter-spacing:.05em}.top small{display:block;color:${VP.M};font-size:11.5px}.top .tag{margin-left:auto;text-align:right;font-size:11px;color:${VP.M}}
.ttl{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin:16px 0 6px}.ttl h2{margin:0;font-size:22px}.ttl p{margin:0;color:${VP.M};font-size:12.5px;text-align:right}
.lead{font-size:15px;margin:4px 0 12px}.ks{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.k{background:${VP.S};border-radius:12px;padding:10px 12px}.k span{display:block;font-size:11px;color:${VP.M};font-weight:700;text-transform:uppercase;letter-spacing:.04em}.k b{display:block;font-size:21px;line-height:1.25;color:${VP.C}}.k i{font-style:normal;font-size:11px;font-weight:700}.up{color:${VP.OK}}.dn{color:${VP.DN}}.z{color:${VP.M}}
section{margin-top:16px;break-inside:avoid}h3{font-size:14.5px;margin:0 0 4px;padding-left:9px;border-left:4px solid ${VP.C}}.sub{margin:0 0 6px 13px;color:${VP.M};font-size:12px}
.lg{display:inline-flex;align-items:center;gap:5px;margin-right:12px}.lg i{display:inline-block;width:12px;height:10px;border-radius:3px;background:${VP.C}}.lg i.p{background:none;border-top:2.2px dashed ${VP.N};opacity:.55;height:0;border-radius:0;width:16px}
.two{display:grid;grid-template-columns:150px 1fr;gap:16px;align-items:center}.tl{margin:0;padding-left:18px}.tl li{margin:2px 0}.tl small{color:${VP.M}}
ul.hl{margin:6px 0 0;padding-left:18px}ul.hl li{margin:3px 0}.nd{color:${VP.M};margin:6px 0 0 13px}
.note{border:1.5px dashed ${VP.L};border-radius:12px;padding:10px 12px;min-height:56px;white-space:pre-wrap;outline:none}.note:empty::before{content:attr(data-ph);color:${VP.M}}
.ft{margin-top:18px;padding-top:9px;border-top:1px solid ${VP.L};font-size:10.5px;color:${VP.M};display:flex;justify-content:space-between;gap:14px}
@media (max-width:640px){.pg{padding:16px 14px;margin:0}.ks{grid-template-columns:repeat(2,1fr)}.two{grid-template-columns:1fr}.top .tag{display:none}.ttl{flex-direction:column;align-items:flex-start}.ttl p{text-align:left}}
@media print{body{background:#fff}.bar,.warn{display:none}.pg{box-shadow:none;margin:0;padding:0;max-width:none}.note{border-color:#fff;padding:0}.note:empty{display:none}.hide-empty:has(.note:empty){display:none}}`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${vpX(ad)} – Haftalık Rapor (${vpX(vpFmt(D.s7,{day:"numeric",month:"short"}))}–${vpX(vpFmt(D.end,{day:"numeric",month:"short"}))})</title><style>${css}</style></head><body>
<div class="bar"><label>Hafta sonu <input type="date" id="vpEnd" value="${D.end}" max="${day()}"></label><button id="vpPrint">📄 PDF olarak kaydet / Yazdır</button></div>${warn?`<div class="warn">${vpX(warn)}</div>`:""}
<div class="pg">
<div class="top"><img src="${VPLOGO||location.origin+"/logo.png"}" alt="Karakış"><div><h1>KARAKIŞ EĞİTİM &amp; DANIŞMANLIK</h1><small>Bireysel eğitim koçluğu · Deneme analizi · Psikolojik danışmanlık</small></div><div class="tag">Pd. Hasan Karakış<br>Kayapınar / Diyarbakır<br>takip.hasankarakis.com</div></div>
<div class="ttl"><h2>Haftalık Veli Raporu</h2><p><b>${vpX(ad)}</b><br>${vpX(vpFmt(D.s7))} – ${vpX(vpFmt(D.end,{day:"numeric",month:"long",year:"numeric"}))}</p></div>
<p class="lead">${head}</p>
<div class="ks">${kpi(vpHm(cm),"Toplam çalışma",vpDelta(cm,pm,vpHm))}${kpi(cq,"Çözülen soru",vpDelta(cq,pq,v=>v))}${kpi(ca+"/7","Çalışılan gün",vpDelta(ca,pa,v=>v+" gün"))}${kpi(tt?"%"+Math.round(td/tt*100):"–","Görev tamamlama",`<i class="z">${tt?td+" / "+tt+" görev":"bu hafta görev yok"}</i>`)}</div>
${hl.length?`<section><h3>Haftanın öne çıkanları</h3><ul class="hl">${hl.map(x=>`<li>${x}</li>`).join("")}</ul></section>`:""}
<section><h3>Günlük çalışma süresi</h3><p class="sub"><span class="lg"><i></i>Bu hafta</span><span class="lg"><i class="p"></i>Geçen haftanın aynı günü</span>Günlük ortalama ${vpHm(cm/7)}</p>${vpBars(D.cur,D.prev,"m",vpHm,"Günlük çalışma süresi")}</section>
<section><h3>Günlük çözülen soru</h3><p class="sub"><span class="lg"><i></i>Bu hafta</span><span class="lg"><i class="p"></i>Geçen haftanın aynı günü</span>${acc!=null?"Doğru oranı %"+acc:""}</p>${vpBars(D.cur,D.prev,"q",v=>String(v),"Günlük çözülen soru")}</section>
<section><h3>Derslere göre dağılım</h3><p class="sub">Sayaçta seçilen derse göre süre; yanında soru sayısı ve doğru oranı.</p>${vpSubj(D.subj)}</section>
<section><h3>Görevler</h3>${tt?`<div class="two">${vpRing(td,tt)}<div>${open.length?`<p style="margin:0 0 4px"><b>Tamamlanmayan ${open.length} görev</b></p><ol class="tl">${open.slice(0,6).map(t=>`<li>${vpX(t.title)}${t.subject?` <small>· ${vpX(t.subject)}</small>`:""} <small>· ${vpX(vpFmt(String(t.task_date).slice(0,10),{day:"numeric",month:"short"}))}</small></li>`).join("")}</ol>${open.length>6?`<p class="nd" style="margin-left:0">ve ${open.length-6} görev daha</p>`:""}`:`<p style="margin:0"><b>Haftanın tüm görevleri tamamlandı.</b> 👏</p>`}</div></div>`:`<p class="nd">Bu hafta için görev atanmadı.</p>`}</section>
<section><h3>Deneme netleri</h3><p class="sub">Son ${Math.min(8,D.ex.length)} deneme; kırmızı noktalar bu haftanın denemeleri.</p>${vpExams(D.ex,D.s7,D.tg)}</section>
<section class="hide-empty"><h3>Koçun notu</h3><div class="note" id="vpNote" contenteditable="true" data-ph="Veliye iletmek istediğiniz notu buraya yazın (yazdırmadan önce). Boş bırakılırsa bu bölüm PDF'te görünmez.">${vpX(note||"")}</div></section>
<div class="ft"><span>Bu rapor öğrencinin uygulamaya girdiği çalışma, görev ve deneme kayıtlarından hazırlanmıştır. Uyku ve ruh hali bilgileri paylaşılmaz.</span><span>© Karakış Eğitim &amp; Danışmanlık</span></div></div></body></html>`;
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
    w.document.open();w.document.write(vpHtml(sid,D,sid in VPN?VPN[sid]:note,warn));w.document.close();
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
