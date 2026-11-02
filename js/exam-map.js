/* Deneme "Konu eksik haritası": ders ders sekmeler. Öğrenci kendi eksiklerini, koç öğrencinin eksiklerini aynı yerden görür.
   Veri: kayıtlı denemelerin topics alanı (son 3 deneme), yapay zekâ gerekmez. Haftalık veli raporundaki "Konu eksik haritası" (vp-charts.js) aynı mantıkla çalışır. */
const EMT={};
const emKey=s=>String(s||"").toLocaleLowerCase("tr").replace(/ dersi$/,"").trim();
const emSame=(a,b)=>{const x=emKey(a),y=emKey(b);return x===y||(x.length>=5&&y.length>=5&&(x.startsWith(y)||y.startsWith(x)))};
function emData(sid){
  const L=(EX[sid]||[]).filter(e=>Array.isArray(e.topics)&&e.topics.length).slice(-3);
  if(!L.length)return null;
  const last=L[L.length-1],by=new Map();
  L.forEach(e=>{const seen=new Set();e.topics.forEach(t=>{
    if(!t||!t.konu)return;const dn=String(t.ders||"Diğer"),k=emKey(dn);
    let g=by.get(k);if(!g){g={ders:dn,t:new Map()};by.set(k,g)}
    const tk=emKey(t.konu),o=g.t.get(tk)||{konu:String(t.konu),d:0,y:0,b:0,n:0};
    o.d+=num(t.dogru);o.y+=num(t.yanlis);o.b+=num(t.bos);
    if(num(t.yanlis)+num(t.bos)>0&&!seen.has(k+"|"+tk)){o.n++;seen.add(k+"|"+tk)}
    g.t.set(tk,o)})});
  const subs=(last.subjects||[]),out=[];
  by.forEach(g=>{
    const all=[...g.t.values()],weak=all.filter(o=>o.y+o.b>0).sort((a,b)=>b.n-a.n||b.y+b.b-(a.y+a.b)),ok=all.filter(o=>o.y+o.b===0);
    const s=subs.find(x=>emSame(x.ders,g.ders))||null;
    out.push({ders:g.ders,weak,ok,miss:weak.reduce((x,o)=>x+o.y+o.b,0),rep:weak.filter(o=>o.n>1).length,s});
  });
  out.sort((a,b)=>b.miss-a.miss);
  return {L,last,list:out};
}
const emHas=sid=>{try{return !!emData(sid)}catch(e){return false}};
function emHTML(sid){
  const D=emData(sid);if(!D)return "";
  const sel=D.list.some(x=>x.ders===EMT[sid])?EMT[sid]:D.list[0].ders,g=D.list.find(x=>x.ders===sel);
  const tabs=D.list.map(x=>`<button type="button" class="emt${x.ders===sel?" on":""}" role="tab" aria-selected="${x.ders===sel}" data-emt="${esc(x.ders)}" data-sid="${esc(sid)}">${esc(x.ders)}<b class="emb${x.miss?"":" z"}">${x.miss||"✓"}</b></button>`).join("");
  const s=g.s,sum=s?`<div class="ems"><span><b>${num(s.dogru)}</b> doğru</span><span><b>${num(s.yanlis)}</b> yanlış</span><span><b>${num(s.bos)}</b> boş</span><span><b>${num(s.net)}</b> net</span>${s.kurum_yuzde!=null?`<span>kurum %${num(s.kurum_yuzde)}${s.ogrenci_yuzde!=null?" · öğrenci %"+num(s.ogrenci_yuzde):""}</span>`:""}</div>`:"";
  const row=o=>{const tot=o.d+o.y+o.b,p=tot?Math.round((o.y+o.b)/tot*100):0;
    return `<div class="emr"><div class="emn">${esc(o.konu)}${o.n>1?`<span class="emtag">${o.n} denemede</span>`:""}</div><div class="emp" aria-hidden="true"><i style="width:${Math.max(6,p)}%"></i></div><small>${o.y?o.y+" yanlış":""}${o.y&&o.b?" · ":""}${o.b?o.b+" boş":""}${o.d?" · "+o.d+" doğru":""}</small></div>`};
  const body=g.weak.length?`<p class="empty" style="margin:8px 0 4px">Çalışılacak konular${g.rep?` (${g.rep} tanesi birden çok denemede eksik)`:""}</p>${g.weak.map(row).join("")}`:`<p class="empty" style="margin:10px 0 0">Bu derste son denemelerde eksik konu görünmüyor. 👏</p>`;
  const ok=g.ok.length?`<details class="emok"><summary>Doğru yapılan konular (${g.ok.length})</summary>${g.ok.map(o=>`<div class="emr ok"><div class="emn">${esc(o.konu)}</div><small>${o.d} doğru</small></div>`).join("")}</details>`:"";
  return `<div class="card" id="emc" data-emsid="${esc(sid)}"><h2>Konu eksik haritası</h2><p class="empty" style="margin:0 0 8px;font-size:13px">Son ${D.L.length} denemenin kazanım tablosundan. Bir derse dokun, eksik konularını gör.</p><div class="emtabs" role="tablist">${tabs}</div><div class="empanel" role="tabpanel"><h3 style="margin:10px 0 0;font-size:16px">${esc(g.ders)}</h3>${sum}${body}${ok}</div></div>`;
}
document.addEventListener("click",e=>{
  const b=e.target.closest&&e.target.closest("[data-emt]");if(!b)return;
  const sid=b.dataset.sid;EMT[sid]=b.dataset.emt;
  const el=document.getElementById("emc");if(el&&el.dataset.emsid===sid){el.outerHTML=emHTML(sid);const t=document.querySelector("#emc .emt.on");if(t&&t.scrollIntoView)t.scrollIntoView({block:"nearest",inline:"center"})}
});
