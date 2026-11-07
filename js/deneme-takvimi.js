/* Karakış Takip · Koç "Deneme takvimi" sekmesi (CPG="e")
   YKS (TYT/AYT/YDT) deneme sınavlarının uygulama tarihleri, ay ay. Koç alacağı denemeleri işaretler (deneme_plan tablosu, supabase/schema-v52.sql).
   Tarihler denemetakvimim.com (Hangi Kaynak) takviminden 7 Kasım 2026'da alındı; yıl içinde değişebilir. Satış/sipariş yok, yalnızca tarih.
   Tablo yoksa ya da okunamazsa seçimler bu tarayıcıda (localStorage) tutulur. Mevcut ekranlar değişmez; hata olursa genel bakışa dönülür.
   Satır biçimi: YYAAGG|tür|ad|kurumsal(1)|kulüp(1). MSÜ denemeleri alınmadı. Kapatmak: DENEME_TAKVIMI_AKTIF=false. */
(function(){
  "use strict";
  const DENEME_TAKVIMI_AKTIF=true;
  if(!DENEME_TAKVIMI_AKTIF||typeof coachView!=="function"||typeof sideNav!=="function"||typeof ui!=="function")return;
  const baseCoachView=coachView,baseSideNav=sideNav,prevUi=ui;
  const RAW=`260715|T|Hız ve Renk TYT 0 2027|1|0
260805|T|Yıldızlar Yarışıyor TYT 0 2027|1|0
260809|T|Çap TYT 0 2027|1|0
260813|T|Vip TYT 1 2027|1|0
260818|T|Yayın Denizi Pro TYT 0 2027|1|0
260822|T|Ulti TYT 0 2027|1|0
260827|T|Paylaşım TYT 1 2027|1|0
260912|T|Aktif TYT 1 2027|1|0
260918|A|Limit AYT 1 2027|1|0
260918|T|ÖZDEBİR TG TYT İLK PROVA 2027|0|1
260918|T|Tözok TYT 1 2027|1|0
260919|T|BES Yön Serisi TYT 1 2027|1|0
260921|A|Eksen AYT 1 2027|1|0
260921|T|Eksen TYT 1 2027|1|0
260924|T|Elit Karma TYT 1 2027|1|0
260925|T|Rasyonel TYT 1 2027|1|0
260925|T|TOPRAK TYT 1 2027|1|1
260930|A|BES Üniversiteye Doğru AYT 1 2027|1|0
260930|T|BES Üniversiteye Doğru TYT 1 2027|1|0
261001|T|Endemik TG TYT 1 2027|0|0
261001|T|Okyanus 40 Seans TYT 1 2027|1|0
261001|T|Paraf TG TYT 1 2027|0|0
261002|T|4K TG TYT 1 2027|0|0
261004|T|Çap TYT 1 2027|1|0
261005|T|Prolig TYT 1 2027|1|0
261008|T|Paylaşım TYT 2 2027|1|0
261008|T|Yayın Denizi Pro TYT 1 2027|1|0
261008|A|Yıldızlar Yarışıyor AYT 1 2027|1|0
261008|T|Yıldızlar Yarışıyor TYT 1 2027|1|0
261009|T|BES Rehber Serisi TYT 1 2027|1|0
261009|T|MİKRO ORİJİNAL TG TYT 1 2027|0|1
261010|T|Sonuç TYT 1 2027|1|0
261012|T|Full Matematik TYT 1 2027|1|0
261012|A|Hız Kurumsal AYT 1 2027|1|0
261012|T|Hız Kurumsal TYT 1 2027|1|0
261013|A|Eksen AYT 2 2027|1|0
261013|T|Eksen TYT 2 2027|1|0
261016|T|Orbital - Krallar Karması TG TYT 1 2027|0|0
261016|A|Özdebir TG AYT 1 2027|0|0
261016|T|Özdebir TG TYT 1 2027|0|0
261016|T|SIFIR POZİTİF EKİM TG 1 2027|0|1
261018|T|Biyotik TYT 1 2027|1|0
261018|A|Nitelik AYT 1 2027|1|0
261018|T|Nitelik TYT 1 2027|1|0
261019|A|Hız TG AYT 1 2027|0|0
261019|T|Hız TG TYT 1 2027|0|0
261019|T|Okyanus Iceberg TYT 1 2027|1|0
261019|A|X Yayıncılık AYT 1 2027|1|0
261019|T|X Yayıncılık TYT 1 2027|1|0
261021|T|Kafa Dengi (Extra) TYT 1 2027|1|0
261021|A|Kafa Dengi AYT 1 2027|1|0
261022|A|Miray AYT 1 2027|1|0
261022|T|Miray TYT 1 2027|1|0
261023|T|3D TG TYT 1 2027|0|1
261023|Y|Akademi Deniz TG YDT 1 2027|0|0
261023|T|Alternatif TYT 1 2027|1|0
261023|T|BİLGİ SARMAL TG TYT 1 2027|0|1
261023|A|Retro AYT 1 2027|1|0
261023|T|Retro TYT 1 2027|1|0
261025|A|Aydın AYT 1 2027|1|0
261025|T|Aydın TYT 1 2027|1|0
261026|T|Paraf Fen Lisesi TYT 1 2027|1|0
261027|A|Etap AYT 1 2027|1|0
261027|T|Etap TYT 1 2027|1|0
261030|A|Karekök - Dakika AYT 1 2027|1|0
261030|T|Karekök - Dakika TYT 1 2027|1|0
261030|A|Limit AYT 2 2027|1|0
261030|T|Limit TYT 2 2027|1|0
261030|A|Palme (Enerji) AYT 1 2027|1|0
261030|T|Palme (Enerji) TYT 1 2027|1|0
261030|T|Toprak TYT 2 2027|1|0
261101|T|Okyanus 40 Seans TYT 2 2027|1|0
261102|T|Yanıt TYT 1 2027|1|0
261103|A|Yayın Denizi Pro AYT 2 2027|1|0
261103|T|Yayın Denizi Pro TYT 2 2027|1|0
261106|A|APOTEMİ TG AYT 1 2027|0|1
261106|T|APOTEMİ TG TYT 1 2027|0|1
261106|T|Eğitim Vadisi TYT 1 2027|1|0
261106|T|KR TG TYT TWİNS 2027|0|1
261106|T|Töder TG TYT 0 2027|0|0
261107|A|BES Üniversiteye Doğru AYT 2 2027|1|0
261107|T|BES Üniversiteye Doğru TYT 2 2027|1|0
261109|T|Eksen ( Premium) TYT 1 2027|1|0
261112|T|Paraf Mor TG TYT 1 2027|0|0
261112|T|Rasyonel TYT 2 2027|1|0
261113|A|Aktif AYT 2 2027|1|0
261113|T|Aktif TYT 2 2027|1|0
261113|A|Edushare Rehber Matematik TG AYT 1 2027|0|0
261113|T|Edushare Rehber Matematik TG TYT 1 2027|0|0
261113|A|Nitelik AYT 2 2027|1|0
261113|T|Nitelik TYT 2 2027|1|0
261118|A|Kondisyon AYT 1 2027|1|0
261118|T|Kondisyon TYT 1 2027|1|0
261119|T|Aday TYT 1 2027|1|0
261120|T|BES Motivasyon TYT 1 2027|1|0
261120|T|ERGİ TG TYT 1 2027|0|1
261120|T|Tözok TYT 2 2027|1|0
261121|T|Okyanus Iceberg TYT 2 2027|1|0
261123|A|Hız Kurumsal AYT 2 2027|1|0
261123|T|Hız Kurumsal TYT 2 2027|1|0
261123|T|Paraf Okul TYT 1 2027|1|0
261123|A|X Yayıncılık AYT 2 2027|1|0
261123|T|X Yayıncılık TYT 2 2027|1|0
261125|A|Eksen AYT 3 2027|1|0
261125|T|Eksen TYT 3 2027|1|0
261126|A|Paylaşım AYT 1 2027|1|0
261126|T|Paylaşım TYT 3 2027|1|0
261127|T|METİN TG TYT 1 2027|0|1
261127|A|Özdebir TG AYT 2 2027|0|0
261127|T|Özdebir TG TYT 2 2027|0|0
261127|A|Palme (Enerji) AYT 2 2027|1|0
261127|T|Palme (Enerji) TYT 2 2027|1|0
261127|A|Retro AYT 2 2027|1|0
261127|T|Retro TYT 2 2027|1|0
261127|A|Ulti AYT 1 2027|1|0
261127|A|Ulti TG AYT 1 2027|0|0
261127|T|Ulti TG TYT 2 2027|0|0
261127|T|Ulti TYT 1 2027|1|0
261127|T|ÜÇDÖRTBEŞ TG TYT İLK PROVA 2027|0|1
261128|A|Didaktik Kalem AYT 1 2027|1|0
261128|T|Didaktik Kalem TYT 1 2027|1|0
261130|A|Acil AYT 1 2027|1|0
261130|T|Acil TYT 1 2027|1|0
261130|A|Hız TG AYT 2 2027|0|0
261130|T|Hız TG TYT 2 2027|0|0
261201|T|Okyanus 40 Seans TYT 3 2027|1|0
261203|T|BES Rehber Serisi TYT 2 2027|1|0
261203|A|Endemik TG AYT 2 2027|0|0
261203|T|Endemik TG TYT 2 2027|0|0
261203|T|Paraf TG TYT 2 2027|0|0
261204|A|Karekök - Dakika AYT 2 2027|1|0
261204|T|Karekök - Dakika TYT 2 2027|1|0
261204|A|Limit AYT 3 2027|1|0
261204|T|Limit TYT 3 2027|1|0
261204|A|Nitelik AYT 3 2027|1|0
261204|T|Nitelik TYT 3 2027|1|0
261204|A|ORİJİNAL TG AYT 1 2027|0|1
261204|T|ORİJİNAL TG TYT 1 2027|0|1
261210|T|Bıyıklı Matematik TG TYT 1 2027|0|0
261210|T|Format TYT 1 2027|1|0
261210|T|Ordinat TYT 1 2027|1|0
261210|T|Strateji TYT 1 2027|1|0
261211|T|4K TG TYT 2 2027|0|0
261211|A|BARIŞ TG AYT 1 2027|0|1
261211|T|BARIŞ TG TYT 1 2027|0|1
261211|A|Benim Hocam TG AYT 1 2027|0|0
261211|T|Benim Hocam TG TYT 1 2027|0|0
261215|T|Kafa Dengi (Extra) TYT 2 2027|1|0
261215|A|Orbital AYT 1 2027|1|0
261215|T|Orbital TYT 1 2027|1|0
261215|A|Yayın Denizi Pro AYT 3 2027|1|0
261215|T|Yayın Denizi Pro TYT 3 2027|1|0
261217|A|Miray TG AYT 2 2027|0|0
261217|T|Miray TG TYT 2 2027|0|0
261217|A|Töder TG AYT 1 2027|0|0
261217|T|Töder TG TYT 1 2027|0|0
261218|T|Alternatif TYT 2 2027|1|0
261218|A|BİLGİ SARMAL TG AYT 2 2027|0|1
261218|T|BİLGİ SARMAL TG TYT 2 2027|0|1
261218|T|Eğitim Vadisi TYT 2 2027|1|0
261218|A|METİN TG AYT 2 2027|0|1
261218|T|METİN TG TYT 2 2027|0|1
261218|T|Toprak TG TYT 3 2027|0|0
261218|A|Tözok AYT 3 2027|1|0
261218|T|Tözok TYT 3 2027|1|0
261219|A|BES Üniversiteye Doğru AYT 3 2027|1|0
261219|T|BES Üniversiteye Doğru TYT 3 2027|1|0
261221|A|Eksen AYT 4 2027|1|0
261221|T|Eksen TYT 4 2027|1|0
261221|A|Hız Kurumsal AYT 3 2027|1|0
261221|T|Hız Kurumsal TYT 3 2027|1|0
261221|A|Okyanus Iceberg AYT 1 2027|1|0
261221|T|Okyanus Iceberg TYT 3 2027|1|0
261222|A|Çap AYT 2 2027|1|0
261222|T|Çap TYT 2 2027|1|0
261224|T|Elit Karma TYT 2 2027|1|0
261225|T|3D TG TYT 2 2027|0|1
261225|A|Palme (Enerji) AYT 3 2027|1|0
261225|T|Palme (Enerji) TYT 3 2027|1|0
261227|T|Ulti TYT 3 2027|1|0
261228|A|X Yayıncılık AYT 3 2027|1|0
261228|T|X Yayıncılık TYT 3 2027|1|0
261228|A|Yanıt TG AYT 2 2027|0|0
261228|T|Yanıt TG TYT 2 2027|0|0
261230|T|Kafa Dengi (Challenger) TYT 1 2027|1|0
270101|T|Okyanus 40 Seans TYT 4 2027|1|0
270102|A|ACİL TG AYT 1 2027|0|1
270102|T|ACİL TG TYT 1 2027|0|1
270102|T|SIFIR POZİTİF KULÜP TYT 1 2027|0|1
270103|T|Okyanus Iceberg TG TYT 1 2027|0|0
270104|A|Karekök - Dakika AYT 3 2027|1|0
270104|T|Karekök - Dakika TYT 3 2027|1|0
270108|A|Özdebir TG AYT 3 2027|0|0
270108|T|Özdebir TG TYT 3 2027|0|0
270109|T|BES Yön Serisi TYT 2 2027|1|0
270114|A|Aydın TG AYT 2 2027|0|0
270114|T|Aydın TG TYT 2 2027|0|0
270114|A|ERGİ TG AYT 2 2027|0|1
270114|T|ERGİ TG TYT 2 2027|0|1
270114|A|Paraf Fen Lisesi AYT 1 2027|1|0
270114|T|Paraf Fen Lisesi TYT 2 2027|1|0
270115|Y|Akademi Deniz TG YDT 2 2027|0|0
270115|A|APOTEMİ TG AYT 2 2027|0|1
270115|T|APOTEMİ TG TYT 2 2027|0|1
270115|A|Mert Hoca TG AYT 1 2027|0|0
270115|T|Mert Hoca TG TYT 1 2027|0|0
270115|A|Nitelik TG AYT 1 2027|0|0
270115|T|Nitelik TG TYT 1 2027|0|0
270115|A|Yıldızlar Yarışıyor AYT 2 2027|1|0
270115|T|Yıldızlar Yarışıyor TYT 2 2027|1|0
270118|A|BES Üniversiteye Doğru AYT 4 2027|1|0
270118|T|BES Üniversiteye Doğru TYT 4 2027|1|0
270118|A|Hız Kurumsal AYT 4 2027|1|0
270118|T|Hız Kurumsal TYT 4 2027|1|0
270118|A|Hız TG AYT 3 2027|0|0
270118|T|Hız TG TYT 3 2027|0|0
270119|T|Eksen ( Premium) TYT 2 2027|1|0
270119|A|Hız ve Renk AYT 1 2027|1|0
270119|T|Hız ve Renk TYT 1 2027|1|0
270121|T|Aday TYT 2 2027|1|0
270121|T|Okyanus Iceberg TYT 4 2027|1|0
270122|A|Branşlar Karması TG AYT 1 2027|0|0
270122|T|Branşlar Karması TG TYT 1 2027|0|0
270128|A|IQ Gölge TG AYT 1 2027|0|0
270128|T|IQ Gölge TG TYT 1 2027|0|0
270129|A|Acil-Ders Platosu TG AYT 2 2027|0|0
270129|T|Acil-Ders Platosu TG TYT 2 2027|0|0
270129|T|BES Motivasyon TYT 2 2027|1|0
270201|T|Okyanus 40 Seans TYT 5 2027|1|0
270204|A|Paylaşım AYT 2 2027|1|0
270204|T|Paylaşım TYT 4 2027|1|0
270208|A|Etap AYT 2 2027|1|0
270208|T|Etap TYT 2 2027|1|0
270211|A|Strateji TG AYT 1 2027|0|0
270211|T|Strateji TG TYT 2 2027|0|0
270212|A|EN DENEME TG AYT 1 2027|0|1
270212|T|EN DENEME TG TYT 1 2027|0|1
270212|T|Özdebir TG TYT 2027|0|0
270212|A|Rasyonel AYT 4 2027|1|0
270212|T|Rasyonel TYT 4 2027|1|0
270212|A|Retro AYT 3 2027|1|0
270212|T|Retro TYT 3 2027|1|0
270213|T|BES Turkuaz Serisi TYT 1 2027|1|0
270215|A|Didaktik Kalem AYT 2 2027|1|0
270215|T|Didaktik Kalem TYT 2 2027|1|0
270215|A|Hız Kurumsal AYT 5 2027|1|0
270215|T|Hız Kurumsal TYT 5 2027|1|0
270218|A|Endemik TG AYT 3 2027|0|0
270218|T|Endemik TG TYT 3 2027|0|0
270218|A|Karekök - Dakika TG AYT 4 2027|0|0
270218|T|Karekök - Dakika TG TYT 4 2027|0|0
270218|A|Miray AYT 3 2027|1|0
270218|T|Miray TYT 3 2027|1|0
270218|T|Paraf TG TYT 3 2027|0|0
270218|T|Sonuç TYT 2 2027|1|0
270219|A|Eğitim Vadisi AYT 3 2027|1|0
270219|T|Eğitim Vadisi TYT 3 2027|1|0
270219|A|Final AYT 1 2027|1|0
270219|T|Final TYT 1 2027|1|0
270219|A|HIZ VE RENK TG AYT 1 2027|0|1
270219|T|HIZ VE RENK TG TYT 1 2027|0|1
270219|A|Toprak AYT 4 2027|1|0
270219|T|Toprak TYT 4 2027|1|0
270221|A|Okyanus Iceberg AYT 2 2027|1|0
270221|T|Okyanus Iceberg TYT 5 2027|1|0
270222|A|X Yayıncılık AYT 4 2027|1|0
270222|T|X Yayıncılık TYT 4 2027|1|0
270223|A|Eksen AYT 5 2027|1|0
270223|T|Eksen TYT 5 2027|1|0
270226|A|Limit AYT 4 2027|1|0
270226|T|Limit TYT 4 2027|1|0
270226|A|Özdebir TG AYT 4 2027|0|0
270226|T|Özdebir TG TYT 4 2027|0|0
270227|A|BES Üniversiteye Doğru AYT 5 2027|1|0
270227|T|BES Üniversiteye Doğru TYT 5 2027|1|0
270227|A|Edushare İlyas Güneş TG AYT 1 2027|0|0
270227|T|Edushare İlyas Güneş TG TYT 1 2027|0|0
270228|A|Orbital AYT 2 2027|1|0
270228|T|Orbital TYT 2 2027|1|0
270301|A|Hız TG AYT 4 2027|0|0
270301|T|Hız TG TYT 4 2027|0|0
270301|T|Okyanus 40 Seans TYT 6 2027|1|0
270302|A|Aydın AYT 3 2027|1|0
270302|T|Aydın TYT 3 2027|1|0
270303|T|Kafa Dengi (Extra) TG TYT 3 2027|0|0
270304|A|PARAF MOR TG AYT 1 2027|0|1
270304|T|PARAF MOR TG TYT 2 2027|0|1
270305|A|Biyotik - Krallar Karması AYT 1 2027|1|0
270305|T|Biyotik - Krallar Karması TYT 1 2027|1|0
270305|A|Palme (Enerji) AYT 4 2027|1|0
270305|T|Palme (Enerji) TYT 4 2027|1|0
270309|A|Merkez AYT 1 2027|1|0
270309|T|Merkez TYT 1 2027|1|0
270317|A|Yanıt TG AYT 3 2027|0|0
270317|T|Yanıt TG TYT 3 2027|0|0
270318|A|Eksen AYT 6 2027|1|0
270318|T|Eksen TYT 6 2027|1|0
270318|A|Ordinat AYT 1 2027|1|0
270318|T|Ordinat TYT 2 2027|1|0
270318|A|Töder TG AYT 2 2027|0|0
270318|T|Töder TG TYT 2 2027|0|0
270319|A|BARIŞ TG AYT 2 2027|0|1
270319|T|BARIŞ TG TYT 2 2027|0|1
270319|A|EĞİTİM VADİSİ TG AYT 4|0|1
270319|A|Nitelik AYT 4 2027|1|0
270319|T|Nitelik TYT 4 2027|1|0
270319|A|ÜÇDÖRTBEŞ TG AYT BÜYÜK PROVA 2027|0|1
270319|T|ÜÇDÖRTBEŞ TG TYT BÜYÜK PROVA 2027|0|1
270320|Y|Akademi Deniz TG YDT 3 2027|0|0
270320|A|ORİJİNAL TG AYT 2 2027|0|1
270320|T|ORİJİNAL TG TYT 2 2027|0|1
270321|A|Okyanus Iceberg AYT 3 2027|1|0
270321|T|Okyanus Iceberg TYT 6 2027|1|0
270322|A|BES Yön Serisi AYT 1 2027|1|0
270322|T|BES Yön Serisi TYT 3 2027|1|0
270322|A|Paraf Okul AYT 1 2027|1|0
270322|T|Paraf Okul TYT 2 2027|1|0
270322|A|Prolig AYT Şampiyonlar Ligi 2027|1|0
270322|T|Prolig TYT Şampiyonlar Ligi 2027|1|0
270324|A|Hız ve Renk AYT 3 2027|1|0
270324|T|Hız ve Renk TYT 3 2027|1|0
270325|A|Acil AYT 2 2027|1|0
270325|T|Acil TYT 2 2027|1|0
270325|A|Elit Karma TG AYT 1 2027|0|0
270325|T|Elit Karma TG TYT 3 2027|0|0
270326|A|3D TG AYT 3 2027|0|1
270326|T|3D TG TYT 3 2027|0|1
270326|A|Alternatif AYT 3 2027|1|0
270326|T|Alternatif TYT 3 2027|1|0
270326|A|Karekök - Dakika AYT 5 2027|1|0
270326|T|Karekök - Dakika TYT 5 2027|1|0
270326|A|RASYONEL TG AYT 5 2027|0|1
270326|T|RASYONEL TG TYT 5 2027|0|1
270326|A|Retro AYT 4 2027|1|0
270326|T|Retro TYT 4 2027|1|0
270327|A|BES Üniversiteye Doğru AYT 6 2027|1|0
270327|T|BES Üniversiteye Doğru TYT 6 2027|1|0
270329|A|Hız Kurumsal AYT 6 2027|1|0
270329|T|Hız Kurumsal TYT 6 2027|1|0
270329|A|X Yayıncılık AYT 5 2027|1|0
270329|T|X Yayıncılık TYT 5 2027|1|0
270330|A|Yayın Denizi Pro AYT 4 2027|1|0
270330|T|Yayın Denizi Pro TYT 4 2027|1|0
270401|A|Miray AYT 4 2027|1|0
270401|T|Miray TYT 4 2027|1|0
270401|T|Okyanus 40 Seans TYT 7 2027|1|0
270401|A|Paylaşım AYT 3 2027|1|0
270401|T|Paylaşım TYT 5 2027|1|0
270402|A|Çap Türkiye Geneli TG AYT 1 2027|0|0
270402|T|Çap Türkiye Geneli TG TYT 1 2027|0|0
270402|A|Özdebir TG AYT 5 2027|0|0
270402|T|Özdebir TG TYT 5 2027|0|0
270404|A|Yıldızlar Yarışıyor AYT 3 2027|1|0
270404|T|Yıldızlar Yarışıyor TYT 3 2027|1|0
270405|A|Aday AYT 1 2027|1|0
270405|T|Aday TYT 3 2027|1|0
270408|A|Paraf Fen Lisesi AYT 2 2027|1|0
270408|T|Paraf Fen Lisesi TYT 3 2027|1|0
270409|A|4K TG AYT 3 2027|0|1
270409|T|4K TG TYT 3 2027|0|1
270409|A|BES Rehber Serisi AYT 1 2027|1|0
270409|T|BES Rehber Serisi TYT 3 2027|1|0
270409|A|BİLGİ SARMAL TG AYT 3 2027|0|1
270409|T|BİLGİ SARMAL TG TYT 3 2027|0|1
270409|A|Palme (Enerji) AYT 5 2027|1|0
270409|T|Palme (Enerji) TYT 5 2027|1|0
270409|A|SIFIR POZİTİF TG AYT 2 2027|0|1
270409|T|SIFIR POZİTİF TG TYT 2 2027|0|1
270409|A|Tözok AYT 4 2027|1|0
270409|T|Tözok TYT 4 2027|1|0
270412|A|Hız TG AYT 5 2027|0|0
270412|T|Hız TG TYT 5 2027|0|0
270415|A|Paraf TG AYT 2 2027|0|0
270415|T|Paraf TG TYT 4 2027|0|0
270415|A|Sonuç AYT 1 2027|1|0
270415|T|Sonuç TYT 3 2027|1|0
270416|A|Eksen AYT 7 2027|1|0
270416|T|Eksen TYT 7 2027|1|0
270416|A|Hız ve Renk AYT 2 2027|1|0
270416|A|HIZ VE RENK TG AYT 2 2027|0|1
270416|T|HIZ VE RENK TG TYT 2 2027|0|1
270416|T|Hız ve Renk TYT 2 2027|1|0
270416|T|Kafa Dengi (Challenger) TG TYT 2 2027|0|0
270416|A|Karekök - Dakika AYT 6 2027|1|0
270416|T|Karekök - Dakika TYT 6 2027|1|0
270416|A|KR TG AYT 2 2027|0|1
270416|T|KR TG TYT 2 2027|0|1
270416|A|Limit AYT 5 2027|1|0
270416|T|Limit TYT 5 2027|1|0
270416|A|Nitelik AYT 5 2027|1|0
270416|T|Nitelik TYT 5 2027|1|0
270417|A|BES Motivasyon Kulubü AYT 1 2027|1|0
270417|T|BES Motivasyon Kulubü TYT 3 2027|1|0
270419|A|Aydın AYT 4 2027|1|0
270419|T|Aydın TYT 4 2027|1|0
270419|A|Biyotik AYT 2 2027|1|0
270419|T|Biyotik TYT 2 2027|1|0
270421|A|Okyanus Iceberg AYT 4 2027|1|0
270421|T|Okyanus Iceberg TYT 7 2027|1|0
270422|A|Endemik TG AYT 4 2027|0|0
270422|T|Endemik TG TYT 4 2027|0|0
270422|A|IQ Gölge TG AYT 2 2027|0|0
270422|T|IQ Gölge TG TYT 2 2027|0|0
270423|A|Metin TG AYT 3 2027|0|0
270423|T|Metin TG TYT 3 2027|0|0
270423|A|Retro AYT 5 2027|1|0
270423|T|Retro TYT 5 2027|1|0
270424|Y|Akademi Deniz TG YDT 4 2027|0|0
270424|A|APOTEMİ TG AYT 3 2027|0|1
270424|T|APOTEMİ TG TYT 3 2027|0|1
270424|A|ERGİ TG AYT 3 2027|0|1
270424|T|ERGİ TG TYT 3 2027|0|1
270424|A|Final AYT 2 2027|1|0
270424|T|Final TYT 2 2027|1|0
270426|A|Hız Kurumsal AYT 7 2027|1|0
270426|T|Hız Kurumsal TYT 7 2027|1|0
270426|A|X Yayıncılık AYT 6 2027|1|0
270426|T|X Yayıncılık TYT 6 2027|1|0
270430|A|BES Üniversiteye Doğru AYT 7 2027|1|0
270430|T|BES Üniversiteye Doğru TYT 7 2027|1|0
270430|A|Bıyıklı Matematik TG AYT 2 2027|0|0
270430|T|Bıyıklı Matematik TG TYT 2 2027|0|0
270430|A|Format AYT 2 2027|1|0
270430|T|Format TYT 2 2027|1|0
270430|A|Zeduva TG AYT 1 2027|0|0
270430|T|Zeduva TG TYT 1 2027|0|0
270501|T|Okyanus 40 Seans TYT 8 2027|1|0
270503|A|Paraf Mor TG AYT 2 2027|0|0
270503|T|Paraf Mor TG TYT 3 2027|0|0
270506|A|Aydın (Premium) TG AYT 5 2027|0|0
270506|T|Aydın (Premium) TG TYT 5 2027|0|0
270506|A|Karekök - Dakika TG AYT 7 2027|0|0
270506|T|Karekök - Dakika TG TYT 7 2027|0|0
270506|A|Töder TG AYT 3 2027|0|0
270506|T|Töder TG TYT 3 2027|0|0
270507|A|Alternatif AYT 4 2027|1|0
270507|T|Alternatif TYT 4 2027|1|0
270507|A|BES Turkuaz Serisi AYT 1 2027|1|0
270507|T|BES Turkuaz Serisi TYT 2 2027|1|0
270507|A|Kondisyon AYT 2 2027|1|0
270507|T|Kondisyon TYT 2 2027|1|0
270507|A|ORİJİNAL TG AYT 3 2027|0|1
270507|T|ORİJİNAL TG TYT 3 2027|0|1
270507|A|ÖZDEBİR TG AYT 6 2027|0|1
270507|T|ÖZDEBİR TG TYT 6 2027|0|1
270507|A|Palme (Enerji) AYT 6 2027|1|0
270507|T|Palme (Enerji) TYT 6 2027|1|0
270507|A|ÜÇDÖRTBEŞ TG AYT SON PROVA 2027|0|1
270507|T|ÜÇDÖRTBEŞ TG TYT SON PROVA 2027|0|1
270508|A|Okyanus Iceberg TG AYT 1 2027|0|0
270508|T|Okyanus Iceberg TG TYT 2 2027|0|0
270509|A|Toprak AYT 5 2027|1|0
270509|T|Toprak TYT 5 2027|1|0
270510|A|Hız TG AYT 6 2027|0|0
270510|T|Hız TG TYT 6 2027|0|0
270511|A|Eksen AYT 8 2027|1|0
270511|T|Eksen TYT 8 2027|1|0
270511|A|IQ Gölge TG AYT 3 2027|0|0
270511|T|IQ Gölge TG TYT 3 2027|0|0
270512|T|Kafa Dengi (Challenger) TG TYT 3 2027|0|0
270514|A|Nitelik TG TG AYT 2 2027|0|0
270514|T|Nitelik TG TG TYT 2 2027|0|0
270515|A|Ulti AYT 3 2027|1|0
270515|A|Ulti Sınava Doğru AYT 1 2027|1|0
270515|A|Ulti Sınava Doğru AYT 2 2027|1|0
270515|A|Ulti Sınava Doğru AYT 3 2027|1|0
270515|T|Ulti Sınava Doğru TYT 1 2027|1|0
270515|T|Ulti Sınava Doğru TYT 2 2027|1|0
270515|T|Ulti Sınava Doğru TYT 3 2027|1|0
270515|T|Ulti TYT 5 2027|1|0
270517|A|X Yayıncılık AYT 7 2027|1|0
270517|A|X Yayıncılık AYT 8 2027|1|0
270517|A|X Yayıncılık AYT 9 2027|1|0
270517|T|X Yayıncılık TYT 7 2027|1|0
270517|T|X Yayıncılık TYT 8 2027|1|0
270517|T|X Yayıncılık TYT 9 2027|1|0
270519|A|BES Üniversiteye Doğru AYT 8 2027|1|0
270519|T|BES Üniversiteye Doğru TYT 8 2027|1|0
270520|A|Elit Karma TG AYT 2 2027|0|0
270520|T|Elit Karma TG TYT 4 2027|0|0
270521|A|Eğitim Vadisi AYT 5 2027|1|0
270521|T|Eğitim Vadisi TYT 5 2027|1|0
270521|A|Okyanus Iceberg AYT 5 2027|1|0
270521|T|Okyanus Iceberg TYT 8 2027|1|0
270521|A|Sonuç TG AYT 2 2027|0|0
270521|T|Sonuç TG TYT 4 2027|0|0
270521|A|TOPRAK TG AYT 6 2027|0|1
270521|T|TOPRAK TG TYT 6 2027|0|1
270522|A|BARIŞ TG AYT 3 2027|0|1
270522|T|BARIŞ TG TYT 3 2027|0|1
270523|A|Acil TG AYT 2 2027|0|0
270523|T|Acil TG TYT 2 2027|0|0
270525|A|Miray TG AYT 5 2027|0|0
270525|T|Miray TG TYT 5 2027|0|0
270527|A|Bıyıklı Matematik TG AYT 3 2027|0|0
270527|T|Bıyıklı Matematik TG TYT 3 2027|0|0
270527|A|Endemik Son Prova TG AYT 5 2027|0|0
270527|T|Endemik Son Prova TG TYT 5 2027|0|0
270527|A|Format AYT 3 2027|1|0
270527|T|Format TYT 3 2027|1|0
270527|A|Töder Son Prova TG AYT Son Prova 2027|0|0
270527|T|Töder Son Prova TG TYT Son Prova 2027|0|0
270527|A|Yanıt AYT 4 2027|1|0
270527|T|Yanıt TYT 4 2027|1|0
270528|A|3D TG AYT 4 2027|0|1
270528|T|3D TG TYT 4 2027|0|1
270528|A|Benim Hocam TG AYT 2 2027|0|0
270528|T|Benim Hocam TG TYT 2 2027|0|0
270528|A|Retro AYT 6 2027|1|0
270528|T|Retro TYT 6 2027|1|0
270528|A|Tözok AYT 5 2027|1|0
270528|T|Tözok TYT 5 2027|1|0
270531|T|Eksen ( Premium) TYT 3 2027|1|0
270531|A|Hız Kurumsal AYT 8 2027|1|0
270531|T|Hız Kurumsal TYT 8 2027|1|0
270601|A|Paraf TG AYT 3 2027|0|0
270601|T|Paraf TG TYT 5 2027|0|0
270603|A|Aydın AYT 6 2027|1|0
270603|T|Aydın TYT 6 2027|1|0
270603|A|Ergi TG AYT 4 2027|0|0
270603|T|Ergi TG TYT 4 2027|0|0
270603|A|IQ Gölge TG AYT 4 2027|0|0
270603|T|IQ Gölge TG TYT 4 2027|0|0
270604|Y|Akademi Deniz TG YDT 5 2027|0|0
270604|A|Bilgi Sarmal TG AYT 4 2027|0|0
270604|T|Bilgi Sarmal TG TYT 4 2027|0|0
270604|A|En Deneme TG AYT 2 2027|0|0
270604|T|En Deneme TG TYT 2 2027|0|0
270604|A|Karekök - Dakika AYT 8 2027|1|0
270604|T|Karekök - Dakika TYT 8 2027|1|0
270604|A|Özdebir TG AYT Son Prova 2027|0|0
270604|T|Özdebir TG TYT Son Prova 2027|0|0
270604|A|Palme (Enerji) AYT 7 2027|1|0
270604|T|Palme (Enerji) TYT 7 2027|1|0
270605|A|Aday AYT 2 2027|1|0
270605|T|Aday TYT 4 2027|1|0
270605|A|Paylaşım TG AYT 4 2027|0|0
270605|T|Paylaşım TG TYT 6 2027|0|0
270606|A|Rasyonel AYT 7 2027|1|0
270606|T|Rasyonel TYT 7 2027|1|0
270607|A|4K TG AYT 4 2027|0|0
270607|T|4K TG TYT 4 2027|0|0
270607|A|Strateji AYT 2 2027|1|0
270607|T|Strateji TYT 3 2027|1|0
270611|T|Kafa Dengi (Extra) TG TYT 4 2027|0|0
270611|A|Kafa Dengi TG AYT 4 2027|0|0
270611|A|KR Akademi TG AYT 3 2027|0|0
270611|T|KR Akademi TG TYT 3 2027|0|0
270611|A|Limit AYT 6 2027|1|0
270611|T|Limit TYT 6 2027|1|0
270611|A|Nitelik AYT 6 2027|1|0
270611|T|Nitelik TYT 6 2027|1|0`;
  const MON=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const MON3=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  const DAY3=["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
  const TY={T:"TYT",A:"AYT",Y:"YDT"};
  const LSK="karakis-deneme-plan";
  const ALL=RAW.split("\n").map(l=>{const p=l.split("|"),d=p[0];return{code:p.slice(0,3).join("|").replace(/\s+/g," "),date:"20"+d.slice(0,2)+"-"+d.slice(2,4)+"-"+d.slice(4,6),t:p[1],name:p[2].replace(/\s+/g," ").trim(),kur:p[3]==="1",club:p[4]==="1"}});
  const BYCODE={};ALL.forEach(e=>{BYCODE[e.code]=e});
  const MONTHS=[...new Set(ALL.map(e=>e.date.slice(0,7)))];
  const pad=n=>String(n).padStart(2,"0");
  const mk=d=>d.slice(0,7);
  const pdt=d=>new Date(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10));
  const today=()=>{const n=new Date();return n.getFullYear()+"-"+pad(n.getMonth()+1)+"-"+pad(n.getDate())};
  const tr=s=>s.toLocaleLowerCase("tr");
  const isOn=()=>typeof ROLE!=="undefined"&&ROLE==="coach"&&typeof CPG!=="undefined"&&CPG==="e";
  // Öğrenci: Analiz → Denemeler sayfası açıkken
  const isStu=()=>typeof ROLE!=="undefined"&&ROLE==="student"&&typeof tab!=="undefined"&&tab==="d"&&typeof ANT!=="undefined"&&ANT==="n";
  const needRender=()=>isOn()||isStu();

  // load: 0 yüklenmedi, 1 yükleniyor, 2 hazır (sunucu), 3 hazır (yalnız bu tarayıcı)
  const DT={view:"cal",m:null,t:{T:1,A:1,Y:1},club:false,q:"",pick:new Set(),load:0,msg:""};
  const monthNow=()=>{const t=mk(today());return MONTHS.includes(t)?t:(MONTHS.find(m=>m>=t)||MONTHS[0])};

  function localRead(){try{const s=localStorage.getItem(LSK);return s?JSON.parse(s):[]}catch(e){return[]}}
  function localSave(){try{localStorage.setItem(LSK,JSON.stringify([...DT.pick]))}catch(e){}}
  function load(){
    if(DT.load)return;DT.load=1;
    let q;try{q=sb.from("deneme_plan").select("code")}catch(e){q=null}
    Promise.resolve(q).then(r=>{
      if(r&&!r.error&&Array.isArray(r.data)){DT.pick=new Set(r.data.map(x=>x.code));DT.load=2;DT.msg=""}
      else{DT.pick=new Set(localRead());DT.load=3;DT.msg="Seçimler sunucuya kaydedilemiyor, bu tarayıcıda tutuluyor."}
      if(needRender())render();
    },()=>{DT.pick=new Set(localRead());DT.load=3;DT.msg="Bağlantı yok, seçimler bu tarayıcıda tutuluyor.";if(needRender())render()});
  }
  function toggle(code){
    if(!BYCODE[code])return;
    const add=!DT.pick.has(code);
    if(add)DT.pick.add(code);else DT.pick.delete(code);
    if(DT.load===2){
      const undo=m=>{if(add)DT.pick.delete(code);else DT.pick.add(code);DT.msg=m;if(isOn())render()};
      const p=add?sb.from("deneme_plan").insert({code}):sb.from("deneme_plan").delete().eq("code",code);
      Promise.resolve(p).then(r=>{if(r&&r.error)undo("Kaydedilemedi: "+r.error.message)},()=>undo("Bağlantı yok, değişiklik kaydedilmedi."));
    }else localSave();
  }

  function visible(){
    const q=tr(DT.q.trim());
    return ALL.filter(e=>DT.t[e.t]&&(!DT.club||e.club)&&(!q||tr(e.name).includes(q)));
  }
  const dayLbl=d=>{const x=pdt(d);return x.getDate()+" "+MON3[x.getMonth()]+" "+DAY3[x.getDay()]};

  function listHTML(){
    const rows=visible().filter(e=>mk(e.date)===DT.m);
    if(!rows.length)return `<p class="dt-empty">Bu ayda seçili filtrelerle deneme yok. Tür ya da arama filtresini değiştir.</p>`;
    const by={};rows.forEach(e=>(by[e.date]=by[e.date]||[]).push(e));
    const td=today();
    return Object.keys(by).sort().map(d=>{
      const x=pdt(d),isT=d===td,past=d<td;
      return `<section class="dt-day${past?" dt-past":""}"><div class="dt-date${isT?" dt-today":""}"><b>${x.getDate()}</b><span>${DAY3[x.getDay()]}${isT?" · bugün":""}</span></div><div class="dt-list">${by[d].map(e=>{const on=DT.pick.has(e.code);return `<button class="dt-item${on?" dt-on":""}" data-dtp="${esc(e.code)}" aria-pressed="${on}"><span class="dt-box" aria-hidden="true">${on?"✓":""}</span><span class="dt-b dt-${e.t}">${TY[e.t]}</span><span class="dt-nm">${esc(e.name)}</span>${e.club?'<span class="dt-tg">Kulüp</span>':""}${e.kur?'<span class="dt-tg dt-k">Kurumsal</span>':""}</button>`}).join("")}</div></section>`;
    }).join("");
  }

  function mineHTML(){
    const mine=ALL.filter(e=>DT.pick.has(e.code));
    if(!mine.length)return `<p class="dt-empty">Henüz deneme seçmedin. Takvim görünümünde bir denemeye basınca buraya eklenir.</p>`;
    const by={};mine.forEach(e=>(by[mk(e.date)]=by[mk(e.date)]||[]).push(e));
    return `<div class="dt-bar"><span><b>${mine.length}</b> deneme, ${Object.keys(by).length} ay</span><span class="dt-acts"><button class="ghost" data-dtclear="1">Seçimi temizle</button><button class="cta" data-dtcopy="1">Listeyi kopyala</button></span></div>`+
      Object.keys(by).sort().map(m=>`<section class="dt-mm"><h3>${MON[+m.slice(5)-1]} ${m.slice(0,4)} <small>(${by[m].length})</small></h3>${by[m].map(e=>`<div class="dt-ln"><time>${dayLbl(e.date)}</time><span class="dt-b dt-${e.t}">${TY[e.t]}</span><span class="dt-nm">${esc(e.name)}</span></div>`).join("")}</section>`).join("");
  }

  function view(){
    load();
    if(!DT.m)DT.m=monthNow();
    const td=today(),up=ALL.filter(e=>e.date>=td).length,mine=ALL.filter(e=>DT.pick.has(e.code));
    const vis=visible();
    const back=typeof backBtn==="function"?backBtn("Geri","pi-back"):"";
    const months=MONTHS.map(m=>{const n=vis.filter(e=>mk(e.date)===m).length,p=ALL.filter(e=>mk(e.date)===m&&DT.pick.has(e.code)).length;return `<button class="dt-mo" data-dtm="${m}" aria-pressed="${m===DT.m}"><small>${m.slice(0,4)}</small><b>${MON[+m.slice(5)-1]} <i>${n}</i>${p?`<em>✓${p}</em>`:""}</b></button>`}).join("");
    return `<section id="coach-deneme" class="coach-section dt">
      <div class="page-intro"><div class="pi-t">${back}<div><p>YKS · TYT, AYT, YDT</p><h1>Deneme takvimi</h1></div></div></div>
      <div class="dt-kpis"><article class="dt-kpi"><h3>Takvimdeki deneme</h3><b>${ALL.length}</b><p>Temmuz 2026 – Haziran 2027</p></article><article class="dt-kpi"><h3>Henüz yapılmadı</h3><b>${up}</b><p>bugünden sonrası</p></article><article class="dt-kpi"><h3>Seçtiklerimiz</h3><b>${mine.length}</b><p>${mine.filter(e=>e.date>=td).length} tanesi ileride</p></article></div>
      <div class="dt-card">
        <div class="dt-ctl"><div class="dt-seg" role="group" aria-label="Görünüm"><button data-dtv="cal" aria-pressed="${DT.view==="cal"}">Takvim</button><button data-dtv="mine" aria-pressed="${DT.view==="mine"}">Seçtiklerimiz</button></div>
          <div class="dt-chips" role="group" aria-label="Tür">${["T","A","Y"].map(k=>`<button class="chip" data-dtt="${k}" aria-pressed="${!!DT.t[k]}">${TY[k]}</button>`).join("")}<button class="chip" data-dtclub="1" aria-pressed="${DT.club}">Yalnız Kulüp</button></div>
          <input id="dtq" type="search" placeholder="Yayın ara: Eksen, Palme, Okyanus…" aria-label="Deneme ara" autocomplete="off" value="${esc(DT.q)}"></div>
        ${DT.msg?`<p class="dt-warn">${esc(DT.msg)}</p>`:""}
        ${DT.view==="cal"?`<nav class="dt-months" aria-label="Aylar">${months}</nav><div id="dt-body" class="dt-body">${listHTML()}</div>`:`<div id="dt-body" class="dt-body dt-mine">${mineHTML()}</div>`}
      </div>
      <p class="dt-note">Tarihler denemetakvimim.com (Hangi Kaynak) takviminden 7 Kasım 2026'da alındı. Site, tarihlerin yıl içinde değişebileceğini söylüyor.</p></section>`;
  }

  // ---- Öğrenci kartı: koçun işaretlediği, tarihi gelmemiş denemeler ----
  let STUALL=false;
  function stuCard(){
    load();
    const td=today(),t0=pdt(td);
    let body;
    if(DT.load<2)body=`<p class="dt-empty"><span class="spin" aria-hidden="true"></span> Yükleniyor…</p>`;
    else{
      // Öğrenci sunucudan okuyamadıysa (DT.load===3) koçun yerel işaretlerini göstermek yanlış olur.
      const up=DT.load===2?ALL.filter(e=>DT.pick.has(e.code)&&e.date>=td):[];
      if(DT.load===3)body=`<p class="dt-empty">Takvim şu an yüklenemedi. Sayfayı yenileyip tekrar dene.</p>`;
      else if(!up.length)body=`<p class="dt-empty">Yaklaşan deneme yok. Koçun denemeleri seçince burada tarihleriyle görünür.</p>`;
      else{
        const left=d=>{const n=Math.round((pdt(d)-t0)/864e5);return n<=0?"Bugün":n===1?"Yarın":n+" gün kaldı"};
        const row=e=>`<div class="dt-ln"><time>${dayLbl(e.date)}</time><span class="dt-b dt-${e.t}">${TY[e.t]}</span><span class="dt-nm">${esc(e.name)}</span><span class="dt-tg${e.date===td||left(e.date)==="Yarın"?"":" dt-k"}">${left(e.date)}</span></div>`;
        let all="";
        if(STUALL){
          const by={};up.forEach(e=>(by[mk(e.date)]=by[mk(e.date)]||[]).push(e));
          all=Object.keys(by).sort().map(m=>`<section class="dt-mm"><h3>${MON[+m.slice(5)-1]} ${m.slice(0,4)} <small>(${by[m].length})</small></h3>${by[m].map(row).join("")}</section>`).join("");
        }else all=up.slice(0,5).map(row).join("");
        body=all+(up.length>5?`<div class="row" style="margin-top:10px"><button class="chip" data-dtstu="1" aria-expanded="${STUALL}">${STUALL?"Yalnız yaklaşan 5 denemeyi göster":"Tüm takvimi göster ("+up.length+")"}</button></div>`:"");
      }
    }
    return `<div class="card dt-stu"><h2>Yaklaşan denemeler</h2><p class="empty" style="margin:0 0 6px">Koçunun seçtiği deneme sınavlarının tarihleri. Tarihler değişebilir.</p>${body}</div>`;
  }
  if(typeof analizTab==="function"){
    const baseAnaliz=analizTab;
    analizTab=function(){
      const html=baseAnaliz.apply(this,arguments);
      try{
        if(!isStu())return html;
        const i=html.indexOf('class="ktseg"');if(i<0)return html;
        const j=html.indexOf("</div>",i);if(j<0)return html;
        return html.slice(0,j+6)+stuCard()+html.slice(j+6);
      }catch(e){console.error("Yaklaşan denemeler çizilemedi:",e);return html}
    };
  }

  const reg=()=>{try{if(typeof CPL==="object"&&CPL&&!CPL.e)CPL.e="Deneme takvimi"}catch(e){}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",reg);else reg();

  coachView=function(){
    reg();
    try{if(isOn()&&!(typeof sel!=="undefined"&&sel)&&!(typeof MV!=="undefined"&&MV))return view()}
    catch(e){console.error("Deneme takvimi çizilemedi, genel bakışa dönüldü:",e);CPG="o"}
    return baseCoachView.apply(this,arguments);
  };
  sideNav=function(){
    const html=baseSideNav.apply(this,arguments);
    try{
      if(typeof sel!=="undefined"&&sel)return html;
      const on=CPG==="e"&&!(typeof MV!=="undefined"&&MV);
      const btn=`<button data-cp="e"${on?' aria-current="true"':""}>${sic("cal")}<span class="nav-label">Deneme takvimi</span></button>`;
      return html.includes('<button data-cp="t"')?html.replace('<button data-cp="t"',btn+'<button data-cp="t"'):html;
    }catch(e){return html}
  };
  ui=function(t){
    const D=t.dataset||{};
    if(D.dtstu){STUALL=!STUALL;render();return true}
    if(D.dtp){toggle(D.dtp);render();return true}
    if(D.dtm){DT.m=D.dtm;render();return true}
    if(D.dtv){DT.view=D.dtv==="mine"?"mine":"cal";render();return true}
    if(D.dtt){const k=D.dtt;if(DT.t[k]){if(Object.keys(DT.t).filter(x=>DT.t[x]).length>1)delete DT.t[k]}else DT.t[k]=1;render();return true}
    if(D.dtclub){DT.club=!DT.club;render();return true}
    if(D.dtclear){[...DT.pick].forEach(c=>toggle(c));render();return true}
    if(D.dtcopy){
      const mine=ALL.filter(e=>DT.pick.has(e.code));let out="",cur="";
      mine.forEach(e=>{const m=mk(e.date);if(m!==cur){cur=m;out+=(out?"\n":"")+MON[+m.slice(5)-1]+" "+m.slice(0,4)+"\n"}out+=dayLbl(e.date)+" - "+e.name+"\n"});
      const ok=()=>{t.textContent="Kopyalandı";setTimeout(()=>{t.textContent="Listeyi kopyala"},1500)};
      try{navigator.clipboard.writeText(out).then(ok,()=>{t.textContent="Kopyalanamadı"})}catch(e){t.textContent="Kopyalanamadı"}
      return true;
    }
    return prevUi.apply(this,arguments);
  };
  // Arama kutusu: yalnızca listeyi yeniden çizer (kutu odağını yitirmesin).
  document.addEventListener("input",e=>{
    if(!e.target||e.target.id!=="dtq"||!isOn())return;
    DT.q=e.target.value;
    const b=document.getElementById("dt-body");
    if(b&&DT.view==="cal")b.innerHTML=listHTML();
  });
})();
