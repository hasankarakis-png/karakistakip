/* ===== Tercih robotu (veri: tercih.json, ÖSYM yerleştirme tablolarından üretilir) ===== */
let TC={st:"idle",data:null,q:"",il:"",tur:"",pt:"SAY",lv:"L",flt:"",lim:40,rank:"",fc:true,tr:""};
const TCK=()=>"karakis-tercih-"+ME;
const tcLoadList=()=>{try{return JSON.parse(localStorage.getItem(TCK())||"{}")}catch(e){return{}}};
const tcSave=o=>{try{localStorage.setItem(TCK(),JSON.stringify(o))}catch(e){}};
const trn=v=>String(v||"").toLocaleLowerCase("tr").replace(/[^a-z0-9ğüşıöç ]/g,"");
// Sıkıştırılmış dosya biçimini (v2) program nesnelerine açar.
function tcExpand(d){
  if(!d||d.v!==2)return d;
  const yl=(d.meta.yillar||[]).slice(1).map(String),P=new Array(d.p.length);
  for(let i=0;i<d.p.length;i++){const r=d.p[i],p={kod:r[0],uni:d.u[r[1]],il:d.il[r[2]],tur:d.tur[r[3]],b:r[4],pt:r[5],lv:r[6],k:r[7],y:r[8],tp:r[9],mp:r[10]};
    if(r[11]){const h={};yl.forEach((y,j)=>{if(r[11][j])h[y]=r[11][j]});p.h=h}P[i]=p}
  return {meta:d.meta,p:P};
}
// Her açılışta 21 bin satırı yeniden taramamak için seviye bazlı listeler bir kez hazırlanır.
function tcMemo(){
  if(TC._m)return TC._m;
  const m={byKod:{},L:{L:null,O:null}};
  TC.data.p.forEach(p=>{m.byKod[p.kod]=p});
  ["L","O"].forEach(lv=>{const base=TC.data.p.filter(p=>p.lv===lv);m.L[lv]={base,ils:[...new Set(base.map(p=>p.il).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"tr")),tur:[...new Set(base.map(p=>p.tur).filter(Boolean))].sort(),pts:[...new Set(base.map(p=>p.pt).filter(Boolean))]}});
  return TC._m=m;
}
function tcInit(){
  if(TC.st!=="idle")return;
  const o=tcLoadList();TC.rank=o.rank||"";TC.pt=o.pt||"SAY";TC.lv=o.lv||"L";TC.st="load";
  const done=j=>{j=tcExpand(j);TC.data=j&&Array.isArray(j.p)?j:{meta:{},p:[]};TC._m=null;TC._sig="";TC.st="ok";if(tab==="t")render()};
  fetch("tercih.json").then(r=>r.ok?r.json():Promise.reject()).then(done).catch(()=>done(null));
}
// Eğilim tahmini (resmî değildir): yıllara göre taban puanına doğru çizgisi uydurulur, bir sonraki yıl için temkinli (%70) uzatılır.
function tcFc(p){
  if(p._f!==undefined)return p._f;
  const h=p.h||{},last=(TC.data.meta&&TC.data.meta.yil)||2026,pts=[];
  Object.keys(h).forEach(y=>{if(h[y]&&h[y][0]!=null)pts.push([+y,h[y][0]])});
  if(p.tp!=null)pts.push([last,p.tp]);
  pts.sort((a,b)=>a[0]-b[0]);
  if(pts.length<3||p.tp==null)return p._f=null;
  const n=pts.length,mx=pts.reduce((a,q)=>a+q[0],0)/n,my=pts.reduce((a,q)=>a+q[1],0)/n;
  const sxx=pts.reduce((a,q)=>a+(q[0]-mx)**2,0),sl=pts.reduce((a,q)=>a+(q[0]-mx)*(q[1]-my),0)/sxx;
  const sd=Math.sqrt(pts.reduce((a,q)=>a+(q[1]-(my+sl*(q[0]-mx)))**2,0)/Math.max(1,n-2));
  return p._f={pred:p.tp+0.7*sl,slope:sl,band:Math.max(4,1.3*sd+0.5*Math.abs(sl)),pts,next:last+1};
}
const tcRef=p=>{if(TC.fc){const f=tcFc(p);if(f)return f.pred}return p.tp};
function tcSpark(f){
  const W=132,H=30,all=f.pts.map(q=>q[1]).concat(f.pred),mn=Math.min(...all),mxv=Math.max(...all),rg=(mxv-mn)||1,x0=f.pts[0][0],x1=f.next,
  X=x=>2+(x-x0)/(x1-x0)*(W-4),Y=v=>H-3-(v-mn)/rg*(H-6),pl=f.pts.map(q=>X(q[0]).toFixed(1)+","+Y(q[1]).toFixed(1)).join(" "),lp=f.pts[f.pts.length-1];
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="flex:none"><polyline points="${pl}" fill="none" stroke="var(--mute)" stroke-width="2" stroke-linejoin="round"/><line x1="${X(lp[0]).toFixed(1)}" y1="${Y(lp[1]).toFixed(1)}" x2="${X(f.next).toFixed(1)}" y2="${Y(f.pred).toFixed(1)}" stroke="var(--acc)" stroke-width="2" stroke-dasharray="3 3"/><circle cx="${X(f.next).toFixed(1)}" cy="${Y(f.pred).toFixed(1)}" r="3.5" fill="var(--acc)"/></svg>`;
}
function tcFcHTML(p){
  const f=tcFc(p);if(!f)return `<p class="sub2" style="margin:0 0 8px">Tahmin için en az 3 yıllık veri gerekir.</p>`;
  const up=f.slope>=3,dn=f.slope<=-3,tag=up?`<span style="color:var(--warn)">▲ yükseliş eğilimi</span>`:dn?`<span style="color:var(--ok)">▼ düşüş eğilimi</span>`:`≈ yatay seyir`;
  const h=p.h||{},ys=Object.keys(h).sort(),pk=ys.length?h[ys[ys.length-1]][1]:null;let kn="";
  if(pk&&p.k){const r=p.k/pk;if(r<=0.8)kn=` · <span style="color:var(--warn)">kontenjan ${pk}→${p.k} azaldı, rekabet artabilir</span>`;else if(r>=1.25)kn=` · kontenjan ${pk}→${p.k} arttı`}
  return `<div style="display:flex;align-items:center;gap:10px;margin:0 0 8px">${tcSpark(f)}<p class="sub2" style="margin:0">${f.next} tahmini taban: <b style="color:var(--ink)">${nf(f.pred,1)}</b> (±${nf(f.band,0)}) · ${tag}${kn}</p></div>`;
}
// Tahmini sınıflandırma (resmî değildir): öğrencinin puanı, 2026 yerleşen son öğrencinin (taban) puanıyla kıyaslanır.
function tcClass(puan,p){
  const ref=tcRef(p);
  if(!puan||ref==null)return {c:"n",t:ref==null?"Taban puan yok":"Puanını gir"};
  const d=puan-ref;
  return d>=8?{c:"g",t:"Güvenli"}:d>=-8?{c:"h",t:"Hedef"}:{c:"r",t:"Riskli"};
}
const nf=(n,d=2)=>Number(n).toLocaleString("tr-TR",{minimumFractionDigits:d,maximumFractionDigits:d});
function tcFiltered(){
  const sg=[TC.lv,TC.pt,TC.il,TC.tur,TC.q,TC.rank,TC.flt,TC.fc,TC.tr].join("|");
  if(TC._sig===sg&&TC._res)return TC._res;
  const D=tcMemo().L[TC.lv].base,qs=trn(TC.q).split(/\s+/).filter(Boolean),puan=num(TC.rank);
  const hay=p=>p._h||(p._h=trn(p.uni+" "+p.b+" "+p.il+" "+p.kod));
  let L=D.filter(p=>p.lv===TC.lv&&(!TC.pt||p.pt===TC.pt)&&(!TC.il||p.il===TC.il)&&(!TC.tur||p.tur===TC.tur)&&(!qs.length||qs.every(w=>hay(p).includes(w))));
  if(TC.tr)L=L.filter(p=>{const f=tcFc(p);return f&&(TC.tr==="up"?f.slope>=3:f.slope<=-3)});
  L=L.map(p=>({p,c:tcClass(puan,p)}));
  if(puan){if(TC.flt)L=L.filter(x=>x.c.c===TC.flt);L.sort((a,b)=>{const x=tcRef(a.p),y=tcRef(b.p);return (x==null?9e9:Math.abs(puan-x))-(y==null?9e9:Math.abs(puan-y))})}
  else L.sort((a,b)=>{const x=tcRef(a.p),y=tcRef(b.p);return (y==null?-1:y)-(x==null?-1:x)});
  TC._sig=sg;return TC._res=L;
}
function tcHist(p){
  const h=p.h||{},ys=Object.keys(h).sort().reverse();if(!ys.length)return"";
  const rows=ys.map(y=>{const [tp,k,yr]=h[y];return `${esc(y)}: ${tp==null?"taban yok":"<b style=\"color:var(--ink)\">"+nf(tp)+"</b>"}${k!=null?" · kont. "+k:""}${yr!=null?" · yerleşen "+yr:""}`}).join("<br>");
  const prev=h[ys[0]][0],tr=p.tp!=null&&prev!=null?p.tp-prev:null;
  const arrow=tr==null?"":`<br>${esc(ys[0])}'e göre: `+(Math.abs(tr)<0.5?"≈ aynı":tr>0?`<span style="color:var(--warn)">▲ ${nf(tr,1)} puan yükselmiş</span>`:`<span style="color:var(--ok)">▼ ${nf(-tr,1)} puan düşmüş</span>`);
  return `<p class="sub2" style="margin:0 0 8px">${rows}${arrow}</p>`;
}
function tcCard(x,list){
  const p=x.p,inl=list.includes(p.kod),dolmadi=p.k!=null&&p.y!=null&&p.y<p.k;
  return `<div class="tcr"><div class="rw"><h3>${esc(p.uni)}</h3><span class="bd ${x.c.c}">${x.c.t}</span></div><p class="sub2" style="margin:3px 0 4px"><b style="color:var(--ink)">${esc(p.b)}</b></p>
  <p class="sub2" style="margin:0 0 6px">${esc(p.il||"")} · ${esc(p.tur||"")} · ${esc(p.pt||"")} · kod ${esc(p.kod)}</p>
  <p class="sub2" style="margin:0 0 8px">${p.tp==null?"2026 taban puanı yok":`2026 taban puan <b style="color:var(--ink)">${nf(p.tp)}</b> · en yüksek ${p.mp==null?"–":nf(p.mp)}`} · kontenjan ${p.k==null?"–":p.k} · yerleşen ${p.y==null?"–":p.y}${dolmadi?" · <span style=\"color:var(--warn)\">kontenjan dolmadı</span>":""}</p>
  ${tcFcHTML(p)}${tcHist(p)}<button class="chip" data-tcadd="${esc(p.kod)}" aria-pressed="${inl}">${inl?"✓ Listemde":"＋ Listeme ekle"}</button></div>`;
}
// Yapay zekâ tercih asistanı: liste + puan + yıllık veriler tercih-ai fonksiyonuna gider (günlük hak sınırı sunucuda).
let TA={busy:false,reply:"",err:"",q:""};
function taCard(lc,puan){
  return `<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)"><h3 style="margin:0 0 6px">🤖 Tercih asistanı</h3>
  <p class="empty" style="margin:0 0 8px;font-size:13px">Listeni ve puanını yıllara göre değerlendirir; sıralama ve riskler için yorum yapar. Resmî karar yerine geçmez.</p>
  ${puan?"":`<p class="empty" style="color:var(--warn);margin:0 0 8px;font-size:13px">Daha iyi yorum için yukarıya puanını gir.</p>`}
  <input id="taq" type="text" maxlength="300" placeholder="İstersen bir soru ekle (örn. hangisini öne almalıyım?)" value="${esc(TA.q)}" style="width:100%;margin-bottom:8px">
  <button class="btn" style="padding:11px 16px" id="taask"${TA.busy?" disabled":""}>${TA.busy?"Düşünüyor…":"Listemi değerlendir"}</button>
  ${TA.err?`<p style="color:var(--warn);margin:8px 0 0">${esc(TA.err)}</p>`:""}${TA.reply?`<div class="cm ai" style="margin-top:10px;white-space:pre-wrap">${esc(TA.reply)}</div>`:""}</div>`;
}
async function taAsk(){
  if(TA.busy)return;const o=tcLoadList(),by=tcMemo().byKod,puan=num(TC.rank);
  const L=(o.l||[]).map(k=>by[k]).filter(Boolean);if(!L.length)return;
  const last=(TC.data.meta&&TC.data.meta.yil)||2026;
  const programs=L.map(p=>{const f=tcFc(p),h={};Object.keys(p.h||{}).forEach(y=>{if(p.h[y]&&p.h[y][0]!=null)h[y]=p.h[y][0]});if(p.tp!=null)h[last]=p.tp;
    const ys=Object.keys(p.h||{}).sort(),pk=ys.length?p.h[ys[ys.length-1]][1]:null;
    return {n:p.uni+" – "+p.b,il:p.il,pt:p.pt,c:tcClass(puan,p).t,h,k:p.k,pk,f:f?Math.round(f.pred*100)/100:null,b:f?Math.round(f.band*10)/10:null,s:f?Math.round(f.slope*10)/10:null}});
  TA.q=(document.getElementById("taq")||{}).value||TA.q;TA.busy=true;TA.err="";TA.reply="";render();
  const r=await callFn("tercih-ai",{puan:puan||null,programs,question:TA.q.trim()});
  TA.busy=false;if(r.error)TA.err=r.error;else TA.reply=r.reply||"";render();
}
function tercihTab(){
  tcInit();
  const o=tcLoadList(),list=o.l||[];
  if(TC.st!=="ok")return `${stHead("Tercih Robotu")}<div class="card"><p class="empty" style="margin:0">Yükleniyor…</p></div>`;
  const D=TC.data,has=D.p.length>0,m=D.meta||{};
  const head=`${stHead("Tercih Robotu")}<div class="card"><p class="empty" style="margin:0;font-size:14px">Puanını gir; programlar <b>${TC.fc?(((m.yil||2026)+1)+" tahmini taban puanına"):((m.yil||2026)+" taban puanına")}</b> göre <b>Güvenli / Hedef / Riskli</b> ayrılır. Bu bir <b>tahmindir</b>, resmî araç değildir; puanlar yıllar arasında birebir kıyaslanamaz. Tercih öncesi ÖSYM kılavuzunu ve koçunu kontrol et.<br><small>Veri: ÖSYM ${esc((m.yillar||[]).join(", "))} yerleştirme sonuçları.</small></p></div>`;
  if(!has)return head+`<div class="card"><h2>Veri henüz yüklenmedi</h2><p class="empty" style="margin:0">Bölüm listesi yüklenince burada arama yapabileceksin.</p></div>`;
  const M=tcMemo().L[TC.lv],ils=M.ils,tur=M.tur,pts=M.pts;if(pts.length&&!pts.includes(TC.pt))TC.pt=pts[0];
  const all=tcFiltered(),shown=all.slice(0,TC.lim),puan=num(TC.rank);
  const cnt={g:0,h:0,r:0};if(puan)all.forEach(x=>{if(cnt[x.c.c]!=null)cnt[x.c.c]++});
  const byKod=tcMemo().byKod;
  const lc=list.map(k=>byKod[k]).filter(Boolean);
  const listCard=`<div class="card"><h2>Tercih listem (${lc.length}/24)</h2>${lc.length?lc.map((p,j)=>`<div class="tcl"><b>${j+1}</b><span>${esc(p.uni)} — ${esc(p.b)}</span><button data-tcup="${esc(p.kod)}" aria-label="Yukarı">↑</button><button data-tcdn="${esc(p.kod)}" aria-label="Aşağı">↓</button><button data-tcrm="${esc(p.kod)}" aria-label="Çıkar">✕</button></div>`).join("")+`<div class="row"><button class="chip" id="tccopy">📋 Listeyi kopyala</button></div>${taCard(lc,puan)}`:`<p class="empty" style="margin:0">Henüz program eklemedin. Aşağıdan seçip “Listeme ekle” de.</p>`}</div>`;
  const fl=(k,l)=>`<button class="chip" data-tcflt="${k}" aria-pressed="${TC.flt===k}">${l}${puan&&k?` (${cnt[k]})`:""}</button>`;
  return head+`<div class="card"><h2>Filtreler</h2>
  <div class="chips" role="group" aria-label="Program türü"><button class="chip" data-tclv="L" aria-pressed="${TC.lv==="L"}">Lisans (4 yıllık)</button><button class="chip" data-tclv="O" aria-pressed="${TC.lv==="O"}">Ön lisans (2 yıllık)</button></div>
  <div class="tcf">
  <label>Puanın (${esc(TC.pt)})<input id="tcrank" type="number" inputmode="decimal" min="100" max="560" step="0.01" value="${esc(TC.rank)}" placeholder="örn. 410,5"></label>
  <label>Puan türü<select id="tcpt">${pts.map(x=>`<option${x===TC.pt?" selected":""}>${esc(x)}</option>`).join("")}</select></label>
  <label class="wide">Ara (üniversite, bölüm, şehir, kod)<input id="tcq" type="text" maxlength="60" value="${esc(TC.q)}"></label>
  <label>Şehir<select id="tcil"><option value="">Hepsi</option>${ils.map(x=>`<option${x===TC.il?" selected":""}>${esc(x)}</option>`).join("")}</select></label>
  <label>Üniversite türü<select id="tctur"><option value="">Hepsi</option>${tur.map(x=>`<option${x===TC.tur?" selected":""}>${esc(x)}</option>`).join("")}</select></label></div>
  <div class="chips" style="margin-top:12px" role="group" aria-label="Hesaplama"><button class="chip" data-tcfc="1" aria-pressed="${TC.fc}">📈 ${(D.meta.yil||2026)+1} tahmini</button><button class="chip" data-tcfc="0" aria-pressed="${!TC.fc}">${D.meta.yil||2026} taban</button></div>
  <div class="chips" style="margin-top:8px" role="group" aria-label="Eğilim"><button class="chip" data-tctr="" aria-pressed="${TC.tr===""}">Tüm eğilimler</button><button class="chip" data-tctr="up" aria-pressed="${TC.tr==="up"}">▲ Yükselenler</button><button class="chip" data-tctr="down" aria-pressed="${TC.tr==="down"}">▼ Düşenler</button></div>
  ${puan?`<div class="chips" style="margin-top:12px">${fl("","Hepsi")}${fl("g","Güvenli")}${fl("h","Hedef")}${fl("r","Riskli")}</div>`:""}</div>
  ${listCard}
  <p class="empty" style="margin:10px 2px">${all.length} program bulundu${puan?" · puanına yakın olanlar üstte":" · taban puanı yüksekten düşüğe"}</p>
  ${shown.map(x=>tcCard(x,list)).join("")}${all.length>shown.length?`<div class="row"><button class="chip" id="tcmore">Daha fazla göster</button></div>`:""}`;
}
function tcAct(D){
  const o=tcLoadList();o.l=o.l||[];
  if(D.tcadd){const k=D.tcadd,i=o.l.indexOf(k);if(i>=0)o.l.splice(i,1);else if(o.l.length<24)o.l.push(k);else{alert("En fazla 24 tercih ekleyebilirsin.");return}}
  if(D.tcrm){o.l=o.l.filter(k=>k!==D.tcrm)}
  if(D.tcup||D.tcdn){const k=D.tcup||D.tcdn,i=o.l.indexOf(k),j=D.tcup?i-1:i+1;if(i>=0&&j>=0&&j<o.l.length){[o.l[i],o.l[j]]=[o.l[j],o.l[i]]}}
  tcSave(o);render();
}

