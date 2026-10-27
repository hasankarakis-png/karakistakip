# Karakış Takip — onarım ve geliştirme planı

Bu dosya, kaynak kodunda yapılan inceleme ile canlı ortamda doğrulanması gereken işleri birbirinden ayırır. Kodda bir özelliğin bulunması, canlı Supabase ve tarayıcıda uçtan uca çalıştığını kanıtlamaz.

## Bu dalda yapılan düzeltmeler

- Tercih listesi kopyalama akışındaki hatalı değişken/DOM kullanımı düzeltildi; Clipboard API başarısız olursa klasik kopyalama yöntemi deneniyor.
- Haftalık görev şemasına `week_title` eklendi, öğrenci yetki koruması genişletildi ve mevcut veritabanları için migration eklendi.
- JavaScript sözdizimi, Supabase Edge Function tip denetimi ve kritik depo sözleşmeleri için CI kontrolleri eklendi.
- Sınav kaydını silme ve elle ekleme işlemlerinde hata kontrolü eklendi; işlem öğrenci/koç rolüne göre doğru öğrenci kaydına bağlanıyor.
- Sınav düzenleme/yükleme akışında seçili öğrenci kimliği korunuyor; tarih, tür ve sayısal alanlar doğrulanıyor.
- Deneme kayıtları okunamadığında eski/boş listeyi sessizce göstermek yerine ekranda hata uyarısı gösteriliyor.
- Deneme belgesi okuma sırasında bir sağlayıcıya yapılan ağ çağrısı istisna verirse diğer yapılandırılmış AI sağlayıcılarına geçiş sürdürülüyor.

## Dağıtımdan önce gerekli manuel kontroller

1. Supabase SQL Editor'da `supabase/migrations/20261027_week_title.sql` dosyasını inceleyip canlı şemayla uyumlu olduğunu doğrula; yedek/geri dönüş planı olmadan çalıştırma.
2. Koç ve en az iki öğrenci hesabıyla RLS: öğrenci A, öğrenci B'nin günlükleri, denemeleri, görevleri, mesajları ve hedeflerini okuyamamalı/değiştirememeli.
3. Öğrenci ve koç rollerinde deneme ekleme, silme, düzenleme; seçili öğrenciye doğru kaydedildiğini doğrula.
4. Gerçek PDF, taranmış PDF, JPG ve PNG dosyalarıyla AI okuma yap; okunamayan değerlerin tahmin edilmediğini, netlerin doğru hesaplandığını ve kota hatasında kullanıcıya anlaşılır mesaj verildiğini doğrula.
5. Gemini, ücretsiz görsel sağlayıcısı ve Claude ayrı ayrı devre dışıyken/anahtarı hatalıyken diğer sağlayıcıya geri dönüşü test et. Ücretsiz katman/kota ve gizlilik koşulları sağlayıcıya göre değişir; ücretsiz kullanım garantisi verilmez.
6. Bildirimler için VAPID, CRON secret, zamanlanmış görev ve cihaz aboneliğini test et.
7. Android Chrome'da PWA kurulumu, sayfa yenileme, çevrimdışı/çevrimiçi geçiş ve küçük ekran düzenini doğrula.
8. Geri yüklenebilir yedek oluştur ve geri yükleme prosedürünü ayrı test ortamında dene.

## Geliştirme sırası

### P0 — Güvenlik ve veri bütünlüğü
- RLS/policy testleri ve koç-yönetici yetkileri.
- SQL migration'ların temiz kurulum ve mevcut kurulum senaryolarında doğrulanması.
- Silme/düzeltme işlemlerinde hata görünürlüğü ve yedekleme.

### P1 — İşlevsel testler
- Giriş/çıkış ve oturum yenileme.
- Görev ekleme, tamamlama, erteleme ve haftalık başlıklar.
- Deneme kaydı ve AI okuma; yinelenen sınav uyarıları.
- Plan taslağı oluşturma, kaydetme, koç onayı ve öğrenciye atama.
- Mesajlaşma, bildirimler, PWA ve mobil ekran.

### P2 — Ürün geliştirmeleri
- Erken uyarı paneli: tek bir kötü güne değil, en az birkaç ölçüte ve zaman içindeki eğilime dayalı uyarılar.
- Haftalık veli raporu: koç onaylı taslak, performans eğilimi ve gelecek hafta hedefleri.
- Hata matrisi: bilgi eksiği, dikkat, süre, yanlış okuma ve heyecan sınıflandırması; öğrenci/koç tarafından doğrulanabilir olmalı.
- Uyarlanabilir plan: tamamlanmayan işleri otomatik yığmak yerine yükü yeniden dağıtma ve koç onayı.
- Açıklanabilir AI önerileri: her önerinin hangi kayıt ve ölçüme dayandığını gösterme.

## Canlıya geçiş kuralı

Bu dal canlıya dağıtılmaz. CI'nin başarılı olması yalnızca otomatik kod kontrollerini kanıtlar; canlı veritabanı, API anahtarları, gerçek hesaplar ve gerçek cihazlar ayrıca test edilmelidir. Ana dala birleştirme ve dağıtım için kullanıcı onayı gerekir.
