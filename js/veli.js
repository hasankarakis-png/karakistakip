/* Veli sayfası: koçun oluşturduğu süreli bağlantıyla (#t=…) öğrencinin grafikli haftalık raporu. Hesap gerekmez.
   Veriyi parent_view() verir (bağlantı geçerli ve veli rızası kayıtlıysa; uyku, ruh hali ve notlar gönderilmez).
   Çizim vp-charts.js'te, koçun PDF raporuyla aynı. Veli bu hafta / geçen hafta / 2 hafta önce arasında geçip PDF olarak kaydedebilir. */
(function(){
  const sb=window.supabase.createClient("https://ramcghaefbbwgwtgtdtt.supabase.co","sb_publishable_MC44S4rXUNLDClD0RgNbaw_1unO3NAI",{auth:{persistSession:false,autoRefreshToken:false}});
  const app=document.getElementById("app");
  const css=document.createElement("style");css.textContent=vpCss();document.head.appendChild(css);
  const tok=(location.hash.match(/t=([A-Za-z0-9_-]{32,64})/)||[])[1];
  const err=(t,m)=>{app.innerHTML=`<div class="pg msg"><div class="top"><img src="logo.png" alt="Karakış"><div><h1>KARAKIŞ EĞİTİM &amp; DANIŞMANLIK</h1><small>Veli raporu</small></div></div><h2>${vpX(t)}</h2><p>${m}</p></div>`};
  if(!tok){err("Bağlantı eksik","Koçunuzun gönderdiği bağlantıyı eksiksiz açtığınızdan emin olun.");return}
  sb.rpc("parent_view",{p_token:tok}).then(({data,error})=>{
    if(error||!data)return err("Rapor açılamadı","Bağlantıyı daha sonra yeniden deneyin ya da koçunuza ulaşın.");
    if(data.error==="riza")return err("Rapor şu an kapalı","Veli onayı kaydı bulunmadığı için rapor gösterilemiyor. Koçunuzla iletişime geçin.");
    if(data.error)return err("Bağlantı geçersiz","Bağlantının süresi dolmuş ya da koçunuz tarafından kapatılmış olabilir.");
    const days={};
    if(Array.isArray(data.detay))data.detay.forEach(g=>{days[String(g.gun).slice(0,10)]={m:g.dk,q:g.soru,c:g.dogru,subt:g.ders||{},qs:g.qs||[]}});
    else (data.gunler||[]).forEach(g=>{days[String(g.gun).slice(0,10)]={m:g.dk,q:g.soru}});// eski sunucu yanıtı
    const ex=(data.denemeler||[]).map(e=>({exam_name:e.ad,exam_type:e.tur,exam_date:e.tarih,total_net:e.net}))
      .sort((a,b)=>(a.exam_date?0:1)-(b.exam_date?0:1)||String(a.exam_date||"").localeCompare(String(b.exam_date||"")));
    const tasks=(data.gorevler||[]).map(t=>({title:t.baslik,subject:t.ders,task_date:t.tarih,done:!!t.tamam}));
    const tg=data.hedef!=null?{target_net:data.hedef,exam_type:data.hedef_tur}:null;
    const today=String(data.bugun).slice(0,10),W=[["Bu hafta",0],["Geçen hafta",1],["2 hafta önce",2]];
    let off=0;
    const draw=()=>{
      const D=vpBuild({name:data.ad,end:vpAdd(today,-7*off),days,tasks,ex,tg});
      document.title=`${D.name} – Haftalık rapor (${vpFmt(D.s7,{day:"numeric",month:"short"})}–${vpFmt(D.end,{day:"numeric",month:"short"})})`;
      app.innerHTML=`<div class="bar" role="toolbar" aria-label="Hafta seçimi">${W.map(([l,o])=>`<button class="wk" data-off="${o}" aria-pressed="${o===off}">${l}</button>`).join("")}<button id="pr">📄 PDF olarak kaydet</button></div>
${vpBody(D,{logo:"logo.png"})}
<p class="after noprint">Bu sayfa ${vpX(vpFmt(String(data.bitis).slice(0,10)))} tarihine kadar geçerlidir; koçunuz bağlantıyı istediği an kapatabilir. Kişisel verilerin işlenmesi hakkında bilgi: <a href="kvkk.html">aydınlatma metni</a>.</p>`;
    };
    draw();
    app.addEventListener("click",e=>{
      const b=e.target.closest("button");if(!b)return;
      if(b.id==="pr"){window.print();return}
      if(b.dataset.off!=null){off=+b.dataset.off;draw();window.scrollTo(0,0)}
    });
  },()=>err("Bağlantı hatası","İnternet bağlantınızı kontrol edip sayfayı yenileyin."));
})();
