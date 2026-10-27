/* deneme: silme, düzeltme, elle ekleme */
function examStudentId(){
  return ROLE==="coach"?sel:ME;
}
async function exDel(id){
  if(!confirm("Bu deneme kaydı silinsin mi?"))return;
  const sid=examStudentId();
  if(!sid){alert("Öğrenci seçimi bulunamadı. Sayfayı yenileyip tekrar dene.");return}
  try{
    const {error}=await sb.from("exam_results").delete().eq("id",id).eq("student_id",sid);
    if(error){alert("Deneme silinemedi. "+error.message);return}
    delete AIR[sid];await loadExams(sid);render();
  }catch(e){alert("Deneme silinirken bağlantı hatası oluştu. İnternetini kontrol edip tekrar dene.")}
}
function exEdit(id){
  const sid=examStudentId(),e=(EX[sid]||[]).find(x=>String(x.id)===String(id));if(!e)return;
  PX={editId:e.id,studentId:sid,uyarilar:[],exam:{sinav_adi:e.exam_name,tarih:e.exam_date||"",tur:e.exam_type,puan:e.score,siralama:e.rank,konular:e.topics||[],soru_satiri:0,dersler:(e.subjects||[]).map(s=>({ders:s.ders,dogru:s.dogru,yanlis:s.yanlis,bos:s.bos,net:s.net,ogrenci_yuzde:s.ogrenci_yuzde==null?null:s.ogrenci_yuzde,kurum_yuzde:s.kurum_yuzde==null?null:s.kurum_yuzde}))}};
  tab="d";render();window.scrollTo(0,0);
}
async function addExam(){
  const sid=examStudentId();
  const netEl=document.getElementById("dnet"),nameEl=document.getElementById("dad"),typeEl=document.getElementById("dtur"),dateEl=document.getElementById("ddt");
  if(!sid||!netEl||!nameEl||!typeEl||!dateEl){alert("Deneme formu eksik görünüyor. Sayfayı yenileyip tekrar dene.");return}
  const netText=netEl.value.trim(),net=Number(netText),name=nameEl.value.trim().slice(0,120)||"Deneme",tur=typeEl.value,date=dateEl.value;
  if(!netText||!Number.isFinite(net)||net<0||net>500){alert("Geçerli bir toplam net gir (0–500).");return}
  if(!["TYT","AYT","LGS","BRANS"].includes(tur)){alert("Sınav türünü seç.");return}
  if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)){alert("Geçerli bir sınav tarihi seç.");return}
  try{
    const {error}=await sb.from("exam_results").insert({student_id:sid,exam_name:name,exam_date:date||null,exam_type:tur,total_net:net,subjects:[],topics:[],source:"manual",verified:true});
    if(error){alert("Deneme kaydedilemedi. "+error.message);return}
    delete AIR[sid];await loadExams(sid);render();
  }catch(e){alert("Deneme kaydedilirken bağlantı hatası oluştu. İnternetini kontrol edip tekrar dene.")}
}
