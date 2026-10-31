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
| js/core.js | Supabase istemcisi, `SUBJ_YKS/SUBJ_LGS`, `subjNorm()`, öğrenci gün durumu `S` (`subt` ders bazında süre, `noq`, `next`), kaydetme/`rollover`, `act()` sayaç, ikinci şans, `roster()`, `flags()` |
| js/coach-tools.js | `render()`, `coachView()` (CPG: o/s/t/c/a/p/y), `detailView()` (DTAB: o/a/g/d), `sideNav()`, CSV, toplu görev |
| js/tasks-chat.js | görevler, geciken görevler, asistan sohbeti, pomodoro, push bildirimi, `once()` çift tıklama koruması |
| js/student-ui.js | öğrenci ana sayfa kartları, ısı haritası, hızlı işlemler |
| js/challenge.js | yarışmalar + `studentView()` (öğrenci sekmeleri: b,g,d,h,k,t,c,y,m) |
| js/messages.js | WhatsApp düzeninde mesajlaşma, `msgLive` (realtime), `msgPaint` |
| js/automation.js | mola hatırlatma ayarları, WhatsApp durumu, iletişim kartı, geciken görevleri yapay zekâyla dağıtma (`RD`) |
| js/coach-center.js (+coach-center.css) | koç genel bakışındaki "Aksiyon Merkezi": `coachView`'ı sarar, öğrencileri gecikme/uyarı/görevsizliğe göre önceliklendirir, bildirimi kapalı öğrencileri listeler |
| js/coach-intelligence.js (+css) | toplu telafi planı (yapay zekâyla geciken görev dağıtımı); kendi sayfası yok, Aksiyon Merkezi `ciPlans()` ile gösterir |
| js/profile.js | öğrenci profili (`student_profile`: YKS/LGS, alan, sınıf, okul, hedef), `subjApply()` ders listesi, LGS tarihi (`exam_calendar`), `push_coverage` |
| js/coach-plus.js | koç: görüşme günlüğü (`meetings`, karar → görev), gruplar + toplu duyuru, tutarlılık puanı `tScore` + `morningBlock` (sabah özeti), plan araçları (geçen haftayı kopyala, `plan_templates`, tekrar eden görev), deneme takvimi + kim girmedi (`exam_calendar` scope='deneme'), paket (`packages`), KVKK izinleri (`consents`) + veli bağlantısı (`parent_links`), ön görüşme başvuruları (`leads`) |
| js/student-plus.js | öğrenci: yanlış defteri (sekme `w`, `wrong_book`, 3/14/30 gün tekrar), haftalık karne, ana sayfa kartları `weekHomeCards`, yarışma ayarları (`challenge_prefs`), mesajda çalışma saati bilgisi; koç için `wbCoachCard` |
| js/account.js | öğrenci Profilim → Hesap: "Şifreni değiştir" ekranı (`PWS`, `pwRule` = sunucudaki `pinRule`), `render()`'ı sarar (yazılan şifre alanları korunur); başarıdan sonra yeniden giriş, `pwAfterMsg()` boot.js'te |
| js/vp-charts.js | haftalık veli raporunun ortak çizimi (uygulama globali kullanmaz): `vpBuild()` veri, `vpBody()` sayfa, `vpCss()`, grafikler (`vpBars`, `vpTrend` son 4 hafta, `vpSubj`, `vpRing`, `vpExams`), `vpInsights()` iyi gidenler/odaklanılacaklar (sabit kurallar, önem sırası). Her grafik `vpDual` ile iki boyutta: geniş (baskı) + dar (telefon, ≤640px) |
| js/veli-pdf.js | koç: veriyi okur (`vpData`, 28 gün) ve `vpOpen(sid,end)` ile A4 raporu açar; koç notu yazılabilir; uyku/ruh hali/gizli not yok; `reportCard`'a "📊 Haftalık veli raporu (PDF)" düğmesi |
| veli.html + js/veli.js | hesapsız veli sayfası (`#t=belirteç` → `parent_view()` RPC v2; veli rızası şart, uyku/ruh hali yok): koçun PDF'iyle aynı grafikli haftalık rapor, Bu hafta / Geçen hafta / 2 hafta önce, PDF olarak kaydet |
| kvkk.html | aydınlatma metni TASLAĞI (avukat onayı bekliyor) |
| js/dayflow.js | öğrenci: kurulum sihirbazı (ana ekran + bildirim), gün sonu kapanış ekranı (`DC`, `act("close")`'u sarar), uzun açık sayaç düzeltme (`fixStop`) |
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
- Sarmalayıcı düzeni: profile.js / dayflow.js / coach-center.js, `ui`, `act`, `studentView`, `coachView` fonksiyonlarını sarar (önce kendi düğmesine bakar, sonra öncekini çağırır). Bu dosyalar coach.js'ten sonra, boot.js'ten önce yüklenir.
- `overdue(id)`: öğrencinin görevleri açılmadıysa koç için `ODL` (loadOD) kullanılır.
- `scripts/bump.sh` index.html ve veli.html içindeki js/*.js (vendor hariç) ve kökteki .css sürümlerini yeniler.
- Gizli not: `notes.private`; öğrenci RLS ile göremez; veli özeti, PDF rapor ve yapay zekâ raporu `!n.p` ile filtreler.
- MCP `apply_migration` drop/revoke içeren SQL'de onay ister ve bu istemcide onay ekranı kendiliğinden iptal olabiliyor: mümkünse yalnızca ekleme yapan SQL yaz (alter policy, create policy); drop/revoke gerekiyorsa SQL'i Hasan'a ver.
- Tanıtım sitesi (site/) iletişim formu → `lead-submit` fonksiyonu (Origin kontrolü, tuzak alan, IP özeti başına saatte 3). site/_headers connect-src Supabase adresini içerir.

## Sunucu fonksiyonları (supabase/functions)
exam-extract, exam-insights, plan-extract, weekly-report, tercih-ai, admin-students, send-reminders (cron 12:00/17:00 UTC), challenge-notify,
lead-submit (tanıtım sitesi formu, giriş yok), pin-change (öğrenci kendi şifresi: mevcut şifre `pin_check` RPC ile sunucuda doğrulanır, `pin_attempts` 15 dk'da 5 hata sınırı, yönetici API'siyle yazar, tüm oturumları kapatır), break-nudge (cron 5 dk, uzun mola mesajı + 3 saati geçen açık sayaç bildirimi; uzun sayaç kaydı break_nudges'ta break_start = −oturum başlangıcı; `{test:true}` ile tanılama), send-reminders akşam turunda soru girmeyene hatırlatır, task-plan (geciken görev dağıtımı), wa-send (WhatsApp Cloud API; WA_TOKEN/WA_PHONE_ID yoksa pasif).
Gemini modeli: fonksiyonlar çalışan en yeni "flash-lite/flash" modeli kendisi seçer (eski varsayılan model kapatıldı).
Cron ve tetikleyiciler `x-cron-secret` (public.app_secrets) kullanır. Dağıtım: Supabase MCP `deploy_edge_function` (verify_jwt=false; fonksiyon kendi doğrular).

## Şema dosyaları (sırayla uygulanmış)
schema.sql, schema-ai.sql, schema-msg.sql, schema-resched.sql, schema-challenge.sql, schema-topics.sql, schema-nudge-wa.sql (v3.4), schema-hardening.sql (v3.5), schema-profile.sql (v3.7: student_profile, push_coverage, ders adı düzeltmesi), schema-v38.sql (v3.8: meetings, plan_templates, wrong_book, challenge_prefs, consents, parent_links, leads, packages, notes.private, student_profile.tags, MEBİ deneme haftaları, challenge_board gizlilik, parent_view), schema-v39.sql (v3.9: pin_attempts, pin_check — yalnızca service_role çalıştırabilir, ayrıca gövdede rol kontrolü), schema-v40.sql (v4.0: parent_view v2 — detay 42 gün ders bazında, gorevler 21 gün, hedef; eski alanlar korundu).
Canlı şema repodan ileride olabilir (bkz. Drive raporu); emin değilsen canlıdan oku.

## Test
`tests/` klasöründe sahte Supabase (`mock-supabase.js`) ve Playwright betikleri var. Çalıştırma:
`cd tests && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 test_nav.py` (ayrıca test_v34.py, test_fix.py, test_undo.py, test_ch.py, test_p1.py: profil/gün sonu/sihirbaz/uzun sayaç, test_p2.py: koç araçları/yanlış defteri/grafikli veli sayfası, test_p3.py: şifre değiştirme + haftalık veli PDF).
Yalnızca değiştirdiğin alanın testini çalıştır.

## Açık işler
Raporlar: Drive "Karakış Takip – Tarama Raporu ve Yol Haritası (29 Ekim 2026)", Claude Docs "Karakış Takip — Eksikler ve Geliştirme Raporu" (30 Ekim; "Güncel durum" bölümünde grafikler ve kalan 16 işin tablosu, grafikler canlı veriden elle güncellenir). 1., 2. ve 3. aşama yayında (v3.7–v3.8); v3.9: öğrenci şifre değiştirme, grafikli haftalık veli PDF. v4.0: veli sayfası da aynı grafikli haftalık raporu gösteriyor (ortak vp-charts.js), son 4 hafta grafiği, haftanın analizi, telefonda okunur grafikler.
Kalanlar: KVKK metninin avukatça incelenmesi; isteğe bağlı anon revoke (schema-v38.sql sonu); WhatsApp Business API bağlantısı; yapay zekâ ücretsiz yedeklerinin kapatılması kararı; "kaç net lazım" hesabı (ÖSYM katsayıları yıllık değiştiği için yapılmadı; hedef bölüm ve hedef net exam_targets'ta var); koç panelinde canlı güncellemede yalnızca değişen öğrencinin yenilenmesi; yayın öncesi otomatik test (GitHub Actions).
