/* Haftalık veli raporu — ortak çizim. İki yerden kullanılır: koç PDF'i (veli-pdf.js) ve hesapsız veli sayfası (veli.js).
   Uygulama globallerine bağlı değildir (veli.html core.js yüklemez).
   Gizlilik: rapor yalnızca süre, soru, ders, görev ve deneme verisi alır; uyku, ruh hali, stres ve koç notları gelmez
   (koçun notunu yalnızca koç, PDF penceresinde elle yazar).
   Grafikler iki boyutta çizilir: geniş (baskı/PDF ve geniş ekran) ve dar (telefon); CSS hangisinin görüneceğini seçer. */
const VP={C:"#C93A20",N:"#1B2A4A",M:"#5C6785",G:"#C9BFAE",L:"#EADFCA",S:"#FFF4E2",OK:"#2F7D57",DN:"#B35F00",OKS:"#EAF4EE",DNS:"#FFF1DD"};
const vpN=v=>{v=Number(v);return isFinite(v)?v:0};
const vpX=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const vpYmd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const vpDate=s=>{const[y,m,d]=String(s).slice(0,10).split("-").map(Number);return new Date(y,m-1,d)};
const vpAdd=(s,k)=>{const d=vpDate(s);d.setDate(d.getDate()+k);return vpYmd(d)};
const vpFmt=(s,o)=>vpDate(s).toLocaleDateString("tr-TR",o||{day:"numeric",month:"long"});
const vpHm=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60),k=m%60;return h?(k?h+" sa "+k+" dk":h+" sa"):k+" dk"};
const vpH1=m=>{m=Math.max(0,Math.round(m));return m<60?m+" dk":(Math.round(m/6)/10).toLocaleString("tr-TR")+" sa"};// dar ekran: 2,8 sa
const vpNet=v=>(Math.round(vpN(v)*100)/100).toLocaleString("tr-TR");
const vpPct=(a,b)=>b?Math.round(a/b*100):0;
const vpWd=(s,f)=>vpFmt(s,{weekday:f||"long"});
const vpRange=(s,e)=>vpDate(s).getMonth()===vpDate(e).getMonth()?vpDate(s).getDate()+"–"+vpFmt(e,{day:"numeric",month:"short"}):vpFmt(s,{day:"numeric",month:"short"})+"–"+vpFmt(e,{day:"numeric",month:"short"});
/* Ders adı: "KİMYA" ile "Kimya" aynı satıra düşsün (koç tarafı kendi subjNorm'unu verir). */
function vpNorm(v){
  const t=String(v||"").trim().replace(/\s+/g," ");if(!t)return "Diğer";
  return (t===t.toLocaleUpperCase("tr-TR")&&t.length>3?t.toLocaleLowerCase("tr-TR").replace(/(^|[\s/])(\S)/g,(a,b,c)=>b+c.toLocaleUpperCase("tr-TR")):t).slice(0,40);
}

/* ---- veri ----
   o.days: {"YYYY-AA-GG": {m: dakika, q: soru, c: doğru, subt: {ders: dakika}, qs: [{s: ders, n: soru, c: doğru}]}}
   o.tasks: [{title, subject, task_date, done}] · o.ex: eskiden yeniye [{exam_name, exam_type, exam_date, total_net}]
   o.tg: {target_net, exam_type} | null · o.end: haftanın son günü (rapor end−6 … end arasını kapsar) */
function vpBuild(o){
  const norm=o.norm||vpNorm,end=o.end,s7=vpAdd(end,-6),s14=vpAdd(end,-13),days=o.days||{};
  const get=k=>{const x=days[k]||{};return {d:k,m:Math.min(1440,Math.max(0,Math.round(vpN(x.m)))),q:Math.max(0,Math.round(vpN(x.q))),c:Math.max(0,Math.round(vpN(x.c))),subt:x.subt&&typeof x.subt==="object"?x.subt:{},qs:Array.isArray(x.qs)?x.qs:[]}};
  const span=(s,n)=>Array.from({length:n},(_,i)=>get(vpAdd(s,i)));
  const cur=span(s7,7),prev=span(s14,7);
  const weeks=[3,2,1,0].map(w=>{const e=vpAdd(end,-7*w),s=vpAdd(e,-6),L=span(s,7);return {s,e,m:L.reduce((a,x)=>a+x.m,0),q:L.reduce((a,x)=>a+x.q,0),a:L.filter(x=>x.m>0||x.q>0).length}});
  const sub={},add=n=>sub[n]=sub[n]||{m:0,q:0,c:0};
  cur.forEach(x=>{
    Object.keys(x.subt).forEach(k=>{add(norm(k)).m+=vpN(x.subt[k])});
    x.qs.forEach(q=>{const v=add(norm(q.s));v.q+=vpN(q.n);v.c+=vpN(q.c)});
  });
  const subj=Object.entries(sub).map(([n,v])=>({n,m:Math.round(v.m),q:Math.round(v.q),c:Math.round(v.c)})).filter(v=>v.m>=5||v.q>0).sort((a,b)=>b.m-a.m||b.q-a.q);
  const tasks=(o.tasks||[]).filter(t=>{const d=String(t.task_date||"").slice(0,10);return d>=s7&&d<=end}).sort((a,b)=>String(a.task_date).localeCompare(String(b.task_date)));
  const ex=(o.ex||[]).filter(e=>e.total_net!=null&&(!e.exam_date||String(e.exam_date).slice(0,10)<=end)).slice(-8);
  return {name:o.name||"Öğrencimiz",end,s7,cur,prev,weeks,subj,tasks,ex,tg:o.tg||null};
}

/* ---- grafikler (SVG; W = çizim genişliği, 700 geniş / 360 dar) ---- */
function vpBars(cur,prev,key,title,W){
  W=W||700;const nw=W<500,H=nw?176:172,top=26,bot=nw?34:38,ch=H-top-bot,sw=W/7,bw=Math.min(58,sw*.58),fs=nw?11:12.5;
  const fmt=key==="m"?(nw?vpH1:vpHm):v=>String(v);
  const mx=Math.max(key==="m"?60:10,...cur.map(x=>x[key]),...prev.map(x=>x[key]));
  const y=v=>top+ch-(v/mx)*ch;
  let g=`<line x1="0" y1="${top+ch}" x2="${W}" y2="${top+ch}" stroke="${VP.L}"/>`;
  cur.forEach((x,i)=>{
    const cx=sw*i+sw/2,v=x[key],pv=prev[i][key],h=Math.max(v?3:0,(v/mx)*ch);
    g+=v?`<rect x="${cx-bw/2}" y="${top+ch-h}" width="${bw}" height="${h}" rx="${nw?4:5}" fill="${VP.C}"/>`:`<rect x="${cx-bw/2}" y="${top+ch-3}" width="${bw}" height="3" rx="1.5" fill="${VP.L}"/>`;
    if(pv>0)g+=`<line x1="${cx-bw/2-4}" x2="${cx+bw/2+4}" y1="${y(pv)}" y2="${y(pv)}" stroke="${VP.N}" stroke-width="2.2" stroke-dasharray="4 3" opacity=".55"/>`;
    g+=`<text x="${cx}" y="${(v?top+ch-h:top+ch-3)-7}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${v?VP.N:VP.M}">${v?fmt(v):"–"}</text>`;
    g+=`<text x="${cx}" y="${H-(nw?16:18)}" text-anchor="middle" font-size="${nw?11:12}" font-weight="700" fill="${VP.N}">${vpX(vpWd(x.d,"short"))}</text><text x="${cx}" y="${H-3}" text-anchor="middle" font-size="${nw?10:11}" fill="${VP.M}">${vpDate(x.d).getDate()}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${vpX(title)}">${g}</svg>`;
}
function vpTrend(Wk,W){
  W=W||700;const nw=W<500,H=nw?188:178,top=26,bot=44,ch=H-top-bot,sw=W/Wk.length,bw=Math.min(nw?50:88,sw*.5),fs=nw?11.5:13;
  const mx=Math.max(60,...Wk.map(w=>w.m));
  let g=`<line x1="0" y1="${top+ch}" x2="${W}" y2="${top+ch}" stroke="${VP.L}"/>`;
  Wk.forEach((w,i)=>{
    const cx=sw*i+sw/2,h=Math.max(w.m?3:0,(w.m/mx)*ch),last=i===Wk.length-1;
    g+=w.m?`<rect x="${cx-bw/2}" y="${top+ch-h}" width="${bw}" height="${h}" rx="6" fill="${last?VP.C:VP.N}" opacity="${last?1:.42}"/>`:`<rect x="${cx-bw/2}" y="${top+ch-3}" width="${bw}" height="3" rx="1.5" fill="${VP.L}"/>`;
    g+=`<text x="${cx}" y="${(w.m?top+ch-h:top+ch-3)-8}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${last?VP.C:VP.N}">${w.m?(nw?vpH1:vpHm)(w.m):"–"}</text>`;
    g+=`<text x="${cx}" y="${H-24}" text-anchor="middle" font-size="${nw?10.5:12}" font-weight="700" fill="${VP.N}">${vpX(last?"Bu hafta":vpRange(w.s,w.e))}</text><text x="${cx}" y="${H-8}" text-anchor="middle" font-size="${nw?10:11}" fill="${VP.M}">${w.q} soru · ${w.a} gün</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Son 4 haftanın çalışma süresi">${g}</svg>`;
}
function vpSubj(L,W){
  if(!L.length)return `<p class="nd">Bu hafta derse göre süre veya soru kaydı yok.</p>`;
  W=W||700;L=L.slice(0,8);const nw=W<500;
  const mx=Math.max(1,...L.map(o=>o.m)),hasM=L.some(o=>o.m>0),mq=Math.max(1,...L.map(o=>o.q));
  const val=o=>hasM?o.m:o.q,scale=hasM?mx:mq,acc=o=>o.q&&o.c?vpPct(o.c,o.q):null;
  const info=o=>`<tspan font-weight="800">${hasM&&o.m?(nw?vpH1(o.m):vpHm(o.m)):o.q+" soru"}</tspan>${hasM&&o.m&&o.q?`<tspan fill="${VP.M}"> · ${o.q} soru</tspan>`:""}${acc(o)!=null?`<tspan fill="${VP.M}"> · %${acc(o)}</tspan>`:""}`;
  let g="",H;
  if(nw){// dar: ad ve değer üstte, çubuk altta (yazılar okunur kalsın)
    const rh=46;H=L.length*rh+2;
    L.forEach((o,i)=>{const yy=i*rh,w=Math.max(val(o)?4:0,(val(o)/scale)*W);
      g+=`<text x="0" y="${yy+16}" font-size="13" font-weight="700" fill="${VP.N}">${vpX(o.n.length>16?o.n.slice(0,15)+"…":o.n)}</text><text x="${W}" y="${yy+16}" text-anchor="end" font-size="12" fill="${VP.N}">${info(o)}</text>`;
      g+=`<rect x="0" y="${yy+23}" width="${W}" height="14" rx="7" fill="${VP.S}"/><rect x="0" y="${yy+23}" width="${w}" height="14" rx="7" fill="${i===0?VP.C:VP.N}" opacity="${i===0?1:.78}"/>`});
  }else{
    const rh=34,lw=150,rw=200,bw=W-lw-rw-16;H=L.length*rh+4;
    L.forEach((o,i)=>{const yy=i*rh+4,w=Math.max(val(o)?4:0,(val(o)/scale)*bw);
      g+=`<text x="0" y="${yy+20}" font-size="13" font-weight="700" fill="${VP.N}">${vpX(o.n.length>20?o.n.slice(0,19)+"…":o.n)}</text>`;
      g+=`<rect x="${lw}" y="${yy+7}" width="${bw}" height="18" rx="9" fill="${VP.S}"/><rect x="${lw}" y="${yy+7}" width="${w}" height="18" rx="9" fill="${i===0?VP.C:VP.N}" opacity="${i===0?1:.78}"/>`;
      g+=`<text x="${lw+bw+12}" y="${yy+20}" font-size="12.5" fill="${VP.N}">${info(o)}</text>`});
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Derslere göre çalışma">${g}</svg>`;
}
function vpRing(done,total){
  const r=46,c=2*Math.PI*r,p=total?done/total:0;
  return `<svg viewBox="0 0 120 120" width="118" height="118" role="img" aria-label="Görev tamamlama %${Math.round(p*100)}"><circle cx="60" cy="60" r="${r}" fill="none" stroke="${VP.S}" stroke-width="14"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${VP.OK}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(c*p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="58" text-anchor="middle" font-size="24" font-weight="800" fill="${VP.N}">${total?"%"+Math.round(p*100):"–"}</text><text x="60" y="78" text-anchor="middle" font-size="11" fill="${VP.M}">${done}/${total} görev</text></svg>`;
}
function vpExams(L,from,tg,W){
  if(L.length<2)return L.length?`<p class="nd">Tek deneme kaydı var: <b>${vpX(L[0].exam_name||L[0].exam_type||"Deneme")}</b> · ${vpNet(L[0].total_net)} net. Grafik ikinci denemeden sonra çizilir.</p>`:`<p class="nd">Henüz deneme sonucu yüklenmemiş.</p>`;
  W=W||700;const nw=W<500,H=nw?184:178,px=nw?24:40,top=24,bot=36,P=L.map(e=>({v:Math.round(vpN(e.total_net)*100)/100,d:String(e.exam_date||"").slice(0,10)}));
  const tn=tg&&tg.target_net!=null&&tg.target_net!==""?vpN(tg.target_net):null,vals=P.map(p=>p.v).concat(tn!=null?[tn]:[]);
  const lo=Math.max(0,Math.floor(Math.min(...vals)-5)),hi=Math.ceil(Math.max(...vals)+5),sx=i=>px+i*(W-px-(nw?18:24))/(P.length-1),sy=v=>top+(H-top-bot)-(v-lo)/(hi-lo||1)*(H-top-bot);
  const many=nw&&P.length>5;
  let g=`<line x1="${px}" y1="${H-bot}" x2="${W-4}" y2="${H-bot}" stroke="${VP.L}"/>`;
  if(tn!=null)g+=`<line x1="${px}" x2="${W-4}" y1="${sy(tn)}" y2="${sy(tn)}" stroke="${VP.OK}" stroke-width="1.6" stroke-dasharray="6 4"/><text x="${W-6}" y="${sy(tn)-6}" text-anchor="end" font-size="11" font-weight="700" fill="${VP.OK}">Hedef ${vpNet(tn)}</text>`;
  g+=`<polyline fill="none" stroke="${VP.N}" stroke-width="2.6" points="${P.map((p,i)=>sx(i)+","+sy(p.v)).join(" ")}"/>`;
  P.forEach((p,i)=>{const nwk=p.d&&p.d>=from,lab=!many||i===P.length-1||i%2===0;
    g+=`<circle cx="${sx(i)}" cy="${sy(p.v)}" r="${nwk?6.5:4.5}" fill="${nwk?VP.C:VP.N}" stroke="#fff" stroke-width="2"/>`;
    if(lab)g+=`<text x="${sx(i)}" y="${sy(p.v)-11}" text-anchor="middle" font-size="${nw?11:12}" font-weight="800" fill="${nwk?VP.C:VP.N}">${vpNet(p.v)}</text><text x="${sx(i)}" y="${H-bot+16}" text-anchor="middle" font-size="${nw?10:10.5}" fill="${VP.M}">${p.d?vpX(vpFmt(p.d,{day:"numeric",month:"short"})):"–"}</text>`});
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Deneme netleri">${g}</svg>`;
}
const vpDual=f=>`<div class="vw">${f(700)}</div><div class="vn">${f(360)}</div>`;

/* ---- haftanın analizi: iyi gidenler / odaklanılacaklar (kurallar sabit, yapay zekâ yok) ---- */
function vpInsights(D){
  const S=(L,k)=>L.reduce((a,x)=>a+x[k],0),cm=S(D.cur,"m"),pm=S(D.prev,"m"),cq=S(D.cur,"q"),cc=S(D.cur,"c");
  const act=D.cur.filter(x=>x.m>0||x.q>0),off=D.cur.filter(x=>!(x.m>0||x.q>0)),noq=D.cur.filter(x=>x.m>=30&&!x.q);
  const tt=D.tasks.length,td=D.tasks.filter(t=>t.done).length,ex=D.ex,le=ex[ex.length-1],pe=ex[ex.length-2],first=String(D.name).trim().split(/\s+/)[0];
  const g=[],w=[],G=(p,t)=>g.push([p,t]),A=(p,t)=>w.push([p,t]);// p: önem sırası (küçük = önce)
  if(!cm&&!cq)return {g:[],w:[`Bu hafta uygulamaya çalışma kaydı girilmedi. Kayıt girilmeyen çalışma rapora yansımaz; ${vpX(first)} ile konuşmanızı öneririz.`]};
  if(pm>=60){const r=Math.round((cm-pm)/pm*100);
    if(r>=100)G(1,`Çalışma süresi geçen haftanın <b>${(Math.round(cm/pm*10)/10).toLocaleString("tr-TR")} katına çıktı</b> (${vpHm(pm)} → ${vpHm(cm)}).`);
    else if(r>=10)G(1,`Çalışma süresi geçen haftaya göre <b>%${r} arttı</b> (${vpHm(pm)} → ${vpHm(cm)}).`);
    else if(r<=-10)A(1,`Çalışma süresi geçen haftaya göre <b>%${-r} azaldı</b> (${vpHm(pm)} → ${vpHm(cm)}).`)}
  if(le&&String(le.exam_date||"").slice(0,10)>=D.s7){
    const d=pe?Math.round((vpN(le.total_net)-vpN(pe.total_net))*100)/100:0;
    if(pe&&d>=1)G(2,`Son denemede net <b>${vpNet(d)} arttı</b> (${vpNet(pe.total_net)} → ${vpNet(le.total_net)}).`);
    else if(pe&&d<=-1)A(2,`Son denemede net ${vpNet(-d)} düştü (${vpNet(pe.total_net)} → ${vpNet(le.total_net)}); yanlış yapılan konular gözden geçirilmeli.`);
    else G(6,`Bu hafta deneme çözdü: son net <b>${vpNet(le.total_net)}</b>.`)}
  const old=D.weeks.slice(0,-1).filter(x=>x.m>0);
  if(old.length>=2&&cm>Math.max(...old.map(x=>x.m)))G(3,`Son 4 haftanın <b>en çok çalışılan haftası</b>.`);
  if(act.length>=6)G(4,`Haftanın <b>${act.length} gününde</b> çalıştı; düzen çok iyi.`);
  else if(off.length>=2)A(3,`<b>${off.length} gün</b> çalışma kaydı yok${off.length<=3?" ("+off.map(x=>vpWd(x.d)).join(", ")+")":""}. Her gün kısa da olsa çalışmak düzeni korur.`);
  if(tt){const p=vpPct(td,tt);
    if(p>=80)G(5,`Haftalık görevlerin <b>${td}/${tt}</b> kadarı tamamlandı (%${p}).`);
    else if(p<60)A(4,`Haftalık görevlerden <b>${tt-td} tanesi</b> tamamlanmadı (${td}/${tt}).`)}
  const acc=cq&&cc?vpPct(cc,cq):null;
  if(acc!=null&&cq>=30&&acc>=75)G(7,`Doğru oranı <b>%${acc}</b> (${cq} sorudan ${cc} doğru).`);
  const weak=D.subj.filter(s=>s.q>=20&&s.c>0).map(s=>Object.assign({a:vpPct(s.c,s.q)},s)).sort((a,b)=>a.a-b.a)[0];
  if(weak&&weak.a<65)A(5,`<b>${vpX(weak.n)}</b> dersinde doğru oranı %${weak.a}; bu derste konu tekrarı faydalı olur.`);
  const tm=D.subj.reduce((a,s)=>a+s.m,0),top=D.subj[0];
  if(top&&tm>=180&&top.m/tm>=.55)A(6,`Çalışma süresinin yarıdan fazlası (%${vpPct(top.m,tm)}) <b>${vpX(top.n)}</b> dersine ayrıldı; diğer derslere de zaman ayrılmalı.`);
  else if(top&&top.m>=30)G(9,`En çok çalışılan ders <b>${vpX(top.n)}</b>: ${vpHm(top.m)}${top.q?" ("+top.q+" soru)":""}.`);
  const best=D.cur.reduce((a,x)=>x.m>a.m?x:a,D.cur[0]);
  if(best.m>=60)G(8,`En verimli gün <b>${vpX(vpWd(best.d))}</b>: ${vpHm(best.m)}${best.q?", "+best.q+" soru":""}.`);
  if(noq.length>=2)A(7,`${noq.length} gün çalışma var ama çözülen soru sayısı girilmemiş; soru sayısının girilmesi analizi güçlendirir.`);
  const pick=(L,n)=>L.sort((a,b)=>a[0]-b[0]).slice(0,n).map(x=>x[1]);
  return {g:pick(g,5),w:w.length?pick(w,4):["Bu hafta dikkat gerektiren belirgin bir durum görünmüyor."]};
}

/* ---- sayfa ---- */
function vpDelta(a,b,fmt){
  const d=a-b;if(!b&&!a)return `<i class="z">geçen hafta da kayıt yok</i>`;
  if(!b)return `<i class="up">geçen hafta kayıt yoktu</i>`;
  if(!d)return `<i class="z">geçen haftayla aynı</i>`;
  return `<i class="${d>0?"up":"dn"}">${d>0?"▲ +":"▼ −"}${fmt(Math.abs(d))} geçen haftaya göre</i>`;
}
/* o: {logo, note, editable (koç notu yazılabilir), foot (alt bilgiye ek)} */
function vpBody(D,o){
  o=o||{};
  const ad=D.name,first=String(ad).trim().split(/\s+/)[0];
  const sum=(L,k)=>L.reduce((a,x)=>a+x[k],0),cm=sum(D.cur,"m"),pm=sum(D.prev,"m"),cq=sum(D.cur,"q"),pq=sum(D.prev,"q"),cc=sum(D.cur,"c");
  const ca=D.cur.filter(x=>x.m>0||x.q>0).length,pa=D.prev.filter(x=>x.m>0||x.q>0).length;
  const tt=D.tasks.length,td=D.tasks.filter(t=>t.done).length,open=D.tasks.filter(t=>!t.done),acc=cq&&cc?vpPct(cc,cq):null;
  const head=cm||cq?`${vpX(first)} bu hafta <b>${ca} gün</b> çalıştı; toplam <b>${vpHm(cm)}</b> çalışma ve <b>${cq}</b> soru.${pm||pq?` Geçen hafta: ${vpHm(pm)} ve ${pq} soru.`:""}`:`${vpX(first)} için bu hafta uygulamaya çalışma kaydı girilmedi.`;
  const I=vpInsights(D),wk=D.weeks,w1=wk[wk.length-1],w0=wk[wk.length-2];
  const kpi=(v,l,dl)=>`<div class="k"><span>${l}</span><b>${v}</b>${dl||""}</div>`;
  const li=L=>L.map(x=>`<li>${x}</li>`).join("");
  const note=o.editable?`<section class="hide-empty"><h3>Koçun notu</h3><div class="note" id="vpNote" contenteditable="true" data-ph="Veliye iletmek istediğiniz notu buraya yazın (yazdırmadan önce). Boş bırakılırsa bu bölüm PDF'te görünmez.">${vpX(o.note||"")}</div></section>`:o.note?`<section><h3>Koçun notu</h3><div class="note ro">${vpX(o.note)}</div></section>`:"";
  return `<div class="pg">
<div class="top"><img src="${vpX(o.logo||"logo.png")}" alt="Karakış"><div><h1>KARAKIŞ EĞİTİM &amp; DANIŞMANLIK</h1><small>Bireysel eğitim koçluğu · Deneme analizi · Psikolojik danışmanlık</small></div><div class="tag">Pd. Hasan Karakış<br>Kayapınar / Diyarbakır<br>takip.hasankarakis.com</div></div>
<div class="ttl"><h2>Haftalık Veli Raporu</h2><p><b>${vpX(ad)}</b><br>${vpX(vpFmt(D.s7))} – ${vpX(vpFmt(D.end,{day:"numeric",month:"long",year:"numeric"}))}</p></div>
<p class="lead">${head}</p>
<div class="ks">${kpi(vpHm(cm),"Toplam çalışma",vpDelta(cm,pm,vpHm))}${kpi(cq,"Çözülen soru",vpDelta(cq,pq,v=>v))}${kpi(ca+"/7","Çalışılan gün",vpDelta(ca,pa,v=>v+" gün"))}${kpi(tt?"%"+vpPct(td,tt):"–","Görev tamamlama",`<i class="z">${tt?td+" / "+tt+" görev":"bu hafta görev yok"}</i>`)}</div>
<section class="an"><h3>Haftanın analizi</h3><div class="an2">${I.g.length?`<div class="ag"><b>İyi gidenler</b><ul>${li(I.g)}</ul></div>`:""}<div class="aw"><b>Odaklanılacaklar</b><ul>${li(I.w)}</ul></div></div></section>
<section><h3>Günlük çalışma süresi</h3><p class="sub"><span class="lg"><i></i>Bu hafta</span><span class="lg"><i class="p"></i>Geçen haftanın aynı günü</span>Günlük ortalama ${vpHm(cm/7)}</p>${vpDual(W=>vpBars(D.cur,D.prev,"m","Günlük çalışma süresi",W))}</section>
<section><h3>Günlük çözülen soru</h3><p class="sub"><span class="lg"><i></i>Bu hafta</span><span class="lg"><i class="p"></i>Geçen haftanın aynı günü</span>${acc!=null?"Doğru oranı %"+acc:""}</p>${vpDual(W=>vpBars(D.cur,D.prev,"q","Günlük çözülen soru",W))}</section>
<section><h3>Son 4 hafta</h3><p class="sub">Haftalık toplam çalışma; altında soru sayısı ve çalışılan gün.${w0&&w0.m?` Bu hafta geçen haftaya göre ${w1.m>=2*w0.m?"▲ "+(Math.round(w1.m/w0.m*10)/10).toLocaleString("tr-TR")+" kat":w1.m>=w0.m?"▲ %"+vpPct(w1.m-w0.m,w0.m)+" fazla":"▼ %"+vpPct(w0.m-w1.m,w0.m)+" az"}.`:""}</p>${vpDual(W=>vpTrend(wk,W))}</section>
<section><h3>Derslere göre dağılım</h3><p class="sub">Sayaçta seçilen derse göre süre; yanında soru sayısı ve doğru oranı.</p>${vpDual(W=>vpSubj(D.subj,W))}</section>
<section><h3>Görevler</h3>${tt?`<div class="two">${vpRing(td,tt)}<div>${open.length?`<p style="margin:0 0 4px"><b>Tamamlanmayan ${open.length} görev</b></p><ol class="tl">${open.slice(0,6).map(t=>`<li>${vpX(t.title)}${t.subject?` <small>· ${vpX(t.subject)}</small>`:""} <small>· ${vpX(vpFmt(String(t.task_date).slice(0,10),{day:"numeric",month:"short"}))}</small></li>`).join("")}</ol>${open.length>6?`<p class="nd" style="margin-left:0">ve ${open.length-6} görev daha</p>`:""}`:`<p style="margin:0"><b>Haftanın tüm görevleri tamamlandı.</b> 👏</p>`}</div></div>`:`<p class="nd">Bu hafta için görev atanmadı.</p>`}</section>
<section><h3>Deneme netleri</h3><p class="sub">Son ${Math.min(8,D.ex.length)} deneme; kırmızı noktalar bu haftanın denemeleri.${D.tg&&D.tg.target_net!=null&&D.tg.target_net!==""?" Yeşil kesikli çizgi hedef net.":""}</p>${D.ex.length<2?vpExams(D.ex,D.s7,D.tg,700):vpDual(W=>vpExams(D.ex,D.s7,D.tg,W))}</section>
${note}
<div class="ft"><span>Bu rapor öğrencinin uygulamaya girdiği çalışma, görev ve deneme kayıtlarından hazırlanmıştır. Uyku ve ruh hali bilgileri paylaşılmaz.${o.foot?" "+o.foot:""}</span><span>© Karakış Eğitim &amp; Danışmanlık</span></div></div>`;
}
function vpCss(){
  return `@page{size:A4;margin:11mm}*{box-sizing:border-box}body{margin:0;font:13px/1.5 "Nunito",system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:${VP.N};background:#e9e6df;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bar{position:sticky;top:0;z-index:5;background:${VP.N};color:#fff;padding:10px 12px;display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;justify-content:center;font:600 13px system-ui,Arial,sans-serif}
.bar button{font:700 14px system-ui,Arial,sans-serif;padding:9px 16px;border:0;border-radius:10px;background:${VP.C};color:#fff;cursor:pointer}.bar label{display:flex;gap:6px;align-items:center}.bar input{font:600 13px system-ui,Arial,sans-serif;padding:6px 8px;border-radius:8px;border:0}
.bar .wk{background:rgba(255,255,255,.12);color:#fff;font-weight:600;padding:8px 12px}.bar .wk[aria-pressed="true"]{background:#fff;color:${VP.N}}
.warn{background:#FFE7C2;color:#6B3A00;padding:8px 12px;text-align:center;font:600 13px system-ui,Arial,sans-serif}
.pg{max-width:794px;margin:14px auto;background:#fff;padding:26px 30px 22px;box-shadow:0 4px 18px rgba(0,0,0,.08)}
.top{display:flex;align-items:center;gap:14px;border-bottom:4px solid ${VP.C};padding-bottom:12px}.top img{width:64px;height:64px;border-radius:14px}.top h1{margin:0;font-size:18px;letter-spacing:.05em}.top small{display:block;color:${VP.M};font-size:11.5px}.top .tag{margin-left:auto;text-align:right;font-size:11px;color:${VP.M}}
.ttl{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin:16px 0 6px}.ttl h2{margin:0;font-size:22px}.ttl p{margin:0;color:${VP.M};font-size:12.5px;text-align:right}
.lead{font-size:15px;margin:4px 0 12px}.ks{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.k{background:${VP.S};border-radius:12px;padding:10px 12px}.k span{display:block;font-size:11px;color:${VP.M};font-weight:700;text-transform:uppercase;letter-spacing:.04em}.k b{display:block;font-size:21px;line-height:1.25;color:${VP.C}}.k i{font-style:normal;font-size:11px;font-weight:700}.up{color:${VP.OK}}.dn{color:${VP.DN}}.z{color:${VP.M}}
section{margin-top:16px;break-inside:avoid}h3{font-size:14.5px;margin:0 0 4px;padding-left:9px;border-left:4px solid ${VP.C}}.sub{margin:0 0 6px 13px;color:${VP.M};font-size:12px}
.an2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}.an2>div{border-radius:12px;padding:10px 12px 8px}.an2>div>b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.an2 ul{margin:4px 0 0;padding-left:17px}.an2 li{margin:3px 0}
.ag{background:${VP.OKS}}.ag>b{color:${VP.OK}}.ag>b::before{content:"✓ "}.aw{background:${VP.DNS}}.aw>b{color:${VP.DN}}.aw>b::before{content:"→ "}.an2>div:only-child{grid-column:1/-1}
.lg{display:inline-flex;align-items:center;gap:5px;margin-right:12px}.lg i{display:inline-block;width:12px;height:10px;border-radius:3px;background:${VP.C}}.lg i.p{background:none;border-top:2.2px dashed ${VP.N};opacity:.55;height:0;border-radius:0;width:16px}
.two{display:grid;grid-template-columns:150px 1fr;gap:16px;align-items:center}.tl{margin:0;padding-left:18px}.tl li{margin:2px 0}.tl small{color:${VP.M}}
.nd{color:${VP.M};margin:6px 0 0 13px}.vn{display:none}
.note{border:1.5px dashed ${VP.L};border-radius:12px;padding:10px 12px;min-height:56px;white-space:pre-wrap;outline:none}.note.ro{min-height:0;border-style:solid}.note:empty::before{content:attr(data-ph);color:${VP.M}}
.ft{margin-top:18px;padding-top:9px;border-top:1px solid ${VP.L};font-size:10.5px;color:${VP.M};display:flex;justify-content:space-between;gap:14px}
@media screen and (max-width:640px){.pg{padding:16px 16px;margin:0}.ks{grid-template-columns:repeat(2,1fr)}.two{grid-template-columns:1fr;justify-items:start}.an2{grid-template-columns:1fr}.top img{width:52px;height:52px}.top h1{font-size:15px}.top .tag{display:none}.ttl{flex-direction:column;align-items:flex-start}.ttl p{text-align:left}.vw{display:none}.vn{display:block}.lead{font-size:14.5px}.ft{flex-direction:column;gap:4px}}
@media print{body{background:#fff}.bar,.warn,.noprint{display:none!important}.pg{box-shadow:none;margin:0;padding:0;max-width:none}.vw{display:block}.vn{display:none}.note{border-color:#fff;padding:0}.note:empty{display:none}.hide-empty:has(.note:empty){display:none}}`;
}
