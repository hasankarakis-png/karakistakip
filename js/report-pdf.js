/* Kurumsal PDF rapor: öğrencinin kayıtlı verilerinden logolu, A4 biçiminde rapor sayfası açar; "PDF olarak kaydet" yazdırma penceresinden yapılır. */
const rpN=v=>{const n=Number(v);return Number.isFinite(n)?Math.round(n*100)/100:0};
const rpE=s=>esc(String(s==null?"":s));
const rpD=s=>{if(!s)return"";const[y,m,d]=String(s).slice(0,10).split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"})};
function rpChart(L){
  const P=L.filter(e=>e.total_net!=null).slice(-10).map(e=>({v:rpN(e.total_net),d:String(e.exam_date||"").slice(5)}));
  if(P.length<2)return"";
  const W=640,H=170,px=34,mx=Math.max(...P.map(p=>p.v)),mn=Math.min(...P.map(p=>p.v)),lo=Math.max(0,Math.floor(mn-5)),hi=Math.ceil(mx+5),sx=i=>px+i*(W-px-14)/(P.length-1),sy=v=>H-26-(v-lo)/(hi-lo||1)*(H-48);
  const pts=P.map((p,i)=>sx(i)+","+sy(p.v)).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Net gelişim grafiği"><line x1="${px}" y1="${H-26}" x2="${W-8}" y2="${H-26}" stroke="#d9cfbd"/><polyline fill="none" stroke="#C93A20" stroke-width="3" points="${pts}"/>${P.map((p,i)=>`<circle cx="${sx(i)}" cy="${sy(p.v)}" r="4.5" fill="#C93A20"/><text x="${sx(i)}" y="${sy(p.v)-9}" font-size="11" font-weight="700" text-anchor="middle" fill="#1B2A4A">${p.v}</text><text x="${sx(i)}" y="${H-9}" font-size="10" text-anchor="middle" fill="#6b738c">${rpE(p.d)}</text>`).join("")}</svg>`;
}
function rpHtml(sid){
  const x=roster().find(r=>r.id===sid),st=STU.find(p=>p.id===sid)||{},ad=rpE(st.name||"Öğrenci"),h=x?x.hist:[],n=h.length||1,sum=k=>h.reduce((a,d)=>a+(d[k]||0),0);
  const L=(EX[sid]||[]).slice().sort((a,b)=>String(a.exam_date||"").localeCompare(String(b.exam_date||""))),last=L[L.length-1],tg=tgPick(sid);
  const tk=(TK[sid]||[]).filter(t=>t.task_date>=dayN(-6)&&t.task_date<=day()),tkd=tk.filter(t=>t.done).length,am=Math.round(sum("m")/n);
  const A=AIR[sid],r=(A&&A.report)||null,s=(A&&A.stats)||null,note=((C.notes[sid]||[]).slice(-1)[0])||null;
  const kpi=(a,b)=>`<div class="k"><b>${a}</b><span>${b}</span></div>`;
  const li=a=>(a||[]).map(t=>`<li>${rpE(t)}</li>`).join("");
  const sec=(t,b)=>b?`<section><h2>${t}</h2>${b}</section>`:"";
  const exRows=L.slice(-8).reverse().map(e=>`<tr><td>${rpE(e.exam_name)}</td><td>${rpE(e.exam_type)}</td><td>${rpE(rpD(e.exam_date))}</td><td class="r">${e.total_net==null?"–":rpN(e.total_net)}</td></tr>`).join("");
  const ders=s&&s.dersler?s.dersler.map(d=>`<tr><td>${rpE(d.ders)}</td><td class="r">${d.onceki_net==null?"–":rpN(d.onceki_net)}</td><td class="r">${rpN(d.son_net)}</td><td class="r">${d.fark==null?"–":(rpN(d.fark)>0?"+":"")+rpN(d.fark)}</td><td>${rpE(d.egilim||"")}</td></tr>`).join(""):"";
  const lv={YUKSEK:"Yüksek",ORTA:"Orta",DUSUK:"Düşük"};
  const pr=r&&r.oncelikler?r.oncelikler.map(o=>`<div class="pr"><b>${rpE(o.ders)}${o.konu?" · "+rpE(o.konu):""}</b> <i>Öncelik: ${rpE(lv[o.seviye]||"Orta")}</i><p>${rpE(o.gerekce)}</p><p><b>Yöntem:</b> ${rpE(o.calisma_yontemi)} · <b>Miktar:</b> ${rpE(o.miktar)}</p></div>`).join(""):"";
  const hd=s&&s.hedef,gl=tg&&tg.target_net!=null?`<p><b>Hedef:</b> ${rpN(tg.target_net)} net${tg.university?" · "+rpE([tg.university,tg.department].filter(Boolean).join(" – ")):""}${hd&&hd.son_net!=null?`<br>Son durum: ${rpN(hd.son_net)} net · ${rpN(hd.kalan_net)>0?rpN(hd.kalan_net)+" net kaldı":"hedefe ulaşıldı"}`:""}</p>`:"";
  const css=`@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;font:13px/1.55 "Nunito",system-ui,Arial,sans-serif;color:#1B2A4A;background:#eee}.pg{max-width:794px;margin:0 auto;background:#fff;padding:28px 34px}
.top{display:flex;align-items:center;gap:16px;border-bottom:4px solid #C93A20;padding-bottom:14px}.top img{width:78px;height:78px;border-radius:16px}.top h1{margin:0;font-size:22px;letter-spacing:.04em}.top small{display:block;color:#5C6785;font-size:12px;margin-top:2px}.top .tag{margin-left:auto;text-align:right;font-size:12px;color:#5C6785}
.title{margin:18px 0 4px;font-size:20px}.meta{color:#5C6785;margin:0 0 14px}.ks{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:10px 0}.k{background:#FFF4E2;border-radius:12px;padding:12px;text-align:center}.k b{display:block;font-size:20px;color:#C93A20}.k span{font-size:11px;color:#5C6785}
section{margin-top:18px;break-inside:avoid}h2{font-size:15px;margin:0 0 8px;padding-left:9px;border-left:4px solid #C93A20}table{width:100%;border-collapse:collapse}th,td{padding:6px 8px;border-bottom:1px solid #eadfca;text-align:left}th{background:#FFF4E2;font-size:12px}.r{text-align:right}ul{margin:4px 0;padding-left:20px}.pr{background:#fffaf1;border:1px solid #eadfca;border-radius:10px;padding:9px 12px;margin-bottom:8px;break-inside:avoid}.pr p{margin:4px 0}.pr i{color:#C93A20;font-style:normal;font-size:12px}
.ft{margin-top:26px;padding-top:10px;border-top:1px solid #eadfca;font-size:11px;color:#5C6785;display:flex;justify-content:space-between;gap:14px}.bar{position:sticky;top:0;background:#1B2A4A;color:#fff;padding:10px;text-align:center}.bar button{font:700 14px Arial,sans-serif;padding:9px 18px;border:0;border-radius:10px;background:#C93A20;color:#fff;cursor:pointer}
@media print{body{background:#fff}.pg{padding:0;max-width:none}.bar{display:none}}`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${ad} – Gelişim Raporu</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
<div class="bar"><button id="rpPrint">📄 PDF olarak kaydet / Yazdır</button></div><div class="pg">
<div class="top"><img src="${location.origin}/logo.png" alt="Karakış"><div><h1>KARAKIŞ EĞİTİM &amp; DANIŞMANLIK</h1><small>Bireysel eğitim koçluğu · Deneme analizi · Psikolojik danışmanlık</small></div><div class="tag">Pd. Hasan Karakış<br>Kayapınar / Diyarbakır<br>takip.hasankarakis.com</div></div>
<h1 class="title">Öğrenci Gelişim Raporu</h1><p class="meta"><b>${ad}</b> · Rapor tarihi: ${rpE(rpD(day()))}</p>
<section><h2>Son ${n} günün özeti</h2><div class="ks">${kpi(Math.floor(am/60)+" sa "+am%60+" dk","günlük ort. net çalışma")}${kpi(h.filter(d=>d.m>0).length+"/"+n,"çalışılan gün")}${kpi(sum("q"),"çözülen soru")}${kpi(tk.length?tkd+"/"+tk.length:"–","tamamlanan görev")}</div></section>
${sec("Deneme gelişimi",L.length?rpChart(L)+`<table><tr><th>Deneme</th><th>Tür</th><th>Tarih</th><th class="r">Net</th></tr>${exRows}</table>`:"")}
${sec("Hedef",gl)}
${sec("Ders bazlı değişim",ders?`<table><tr><th>Ders</th><th class="r">Önceki</th><th class="r">Son</th><th class="r">Fark</th><th>Eğilim</th></tr>${ders}</table>`:"")}
${r?sec("Genel değerlendirme",`<p>${rpE(r.ozet)}</p><p>${rpE(r.egilim)}</p>`):""}
${r&&(r.guclu_yonler||[]).length?sec("Güçlü yönler",`<ul>${li(r.guclu_yonler)}</ul>`):""}
${r&&(r.gelistirilecek_alanlar||[]).length?sec("Geliştirilecek alanlar",`<ul>${li(r.gelistirilecek_alanlar)}</ul>`):""}
${sec("Öncelikli konular ve çalışma önerisi",pr)}
${note?sec("Koç notu",`<p>${rpE(note.x)}</p>`):""}
${r?"":`<p style="color:#B35F00">Not: Bu öğrenci için yapay zekâ analizi henüz üretilmedi. Panelde "Yapay zekâ koç raporunu üret"e basıp raporu yeniden oluştur.</p>`}
<div class="ft"><span>Bu rapor kayıtlı çalışma ve deneme verilerinden hazırlanmıştır. Yapay zekâ yorumları rehber niteliğindedir, kesin sonuç değildir.</span><span>© Karakış Eğitim &amp; Danışmanlık</span></div></div></body></html>`;
}
async function pdfReport(sid){
  const w=window.open("","_blank");if(!w){alert("Pop-up engellendi. Tarayıcıda bu site için açılır pencereye izin ver.");return}
  w.document.write("<p style='font-family:sans-serif;padding:20px'>Rapor hazırlanıyor…</p>");
  try{
    if(!(sid in EX)||!EX[sid])await loadExams(sid);
    if(!AIR[sid])await loadReport(sid);
    w.document.open();w.document.write(rpHtml(sid));w.document.close();
    const b=w.document.getElementById("rpPrint");if(b)b.addEventListener("click",()=>w.print());
  }catch(e){w.document.body.textContent="Rapor oluşturulamadı: "+(e&&e.message||e)}
}
