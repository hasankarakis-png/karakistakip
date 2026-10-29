# Karakış Takip — proje haritası (Claude için kısa rehber)

Amaç: yeni bir oturum tüm dosyaları okumadan işe başlayabilsin. Yalnızca işin gerektirdiği dosyayı aç.

## Ne bu?
Hasan Karakış'ın (Karakış Eğitim & Danışmanlık, Diyarbakır) ~18 YKS/LGS öğrencisi için günlük çalışma takip uygulaması.
- Canlı: https://takip.hasankarakis.com (Cloudflare Pages, depo kökü yayınlanır, build yok)
- Veritabanı/sunucu: Supabase projesi `ramcghaefbbwgwtgtdtt` (Frankfurt). Supabase MCP araçlarıyla yönetilir.
- Arayüz dili Türkçe; kullanıcıya her şey Türkçe yazılır.

## Çalışma kuralları (Hasan'ın tercihleri)
- Değişiklikleri sormadan GitHub'a gönder (`main`). Göndermeden önce `sh scripts/bump.sh` (önbellek sürümü).
- Veritabanını değiştiren (drop/revoke) SQL'de Supabase onay ekranı çıkar; çalışmazsa SQL'i Hasan'a ver, SQL Editor'da çalıştırır.
- Proje notları Google Drive'a yazılır ("Karakış Takip – …" başlıklı belgeler).
- Kotayı korumak için: gereken dosyayı aç, toplu ajan taramasını seyrek yap, rutin işte daha hafif model kullan.

## Dosyalar (index.html bu sırayla yükler; hepsi global fonksiyon, modül yok)
| Dosya | İçerik |
|---|---|
| js/vendor/supabase.js | supabase-js 2.117.1 (kendi sunucumuzdan) |
| js/core.js | Supabase istemcisi, öğrenci gün durumu `S`, kaydetme/`rollover`, `act()` sayaç, ikinci şans (geri al/geri getir), `roster()`, `flags()` |
| js/coach-tools.js | `render()`, `coachView()` (CPG: o/s/t/c/a/p/y), `detailView()` (DTAB: o/a/g/d), `sideNav()`, CSV, toplu görev |
| js/tasks-chat.js | görevler, geciken görevler, asistan sohbeti, pomodoro, push bildirimi, `once()` çift tıklama koruması |
| js/student-ui.js | öğrenci ana sayfa kartları, ısı haritası, hızlı işlemler |
| js/challenge.js | yarışmalar + `studentView()` (öğrenci sekmeleri: b,g,d,h,k,t,c,y,m) |
| js/messages.js | WhatsApp düzeninde mesajlaşma, `msgLive` (realtime), `msgPaint` |
| js/automation.js | mola hatırlatma ayarları, WhatsApp durumu, iletişim kartı, geciken görevleri yapay zekâyla dağıtma (`RD`) |
| js/coach-center.js (+coach-center.css) | koç genel bakışındaki "Aksiyon Merkezi": `coachView`'ı sarar, öğrencileri gecikme/uyarıya göre önceliklendirir |
| js/nav.js | geri tuşu (History API, `navSync`), üst çubuk, bildirim merkezi `notifCard`, `openStu`, `openMsg` |
| js/coach.js | tıklama yönlendirme `ui()`, denemeler/yapay zekâ raporu, `busy()`/`DRAFTS` |
| js/boot.js | giriş (Turnstile), `start()`, `loadStudent()`/`pushPast()`, `refreshRun()`, realtime kanalları |
| diğer js | konu.js (konu takibi), tercih.js (tercih robotu, tercih.json), plan-upload.js / plan-pdf.js (program PDF), exams.js, profile-photo.js, report-pdf.js |
| styles.css | tek stil dosyası; yeni kurallar sona eklenir |
| sw.js | servis çalışanı, push bildirimi (`url` ile derin bağlantı, ör. `./#mesaj`) |

## Kurallar ve tuzaklar
- Ekran `render()` ile innerHTML olarak yeniden çizilir. Kullanıcı verisini her zaman `esc()` ile yaz.
- Arka plan yenilemesi `busy()` true iken bekler: odakta alan varsa veya `DRAFTS` listesindeki alanlarda kaydedilmemiş değer varsa. Yeni form alanı eklerken id'sini `DRAFTS`'a ekle.
- Ekran değiştiren her şey `render()` sonunda `navSync()` ile geçmişe yazılır; yeni sayfa eklerken `navSnap/navKey/CPL` güncelle.
- Öğrenci `daily` satırına yalnızca bugün−2 … yarın arası yazabilir (RLS). Silemez.
- Mesaj türü `kind`: 'chat' / 'auto' (sunucunun yapay zekâ mesajı). İstemci yalnız 'chat' ekleyebilir.

## Sunucu fonksiyonları (supabase/functions)
exam-extract, exam-insights, plan-extract, weekly-report, tercih-ai, admin-students, send-reminders (cron 12:00/17:00 UTC), challenge-notify,
break-nudge (cron 5 dk, uzun mola mesajı; `{test:true}` ile tanılama), task-plan (geciken görev dağıtımı), wa-send (WhatsApp Cloud API; WA_TOKEN/WA_PHONE_ID yoksa pasif).
Gemini modeli: fonksiyonlar çalışan en yeni "flash-lite/flash" modeli kendisi seçer (eski varsayılan model kapatıldı).
Cron ve tetikleyiciler `x-cron-secret` (public.app_secrets) kullanır. Dağıtım: Supabase MCP `deploy_edge_function` (verify_jwt=false; fonksiyon kendi doğrular).

## Şema dosyaları (sırayla uygulanmış)
schema.sql, schema-ai.sql, schema-msg.sql, schema-resched.sql, schema-challenge.sql, schema-topics.sql, schema-nudge-wa.sql (v3.4), schema-hardening.sql (v3.5).
Canlı şema repodan ileride olabilir (bkz. Drive raporu); emin değilsen canlıdan oku.

## Test
`tests/` klasöründe sahte Supabase (`mock-supabase.js`) ve Playwright betikleri var. Çalıştırma:
`cd tests && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 test_nav.py` (ayrıca test_v34.py, test_fix.py, test_undo.py, test_ch.py).
Yalnızca değiştirdiğin alanın testini çalıştır.

## Açık işler
Drive: "Karakış Takip – Tarama Raporu ve Yol Haritası (29 Ekim 2026)" → bölüm 2 (Hasan'ın kararları) ve 3–4 (sıradaki işler).
