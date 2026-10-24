/* ===== Öğrenci arayüzü (siyah + limon) ===== */
let QA=false,HMSEL=null;
const IC={
  home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/></svg>',
  cal:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h2M12 14h2M8 17h2M12 17h2"/></svg>',
  bars:'<svg viewBox="0 0 24 24"><path d="M5 20V12M10 20V6M15 20V9M20 20V14" stroke-width="3.2"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/></svg>'
};
const QUOTES=["Bugün attığın küçük adım, sınav günü büyük fark yaratır.","Mükemmel olmak zorunda değilsin, devam etmen yeterli.","Zor konular, doğru çalışmayla kolaylaşır.","Her çözdüğün soru seni hedefe biraz daha yaklaştırır.","Yorulduğunda dinlen, ama vazgeçme.","İstikrar, motivasyondan daha güçlüdür.","Dünün netini değil, dünkü kendini geç.","Hata yaptığın yer, öğrenmeye en açık olduğun yerdir."];
const quoteCard=()=>`<div class="card qt"><h2>Günün Sözü</h2><p>“${QUOTES[Math.floor(Date.now()/864e5)%QUOTES.length]}”</p></div>`;
function tasksRing(){
  const L=(TK[ME]||[]).filter(t=>t.task_date===day()),d=L.filter(t=>t.done).length,p=L.length?Math.round(d/L.length*100):0;
  const last=t=>{const a=(EX[ME]||[]).filter(e=>e.exam_type===t&&e.total_net!=null);return a.length?num(a[a.length-1].total_net):null};
  const kinds=["TYT","AYT"].concat(last("LGS")!=null?["LGS"]:[]);
  return `<button class="card tr" data-tab="g" aria-label="Görevlerim sekmesini aç"><span class="rg" style="--p:${p}"><span>${L.length?d+"/"+L.length:"+"}</span></span><span><h2>Bugünkü Görevler</h2><p>${L.length?d+" / "+L.length+" tamamlandı":"Henüz görev yok"}</p>${L.length?"":"<small>Koçun görev atayınca burada görünür.</small>"}</span></button>
  <div class="nets">${kinds.map(k=>`<div><small>${k} son net</small><b>${last(k)==null?"—":last(k)}</b></div>`).join("")}</div>`;
}
const YKS=new Date(2027,5,19,10,15,0);
const cdParts=()=>{let t=Math.max(0,YKS-Date.now());const s=Math.floor(t/1000);return [Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60]};
function countdownCard(){
  const v=cdParts();
  return `<div class="card"><div class="cdh"><h2>YKS 2027</h2><small>19 Haziran 2027</small></div><div class="cd">${["Gün","Saat","Dakika","Saniye"].map((l,i)=>`<div><b id="cd${i}">${i?String(v[i]).padStart(2,"0"):v[i]}</b><span>${l}</span></div>`).join("")}</div></div>`;
}
function heatCard(){
  const H=Object.assign({},HIST[ME]||{});H[day()]=snap();
  const WK=18,today=new Date();today.setHours(0,0,0,0);
  const dow=(today.getDay()+6)%7; // Pzt=0
  const start=new Date(today);start.setDate(start.getDate()-dow-(WK-1)*7);
  const lvl=m=>m<=0?0:m<30?1:m<90?2:m<180?3:4;
  const cells=[],months=[];let lastM=-1;
  for(let w=0;w<WK;w++)for(let r=0;r<7;r++){
    const d=new Date(start);d.setDate(start.getDate()+w*7+r);const k=ymd(d),fut=d>today;
    if(r===0&&d.getMonth()!==lastM){lastM=d.getMonth();months.push([w,d.toLocaleDateString("tr-TR",{month:"short"})])}
    if(fut){cells.push(`<span></span>`);continue}
    const z=H[k]||{},m=num(z.m);
    cells.push(`<button class="l${lvl(m)}${k===day()?" td":""}${HMSEL===k?" sel":""}" data-hm="${k}" aria-label="${k}: ${m} dakika"></button>`);
  }
  const sel=HMSEL&&H[HMSEL]?`<b>${fd(HMSEL)}</b>: ${hm2(num(H[HMSEL].m))} · ${num(H[HMSEL].q)} soru`:"Dokun: o günün çalışmasını gör";
  const cw=`calc((100% - 30px - ${(WK-1)*4}px)/${WK})`;
  return `<div class="card"><h2>Yoğunluk Haritası</h2><div class="hmm" style="margin-left:30px">${months.map(([w,n])=>`<span style="left:calc(${w} * (100% / ${WK}))">${esc(n)}</span>`).join("")}</div>
  <div class="hmw"><div class="hmd"><span>Pzt</span><span></span><span>Çar</span><span></span><span>Cum</span><span></span><span>Paz</span></div><div class="hm" style="flex:1;grid-template-columns:repeat(${WK},1fr)">${cells.join("")}</div></div>
  <p class="empty" style="margin:4px 0 8px;font-size:14px">${sel}</p>
  <div class="hmf"><span>Az</span><span><i style="background:var(--line)"></i><i style="background:#3d4a14"></i><i style="background:#7d9420"></i><i style="background:#aac331"></i><i style="background:#d9f24a"></i></span><span>Çok</span></div></div>`;
}
function qaSheet(){
  const it=(ic,t,sub,tab,sc)=>`<button class="qa-i" data-qa="${tab}"${sc?` data-qs="${sc}"`:""}><span aria-hidden="true">${ic}</span><span><b>${t}</b><small>${sub}</small></span><i aria-hidden="true">›</i></button>`;
  return `<button class="qa-bg" id="qabg" aria-label="Kapat"></button><div class="qa" role="dialog" aria-modal="true" aria-label="Hızlı işlemler"><div class="grab"></div><h2>Hızlı işlemler</h2>
  ${it("⏱","Kronometre","Derse başla, mola ver, süreni gör","b")}
  ${it("✍️","Soru girişi","Çözdüğün soruları kaydet","b","qcard")}
  ${it("➕","Yeni Sınav Sonucu","Görseli ya da PDF'i yükle","d")}
  ${it("✅","Haftalık Görevler","Koçunun verdiği görevler","g")}
  ${it("🏆","Yarışma","Arkadaşlarınla sıralamayı gör","y")}
  ${it("📚","Konu Takibi","Bitirdiğin konuları işaretle","c")}
  ${it("🎓","Tercih Robotu","Sıranla bölümleri karşılaştır","t")}
  ${it("🤖","Çalışma Asistanı","Plan ve motivasyon için sor","k")}</div>`;
}

let ANT="o";
function analizTab(){
  const seg=`<div class="ktseg" role="tablist" style="margin:0 0 12px">${[["o","Özet"],["n","Denemeler"],["t","Hedef ve tekrar"]].map(([k,n])=>`<button data-ant="${k}" aria-pressed="${ANT===k}">${n}</button>`).join("")}</div>`;
  const b=ANT==="n"?examCard()+netChartsCard(ME):ANT==="t"?goalRoad(ME)+(ktLoad(),tekrarCard(ME,KTS.done,6))+`<button class="card tr" data-tab="c" aria-label="Konu takibini aç"><span class="rg" style="--p:0"><span style="font-size:30px">📚</span></span><span><h2>Konu Takibi</h2><p style="font-size:15px">Bitirdiğin konuları işaretle</p></span></button>`:dailyActivityCard()+heatCard();
  return `<h1 class="pg">Analiz</h1>${seg}${b}`;
}
