# Karakış Takip — proje haritası (Claude için kısa rehber)

Amaç: yeni bir oturum tüm dosyaları okumadan işe başlayabilsin. Yalnızca işin gerektirdiği dosyayı aç.

## Ne bu?
Hasan Karakış'ın (Karakış Eğitim & Danışmanlık, Diyarbakır) ~18 YKS/LGS öğrencisi için günlük çalışma takip uygulaması.
- Canlı: https://takip.hasankarakis.com (Cloudflare Pages, depo kökü yayınlanır, build yok). İç klasörler (supabase/, tests/, scripts/, functions/) ve CLAUDE.md/README*.md sitede 404 döner: `functions/_middleware.js` + `_routes.json` + `site/_routes.json` (tanıtım sitesi de aynı depo kökünü kullanır). Yeni iç klasör eklersen üçüne de yaz.
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
| js/student-simple.js | öğrenci Bugün sayfasını sadeleştirir: `todayTab()`'ı sarar; sıra sayaç → görevler → soru girişi → gün sonu; Yarışma/Konu/Tercih kartları "Kısayollar" karosuna, söz/karne/istatistik/seri/akış katlanır "Daha fazla"ya iner (`localStorage karakis-sade-more`). Bilgi silmez, tanınmayan kart görünür kalır; yapı değişirse eski ekranı çizer. `analizTab()`'ı da sarar: Analiz→Özet'te tekrar eden sayı kutuları (`.activity-metrics`) kalkar, yoğunluk haritası katlanır; Günlük durum kartı özetli katlanır (`fold()`, `localStorage karakis-sade-fold`, içerik hep çizilir sadece gizlenir). Kapatmak: dosyadaki `SADE_AKTIF=false`. Stil: styles.css sonu `.sx-*` |
| js/nav.js | geri tuşu (History API, `navSync`), üst çubuk, bildirim merkezi `notifCard`, `openStu`, `openMsg` |
| js/coach.js | tıklama yönlendirme `ui()`, denemeler/yapay zekâ raporu, `busy()`/`DRAFTS` |
| js/boot.js | giriş (Turnstile), `start()`, `loadStudent()`/`pushPast()`, `refreshRun()`, realtime kanalları |
| js/exam-map.js | deneme "Konu eksik haritası": ders ders sekmeler (`emHTML(sid)`, `emData`, durum `EMT`; veri = son 3 denemenin `topics`'i, yapay zekâsız); öğrenci `examCard` ve koç `aiCard` içinde; `reportHTML` bu varken eski uzun konu listelerini göstermez. Haftalık rapordaki karşılığı vp-charts.js `vpKn`/`vpKnHTML` (ders kartları, baskıda sekme yok). Test: tests/test_exammap.py |
| js/pdf-exam.js | deneme sonuç PDF'ini yapay zekâsız, tarayıcıda okur (`pdfExamLocal(file)` → `{exam,uyarilar,hasText,why}`): pdf.js metin katmanı → önce K14Net "SINAV SONUÇ BELGESİ" şablonuna konumla (`peK14`: DERSLER tablosu, "64.4 %" ayrı parça, Puan Türü satırı, "46.25 Net", 3 sütunlu `<Ders> dersi` blokları, Sr/Ö/A başlık konumlarına göre Ö=A doğru, farklı yanlış, boş BOŞ; sütun sonunda ders sonraki sütunda başlıksız devam eder; belgede tarih yok; öğrenci adı/kurum alınmaz; test: tests/fixtures/sonuc-k14.pdf, make_sample_k14.py), olmazsa genel satır okuyucu → ders tablosu + başlık + soru bazlı kazanımlar (`pdfExamParse`); çıktı biçimi exam-extract ile aynı, konu verisi yalnızca ders tablosuyla birebir tutarsa. `examExtract0` (coach.js) YALNIZCA PDF kabul eder (v4.6: fotoğraf/yapay zekâ yolu kaldırıldı); okunamazsa `PEWHY` nedeni yazılır (ödev PDF'indeki PPWHY gibi). exam-extract fonksiyonu artık istemciden çağrılmaz. Kayıtta `extraction_meta.kaynak='pdf_metin'`. |
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
- Kalan görev kararı (v4.2): `overdue()` penceresi 28 gün (`OD_DAYS`). `weekly_tasks` okuyan her yeni sorguya `.or(OPEN_TK)` ekle (kapatılanlar `carry_state='closed'` listelerden, veli raporundan ve `task-plan` dağıtımından kalkar; satır silinmez, `clUndo` geri alır). Koç arayüzü: `overdueCard` (Ekleme / Yeni haftaya ekle), `clClose`/`clUndo` automation.js'te; Program ver sayfasında kart PDF yüklemeden önce gelir.
- Öğrencinin kendi dağıtımı (v4.7): öğrenci YALNIZCA bu haftanın geçen günlerinden kalan görevleri (`odWeek`) yapay zekâyla bu haftanın kalan günlerine dağıtır (`rdCard(id,L,true)`, düğmeyle istenir, kendiliğinden değil; task-plan `redistribute_self`, öğrenci başına günde 8). Uygulama `task_self_reschedule` / `task_self_undo` RPC ile (sunucu tarih kurallarını yeniden denetler); görev `self_from` ile işaretlenir, koç satırda "🔀 öğrenci … gününden kaydırdı" görür. Önceki haftalardan kalanlar koç kararını bekler.
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
schema.sql, schema-ai.sql, schema-msg.sql, schema-resched.sql, schema-challenge.sql, schema-topics.sql, schema-nudge-wa.sql (v3.4), schema-hardening.sql (v3.5), schema-profile.sql (v3.7: student_profile, push_coverage, ders adı düzeltmesi), schema-v38.sql (v3.8: meetings, plan_templates, wrong_book, challenge_prefs, consents, parent_links, leads, packages, notes.private, student_profile.tags, MEBİ deneme haftaları, challenge_board gizlilik, parent_view), schema-v39.sql (v3.9: pin_attempts, pin_check — yalnızca service_role çalıştırabilir, ayrıca gövdede rol kontrolü), schema-v40.sql (v4.0: parent_view v2 — detay 42 gün ders bazında, gorevler 21 gün, hedef; eski alanlar korundu), schema-v42.sql (v4.2: weekly_tasks.carry_state/carried_from — geçen haftadan kalan görevleri KOÇ yeni haftaya taşır ('carried') ya da 'Ekleme' ile kapatır ('closed'); öğrenci kaydıramaz: task_reschedule yalnız koç, tasks_guard carry alanlarını korur; parent_view kapatılanları saymaz), schema-v43.sql (v4.3: challenge_board süre ölçütünde çalışan oturumu da sayar — ch_row_min: state.done + state.cur, son kayıttan en fazla 3 saat sonrasına kadar; istemci çalışırken dakikada bir kayıt gönderir, sıralama 15 sn de bir yenilenir), schema-v45.sql (v4.5: parent_view'a `konular` anahtarı — son 3 denemede yanlış/boş konular {ders,konu,y,b,n}; canlı fonksiyon tanımı okunup sonuna eklenir), schema-v44.sql (v4.4: challenge_board2 — süre SANİYE cinsinden, running bayrağı tüm öğrencilere açık (gizli olanlar listede yok); istemci çalışanların süresini her saniye ilerletir, sırayı canlı değiştirir, 6 sn de bir sunucudan düzeltir; eski challenge_board önbellekli istemciler için kalır), schema-v47.sql (v4.7: weekly_tasks.self_from; tasks_guard self_from'u yalnız app.resched ile değiştirtir; task_self_reschedule / task_self_undo — öğrenci bu haftanın kalanlarını haftanın kalan günlerine kaydırır).
Canlı şema repodan ileride olabilir (bkz. Drive raporu); emin değilsen canlıdan oku.

## Test
`tests/` klasöründe sahte Supabase (`mock-supabase.js`) ve Playwright betikleri var. Çalıştırma:
`cd tests && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 test_nav.py` (ayrıca test_v34.py, test_fix.py, test_undo.py, test_ch.py, test_p1.py: profil/gün sonu/sihirbaz/uzun sayaç, test_p2.py: koç araçları/yanlış defteri/grafikli veli sayfası, test_p3.py: şifre değiştirme + haftalık veli PDF, test_carry.py: kalan görevlerde koç kararı / öğrenci bekleme, test_pdfexam.py + test_pdfexam_app.py: yapay zekâsız PDF okuyucu; örnek PDF'ler tests/fixtures'ta, make_sample_pdf.py üretir). Not: test_p2.py'nin 'geçen haftayı kopyala' denetimi haftanın gününe bağlı (Pazartesi/Salı çalıştırınca sahte dünkü görevleri de sayar), kod hatası değil.
Yalnızca değiştirdiğin alanın testini çalıştır.
Toplu çalıştırıcı: `python3 tests/run_all.py [test_X.py ...]` — testlerin çoğu başarısızlıkta da 0 ile çıktığı için sonucu çıktıdaki `FAIL`/`JS hataları` satırlarından okur, tarihe bağlı bilinen iki dalgalanmayı (test_p2 Pazartesi/Salı, test_v34 "Gün ayraçları" gece 00:00-00:59) yalnızca uyarı sayar.
GitHub Actions: `functional-tests.yml` her dala her push'ta ve PR'da hepsini çalıştırır; sonuç tablosu çalışmanın özet sayfasında. Cloudflare main'i testleri BEKLEMEDEN yayınlar: riskli değişikliği önce ayrı dala gönder (Cloudflare o dal için önizleme adresi açar), testler yeşilse main'e al.
`claude.yml`: issue/PR'da `@claude` yazılınca (yalnız depo sahibi) Actions içinde Claude çalışır; orada MCP ve Drive yoktur, main'e göndermez.

## Açık işler
Raporlar: Drive "Karakış Takip – Tarama Raporu ve Yol Haritası (29 Ekim 2026)", Claude Docs "Karakış Takip — Eksikler ve Geliştirme Raporu" (30 Ekim; "Güncel durum" bölümünde grafikler ve kalan 16 işin tablosu, grafikler canlı veriden elle güncellenir). 1., 2. ve 3. aşama yayında (v3.7–v3.8); v3.9: öğrenci şifre değiştirme, grafikli haftalık veli PDF. v4.0: veli sayfası da aynı grafikli haftalık raporu gösteriyor (ortak vp-charts.js), son 4 hafta grafiği, haftanın analizi, telefonda okunur grafikler.
Kalanlar: KVKK metninin avukatça incelenmesi; isteğe bağlı anon revoke (schema-v38.sql sonu); WhatsApp Business API bağlantısı; yapay zekâ ücretsiz yedeklerinin kapatılması kararı; "kaç net lazım" hesabı (ÖSYM katsayıları yıllık değiştiği için yapılmadı; hedef bölüm ve hedef net exam_targets'ta var); koç panelinde canlı güncellemede yalnızca değişen öğrencinin yenilenmesi; yayının testleri beklemesi (testler artık her push'ta çalışıyor ama Cloudflare main'i beklemeden yayınlıyor).
