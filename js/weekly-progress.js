/* Karakış Takip · Haftalık gelişim özeti
   Koç genel bakışında, mevcut daily.snap verilerinden son 7 günü önceki 7 günle karşılaştırır. */
(function(){
  "use strict";
  const baseCoachView=coachView;
  let cache=null,cacheAt=0,loading=false,requestNo=0;
  const fmt=n=>Math.round(num(n)).toLocaleString("tr-TR");
  const duration=m=>{m=Math.max(0,num(m));return Math.floor(m/60)+" sa "+Math.round(m%60)+" dk"};
  const safe=s=>esc(String(s==null?"":s));
  function reportShell(){
    return `<section class="weekly-progress" id="weekly-progress-card" aria-labelledby="weekly-progress-title">
      <div class="wpr-head"><div><p class="wpr-eyebrow">HAFTALIK GELİŞİM</p><h2 id="weekly-progress-title">Sınıfın çalışma özeti</h2><p class="wpr-sub">Son 7 gün, önceki 7 günle karşılaştırılır.</p></div><button type="button" class="wpr-refresh" data-wpr-refresh>↻ Yenile</button></div>
      <div class="wpr-body"><p class="wpr-loading">Haftalık veriler hesaplanıyor…</p></div>
    </section>`;
  }
  function makeReport(rows){
    const today=day(),from=dayN(-13),currentFrom=dayN(-6),previousTo=dayN(-7);
    const cur={},prev={};
    rows.forEach(r=>{
      const dest=r.day>=currentFrom&&r.day<=today?cur:r.day>=from&&r.day<=previousTo?prev:null;
      if(!dest)return;
      const o=dest[r.student_id]||(dest[r.student_id]={m:0,q:0,days:0});
      const s=r.snap||{},m=Math.max(0,num(s.m)),q=Math.max(0,num(s.q));
      o.m+=m;o.q+=q;if(m>0||q>0)o.days++;
    });
    const total=o=>Object.values(o).reduce((a,x)=>({m:a.m+x.m,q:a.q+x.q,days:a.days+x.days}),{m:0,q:0,days:0});
    const a=total(cur),b=total(prev),names=STU||[],active=Object.values(cur).filter(x=>x.m>0||x.q>0).length;
    const delta=(x,y)=>y?Math.round((x-y)/y*100):null;
    const md=delta(a.m,b.m),qd=delta(a.q,b.q);
    const students=names.map(s=>{
      const c=cur[s.id]||{m:0,q:0,days:0},p=prev[s.id]||{m:0,q:0,days:0};
      return {id:s.id,name:s.name||"Öğrenci",m:c.m,q:c.q,days:c.days,dm:c.m-p.m,dq:c.q-p.q};
    }).filter(s=>s.m||s.q||s.dm>0||s.dq>0).sort((x,y)=>y.days-x.days||y.m-x.m).slice(0,5);
    const change=(v)=>v==null?"Önceki hafta veri yok":(v>0?"+":"")+v+"%";
    const cls=(v)=>v==null?"":v>0?" positive":v<0?" negative":"";
    const studentRows=students.length?students.map(s=>`<div class="wpr-student"><span class="wpr-avatar">${safe((s.name.trim().split(/\\s+/).map(p=>p[0]).join("").slice(0,2)||"Ö"))}</span><span class="wpr-student-name"><b>${safe(s.name)}</b><small>${s.days} aktif gün · ${duration(s.m)} · ${fmt(s.q)} soru</small></span><span class="wpr-trend${s.dm>0?" positive":s.dm<0?" negative":""}">${s.dm>0?"+":""}${duration(Math.abs(s.dm))}<small>${s.dm>0?"süre artışı":s.dm<0?"süre azalışı":"süre aynı"}</small></span></div>`).join(""):`<div class="wpr-empty">Henüz haftalık çalışma kaydı bulunmuyor. Öğrenciler kayıt girdikçe özet burada oluşacak.</div>`;
    return `<div class="wpr-metrics">
      <div class="wpr-metric"><span>Toplam çalışma</span><b>${duration(a.m)}</b><small class="${cls(md)}">${change(md)} <i>önceki haftaya göre</i></small></div>
      <div class="wpr-metric"><span>Çözülen soru</span><b>${fmt(a.q)}</b><small class="${cls(qd)}">${change(qd)} <i>önceki haftaya göre</i></small></div>
      <div class="wpr-metric"><span>Aktif öğrenci</span><b>${active} / ${names.length}</b><small>${names.length?Math.round(active/names.length*100):0}% sınıf katılımı</small></div>
    </div>
    <div class="wpr-detail-head"><b>Öğrenci çalışma görünümü</b><span>${from.split("-").reverse().join(".")} – ${today.split("-").reverse().join(".")}</span></div>
    <div class="wpr-students">${studentRows}</div>
    <p class="wpr-note">Karşılaştırma günlük kayıtların toplamından hesaplanır; deneme neti veya başarı sıralaması yerine çalışma düzenini gösterir.</p>`;
  }
  async function load(force){
    if(loading)return;
    if(!force&&cache&&Date.now()-cacheAt<5*60*1000){paint(cache);return}
    loading=true;const req=++requestNo;
    const body=document.querySelector("#weekly-progress-card .wpr-body");
    if(body)body.innerHTML='<p class="wpr-loading">Haftalık veriler hesaplanıyor…</p>';
    try{
      const {data,error}=await sb.from("daily").select("student_id,day,snap").gte("day",dayN(-13)).lte("day",day()).order("day");
      if(error)throw error;
      const html=makeReport(data||[]);
      cache=html;cacheAt=Date.now();
      if(req===requestNo)paint(html);
    }catch(e){
      const el=document.querySelector("#weekly-progress-card .wpr-body");
      if(el)el.innerHTML='<p class="wpr-error">Haftalık rapor yüklenemedi. Bağlantıyı kontrol edip yeniden dene.</p>';
    }finally{loading=false}
  }
  function paint(html){
    const el=document.querySelector("#weekly-progress-card .wpr-body");
    if(el)el.innerHTML=html;
  }
  coachView=function(){
    const html=baseCoachView.apply(this,arguments);
    if(typeof ROLE==="undefined"||ROLE!=="coach"||typeof CPG==="undefined"||CPG!=="o"||(typeof sel!=="undefined"&&sel))return html;
    if(html.includes('id="weekly-progress-card"'))return html;
    const out=html.replace(/<\/section>\s*$/,reportShell()+"</section>");
    if(out!==html)Promise.resolve().then(()=>load(false));
    return out;
  };
  document.addEventListener("click",e=>{
    const btn=e.target.closest&&e.target.closest("[data-wpr-refresh]");
    if(!btn)return;
    cache=null;cacheAt=0;load(true);
  });
})();