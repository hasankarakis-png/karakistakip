/* ===== Öğrenci profili (student_profile) =====
   Sınav türü (YKS/LGS), alan, sınıf, okul ve hedef. Koç öğrencinin "Diğer" sekmesinden düzenler, öğrenci yalnızca okur.
   Sınav türü ders listesini (SUBJ), geri sayımı ve net kartlarını belirler. LGS tarihi exam_calendar'da tutulur (koç girer).
   Koç ayrıca hangi öğrencinin bildirimi açık olduğunu görür (push_coverage: yalnızca sayı, abonelik anahtarı değil). */
const PROF={},PRD={};let PRMSG={},PUSHCOV=null,EXCAL=[];
const PR_FIELDS=["SAY","EA","SÖZ","DİL","TYT"],PR_GRADES=["7","8","9","10","11","12","Mezun"];
const isLGS=id=>(PROF[id]||{}).exam==="LGS";
const subjFor=id=>isLGS(id)?SUBJ_LGS:SUBJ_YKS;
function subjApply(){if(ROLE!=="student")return;SUBJ=subjFor(ME);if(!SUBJ.includes(subj))subj=SUBJ[0]}
async function profLoad(id){try{const {data}=await sb.from("student_profile").select("*").eq("student_id",id).maybeSingle();PROF[id]=data||{}}catch(e){PROF[id]=PROF[id]||{}}subjApply()}
async function calLoad(){try{const {data}=await sb.from("exam_calendar").select("id,exam_date,title,exam_type").gte("exam_date",day()).order("exam_date");EXCAL=data||[]}catch(e){}}
async function profPullCoach(){
  const [p,c,k]=await Promise.all([sb.from("student_profile").select("*"),sb.rpc("push_coverage"),sb.from("exam_calendar").select("id,exam_date,title,exam_type").gte("exam_date",day()).order("exam_date")]).catch(()=>[{},{},{}]);
  if(p&&p.data){Object.keys(PROF).forEach(k=>delete PROF[k]);p.data.forEach(r=>PROF[r.student_id]=r)}
  if(c&&!c.error&&Array.isArray(c.data)){PUSHCOV={};c.data.forEach(r=>PUSHCOV[r.student_id]=num(r.n))}
  if(k&&k.data)EXCAL=k.data;
}
const lgsCal=()=>EXCAL.find(r=>r.exam_type==="LGS")||null;
const pushOff=id=>PUSHCOV!==null&&!PUSHCOV[id];
const pushOffIds=()=>PUSHCOV===null?[]:STU.filter(p=>!PUSHCOV[p.id]).map(p=>p.id);
// Kısa profil satırı: "YKS · SAY · 12. sınıf · 🎯 Tıp" (+ koç için bildirim durumu)
function profBadge(id){
  const p=PROF[id]||{},a=[];
  if(p.exam)a.push(p.exam);if(p.exam!=="LGS"&&p.field)a.push(p.field);if(p.grade)a.push(p.grade==="Mezun"?"Mezun":p.grade+". sınıf");if(p.target)a.push("🎯 "+p.target);
  const off=ROLE==="coach"&&pushOff(id)?`<span class="pr-off" title="Bu öğrenciye bildirim gitmiyor">🔕 Bildirim kapalı</span>`:"";
  if(!a.length&&!off)return ROLE==="coach"?`<div class="pr-line"><button class="chip" data-dt="d" style="padding:4px 10px;font-size:13px">+ Profil bilgisi ekle</button></div>`:"";
  return `<div class="pr-line">${a.map(t=>`<span>${esc(t)}</span>`).join("")}${off}</div>`;
}
const prVal=(id,k)=>{const d=PRD[id];if(d&&k in d)return d[k];if(k==="lgs"){const r=lgsCal();return r?r.exam_date:""}return (PROF[id]||{})[k]||(k==="exam"?"YKS":"")};
function profCard(x){
  const id=x.id,ex=prVal(id,"exam"),opt=(L,v,ph)=>(ph?`<option value="">${ph}</option>`:"")+L.map(o=>`<option value="${esc(o)}"${o===v?" selected":""}>${esc(o==="Mezun"?"Mezun":/^\d+$/.test(o)?o+". sınıf":o)}</option>`).join("");
  const m=PRMSG[id];
  return `<div class="card" id="detail-profile"><h2>🎓 Öğrenci profili</h2><p class="empty" style="margin:0 0 8px;font-size:13px">Sınav türü ders listesini, geri sayımı ve net kartlarını belirler. Öğrenci görür ama değiştiremez.</p>
  <div class="row" style="margin-top:0"><label>Sınav<select id="prx" data-pr="exam">${opt(["YKS","LGS"],ex)}</select></label>
  ${ex==="LGS"?"":`<label>Alan<select id="prf" data-pr="field">${opt(PR_FIELDS,prVal(id,"field"),"Seçilmedi")}</select></label>`}
  <label>Sınıf<select id="prg" data-pr="grade">${opt(ex==="LGS"?["7","8"]:["9","10","11","12","Mezun"],prVal(id,"grade"),"Seçilmedi")}</select></label></div>
  <div class="row"><label>Okul<input id="prs" data-pr="school" maxlength="80" autocomplete="off" value="${esc(prVal(id,"school"))}" style="width:200px"></label><label>Hedef<input id="prt" data-pr="target" maxlength="120" autocomplete="off" placeholder="${ex==="LGS"?"ör. Fen lisesi":"ör. Dicle Üni. Tıp"}" value="${esc(prVal(id,"target"))}" style="width:220px"></label></div>
  ${ex==="LGS"?`<div class="row"><label>LGS sınav tarihi<input id="prl" data-pr="lgs" type="date" value="${esc(prVal(id,"lgs"))}"></label></div><p class="empty" style="margin:2px 0 0;font-size:12px">MEB resmî tarihi açıklayınca gir; tüm LGS öğrencilerinin geri sayımı buna göre çalışır.</p>`:""}
  <div class="row"><button class="btn" style="padding:11px 16px" data-prsave="${id}">Kaydet</button></div>
  ${m?`<p class="empty" style="font-size:13px;margin:6px 0 0;${m.err?"color:var(--warn)":""}">${esc(m.t)}</p>`:""}</div>`;
}
async function profSave(id){
  const g=k=>String(prVal(id,k)||"").trim(),ex=g("exam")==="LGS"?"LGS":"YKS";
  const row={student_id:id,exam:ex,field:ex==="LGS"?null:(PR_FIELDS.includes(g("field"))?g("field"):null),grade:PR_GRADES.includes(g("grade"))?g("grade"):null,school:g("school").slice(0,80)||null,target:g("target").slice(0,120)||null,updated_at:new Date().toISOString()};
  if(ex==="LGS"&&row.grade&&!["7","8"].includes(row.grade))row.grade=null;
  if(ex==="YKS"&&["7","8"].includes(row.grade))row.grade=null;
  const r=await dbw(sb.from("student_profile").upsert(row));
  if(r&&r.error){PRMSG[id]={t:"Kaydedilemedi: "+r.error.message,err:true};render();return}
  PROF[id]=row;
  const ld=g("lgs"),cur=lgsCal();
  if(ex==="LGS"&&ld&&/^\d{4}-\d{2}-\d{2}$/.test(ld)&&(!cur||cur.exam_date!==ld)){
    const q=cur?sb.from("exam_calendar").update({exam_date:ld}).eq("id",cur.id):sb.from("exam_calendar").insert({exam_date:ld,title:"LGS",exam_type:"LGS",scope:"all"});
    const c=await dbw(q);if(c&&c.error){PRMSG[id]={t:"Profil kaydedildi; LGS tarihi kaydedilemedi: "+c.error.message,err:true};delete PRD[id];render();return}
    await calLoad();
  }
  delete PRD[id];PRMSG[id]={t:"Kaydedildi ✓"};render();
}
// Profil alanları yazılırken taslak PRD'de tutulur: arka plan yenilemesi ekranı yeniden çizse de yazılan kaybolmaz.
document.addEventListener("input",e=>{const k=e.target.dataset&&e.target.dataset.pr;if(k&&sel){(PRD[sel]=PRD[sel]||{})[k]=e.target.value;PRMSG[sel]=null}});
document.addEventListener("change",e=>{const k=e.target.dataset&&e.target.dataset.pr;if(!k||!sel)return;(PRD[sel]=PRD[sel]||{})[k]=e.target.value;PRMSG[sel]=null;if(k==="exam")render()});
(function(){const prev=ui;ui=function(t){if(t.dataset&&t.dataset.prsave){profSave(t.dataset.prsave);return true}return prev.apply(this,arguments)}})();
