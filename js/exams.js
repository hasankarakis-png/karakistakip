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
// Türlere göre üst sınır: TYT 120, AYT 160, LGS 90 soru. Net, yanlışlar nedeniyle biraz eksiye düşebilir.
const NETMAX={TYT:120,AYT:160,LGS:90,BRANS:80};let ADDXBUSY=false;
async function addExam(){
  if(ADDXBUSY)return;
  const id=sel,v=String(document.getElementById("dnet").value).replace(",","."),net=parseFloat(v),tur=document.getElementById("dtur").value,mx=NETMAX[tur]||160;
  if(isNaN(net)){alert("Toplam neti yaz.");return}
  if(net<-mx/4||net>mx){alert(tur+" için net "+(-mx/4)+" ile "+mx+" arasında olmalı.");return}
  const name=document.getElementById("dad").value.trim().slice(0,120),date=document.getElementById("ddt").value||day();
  if(!name){alert("Deneme adını yaz.");return}
  if(date>day()){alert("Deneme tarihi ileri bir gün olamaz.");return}
  ADDXBUSY=true;
  const r=await dbw(sb.from("exam_results").insert({student_id:id,exam_name:name,exam_date:date,exam_type:tur,total_net:Math.round(net*100)/100,subjects:[],topics:[],source:"manual",verified:true}));
  ADDXBUSY=false;
  if(r&&r.error){alert("Kaydedilemedi: "+r.error.message);return}
  delete AIR[id];await loadExams(id);render();
}

