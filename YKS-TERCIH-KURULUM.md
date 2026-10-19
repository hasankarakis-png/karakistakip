# Karakış YKS Tercih Robotu

## Bu dalda eklenenler
- `yks-tercih.html`: Takip uygulamasından ayrı açılan tercih modülü.
- `yks-tercih.js`: Supabase oturumu, arama/filtreleme, program detayları, geçmiş yıl karşılaştırması, 24 tercihlik liste, CSV dışa aktarma ve koç katalog içe aktarma.
- `yks-tercih.css`: Mobil uyumlu arayüz.
- `supabase/migrations/20261019_yks_tercih.sql`: Program kataloğu, tercih kayıtları ve RLS politikaları.

## Kurulum
1. Supabase Dashboard > SQL Editor bölümünde migration dosyasını çalıştır.
2. Cloudflare Pages önizlemesinde bu dalı dağıt veya yerel olarak test et. Ana dal ve canlı site bu çalışma tarafından değiştirilmez.
3. Koç hesabıyla giriş yapıp Koç araçları sekmesinden CSV yükle.
4. Yalnızca resmî ÖSYM/YÖK Atlas verilerini kullan; CSV satırları yıl, kaynak URL'si ve program kodunu korumalıdır.

## CSV biçimi
Zorunlu başlıklar: `program_code,university,department,city,score_type,year`
İsteğe bağlı: `quota,fee_type,university_type,language,base_rank,base_score,source_url`

- `score_type`: SAY, EA, SÖZ, DİL veya TYT.
- `year`: verinin ait olduğu yıl.
- `base_rank`: sayısal başarı sırası.
- UTF-8 CSV; virgül veya noktalı virgül ayracı kabul edilir.
- Aynı programın yıllara göre kayıtları ayrı satırlardır. Program kodu + yıl benzersiz olmalıdır.

## Güvenlik ve sınırlamalar
- Öğrenci yalnızca kendi tercihlerini ekler/günceller/siler; koç RLS üzerinden tercih kayıtlarını okuyabilir.
- Katalog okumak için giriş gerekir; katalog yazma/silme yalnızca koç rolüne açıktır.
- Bu değişiklik mevcut takip şemasını değiştirmez; yalnızca iki yeni tablo ekler.
- Henüz doğrulanmış program verisi dahil değildir. Örnek veya tahminî taban sırası üretilmez.
- Yayımlama/merge yapılmadı. Gerçek Supabase hesabıyla oturum, RLS ve mobil uçtan uca testler ayrıca yapılmalıdır.
