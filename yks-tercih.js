/* Karakış YKS tercih modülü. Katalog yalnızca doğrulanmış resmî verilerle doldurulmalıdır. */
const SUPABASE_URL="https://ramcghaefbbwgwtgtdtt.supabase.co";
const SUPABASE_KEY="sb_publishable_MC44S4rXUNLDClD0RgNbaw_1unO3NAI";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let me=null,role="student",catalog=[],saved=[],page=1,activeTab="search";
const PAGE_SIZE=25;
const fmt=v=>v==null||v===""?"—":Number.isFinite(Number(v))?Number(v).toLocaleString("tr-TR"):String(v);
function notice(msg,type=""){ $("notice").textContent=msg;$("notice").className="notice "+type; }
function normalize(p){return {...p,base_rank:p.base_rank==null?null:Number(p.base_rank),base_score:p.base_score==null?null:Number(p.base_score),quota:p.quota==null?null:Number(p.quota),year:Number(p.year)}}
async function init(){
 const {data:{session},error}=await sb.auth.getSession();
 if(error){notice("Oturum bilgisi alınamadı: "+error.message,"error");return}
 if(!session){$("authPanel").hidden=false;notice("Önce Karakış Takip hesabınla giriş yapmalısın.");return}
 me=session.user;
 const {data:profile,error:pe}=await sb.from("profiles").select("id,name,role").eq("id",me.id).maybeSingle();
 if(pe){notice("Profil okunamadı. Tercih robotu için veritabanı güncellemesi gerekebilir: "+pe.message,"error");return}
 role=profile?.role||"student";
 $("workspace").hidden=false;$("signout").hidden=false;$("coachTab").hidden=role!=="coach";
 await Promise.all([loadCatalog(),loadSaved()]);
 if(role==="coach")await loadCoachLists();
}
async function loadCatalog(){
 const {data,error}=await sb.from("yks_programs").select("*").order("year",{ascending:false}).limit(10000);
 if(error){notice("Program kataloğu henüz hazır değil. Supabase migration dosyasını uyguladıktan sonra resmî veri CSV'sini koç panelinden yükle. ("+error.message+")","error");catalog=[];renderResults();return}
 catalog=(data||[]).map(normalize);
 $("programCount").textContent=fmt(catalog.length);
 const cities=[...new Set(catalog.map(p=>p.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"tr"));
 $("city").innerHTML='<option value="">Tüm şehirler</option>'+cities.map(c=>'<option>'+esc(c)+'</option>').join("");
 const years=[...new Set(catalog.map(p=>p.year).filter(Boolean))].sort((a,b)=>b-a);
 $("year").innerHTML='<option value="">Tüm yıllar</option>'+years.map(y=>'<option>'+y+'</option>').join("");
 if(!catalog.length)notice("Katalog boş. Koç, ÖSYM/YÖK Atlas kaynaklı doğrulanmış CSV verisini içe aktarabilir.");
 renderResults();
}
async function loadSaved(){
 const {data,error}=await sb.from("yks_preferences").select("id,student_id,program_id,preference_order,created_at").eq("student_id",me.id).order("preference_order");
 if(error){notice("Tercih listen okunamadı. Migration/RLS ayarlarını kontrol et: "+error.message,"error");return}
 saved=data||[];renderSaved();
}
function filtered(){
 const q=$("query").value.trim().toLocaleLowerCase("tr-TR"),st=$("scoreType").value,city=$("city").value,ut=$("uniType").value,fee=$("fee").value,yr=$("year").value,max=Number($("maxRank").value)||0;
 let out=catalog.filter(p=>{
  const text=[p.program_code,p.university,p.department,p.city,p.language].join(" ").toLocaleLowerCase("tr-TR");
  return (!q||text.includes(q))&&(!st||p.score_type===st)&&(!city||p.city===city)&&(!ut||p.university_type===ut)&&(!fee||p.fee_type===fee)&&(!yr||String(p.year)===yr)&&(!max||(p.base_rank&&p.base_rank<=max));
 });
 const s=$("sort").value;
 out.sort((a,b)=>s==="name"?String(a.department).localeCompare(String(b.department),"tr"):s==="rank-desc"?(b.base_rank||0)-(a.base_rank||0):(a.base_rank||Infinity)-(b.base_rank||Infinity));
 return out;
}
function programCard(p){
 const isSaved=saved.some(s=>s.program_id===p.id);
 return '<article class="program"><div><h3>'+esc(p.department||"Program adı yok")+'</h3><div class="uni">'+esc(p.university||"Üniversite belirtilmemiş")+'</div><div class="meta"><span class="chip">'+esc(p.city||"Şehir yok")+'</span><span class="chip">'+esc(p.score_type||"Puan türü yok")+'</span><span class="chip">'+esc(p.university_type||"Tür belirtilmemiş")+'</span><span class="chip">'+esc(p.year||"Yıl yok")+'</span></div><div class="numbers"><span>Başarı sırası<b>'+fmt(p.base_rank)+'</b></span><span>Taban puan<b>'+fmt(p.base_score)+'</b></span><span>Kontenjan<b>'+fmt(p.quota)+'</b></span></div></div><div class="actions"><button class="btn secondary" data-detail="'+p.id+'">Detayları gör</button><button class="btn" data-toggle="'+p.id+'">'+(isSaved?"Listeden çıkar":"Tercihe ekle")+'</button></div></article>';
}
function renderResults(){
 const all=filtered(),shown=all.slice(0,page*PAGE_SIZE);
 $("resultSummary").textContent=fmt(all.length)+" program bulundu"+(catalog.length?" · yalnızca katalogdaki doğrulanmış veriler":"");
 $("results").innerHTML=shown.length?shown.map(programCard).join(""):'<div class="empty">'+(catalog.length?"Filtrelere uygun program bulunamadı.":"Henüz program verisi yüklenmemiş. Koç panelinden resmî veri kataloğu içe aktarılabilir.")+'</div>';
 $("loadMore").hidden=shown.length>=all.length;
 $("loadMore").textContent="Daha fazla göster ("+Math.max(0,all.length-shown.length)+")";
}
function renderSaved(){
 $("savedCount").textContent=saved.length;
 const rows=saved.map((s,i)=>({...s,program:catalog.find(p=>p.id===s.program_id)}));
 $("savedResults").innerHTML=rows.length?'<div class="results">'+rows.map((s,i)=>s.program?'<article class="program"><div><span class="pill">TERCİH '+(i+1)+'</span><h3>'+esc(s.program.department)+'</h3><div class="uni">'+esc(s.program.university)+' · '+esc(s.program.city)+'</div><div class="numbers"><span>Yıl<b>'+fmt(s.program.year)+'</b></span><span>Başarı sırası<b>'+fmt(s.program.base_rank)+'</b></span><span>Taban puan<b>'+fmt(s.program.base_score)+'</b></span></div></div><div class="actions"><label>Sıra<input type="number" min="1" max="24" value="'+(i+1)+'" data-order="'+s.id+'"></label><button class="btn secondary" data-detail="'+s.program.id+'">Detay</button><button class="btn" data-toggle="'+s.program.id+'">Çıkar</button></div></article>':'<div class="empty">Bu program katalogda bulunamadı; yeniden içe aktarılması gerekebilir.</div>').join("")+'</div>':'<div class="empty">Henüz tercih eklemedin. Program ara bölümünden beğendiğin programları listeye ekleyebilirsin.</div>';
}
function detail(p){
 const {data:unused}= {data:null};
 const history=catalog.filter(x=>x.program_code===p.program_code&&x.university===p.university&&x.department===p.department).sort((a,b)=>a.year-b.year);
 $("detailContent").innerHTML='<span class="pill">'+esc(p.score_type||"YKS")+' · '+esc(p.year||"")+'</span><h2>'+esc(p.department)+'</h2><p>'+esc(p.university)+' · '+esc(p.city)+'</p><div class="detail-grid"><div><small>Başarı sırası</small><b>'+fmt(p.base_rank)+'</b></div><div><small>Taban puan</small><b>'+fmt(p.base_score)+'</b></div><div><small>Kontenjan</small><b>'+fmt(p.quota)+'</b></div><div><small>Ücret / burs</small><b>'+esc(p.fee_type||"—")+'</b></div><div><small>Öğretim dili</small><b>'+esc(p.language||"—")+'</b></div><div><small>Program kodu</small><b>'+esc(p.program_code||"—")+'</b></div></div><h3>Geçmiş yıllar</h3>'+(history.length?'<table class="history"><thead><tr><th>Yıl</th><th>Başarı sırası</th><th>Taban puan</th><th>Kontenjan</th></tr></thead><tbody>'+history.map(h=>'<tr><td>'+fmt(h.year)+'</td><td>'+fmt(h.base_rank)+'</td><td>'+fmt(h.base_score)+'</td><td>'+fmt(h.quota)+'</td></tr>').join("")+'</tbody></table>':'<p class="muted">Bu program için katalogda henüz geçmiş yıl kaydı yok.</p>')+'<p class="muted">Kaynak: '+(p.source_url?'<a href="'+esc(p.source_url)+'" target="_blank" rel="noopener noreferrer">Veri kaynağını aç</a>':"Kaynak bağlantısı kaydedilmemiş")+'. Geçmiş veriler gelecek yılın yerleşme garantisi değildir.</p><button class="btn" data-toggle="'+p.id+'">'+(saved.some(s=>s.program_id===p.id)?"Listeden çıkar":"Tercihe ekle")+'</button>';
 if(!$("detailDialog").open)$("detailDialog").showModal();
}
async function toggleProgram(id){
 const p=catalog.find(x=>String(x.id)===String(id));if(!p)return;
 const existing=saved.find(s=>String(s.program_id)===String(id));
 if(existing){
  const {error}=await sb.from("yks_preferences").delete().eq("id",existing.id).eq("student_id",me.id);
  if(error){notice("Tercih silinemedi: "+error.message,"error");return}
 }else{
  if(saved.length>=24){notice("Tercih listesi en fazla 24 program içerebilir.","error");return}
  const {error}=await sb.from("yks_preferences").insert({student_id:me.id,program_id:p.id,preference_order:saved.length+1});
  if(error){notice("Tercih eklenemedi: "+error.message,"error");return}
 }
 await loadSaved();renderResults();notice("Tercih listen kaydedildi.","success");
 if($("detailDialog").open)detail(p);
}
async function reorder(id,order){
 const target=saved.find(s=>String(s.id)===String(id));if(!target)return;
 const n=Math.max(1,Math.min(24,Number(order)||1));
 const list=saved.filter(s=>s.id!==target.id);list.splice(n-1,0,target);
 for(let i=0;i<list.length;i++){const {error}=await sb.from("yks_preferences").update({preference_order:i+1}).eq("id",list[i].id).eq("student_id",me.id);if(error){notice("Tercih sırası güncellenemedi: "+error.message,"error");return}}
 await loadSaved();notice("Tercih sırası güncellendi.","success");
}
function csvParse(text){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++}else if(c==='"'){quoted=!quoted}else if((c===","||c===";")&&!quoted){row.push(cell.trim());cell=""}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell.trim());if(row.some(v=>v!==""))rows.push(row);row=[];cell=""}else cell+=c}
 row.push(cell.trim());if(row.some(v=>v!==""))rows.push(row);return rows;
}
async function importCsv(){
 if(role!=="coach")return;
 const file=$("csvFile").files[0];if(!file){$("importStatus").textContent="Önce CSV dosyası seç.";return}
 $("importStatus").textContent="Dosya okunuyor…";
 try{
  const rows=csvParse((await file.text()).replace(/^\uFEFF/,""));if(rows.length<2)throw new Error("CSV başlık ve en az bir veri satırı içermeli.");
  const headers=rows.shift().map(x=>x.trim().toLowerCase());
  const required=["program_code","university","department","city","score_type","year"];
  const missing=required.filter(k=>!headers.includes(k));if(missing.length)throw new Error("Eksik sütunlar: "+missing.join(", "));
  const records=rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""]))).map(r=>({program_code:r.program_code,university:r.university,department:r.department,city:r.city,score_type:r.score_type,quota:r.quota?Number(r.quota):null,fee_type:r.fee_type||null,university_type:r.university_type||null,language:r.language||null,year:Number(r.year),base_rank:r.base_rank?Number(r.base_rank):null,base_score:r.base_score?Number(r.base_score):null,source_url:r.source_url||null,updated_by:me.id}));
  for(let i=0;i<records.length;i+=250){const {error}=await sb.from("yks_programs").upsert(records.slice(i,i+250),{onConflict:"program_code,year"});if(error)throw error}
  $("importStatus").textContent=records.length+" program kaydı içe aktarıldı.";
  await loadCatalog();notice("Katalog güncellendi.","success");
 }catch(e){$("importStatus").textContent="İçe aktarma başarısız: "+e.message;notice("CSV içe aktarılamadı.","error")}
}
async function loadCoachLists(){
 const {data:profiles,error}=await sb.from("profiles").select("id,name").eq("role","student");
 if(error){$("coachLists").textContent="Öğrenci listeleri yüklenemedi: "+error.message;return}
 const ids=(profiles||[]).map(p=>p.id);if(!ids.length){$("coachLists").textContent="Henüz öğrenci hesabı yok.";return}
 const {data:pref,error:pe}=await sb.from("yks_preferences").select("student_id,program_id,preference_order,created_at").in("student_id",ids).order("preference_order");
 if(pe){$("coachLists").textContent="Tercih kayıtları okunamadı: "+pe.message;return}
 $("coachLists").innerHTML=(profiles||[]).map(p=>{const list=(pref||[]).filter(x=>x.student_id===p.id);return '<div class="program"><div><h3>'+esc(p.name)+'</h3><p class="muted">'+list.length+' tercih kaydı</p>'+(list.length?list.map((x,i)=>{const prog=catalog.find(z=>z.id===x.program_id);return '<p>'+(i+1)+'. '+esc(prog?prog.department:"Katalogda bulunamadı")+' — '+esc(prog?prog.university:"")+'</p>'}).join(""):"")+'</div></div>'}).join("");
}
function exportCsv(){
 const rows=saved.map((s,i)=>{const p=catalog.find(x=>x.id===s.program_id)||{};return [i+1,p.program_code,p.university,p.department,p.city,p.score_type,p.year,p.base_rank,p.base_score,p.quota,p.source_url]});
 const csv=[["Tercih sırası","Program kodu","Üniversite","Bölüm","Şehir","Puan türü","Yıl","Başarı sırası","Taban puan","Kontenjan","Kaynak"],...rows].map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));a.download="karakis-yks-tercih-listem.csv";a.click();URL.revokeObjectURL(a.href);
}
function bind(){
 ["query","scoreType","city","uniType","fee","year","maxRank","sort"].forEach(id=>$(id).addEventListener(id==="query"||id==="maxRank"?"input":"change",()=>{page=1;renderResults()}));
 $("clearFilters").onclick=()=>{["query","scoreType","city","uniType","fee","year","maxRank"].forEach(id=>$(id).value="");page=1;renderResults()};
 $("loadMore").onclick=()=>{page++;renderResults()};
 document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));$("searchView").hidden=activeTab!=="search";$("savedView").hidden=activeTab!=="saved";$("coachView").hidden=activeTab!=="coach";if(activeTab==="coach"&&role!=="coach")return});
 document.addEventListener("click",e=>{const t=e.target.closest("[data-toggle]");if(t)toggleProgram(t.dataset.toggle);const d=e.target.closest("[data-detail]");if(d){const p=catalog.find(x=>String(x.id)===d.dataset.detail);if(p)detail(p)}});
 document.addEventListener("change",e=>{if(e.target.matches("[data-order]"))reorder(e.target.dataset.order,e.target.value)});
 $("exportList").onclick=exportCsv;
 $("shareList").onclick=async()=>{const txt=saved.map((s,i)=>{const p=catalog.find(x=>x.id===s.program_id);return (i+1)+". "+(p?p.department+" — "+p.university:"Program")}).join("\n");if(navigator.share){try{await navigator.share({title:"YKS tercih listem",text:txt})}catch(e){}}else if(navigator.clipboard){await navigator.clipboard.writeText(txt);notice("Tercih listesi panoya kopyalandı.","success")}else notice("Bu cihazda paylaşım desteklenmiyor.")};
 $("importCsv").onclick=importCsv;
 $("signout").onclick=async()=>{await sb.auth.signOut();location.href="index.html"};
 $("detailDialog").addEventListener("click",e=>{if(e.target===$("detailDialog"))$("detailDialog").close()});
}
bind();init();