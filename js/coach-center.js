/* Karakış Takip · Koç Aksiyon Merkezi
   Filtrelenebilir günlük öncelikler. Mevcut veri akışlarını ve ekranları korur. */
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
      const tags=[];
      if(late) tags.push("late");
      if(fl) tags.push("warn");
      if(noWork) tags.push("no-work");
      return {id:x.id,name:x.n||x.name||"Öğrenci",late,fl,noWork,score,reasons,tags};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.late-a.late||b.fl-a.fl);
    const lateN=items.filter(x=>x.late>0).length;
    const warnN=items.filter(x=>x.fl>0).length;
    const idleN=items.filter(x=>x.noWork).length;
    const list=items.slice(0,8);
    const safeName=x=>esc((STU.find(p=>String(p.id)===String(x.id))||{}).name||String(x.name||"Öğrenci").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">"));
    return `<section class="coach-action-center" aria-labelledby="coach-action-title">
      <div class="cac-head"><div><p class="cac-eyebrow">KOÇ PANELİ · GÜNLÜK ÖNCELİKLER</p><h2 id="coach-action-title">Bugün müdahale planı</h2><p class="cac-sub">Öncelikleri filtrele ve ilgili öğrencinin kaydına doğrudan geç.</p></div><span class="cac-mark" aria-hidden="true">✦</span></div>
      <div class="cac-stats">
        <button class="cac-stat" data-cac-filter="late" aria-label="Geciken görevi olan öğrencileri filtrele"><span class="cac-icon cac-orange">↗</span><span><small>Görevi geciken</small><b>${lateN}</b><em>Öğrenci</em></span></button>
        <button class="cac-stat" data-cac-filter="warn" aria-label="Takip uyarısı olan öğrencileri filtrele"><span class="cac-icon cac-violet">⚑</span><span><small>Takip uyarısı</small><b>${warnN}</b><em>Öğrenci</em></span></button>
        <button class="cac-stat" data-cac-filter="no-work" aria-label="Bugün çalışma kaydı olmayan öğrencileri filtrele"><span class="cac-icon cac-teal">◷</span><span><small>Bugün kayıt yok</small><b>${idleN}</b><em>Öğrenci</em></span></button>
      </div>
      <div class="cac-list-head"><h3>Öncelikli takip listesi</h3><span>${items.length} öğrencide takip sinyali</span></div>
      <div class="cac-filters" role="group" aria-label="Öğrenci listesini filtrele">
        <button type="button" class="cac-filter is-active" data-cac-filter="all" aria-pressed="true">Tümü <span>${items.length}</span></button>
        <button type="button" class="cac-filter" data-cac-filter="late" aria-pressed="false">Geciken görev <span>${lateN}</span></button>
        <button type="button" class="cac-filter" data-cac-filter="warn" aria-pressed="false">Uyarı <span>${warnN}</span></button>
        <button type="button" class="cac-filter" data-cac-filter="no-work" aria-pressed="false">Çalışma kaydı yok <span>${idleN}</span></button>
      </div>
      ${list.length?`<div class="cac-list">${list.map((x,i)=>`<div class="cac-row" data-cac-row data-cac-tags="${x.tags.join(" ")}"><span class="cac-rank">${String(i+1).padStart(2,"0")}</span><div class="cac-person"><b>${safeName(x)}</b><span>${x.reasons.map(esc).join(" · ")}</span></div><div class="cac-actions"><button class="cac-open" data-i="${esc(x.id)}">Kaydı aç <span aria-hidden="true">→</span></button></div></div>`).join("")}</div><p class="cac-no-match" hidden>Bu filtreye uygun öğrenci yok.</p>`: `<div class="cac-empty"><span>✓</span><div><b>Öncelikli uyarı görünmüyor</b><p>Yeni görev veya çalışma kaydı geldikçe bu alan güncellenir.</p></div></div>`}
      <div class="cac-foot"><span><i></i> Mevcut panel verileri</span><button data-cp="a">Sınıf deneme analizini aç <span aria-hidden="true">→</span></button></div>
    </section>`;
  }

  coachView=function(){
    const html=baseCoachView.apply(this,arguments);
    if(typeof ROLE==="undefined"||ROLE!=="coach"||typeof CPG==="undefined"||CPG!=="o"||(typeof sel!=="undefined"&&sel))return html;
    try { return html.replace("</section>",coachActionCenter()+"</section>"); }
    catch(e) { return html; }
  };

  if(!document.documentElement.dataset.cacFiltersBound){
    document.documentElement.dataset.cacFiltersBound="1";
    document.addEventListener("click",function(e){
      const btn=e.target.closest&&e.target.closest("[data-cac-filter]");
      if(!btn)return;
      const panel=btn.closest(".coach-action-center");
      if(!panel)return;
      const filter=btn.getAttribute("data-cac-filter")||"all";
      panel.querySelectorAll("[data-cac-filter]").forEach(b=>{
        const active=b===btn;
        if(b.classList.contains("cac-filter")){
          b.classList.toggle("is-active",active);
          b.setAttribute("aria-pressed",active?"true":"false");
        }else if(b.classList.contains("cac-stat")&&filter!=="all"){
          b.classList.toggle("is-selected",b.getAttribute("data-cac-filter")===filter);
        }else if(b.classList.contains("cac-stat"))b.classList.remove("is-selected");
      });
      let visible=0;
      panel.querySelectorAll("[data-cac-row]").forEach(row=>{
        const tags=(row.getAttribute("data-cac-tags")||"").split(/\s+/);
        const show=filter==="all"||tags.includes(filter);
        row.hidden=!show;
        if(show)visible++;
      });
      const empty=panel.querySelector(".cac-no-match");
      if(empty)empty.hidden=visible!==0;
    });
  }
})();