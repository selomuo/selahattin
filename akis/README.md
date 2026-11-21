# Akış – gelir, gider ve abonelik takvimi

Paranın ne zaman geleceğini ve gideceğini tek ekranda gösteren, reklamsız ve ücretsiz
bir web uygulaması (PWA). iPhone'da Safari ile açıp **Paylaş → Ana Ekrana Ekle** dersen
normal bir uygulama gibi tam ekran açılır, internetsiz de çalışır.

## Özellikler

- **Ana sayfa:** toplam varlık, ay sonu tahmini (bakiyeler + bu ay gelecekler − gidecekler),
  bu ayın geliri/gideri ve **Yaklaşanlar** (BUGÜN / YARIN / 3 GÜN etiketleriyle)
- **Kontrol et:** günü gelen her kayıt “Bursun yattı mı?”, “Turkcell faturasını ödedin mi?”
  diye sorulur. **Evet** deyince bağlı hesabın bakiyesi hemen güncellenir. Cevap verilmezse
  **ertesi gün otomatik onaylanır**, ana sayfada “Otomatik onaylandı” kartıyla gösterilir ve
  **Geri al** ile geri alınabilir. **Hayır** denirse otomatik onaylanmaz, ertesi gün yeniden sorulur
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
- **Geldi / Ödendi:** bir kayda dokunup elle de işaretlenebilir; tek bir seferin tutarı
  ayrıca değiştirilebilir
- **Hesaplar:** banka kartları (Ziraat, VakıfBank, İş, Garanti, Akbank, Enpara, Papara,
  Wise, nakit, altın…); bakiyeler elle girilir
- **Özet:** ay ay gelir, gider, birikim yüzdesi; kategori ve kalem dağılımı
- **Takvime aktar:** istediğin kayıtları tek tek ya da “Giderler / Gelirler / Tümü” olarak
  seçip iPhone Takvimi'ne ekler (bir gün önce ve o gün 09:00'da bildirim). Ayrı bir
  “Akış” takvimine eklersen hepsini tek seferde silip yeniden seçebilirsin
- **Hesaplar:** kullanıcı adı + şifre ile kayıt ve giriş; herkes yalnızca kendi verisini görür
- Açık / koyu tema, yedek indirme ve geri yükleme

## Hesaplar ve veriler

`config.js` boşken hesaplar **yalnızca o cihazda** tutulur: aynı telefonu kullananlar
birbirinin verisini göremez, arkadaşların kendi telefonlarında zaten ayrı veri tutar.
Önceki sürümde girilmiş kayıtlar, cihazda açılan ilk hesaba aktarılır.

Telefon değişince verinin kaybolmaması ve her cihazdan aynı hesapla girilebilmesi için
ücretsiz bir Firebase projesi bağlanabilir (bir kerelik, ~10 dakika):

1. https://console.firebase.google.com → **Proje ekle** (Tabak için açtığın projeyi de kullanabilirsin).
2. **Build → Authentication → Sign-in method → E-posta/Şifre → Etkinleştir.**
3. **Build → Firestore Database → Veritabanı oluştur** (production mode). **Kurallar** sekmesine
   `firestore.rules` içeriğini yapıştır. Tabak'ın projesini kullanıyorsan mevcut kuralları
   silme; içindeki `match /akis/{uid} { … }` bloğunu mevcut kuralların içine ekle.
4. Proje ayarları → **Uygulamalarınız → Web (`</>`)** → gösterilen `firebaseConfig`
   değerlerini `config.js` dosyasına yapıştır ve siteyi yeniden yükle.

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
