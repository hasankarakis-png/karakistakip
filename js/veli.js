/* Veli sayfası: koçun oluşturduğu süreli bağlantıyla (#t=…) öğrencinin son 30 günlük özeti. Hesap gerekmez.
   Veriyi parent_view() verir: bağlantı geçerli ve veli rızası kayıtlıysa; uyku ve ruh hali gönderilmez. */
(function(){
  const sb=window.supabase.createClient("https://ramcghaefbbwgwtgtdtt.supabase.co","sb_publishable_MC44S4rXUNLDClD0RgNbaw_1unO3NAI",{auth:{persistSession:false,autoRefreshToken:false}});
  const app=document.getElementById("app"),esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const tok=(location.hash.match(/t=([A-Za-z0-9_-]{32,64})/)||[])[1];
  const head=`<div class="top"><span class="mark">K</span><div><b>KARAKIŞ EĞİTİM &amp; DANIŞMANLIK</b><small>Veli özeti</small></div></div>`;
  const err=(t,m)=>{app.innerHTML=head+`<div class="card err"><b>${t}</b><p class="note">${m}</p></div>`};
  const fdate=s=>{const [y,m,d]=String(s).slice(0,10).split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("tr-TR",{day:"numeric",month:"long"})};
  const hm=m=>Math.floor(m/60)+" sa "+(Math.round(m)%60)+" dk";
  if(!tok){err("Bağlantı eksik","Koçunuzun gönderdiği bağlantıyı eksiksiz açtığınızdan emin olun.");return}
  sb.rpc("parent_view",{p_token:tok}).then(({data,error})=>{
    if(error||!data)return err("Özet açılamadı","Bağlantıyı daha sonra yeniden deneyin ya da koçunuza ulaşın.");
    if(data.error==="riza")return err("Özet şu an kapalı","Veli onayı kaydı bulunmadığı için özet gösterilemiyor. Koçunuzla iletişime geçin.");
    if(data.error)return err("Bağlantı geçersiz","Bağlantının süresi dolmuş ya da koçunuz tarafından kapatılmış olabilir.");
    const end=data.bugun,days=[];for(let i=29;i>=0;i--){const d=new Date(end+"T12:00:00");d.setDate(d.getDate()-i);days.push(d.toISOString().slice(0,10))}
    const by=Object.fromEntries((data.gunler||[]).map(g=>[String(g.gun).slice(0,10),g]));
    const L=days.map(d=>({d,m:Number((by[d]||{}).dk)||0,q:Number((by[d]||{}).soru)||0})),tm=L.reduce((a,x)=>a+x.m,0),tq=L.reduce((a,x)=>a+x.q,0),act=L.filter(x=>x.m>0||x.q>0).length,mx=Math.max(60,...L.map(x=>x.m));
    const g=data.gorev||{},gp=g.toplam?Math.round(g.tamam/g.toplam*100):null,E=data.denemeler||[];
    app.innerHTML=head+`<h1>${esc(data.ad||"Öğrencimiz")}</h1><p class="sub">Son 30 gün · ${fdate(days[0])} – ${fdate(end)}</p>
    <div class="card"><div class="grid"><div class="st"><small>Toplam çalışma</small><b>${hm(tm)}</b></div><div class="st"><small>Çalışılan gün</small><b>${act}/30</b></div><div class="st"><small>Çözülen soru</small><b>${tq}</b></div><div class="st"><small>Görev tamamlama</small><b>${gp==null?"–":"%"+gp}</b></div></div></div>
    <div class="card"><h2>Günlük çalışma süresi</h2><div class="bars" role="img" aria-label="Son 30 günün günlük çalışma süreleri">${L.map(x=>`<i class="${x.m?"":"z"}" style="height:${Math.max(2,Math.round(x.m/mx*100))}%" title="${fdate(x.d)}: ${hm(x.m)}, ${x.q} soru"></i>`).join("")}</div><div class="ax"><span>${fdate(days[0])}</span><span>Günlük ortalama ${hm(tm/30)}</span><span>${fdate(end)}</span></div></div>
    <div class="card"><h2>Son denemeler</h2>${E.length?`<table><thead><tr><th>Tarih</th><th>Deneme</th><th>Tür</th><th style="text-align:right">Net</th></tr></thead><tbody>${E.map(e=>`<tr><td>${e.tarih?fdate(e.tarih):"–"}</td><td>${esc(e.ad||"Deneme")}</td><td>${esc(e.tur||"")}</td><td class="n">${e.net==null?"–":esc(e.net)}</td></tr>`).join("")}</tbody></table>`:`<p class="note">Henüz deneme sonucu yüklenmemiş.</p>`}</div>
    <div class="noprint" style="margin:6px 0 16px"><button class="btn" id="pr">Yazdır / PDF olarak kaydet</button></div>
    <p class="note">Bu sayfa ${fdate(data.bitis)} tarihine kadar geçerlidir; koçunuz bağlantıyı istediği an kapatabilir. Kişisel verilerin işlenmesi hakkında bilgi: <a href="kvkk.html">aydınlatma metni</a>.</p>`;
    document.getElementById("pr").addEventListener("click",()=>window.print());
  },()=>err("Bağlantı hatası","İnternet bağlantınızı kontrol edip sayfayı yenileyin."));
})();
