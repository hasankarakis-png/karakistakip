/* deneme: silme, düzeltme, elle ekleme */
async function exDel(id){
  if(!confirm("Bu deneme kaydı silinsin mi?"))return;
  const sid=ROLE==="coach"?sel:ME;
  await dbw(sb.from("exam_results").delete().eq("id",id).eq("student_id",sid));
  delete AIR[sid];await loadExams(sid);render();
}
function exEdit(id){
  const e=(EX[ME]||[]).find(x=>String(x.id)===String(id));if(!e)return;
  PX={editId:e.id,uyarilar:[],exam:{sinav_adi:e.exam_name,tarih:e.exam_date||"",tur:e.exam_type,puan:e.score,siralama:e.rank,konular:e.topics||[],soru_satiri:0,dersler:(e.subjects||[]).map(s=>({ders:s.ders,dogru:s.dogru,yanlis:s.yanlis,bos:s.bos,net:s.net,ogrenci_yuzde:s.ogrenci_yuzde==null?null:s.ogrenci_yuzde,kurum_yuzde:s.kurum_yuzde==null?null:s.kurum_yuzde}))}};
  tab="d";render();window.scrollTo(0,0);
}
async function addExam(){
  const net=parseFloat(document.getElementById("dnet").value);if(isNaN(net))return;
  const name=document.getElementById("dad").value.trim().slice(0,120)||"Deneme",tur=document.getElementById("dtur").value,date=document.getElementById("ddt").value;
  await dbw(sb.from("exam_results").insert({student_id:sel,exam_name:name,exam_date:date||null,exam_type:tur,total_net:net,subjects:[],topics:[],source:"manual",verified:true}));
  delete AIR[sel];await loadExams(sel);render();
}

