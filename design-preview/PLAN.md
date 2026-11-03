# Premium Hibrit Ana Site — Geliştirme Planı

## Mevcut durum
- Doğrulanan depo: hasankarakis-png/karakistakip
- Varsayılan dal: main
- Kök index.html, Günlük Takip uygulamasıdır; kurumsal ana sayfa olduğu varsayılmamalıdır.
- Ayrı tasarım dalı: design/premium-hybrid-main-site
- İlk bağımsız prototip: design-preview/index.html
- main, kimlik doğrulama, veri tabanı ve öğrenci paneli değiştirilmedi.

## Tasarım ilkeleri
1. Premium lacivert/altın kurumsal kimlik; videodaki sinematik yaklaşımın özgün yorumu.
2. Girişte hafif geometrik animasyon; içerik alanlarında sade okunaklı kartlar.
3. Mobil performans, erişilebilirlik, reduced-motion, SEO ve Core Web Vitals.
4. Öğrenci paneline dış bağlantı; panelin işleyişine müdahale yok.
5. Formlar ancak güvenli backend, spam koruması ve KVKK metinleri doğrulandıktan sonra.

## Sonraki adımlar
1. hasankarakis.com ana sitesinin hangi GitHub deposu / Cloudflare Pages projesinden yayımlandığını doğrula.
2. Kurumsal sitenin mevcut sayfalarını, metinlerini, logo ve görsellerini envanterle.
3. Tasarımı mevcut teknolojiye uygun bileşenlere dönüştür; statik prototipi üretim kodu sanma.
4. İzole preview deploy ve mobil/masaüstü görsel kontrol.
5. Linkler, Lighthouse, klavye erişimi, kırılma noktaları ve güvenlik kontrolleri.
6. Kullanıcı onayı olmadan main merge veya canlıya alma YOK.

## Güvenlik sınırı
Bu dalda yalnızca design-preview altına yeni dosyalar eklenir. Mevcut takip panelinin index.html, js/, styles.css, auth ve Supabase dosyaları korunur.
