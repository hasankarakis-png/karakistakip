# Karakış Günlük Takip · Pro kurulum

Mimari: statik PWA (`index.html` arayüz iskeleti, `styles.css` tasarım, `app.js` uygulama mantığı) + Supabase (giriş, veri tabanı, canlı güncelleme). Ücretsiz planla 20 öğrenci için yeterlidir.

## Kurulum (yaklaşık 30 dakika)

1. **Proje aç:** supabase.com → New project. Bölge olarak AB (Frankfurt) seç. Veritabanı şifresini kaydet.
2. **Herkese açık kaydı kapat:** Authentication → Sign In / Providers → "Allow new users to sign up" kapalı olsun (arayüz değişmiş olabilir). Hesapları yalnızca sen oluşturacaksın. "Confirm email" ayarına dokunmana gerek yok: script hesapları zaten onaylı oluşturur (`email_confirm: true`) ve uygulama gerçek e-posta göndermez.
3. **Şemayı yükle:** SQL Editor → New query → `supabase/schema.sql` içeriğini yapıştır → Run.
4. **Anahtarları yaz:** Proje adresi (Project URL) ve **Publishable key** (`sb_publishable_...`) değerlerini Settings → API Keys sayfasından al (Connect penceresinde de görünür). `app.js` içindeki `SUPABASE_URL` ve `SUPABASE_KEY` değerlerini güncelle. Publishable key herkese açık olacak şekilde tasarlanmıştır, güvenliği şemadaki RLS kuralları sağlar. **Secret key'i (`sb_secret_...`) asla index.html'e koyma.** Sayfada "Create new API keys" düğmesi varsa önce ona bas.
5. **Hesapları oluştur** (kendi bilgisayarında, Node.js 18+):
   ```
   npm i @supabase/supabase-js
   export SUPABASE_URL="https://PROJE-KODU.supabase.co"
   export SECRET_KEY="sb_secret_... anahtarı"
   node scripts/create-users.mjs koc hasan "GucluBirSifre123" "Hasan Karakış"
   node scripts/create-users.mjs ogrenciler ogrenciler.txt
   ```
   `ogrenciler.txt` her satırda bir "Ad Soyad" içerir. Script her öğrenciye kullanıcı adı ve 6 haneli PIN üretir, `giris-bilgileri.csv` dosyasına yazar.
6. **Yayınla (Cloudflare Pages):** GitHub deposunu Cloudflare Pages'e bağla. Build command alanını boş bırak; build çıktısı dizini olarak `.` (depo kökü) seç. İlk dağıtımda `index.html`, `sw.js`, `manifest.webmanifest` ve `_headers` dosyalarının yayımlandığını kontrol et. Supabase Edge Functions, frontend dağıtımından ayrı olarak Supabase üzerinden yayımlanır. Eski Netlify adresini yeni Pages/özel alan adı ve giriş akışı doğrulanana kadar kapatma. Öğrenciler tek bir kalıcı alan adı kullanmalı.

## Yapay zekâ modülü
Deneme görseli okuma, gelişim analizi ve konu önceliklendirme için `README-AI.md` dosyasına bak.

## Rol ve güvenlik
- Öğrenci yalnızca kendi verisini okur/yazar, kendi hedefini ve koç notunu görür.
- Koç tüm öğrencileri canlı görür, hedef/not/deneme girer.
- Kurallar veritabanı katmanında (RLS) uygulanır, tarayıcıdan atlatılamaz.
- Uyku, stres ve ruh hali verileri hassastır: küçük yaştaki öğrenciler için veli onayı alın, KVKK aydınlatma metnini hazırlayın, veriyi gerektiğinden uzun saklamayın.
- Ücretsiz planda uzun süre hareketsiz kalan proje duraklatılabilir. Güncel koşulları Supabase sayfasından kontrol edin.

## Sınırlar
- Hatırlatma bildirimleri öğrencilere gider (aşağıya bak). Koça özet bildirimi henüz yok.
- Uyarı eşikleri koçun cihazında saklanır.
- Gün, cihazın yerel saatine göre ayrılır (gece 00:00).

## Yeni özellikler (v3)

**Öğrenci:** alt menülü sekmeler (Bugün, Görevler, Denemeler, Hedefim, Koçum); koçun atadığı haftalık görevleri işaretleme; yanlış kaydedilen denemeyi silme veya düzeltme; seri ve rozetler; odak zamanlayıcı (25/5 dk); yapay zekâ sohbet koçu (günlük sınırlı).

**Koç:** panelden öğrenci ekleme (kullanıcı adı ve 6 haneli PIN otomatik, bir kez gösterilir), PIN sıfırlama, öğrenci silme; haftalık görev ekleme ve tamamlanma yüzdesi; yapay zekâyla haftalık plan taslağı (öğrenciye ancak sen onaylayınca görünür); sınıf geneli ortak zayıf konular; elle deneme ekleme (öğrencinin yüklediği denemelerle aynı listede).

**Sunucu işlevleri** (`supabase/functions`): `exam-extract`, `exam-insights` (analiz, `action: "plan"`, `action: "chat"`), `admin-students` (öğrenci hesabı yönetimi, yalnızca koç). Yeni tablolar ve kurallar `supabase/schema-ai.sql` dosyasında.

**Hatırlatma bildirimi:** öğrenci "Hedefim" sekmesinden bildirimi açar. Her gün 15:00 ve 20:00'de (TSİ) çalışmaya başlamayan veya bekleyen görevi olan öğrencilere bildirim gider (`send-reminders` işlevi + pg_cron). iPhone'da bildirim için siteyi önce "Ana Ekrana Ekle" ile kurmak gerekir.

Cloudflare (Turnstile, Pages, alan adı, AI Gateway) kurulumu için README-CLOUDFLARE.md dosyasına bak.

## Denetim turu (v3.1)
- Veri güvenliği: okuma/yazma hatasında günün verisi silinmez, kayıt hatası üstte uyarı şeridiyle görünür ve otomatik yeniden denenir; gece yarısı geçişi dünün oturumunu kapatıp yeni güne devam eder.
- Yapay zekâ kotası yalnızca sunucuda artırılır; öğrenci sayaç veya rapor önbelleği yazamaz.
- Öğrenci: ilk giriş rehberi (veri/yapay zekâ bilgilendirmesi dahil), yanlış girilen soru kaydını silme, 4 saati aşan sayaç uyarısı, "Asistan" sekmesi, çıkışta cihazdaki verinin temizlenmesi.
- Koç: tüm öğrencilere toplu görev ata, CSV yedek (günlük çalışma, denemeler, görevler), veli özetine son deneme/hedef/görev bilgisi ve WhatsApp/paylaş düğmesi.


## YKS Tercih Merkezi

Takip panelindeki **YKS Tercih** bağlantısı `yks-tercih.html` sayfasını açar. Özellikler:

- Üniversite/bölüm/şehir/program kodu araması ve puan türü, şehir, başarı sırası filtreleri
- CSV katalog içe aktarma; beklenen alanlar `program_kodu`, `universite`, `bolum`, `sehir`, `puan_turu`, `basari_sirasi`, `taban_puan`, `kontenjan`, `yil`
- En fazla 24 programlık, sırası değiştirilebilir ve CSV olarak dışa aktarılabilir tercih listesi
- Tercih listesi tarayıcıda kullanıcı kimliğine göre ayrılır; henüz Supabase veritabanına veya cihazlar arası eşitlemeye yazılmaz
- Resmî katalog dosyası otomatik eklenmez. Güncel ÖSYM/YÖK Atlas verisi kullanılmalı; araç yerleşme garantisi vermez.

Yayın öncesi test: giriş yapmış öğrenci hesabıyla sayfayı aç, CSV içe aktar, filtreleri dene, 24 program sınırını ve dışa aktarılan CSV'yi kontrol et. Gerçek öğrenci verisiyle koç/öğrenci yetki ve RLS testleri ayrıca yapılmalı.
