# Yapay zekâ (Gemini) modülü kurulumu

Öğrenci deneme sonuç görselini yükler → Gemini okur → öğrenci kontrol edip onaylar → sonuç kaydedilir → kayıtlı TÜM denemelerden gelişim analizi, konu öncelikleri ve koç raporu üretilir.

Gemini anahtarı yalnızca Supabase Edge Function'larında (sunucuda) durur. Tarayıcıya, index.html'e veya GitHub'a asla yazılmaz.

## 0. Önce güvenlik ve gizlilik
1. **Anahtarı yenile.** Anahtar bir sohbette paylaşıldıysa Google AI Studio → API keys sayfasından yeni bir anahtar oluştur, eskisini sil. Yenisini yalnızca aşağıdaki 4. adımda Supabase'e yaz.
2. **Ücretsiz katman ve öğrenci verisi.** Google'ın şartlarına göre ücretsiz kotada gönderilen içerik Google ürünlerini geliştirmek için kullanılabilir. AEA, İsviçre ve Birleşik Krallık dışında (Türkiye dahil) bu geçerli. Cloud Billing hesabı etkinleştirildiğinde tüm kullanım "ücretli hizmet" sayılır ve bu veri kullanımı uygulanmaz. Gerçek öğrenci görselleri göndermeden önce AI Studio'dan projeye Billing bağla. Küçük yaştaki öğrenciler için veli onayı ve KVKK aydınlatma metni hazırla.
3. Görsel kaydedilmez. Yalnızca öğrencinin onayladığı sayısal sonuçlar (ders, doğru, yanlış, boş, net) saklanır. Ad, soyad ve T.C. kimlik numarası okunmaz.

## 1. Tabloları ekle
Supabase → SQL Editor → New query → `supabase/schema-ai.sql` içeriğini yapıştır → Run. (schema.sql daha önce çalıştırılmış olmalı.)

## 2. İki fonksiyonu yükle
Supabase → Edge Functions → Deploy a new function → **Via Editor**.
1. Adı tam olarak `exam-extract` yaz. `supabase/functions/exam-extract/index.ts` içeriğini yapıştır → Deploy.
2. Aynısını `exam-insights` için yap (`supabase/functions/exam-insights/index.ts`).
3. Her fonksiyonun ayarlarında **"Verify JWT"** seçeneği varsa kapat. Fonksiyonlar kullanıcı oturumunu kendileri doğrular ve girişsiz isteği reddeder.

## 3. Gizli değerleri (Secrets) ekle
Edge Functions → Secrets (ya da Project Settings → Edge Functions → Secrets):
- `GEMINI_API_KEY` = Google AI Studio'dan aldığın yeni anahtar
- `APP_PUBLISHABLE_KEY` = index.html içindeki `sb_publishable_...` anahtarı (aynısı)
- İsteğe bağlı `GEMINI_MODEL` = model adı. Boş bırakırsan `gemini-2.5-flash` kullanılır. Model adı yanlışsa ya da kapatılmışsa burayı değiştirmen yeter, kod değişmez.

## 4. Bağlantıyı test et
Siteye koç olarak gir → ⚙️ Uyarı eşikleri → **Yapay zekâ bağlantısını test et**.
- "Bağlantı çalışıyor" yazarsa tamam.
- "Model bulunamadı" derse yanındaki listeden bir `flash` modeli seçip `GEMINI_MODEL` secret'ına yaz.
- "Anahtar kabul edilmedi" derse anahtarı kontrol et.

## 5. Siteyi güncelle
Güncel klasörü GitHub'a yükle (Netlify bağlıysa otomatik yayınlanır) ya da Netlify Deploys sayfasına bırak.

## Nasıl çalışır
- **Okuma:** Görsel tarayıcıda küçültülür, `exam-extract` fonksiyonuna gider. Gemini yapılandırılmış JSON döndürür. Netler uygulamada yeniden hesaplanır (TYT/AYT/branş: doğru − yanlış/4, LGS: doğru − yanlış/3). Okunamayan alanlar boş kalır ve öğrenciye turuncu çerçeveyle gösterilir, tahmin edilmez.
- **Onay:** Öğrenci kontrol edip düzeltmeden kayıt yapılmaz.
- **Analiz:** `exam-insights` kayıtlı tüm denemeleri okur. Karşılaştırmalar, ortalamalar ve eğilimler kodla hesaplanır, Gemini bunları yorumlar. Konu bazlı veri yoksa kesin konu eksikliği üretmez, ders bazlı değerlendirme testi önerir. Analiz aynı veriyle tekrar istenirse önbellekten gelir (ek maliyet yok).
- **Yetki:** Öğrenci yalnızca kendi verisini, koç tüm öğrencileri görür. Kurallar veritabanında (RLS) uygulanır.
- **Sınırlar:** Öğrenci başına günde 10 görsel okuma ve 10 analiz. Koç günde 60 analiz. Değiştirmek için `EXTRACT_DAILY_LIMIT`, `INSIGHTS_DAILY_LIMIT`, `INSIGHTS_COACH_DAILY_LIMIT` secret'larını ekle.

## Mevcut sınırlar ve kontrol listesi
- Haftalık çalışma planı taslağı ve öğrenci sohbet koçu uygulamada mevcut; çalışmaları için `exam-insights` fonksiyonunun güncel sürümünün dağıtılmış olması gerekir.
- Hedef net/puan alanları uygulamada bulunur. Hedef analizi için `exam_targets` tablosu ve `schema-ai.sql` içindeki RLS kuralları canlı veritabanında kurulmuş olmalıdır.
- Koç görüşme başlıkları öğrenci tarafından okunabilen rapor önbelleğine yazılmaz; koç bunları raporu yeniden üreterek alır.
- Bu rehber, canlı Supabase ayarlarının doğru olduğunu tek başına kanıtlamaz. Dağıtım sonrası öğrenci ve koç hesaplarıyla giriş, kota, plan taslağını kaydetme ve veri erişim yetkilerini test et.
