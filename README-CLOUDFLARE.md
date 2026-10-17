# Cloudflare kurulum rehberi

Hepsi ücretsiz planda yapılabilir. Kredi kartı gerekmez (alan adı satın almak hariç).
Sırayla ilerle. Her adımın sonunda "bana haber ver" yazan yerde Claude'a yaz, geri kalanını o yapar.

## 0. Hesap aç
1. https://dash.cloudflare.com/sign-up adresine git.
2. E-posta ve parola ile kaydol, gelen e-postadaki bağlantıyla doğrula.

## 1. Giriş koruması (Turnstile) — en önemlisi
Giriş ekranına "ben robot değilim" doğrulaması ekler. PIN tahmin eden botları durdurur.

1. Cloudflare panelinde sol menüden **Turnstile** > **Add widget**.
2. Ad: `karakis-takip`. Hostname: sitenin adresi (şimdilik Netlify adresin; Pages'e geçince onu da ekle).
3. Mod: **Managed**. Oluştur.
4. İki anahtar görürsün:
   - **Site Key** (herkese açık, sorun değil): bana yaz. `index.html` içindeki `TS_KEY` alanına ben yazarım.
   - **Secret Key** (gizli): sohbete yazma. Supabase panelinde **Authentication > Attack Protection > Captcha protection** bölümünü aç, sağlayıcı olarak **Turnstile**'ı seç, Secret Key'i oraya yapıştır.
5. SIRA ÖNEMLİ: Önce Site Key'i bana ver, ben siteye ekleyip yayınlayayım. Ondan sonra Supabase'de Captcha'yı aç. Tersini yaparsan öğrenciler giriş yapamaz.

## 2. Hosting (Cloudflare Pages)
1. **Workers & Pages** > **Create** > **Pages** > **Connect to Git** > GitHub'daki `karakistakip` deposunu seç.
2. Build command: boş bırak. Output directory: `/` (kök). Kaydet ve dağıt.
3. `xxxx.pages.dev` adresi verir. Çalıştığını gör, sonra bu adresi Turnstile widget'ının hostname listesine ekle.

DİKKAT: Adres değişirse öğrenciler yeniden giriş yapmak, ana ekrana yeniden eklemek ve bildirimleri yeniden açmak zorunda kalır
(tarayıcı her adresi ayrı uygulama sayar). Bu yüzden önce kendi alan adını bağlayıp (adım 3) öğrencilere o adresi vermek en rahatıdır.
Netlify'ı ancak herkes yeni adrese geçince kapat.

## 3. Alan adı, CDN ve koruma
- Alan adın varsa: **Add a domain** ile Cloudflare'e ekle, kayıt şirketinde "nameserver" adreslerini Cloudflare'inkilerle değiştir.
  Sonra Pages projesinde **Custom domains** > alan adını ekle (ör. `takip.alanadin.com`).
- Alan adın yoksa: ücretli satın alınır (yıllık birkaç dolar). Almak zorunda değilsin, `pages.dev` adresiyle de çalışır.
- Bağlanınca **SSL/TLS > Full (strict)**, **Security > Bots > Bot Fight Mode** açık olsun. Güvenlik başlıkları (`_headers` dosyası) zaten projede hazır.

## 4. Yapay zekâ ağ geçidi (AI Gateway) — isteğe bağlı
Gemini çağrılarını Cloudflare üzerinden geçirir: kullanım grafikleri ve istek sınırı sağlar.
Dikkat: Cloudflare da öğrenci içeriğinin geçtiği bir taraf olur. Bu yüzden:
- Ağ geçidi ayarlarında istek/yanıt kaydını (logging) **kapat**, önbelleği (cache) **kapalı** tut.
- Veli aydınlatma metnine Cloudflare'i de ekle.
- Uygulamada öğrenci başına günlük kota zaten var; ağ geçidi bunun yerine geçmez, ek bir katmandır.

Kurulum:
1. **AI > AI Gateway > Create Gateway**, ad: `karakis`.
2. **Account ID**'ni (Workers & Pages ana sayfasının sağında) ve ağ geçidi adını not al.
3. Supabase > **Edge Functions > Secrets** bölümüne `GEMINI_BASE` adıyla şu değeri ekle:
   `https://gateway.ai.cloudflare.com/v1/HESAP_NO/karakis/google-ai-studio/v1beta`
4. Bana haber ver; yapay zekâ fonksiyonlarını yeniden yayınlarım (kod hazır). `GEMINI_BASE` yoksa uygulama doğrudan Google'a bağlanır.
   Güvenlik için yalnızca Google ve Cloudflare adresleri kabul edilir.

## Geri dönüş
Her adım geri alınabilir: Captcha'yı Supabase'de kapat, `TS_KEY`'i boşalt; `GEMINI_BASE` secret'ını sil; Netlify açık kaldığı sürece eski adres çalışır.
