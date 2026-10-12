# Karakış Günlük Takip · Pro kurulum

Mimari: tek dosya web uygulaması (index.html, PWA) + Supabase (giriş, veri tabanı, canlı güncelleme). Ücretsiz planla 20 öğrenci için yeterlidir.

## Kurulum (yaklaşık 30 dakika)

1. **Proje aç:** supabase.com → New project. Bölge olarak AB (Frankfurt) seç. Veritabanı şifresini kaydet.
2. **Herkese açık kaydı kapat:** Authentication → Sign In / Providers → "Allow new users to sign up" kapalı olsun (arayüz değişmiş olabilir). Hesapları yalnızca sen oluşturacaksın. "Confirm email" ayarına dokunmana gerek yok: script hesapları zaten onaylı oluşturur (`email_confirm: true`) ve uygulama gerçek e-posta göndermez.
3. **Şemayı yükle:** SQL Editor → New query → `supabase/schema.sql` içeriğini yapıştır → Run.
4. **Anahtarları yaz:** Proje adresi (Project URL) ve **Publishable key** (`sb_publishable_...`) değerlerini Settings → API Keys sayfasından al (Connect penceresinde de görünür). `index.html` en üstündeki `SUPABASE_URL` ve `SUPABASE_KEY` yerlerine yaz. Publishable key herkese açık olacak şekilde tasarlanmıştır, güvenliği şemadaki RLS kuralları sağlar. **Secret key'i (`sb_secret_...`) asla index.html'e koyma.** Sayfada "Create new API keys" düğmesi varsa önce ona bas.
5. **Hesapları oluştur** (kendi bilgisayarında, Node.js 18+):
   ```
   npm i @supabase/supabase-js
   export SUPABASE_URL="https://PROJE-KODU.supabase.co"
   export SECRET_KEY="sb_secret_... anahtarı"
   node scripts/create-users.mjs koc hasan "GucluBirSifre123" "Hasan Karakış"
   node scripts/create-users.mjs ogrenciler ogrenciler.txt
   ```
   `ogrenciler.txt` her satırda bir "Ad Soyad" içerir. Script her öğrenciye kullanıcı adı ve 6 haneli PIN üretir, `giris-bilgileri.csv` dosyasına yazar.
6. **Yayınla:** Klasörü Netlify'a sürükle-bırak (zaten sende kurulu yöntem). Öğrenciler adresi açıp "Ana ekrana ekle" yapar.

## Rol ve güvenlik
- Öğrenci yalnızca kendi verisini okur/yazar, kendi hedefini ve koç notunu görür.
- Koç tüm öğrencileri canlı görür, hedef/not/deneme girer.
- Kurallar veritabanı katmanında (RLS) uygulanır, tarayıcıdan atlatılamaz.
- Uyku, stres ve ruh hali verileri hassastır: küçük yaştaki öğrenciler için veli onayı alın, KVKK aydınlatma metnini hazırlayın, veriyi gerektiğinden uzun saklamayın.
- Ücretsiz planda uzun süre hareketsiz kalan proje duraklatılabilir. Güncel koşulları Supabase sayfasından kontrol edin.

## Sınırlar
- Push bildirimi yok (ör. "sabah uyanmadı" uyarısı). Sonraki aşama: Supabase Edge Function + web push.
- Uyarı eşikleri koçun cihazında saklanır.
- Gün, cihazın yerel saatine göre ayrılır (gece 00:00).
