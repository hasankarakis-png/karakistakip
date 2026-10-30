/* Karakış Takip · Toplu telafi planı (yapay zekâyla geciken görev dağıtımı)
   Var olan task-plan/weekly_tasks akışını kullanır; şema veya RLS değiştirmez.
   Kendi sayfası yok: Aksiyon Merkezi (coach-center.js) genel bakışta ciPlans() ile gösterir. Sayılar Aksiyon Merkezi'nde. */
(function(){
  "use strict";
  const previousUi = ui;
  const CI = { initialized:false, selected:new Set(), busy:false, message:"", lastResults:[] };
  const ciRoster = () => {
    let rows=[]; try { rows=roster()||[]; } catch(e) {}
    return rows.map(x=>{
      let late=[]; try { late=overdue(x.id)||[]; } catch(e) {}
      let warnings=[]; try { warnings=flags(x.hist||[])||[]; } catch(e) {}
      const noWork=!(Number(x.m)||Number(x.q)||x.st==="study"||x.st==="break");
      return {id:String(x.id),name:String(x.n||x.name||"Öğrenci"),late:late.length,warnings:warnings.length,noWork,minutes:Number(x.m)||0,questions:Number(x.q)||0};
    });
  };
  const ciEscape = v => typeof esc==="function" ? esc(String(v==null?"":v)) : String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function ciStatus(id){
    if(typeof RD==="undefined"||!RD[id]) return "";
    const s=RD[id].st;
    if(s==="load"||s==="apply") return "Hazırlanıyor…";
    if(s==="ok") return "Plan hazır";
    if(s==="err") return "Plan oluşturulamadı";
    if(s==="done") return "Dağıtıldı";
    return "";
  }
  function ciCard(){
    const rows=ciRoster(),eligible=rows.filter(x=>x.late>0);
    if(!CI.initialized){CI.selected=new Set(eligible.map(x=>x.id));CI.initialized=true;}
    const lateTotal=rows.reduce((n,x)=>n+x.late,0);
    const warningTotal=rows.filter(x=>x.warnings>0).length;
    const idleTotal=rows.filter(x=>x.noWork).length;
    const ready=eligible.filter(x=>CI.selected.has(x.id));
    const prepared=ready.filter(x=>typeof RD!=="undefined"&&RD[x.id]&&RD[x.id].st==="ok");
    const completed=rows.filter(x=>typeof RD!=="undefined"&&RD[x.id]&&RD[x.id].st==="done").length;
    return `<section class="ci-panel" aria-labelledby="ci-title">
      <div class="ci-head"><div><p class="ci-eyebrow">YAPAY ZEKÂ · TELAFİ PLANI</p><h2 id="ci-title">Geciken görevleri dağıt</h2><p class="ci-sub">Geciken görevi olan öğrenciler için kişiye özel telafi planı hazırla, inceleyip tek işlemle uygula.</p></div><span class="ci-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="4"/></svg></span></div>
      <div class="ci-toolbar"><div><h3>Telafi planı oluştur</h3><p>Yalnızca geciken, henüz tamamlanmamış görevler planlanır.</p></div><div class="ci-actions"><button class="ci-btn ci-btn-quiet" data-ci-selectall="1">${ready.length===eligible.length?"Seçimi kaldır":"Tümünü seç"}</button><button class="ci-btn ci-btn-primary" data-ci-generate="1" ${CI.busy||!ready.length?"disabled":""}>${CI.busy?"Planlar hazırlanıyor…":"✦ Yapay zekâyla plan oluştur"}</button></div></div>
      ${eligible.length?`<div class="ci-list">${eligible.map(x=>{
        const chosen=CI.selected.has(x.id),status=ciStatus(x.id);
        const r=typeof RD!=="undefined"?RD[x.id]:null;
        const detail=[x.late+" geciken görev",x.warnings?x.warnings+" takip uyarısı":null,x.noWork?"bugün çalışma kaydı yok":null].filter(Boolean).join(" · ");
        return `<label class="ci-row"><input type="checkbox" data-ci-student="${ciEscape(x.id)}" ${chosen?"checked":""} ${CI.busy?"disabled":""}><span class="ci-person"><b>${ciEscape(x.name)}</b><small>${ciEscape(detail)}</small></span><span class="ci-row-end">${status?`<em class="ci-status ${r&&r.st==="done"?"is-done":r&&r.st==="err"?"is-error":""}">${ciEscape(status)}</em>`:""}${r&&r.st==="done"?`<button type="button" class="ci-undo" data-ci-undo="${ciEscape(x.id)}">Geri al</button>`:""}</span></label>`;
      }).join("")}</div>`:`<div class="ci-empty"><b>Şu an geciken görev görünmüyor.</b><span>Yeni gecikmeler oluştuğunda öğrenciler bu listede görünür.</span></div>`}
      <div class="ci-footer"><span>${ready.length} öğrenci seçildi · ${prepared.length} plan uygulamaya hazır${completed?" · "+completed+" öğrenciye daha önce dağıtıldı":""}</span><button class="ci-btn ci-btn-primary" data-ci-apply="1" ${CI.busy||!prepared.length?"disabled":""}>Hazır planları uygula (${prepared.length})</button></div>
      ${CI.message?`<p class="ci-message" role="status">${ciEscape(CI.message)}</p>`:""}
      <p class="ci-note">Güvenlik: Yapay zekâ önerileri önce önizleme durumunda hazırlanır. “Hazır planları uygula” seçilince mevcut görevlerin tarihleri değiştirilir; tamamlanmış görevler değiştirilmez. Yeni görev kaydı veya veri tabanı şeması oluşturulmaz.</p>
    </section>`;
  }
  // Geciken görevi olan öğrenci yoksa genel bakışta yer kaplamaz.
  window.ciPlans=function(){try{return ciRoster().some(x=>x.late>0)?ciCard():""}catch(e){return ""}};
  async function ciGenerate(){
    if(CI.busy)return;
    const rows=ciRoster().filter(x=>CI.selected.has(x.id)&&x.late>0);
    if(!rows.length){CI.message="Plan oluşturmak için en az bir geciken öğrenciyi seç.";render();return;}
    CI.busy=true;CI.message="0 / "+rows.length+" öğrenci için plan hazırlanıyor…";render();
    let ok=0,fail=0;
    for(let i=0;i<rows.length;i++){
      try{
        if(typeof rdPlan!=="function")throw new Error("Mevcut görev planlama servisi bulunamadı.");
        await rdPlan(rows[i].id);
        if(typeof RD!=="undefined"&&RD[rows[i].id]&&RD[rows[i].id].st==="ok")ok++;else fail++;
      }catch(e){fail++;}
      CI.message=(i+1)+" / "+rows.length+" öğrenci işlendi · "+ok+" plan hazır"+(fail?" · "+fail+" sorun":"");
      render();
    }
    CI.busy=false;
    CI.message=ok+" kişiye özel plan hazır"+(fail?"; "+fail+" öğrenci için plan oluşturulamadı. Hata verenleri kontrol edip yeniden deneyebilirsin.":". Planları inceleyip topluca uygulayabilirsin.");
    render();
  }
  async function ciApply(){
    if(CI.busy)return;
    const rows=ciRoster().filter(x=>CI.selected.has(x.id)&&typeof RD!=="undefined"&&RD[x.id]&&RD[x.id].st==="ok");
    if(!rows.length){CI.message="Uygulanmaya hazır plan bulunamadı.";render();return;}
    if(!confirm(rows.length+" öğrenci için yapay zekâ planları uygulanacak. Yalnızca geciken görevlerin tarihleri değişecek. Devam edilsin mi?"))return;
    CI.busy=true;CI.message="Planlar uygulanıyor…";render();
    let ok=0,fail=0;
    for(let i=0;i<rows.length;i++){
      try{
        await rdGo(rows[i].id);
        if(typeof RD!=="undefined"&&RD[rows[i].id]&&RD[rows[i].id].st==="done"&&!RD[rows[i].id].bad)ok++;else fail++;
      }catch(e){fail++;}
      CI.message=(i+1)+" / "+rows.length+" öğrenci işlendi";render();
    }
    CI.busy=false;CI.message="Toplu işlem tamamlandı: "+ok+" başarılı"+(fail?", "+fail+" öğrenci için kontrol gerekiyor":".");
    try{await pullCoach()}catch(e){}
    render();
  }
  function ciUi(t){
    const d=t&&t.dataset||{};
    if(d.ciStudent!==undefined){const id=String(d.ciStudent);if(t.checked)CI.selected.add(id);else CI.selected.delete(id);CI.message="";render();return true;}
    if(d.ciSelectall!==undefined){const eligible=ciRoster().filter(x=>x.late>0),all=eligible.every(x=>CI.selected.has(x.id));CI.selected=all?new Set():new Set(eligible.map(x=>x.id));CI.message="";render();return true;}
    if(d.ciGenerate!==undefined){ciGenerate();return true;}
    if(d.ciApply!==undefined){ciApply();return true;}
    if(d.ciUndo){if(typeof rdUndo==="function")rdUndo(String(d.ciUndo));return true;}
    return false;
  }
  ui=function(t){if(ciUi(t))return true;return previousUi.apply(this,arguments);};
  document.addEventListener("change",function(e){const t=e.target;if(!t||!t.dataset||t.dataset.ciStudent===undefined)return;const id=String(t.dataset.ciStudent);if(t.checked)CI.selected.add(id);else CI.selected.delete(id);CI.message="";render();});
})();