/* Koçluk haftalık program şablonunu (Excel'den PDF) doğrudan okur: ders × gün tablosu, her derste Kaynak/Konu/Çalışma Süresi/Soru Sayısı satırı.
   Yapay zekâ gerektirmez; tablo bulunamazsa null döner ve yapay zekâ yedeği devreye girer. */
const PPD=["pazartesi","salı","çarşamba","perşembe","cuma","cumartesi","pazar"];
const ppL=s=>String(s||"").toLocaleLowerCase("tr").replace(/\s+/g," ").trim();
const ppTc=s=>ppL(s).replace(/(^|[\s\-\/(])(\S+)/g,(m,a,w)=>a+(["ve","ile","de","da"].includes(w)&&a?w:w.charAt(0).toLocaleUpperCase("tr")+w.slice(1)));
const ppU=s=>ppL(s).replace(/(\d)([a-zçğıöşü])/g,"$1 $2");
function ppParse(items){
  const it=items.map(i=>({x:i.x,y:i.y,w:i.w||0,c:i.x+(i.w||0)/2,s:String(i.s||"").replace(/\s+/g," ").trim()})).filter(i=>i.s);
  // 1) gün başlıkları: tablo gövdesine en yakın (en alttaki) başlık satırı
  const dh=it.filter(i=>PPD.includes(ppL(i.s)));if(dh.length<7)return null;
  const ys=[...new Set(dh.map(i=>Math.round(i.y/4)))].sort((a,b)=>b-a);
  let cols=null,hy=0;
  for(const q of ys){const g=dh.filter(i=>Math.round(i.y/4)===q);const m={};g.forEach(i=>m[ppL(i.s)]=i);if(PPD.every(d=>m[d])){cols=PPD.map(d=>m[d].c);hy=m[PPD[0]].y;break}}
  if(!cols)return null;
  // 2) satır etiketleri
  const LAB={"kaynak":"k","konu":"o","çalışma süresi":"s","soru sayısı":"q"};
  const labs=it.filter(i=>LAB[ppL(i.s)]&&i.y>hy&&i.c<cols[0]-20).sort((a,b)=>a.y-b.y);
  if(labs.length<4)return null;
  const blocks=[];let cur=null;
  for(const l of labs){const k=LAB[ppL(l.s)];if(!cur||cur[k]!=null||(k==="k"&&cur.n>0)){cur={k:null,o:null,s:null,q:null,n:0};blocks.push(cur)}cur[k]=l.y;cur.n++}
  const areaLeft=Math.max(...labs.map(l=>l.x+l.w))+3,nameRight=Math.min(...labs.map(l=>l.x))-4;
  const out=[],used=new Set();
  blocks.forEach((b,bi)=>{
    const rows=["k","o","s","q"].filter(k=>b[k]!=null),lo=Math.min(...rows.map(k=>b[k]))-14,hi=Math.max(...rows.map(k=>b[k]))+9;
    const nameTok=it.filter(i=>i.c<nameRight&&i.y>=lo&&i.y<=hi&&i.y>hy+5).sort((a,c)=>a.y-c.y||a.x-c.x);
    const ders=nameTok.map(i=>i.s).join(" ").trim()||"Ders "+(bi+1);
    const cell={};
    it.filter(i=>i.x>=areaLeft-2&&i.y>=lo&&i.y<=hi).forEach(i=>{
      let r=rows[0],bd=1e9;rows.forEach(k=>{const d=Math.abs(i.y-b[k]);if(d<bd){bd=d;r=k}});
      let c=0,cd=1e9;cols.forEach((x,j)=>{const d=Math.abs(i.c-x);if(d<cd){cd=d;c=j}});
      (cell[r+c]=cell[r+c]||[]).push(i);used.add(i)});
    const txt=(r,c)=>(cell[r+c]||[]).sort((a,d)=>a.y-d.y||a.x-d.x).map(i=>i.s).join(" ").trim();
    for(let c=0;c<7;c++){
      let konu=txt("o",c);if(!konu)continue;
      let sure=txt("s",c),soru=txt("q",c),kay=txt("k",c);
      if(sure&&!/saat|dk|dakika|\bsa\b/i.test(sure)){konu+=" "+sure;sure=""}
      if(soru&&!/\d/.test(soru)){konu+=" "+soru;soru=""}
      out.push({gun:c+1,ders:ders.slice(0,40),konu:ppTc(konu).slice(0,100),sure:sure?ppU(sure).slice(0,20):null,soru:soru?ppU(soru).slice(0,20):null,kaynak:kay?ppTc(kay).slice(0,40):null});
    }
  });
  if(!out.length)return null;
  // 3) serbest notlar (Kalan konular / Değerlendirme)
  const notlar=[];
  it.filter(i=>["kalan konular","değerlendirme"].includes(ppL(i.s))).forEach(l=>{
    const t=it.filter(i=>i!==l&&i.x>areaLeft-2&&Math.abs(i.y-l.y)<=7).sort((a,b)=>a.x-b.x).map(i=>i.s).join(" ").trim();
    if(t)notlar.push(ppTc(l.s)+": "+t.slice(0,140));
  });
  return {baslik:"",gorevler:out.slice(0,150),notlar};
}
let PPJS=null;
async function ppFromPdf(file){
  try{
    if(!PPJS){PPJS=await import("/js/vendor/pdf.min.mjs");PPJS.GlobalWorkerOptions.workerSrc="/js/vendor/pdf.worker.min.mjs"}
    const doc=await PPJS.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    const pg=await doc.getPage(1),H=pg.getViewport({scale:1}).height,tc=await pg.getTextContent();
    return ppParse(tc.items.map(i=>({s:i.str,x:i.transform[4],y:H-i.transform[5],w:i.width})));
  }catch(e){return null}
}
