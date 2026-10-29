/* Karakış Takip · Koç Aksiyon Merkezi
   Mevcut ekranları ve veri akışını değiştirmeden genel bakışa önceliklendirilmiş takip katmanı ekler. */
(function(){
  "use strict";
  const baseCoachView = coachView;
  function coachActionCenter(){
    let rows=[];
    try { rows=roster()||[]; } catch(e) { return ""; }
    const items=rows.map(x=>{
      let late=0,fl=0;
      try { late=overdue(x.id).length; } catch(e) {}
      try { fl=flags(x.hist||[]).length; } catch(e) {}
      const noWork=!(num(x.m)||num(x.q)||x.st==="study"||x.st==="break");
      const score=(late?late*4:0)+(fl?fl*2:0)+(noWork?1:0);
      const reasons=[];
      if(late) reasons.push(late+" geciken görev");
      if(fl) reasons.push(fl+" takip uyarısı");
      if(noWork) reasons.push("bugün henüz çalışma kaydı yok");
      return {id:x.id,name:x.n||x.name||"Öğrenci",late,fl,noWork,score,reasons,st:x.st||"idle",m:num(x.m),q:num(x.q)};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.late-a.late||b.fl-a.fl);
    const lateN=rows.filter(x=>{try{return overdue(x.id).length>0}catch(e){return false}}).length;
    const warnN=rows.filter(x=>{try{return flags(x.hist||[]).length>0}catch(e){return false}}).length;
    const idleN=rows.filter(x=>!(num(x.m)||num(x.q)||x.st==="study"||x.st==="break")).length;
    const list=items.slice(0,5);
    const safeName=x=>esc(String(x.name).replace(/<[^>]*>/g,""));
    return `<section class="coach-action-center" aria-labelledby="coach-action-title">
      <div class="cac-head"><div><p class="cac-eyebrow">KOÇ PANELİ · GÜNLÜK ÖNCELİKLER</p><h2 id="coach-action-title">Bugün müdahale planı</h2><p class="cac-sub">Verilerden çıkan sinyalleri sırala; gerekli öğrencinin kaydına doğrudan geç.</p></div><span class="cac-mark" aria-hidden="true">✦</span></div>
      <div class="cac-stats">
        <button class="cac-stat" data-cp="t"><span class="cac-icon cac-orange">↗</span><span><small>Geciken görev</small><b>${lateN}</b><em>Görev yönetimine git</em></span></button>
        <button class="cac-stat" data-cp="t"><span class="cac-icon cac-violet">⚑</span><span><small>Takip uyarısı</small><b>${warnN}</b><em>Öğrencileri incele</em></span></button>
        <button class="cac-stat" data-cp="s"><span class="cac-icon cac-teal">◷</span><span><small>Bugün kayıt yok</small><b>${idleN}</b><em>Öğrenci listesine git</em></span></button>
      </div>
      <div class="cac-list-head"><h3>Öncelikli takip listesi</h3><span>${items.length} öğrenci sinyal verdi</span></div>
      ${list.length?'<div class="cac-list">'+list.map((x,i)=>`<div class="cac-row"><span class="cac-rank">${String(i+1).padStart(2,"0")}</span><div class="cac-person"><b>${safeName(x)}</b><span>${x.reasons.map(esc).join(" · ")}</span></div><div class="cac-actions"><button class="cac-open" data-i="${esc(x.id)}">Kaydı aç <span aria-hidden="true">→</span></button></div></div>`).join("")+'</div>':`<div class="cac-empty"><span>✓</span><div><b>Öncelikli uyarı görünmüyor</b><p>Yeni görev veya çalışma kaydı geldikçe bu alan güncellenir.</p></div></div>`}
      <div class="cac-foot"><span><i></i> Canlı panel verileri</span><button data-cp="a">Sınıf deneme analizini aç <span aria-hidden="true">→</span></button></div>
    </section>`;
  }
  coachView=function(){
    const html=baseCoachView.apply(this,arguments);
    if(typeof ROLE==="undefined"||ROLE!=="coach"||typeof CPG==="undefined"||CPG!=="o"||typeof sel!=="undefined"&&sel)return html;
    try { return html.replace("</section>",coachActionCenter()+"</section>"); }
    catch(e){ return html; }
  };
})();
