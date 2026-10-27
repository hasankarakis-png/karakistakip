# Karakış Takip — Yayın Öncesi Test Kontrol Listesi

Bu liste kod kontrollerinin yerine geçmez; gerçek Supabase projesi ve iki ayrı test hesabıyla uygulanmalıdır. Canlıya geçmeden önce her madde için sonuç ve tarih kaydedin.

## A. Veritabanı ve yetkiler
- [ ] Mevcut veritabanıysa `supabase/migrations/20261027_week_title.sql` SQL Editor'da gözden geçirilip uygulanmış.
- [ ] Yeni kurulumda `schema.sql`, `schema-ai.sql` ve ihtiyaç duyulan diğer şemalar belgelenen sırayla çalıştırılmış.
- [ ] Öğrenci A, öğrenci B'nin deneme sonuçlarını, günlüklerini, görevlerini ve mesajlarını okuyamıyor.
- [ ] Öğrenci, kendi görevinde yalnızca tamamlandı durumunu değiştirebiliyor; başlık, tarih, kaynak ve hafta adını doğrudan API ile değiştiremiyor.
- [ ] Koç yalnızca yetkili koç hesabıyla öğrenci kayıtlarını görebiliyor; öğrenci rolü koç API'lerini çağıramıyor.
- [ ] Koç/öğrenci hesap silme ve PIN sıfırlama işlemleri test edildi; silme öncesi iki onay çalışıyor.

## B. Görevler ve çalışma takibi
- [ ] Koç görev ekliyor, düzenliyor, siliyor ve haftalık plan PDF'inden görev atıyor.
- [ ] Aynı görev tekrar atandığında yinelenen kayıt oluşmuyor.
- [ ] Haftanın adı değiştiğinde yalnızca seçilen haftanın görevleri güncelleniyor ve hata varsa kullanıcıya gösteriliyor.
- [ ] Öğrenci görev ekleme/silme sınırlarına uyuluyor; tamamlandı durumu iki cihaz arasında tutarlı.
- [ ] Günlük sayaç, mola, sayfa arka plana alınması, bağlantının kesilmesi ve gece yarısı geçişi kontrol edildi.

## C. Deneme ve AI
- [ ] En az bir gerçek TYT, AYT, LGS ve branş denemesi; PDF ve görsel olarak test edildi.
- [ ] PDF'in 8 sayfadan uzun olması, büyük dosya, bozuk PDF ve deneme dışı görsel için anlaşılır hata gösteriliyor.
- [ ] Okunan doğru/yanlış/boş sayıları kullanıcı tarafından kontrol edilip düzeltilmeden kaydedilmiyor.
- [ ] Netler modelin verdiği toplamdan bağımsız olarak uygulamada doğru hesaplanıyor.
- [ ] Ücretsiz sağlayıcıyla başarılı okuma; kota aşımı; sağlayıcı kapalıyken Gemini'ye geri dönüş; tüm sağlayıcılar başarısız olduğunda kota iadesi kontrol edildi.
- [ ] Konu verisi olmayan denemeden AI'ın konu uydurmadığı doğrulandı.
- [ ] AI raporu ve haftalık plan gerçek deneme verilerine dayanıyor; plan koç onayı olmadan öğrenciye atanmıyor.
- [ ] AI anahtarları yalnızca Edge Function Secrets içinde; tarayıcı kaynaklarında ve Git deposunda anahtar yok.

## D. Bildirimler ve PWA
- [ ] Bildirim izni reddedildiğinde uygulama kullanılmaya devam ediyor.
- [ ] Abonelik oluşturma, aboneliği kaldırma ve eski/expired endpoint temizliği test edildi.
- [ ] `CRON_SECRET`, VAPID anahtarları, Supabase proje URL'si ve zamanlanmış işler doğrulandı.
- [ ] Hatırlatma işinde kaynak tablo sorgusu hata verirse sahte “başarılı” sonucu üretilmiyor.
- [ ] Android'de ana ekrana ekleme, yeni sürüm güncellemesi, çevrimdışı açılma ve yeniden bağlantı testi yapıldı.

## E. Mobil, erişilebilirlik ve geri dönüş
- [ ] Küçük Android ekranında alt menü, modal, tarih alanları ve klavye taşma yapmıyor.
- [ ] Yükleniyor, boş veri, bağlantı hatası ve yeniden dene durumları ayırt ediliyor.
- [ ] Öğrenci verisi içeren loglar, ekran görüntüleri ve dosyalar gereksiz yere tutulmuyor.
- [ ] Veritabanı yedeği ve geri yükleme prosedürü test edildi.
- [ ] PR incelemesi, CI kontrolü ve manuel test sonuçları tamamlanmadan ana dala birleştirme veya canlı dağıtım yapılmıyor.

## Otomatik kontrollerin kapsamı
GitHub Actions JavaScript sözdizimini, Supabase Edge Function türlerini ve kritik kaynak-kod sözleşmelerini kontrol eder. Bunlar gerçek hesaplarla RLS, görsel/PDF okuma, push teslimi veya mobil ekran testinin yerini tutmaz.
