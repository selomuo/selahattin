# Akış – gelir, gider ve abonelik takvimi

Paranın ne zaman geleceğini ve gideceğini tek ekranda gösteren, reklamsız ve ücretsiz
bir web uygulaması (PWA). iPhone'da Safari ile açıp **Paylaş → Ana Ekrana Ekle** dersen
normal bir uygulama gibi tam ekran açılır, internetsiz de çalışır.

## Özellikler

- **Ana sayfa:** toplam varlık, ay sonu tahmini (bakiyeler + bu ay gelecekler − gidecekler),
  bu ayın geliri/gideri, **Bekleyenler** (tarihi geçmiş ama “geldi/ödendi” işaretlenmemiş
  kayıtlar) ve **Yaklaşanlar** (BUGÜN / YARIN / 3 GÜN etiketleriyle)
- **Takvim:** günlerin altında renkli noktalar (gelir yeşil, gider turuncu, tamamlanan mor);
  bir güne dokununca o günden itibaren ayın kayıtları zaman çizelgesinde
- **Hazır kalemler:** yaklaşık 120 hizmet logolarıyla: Netflix, YouTube, Spotify, Disney+,
  Exxen, TOD, Gain, iCloud, ChatGPT, Claude, Turkcell, Vodafone, Türk Telekom, Superonline,
  TürkNet, elektrik/doğalgaz/su şirketleri, kira, aidat, yurt, KYK, kredi kartı, taksit…
  Listede olmayanlar için “Özel ekle”
- **Gelirler:** maaş, KYK burs/kredi, harçlık, proje ödemesi, freelance, özel ders…
- **Tekrar:** tek sefer, her hafta, 2 haftada bir, her ay, 2/3/6 ayda bir, her yıl;
  “kaç kez?” alanıyla taksitli ve parça parça gelen ödemeler. Ayın 31'i gibi günler kısa
  aylarda ayın son gününe kayar
- **Geldi / Ödendi:** işaretleyince bağlı banka hesabının bakiyesi kendiliğinden güncellenir;
  tek bir seferin tutarı ayrıca değiştirilebilir
- **Hesaplar:** banka kartları (Ziraat, VakıfBank, İş, Garanti, Akbank, Enpara, Papara,
  Wise, nakit, altın…); bakiyeler elle girilir
- **Özet:** ay ay gelir, gider, birikim yüzdesi; kategori ve kalem dağılımı
- **Hatırlatma:** tüm kayıtları iPhone Takvimi'ne aktarır (bir gün önce ve o gün 09:00'da bildirim)
- Açık / koyu tema, yedek indirme ve geri yükleme

Veriler yalnızca o cihazda, tarayıcının içinde saklanır; hiçbir sunucuya gönderilmez.
Telefon değiştirirken **Ayarlar → Yedek indir** ile dosyayı alıp yeni cihazda geri yükle.

## Telefona kurma

1. **Netlify Drop (en kolayı):** https://app.netlify.com/drop sayfasına bu klasörün
   *içindekileri* ya da `akis-netlify.zip` dosyasını sürükle. Proje ayarlarında
   **Access & security → Visitor access** bölümünden siteyi **Public** yap.
2. **Netlify + GitHub (otomatik güncellenir):** Netlify'da *Add new project → Import from Git*
   ile bu repoyu seç, **Base directory** olarak `akis` yaz, build komutunu boş bırak.
   Bundan sonra repoya gelen her değişiklik siteye kendiliğinden yansır.
3. **Bilgisayarda deneme:** bu klasörde `python3 -m http.server 8000` çalıştırıp
   `http://localhost:8000` adresini aç.

Sonra iPhone'da Safari ile aç → **Paylaş → Ana Ekrana Ekle**.

## Notlar

- Marka logoları [Simple Icons](https://simpleicons.org) (CC0) projesindendir; markalar
  sahiplerine aittir. Logosu bulunmayan markalar kendi renginde baş harfleriyle gösterilir.
- Bankalardan otomatik bakiye çekilmez (Türkiye'de açık bankacılık lisansı gerekir).
