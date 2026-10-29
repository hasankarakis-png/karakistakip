/* Profil fotoğrafı: 256px JPEG olarak profile_photos tablosunda tutulur */
const PH={};const okImg=v=>typeof v==="string"&&/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(v)?v:"";
let PHST="idle",PHMSG="";
const avIn=(id,name)=>PH[id]?`<img src="${PH[id]}" alt="">`:esc(((name||"Ö").trim().slice(0,1)||"Ö").toLocaleUpperCase("tr-TR"));
const mav=id=>PH[id]?`<img class="mav" src="${PH[id]}" alt="">`:"";
function phEnsure(){
  if(PHST!=="idle"||!ME)return;PHST="load";
  const q=ROLE==="coach"?sb.from("profile_photos").select("student_id,img"):sb.from("profile_photos").select("student_id,img").eq("student_id",ME);
  Promise.resolve(q).then(r=>{(r&&r.data||[]).forEach(x=>{PH[x.student_id]=okImg(x.img)});PHST="ok";render()},()=>{PHST="ok"});
}
function phShrink(file){
  return new Promise((ok,no)=>{
    const u=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{URL.revokeObjectURL(u);const S=256,c=document.createElement("canvas");c.width=c.height=S;const g=c.getContext("2d"),m=Math.min(im.width,im.height),sx=(im.width-m)/2,sy=(im.height-m)/2;
      g.fillStyle="#fff";g.fillRect(0,0,S,S);g.drawImage(im,sx,sy,m,m,0,0,S,S);
      let d=c.toDataURL("image/jpeg",.82);if(d.length>110000)d=c.toDataURL("image/jpeg",.6);d.length>115000?no(new Error("big")):ok(d)};
    im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("fmt"))};im.src=u;
  });
}
async function phSet(file){
  PHMSG="";
  if(!file||!/^image\//.test(file.type)){PHMSG="Lütfen bir resim dosyası seç.";render();return}
  try{
    const d=await phShrink(file);
    const r=await dbw(sb.from("profile_photos").upsert({student_id:ME,img:d,updated_at:new Date().toISOString()},{onConflict:"student_id"}));
    if(r&&r.error){PHMSG="Kaydedilemedi, tekrar dene.";}else{PH[ME]=d;PHMSG="Fotoğrafın kaydedildi ✓"}
  }catch(e){PHMSG="Bu resim işlenemedi. Başka bir fotoğraf dene."}
  render();
}
async function phDel(){
  if(!confirm("Profil fotoğrafın kaldırılsın mı?"))return;
  const r=await dbw(sb.from("profile_photos").delete().eq("student_id",ME));
  if(r&&r.error)PHMSG="Kaldırılamadı, tekrar dene.";else{delete PH[ME];PHMSG="Fotoğraf kaldırıldı."}
  render();
}
function profileCard(){
  const f=(NAME||"Ö").trim();
  return `<div class="card pf"><div class="av2">${avIn(ME,f)}</div><h2>${esc(f)}</h2><p class="empty" style="margin:4px 0 0">Öğrenci hesabı</p>
  <div class="row" style="justify-content:center;margin-top:12px"><label class="chip" style="cursor:pointer">📷 ${PH[ME]?"Fotoğrafı değiştir":"Fotoğraf ekle"}<input type="file" id="phfile" accept="image/*" hidden></label>${PH[ME]?`<button class="chip" id="phdel">Kaldır</button>`:""}</div>${PHMSG?`<p class="empty" style="margin:8px 0 0;font-size:13px">${esc(PHMSG)}</p>`:""}</div>`;
}
function accountCard(){
  const dark=document.documentElement.getAttribute("data-theme")!=="light";
  return `<div class="card"><h2>Hesap</h2><div class="row" style="margin-top:6px"><button class="chip" id="theme2">${dark?"☀ Açık tema":"☾ Koyu tema"}</button><button class="chip" id="pw-open" aria-haspopup="dialog" aria-controls="pwp-dialog"><svg class="account-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="5"/><path d="m11.5 11.5 8-8 2 2-2 2 2 2-3 3-2-2-2 2"/></svg><span>Parola</span></button><button class="chip" id="out2">Çıkış yap</button></div>${resetCard()}</div>`;
}
