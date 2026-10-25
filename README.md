<<<<<<< HEAD
# NutriLens

Barkodu tara → ürün bilgisi + diyet analizi. Ürün sistemde yoksa etiketteki **içindekiler** kısmını kameradan oku → vegan mı, glütensiz mi, sütsüz mü analiz et.

## Özellikler
- **Lazer barkod tarayıcı:** barkod görününce çerçeve barkoda kilitlenir, lazer hızlı yukarı-aşağı titreşir, haptic geri bildirim. EAN/UPC sağlama toplamı doğrulanır (yanlış okuma yok sayılır).
- **Keşfet:** Open Food Facts'ten Türkiye'de en çok taranan ürünler, kategori filtreleri, arama, sayfalama, yenileme, hata/yeniden dene.
- **İçerik analizi (TR + EN):** Vegan, Vejetaryen, Glütensiz, Sütsüz, Yumurtasız, Kuruyemişsiz, Soyasız. E-kodları, "içerebilir/eser miktarda" ifadeleri ve OFF alerjen etiketleri hesaba katılır.
- **Etiket tarama (OCR):** fotoğraf → metin → düzenlenebilir → analiz.
- **Profil:** diyet tercihlerine göre "Sana uygun / uygun değil".
- **Geçmiş:** yerel olarak saklanır.
- **Tasarım:** açık, sıcak beyaz tema; zümrüt vurgu; iOS 26'da gerçek Liquid Glass, eski iOS'ta blur, Android'de katı yüzey olan yüzen tab bar.

## Çalıştırma
```bash
npm install
cp .env.example .env     # OCR anahtarını yaz (ücretsiz: https://ocr.space/ocrapi/freekey)
npx expo start
```
Kamera ve barkod **gerçek cihazda** test edilmelidir. Expo Go'da `expo-glass-effect` her zaman çalışmayabilir; Liquid Glass için development build önerilir (`npx expo run:ios`).

## Notlar
- Veriler Open Food Facts topluluğundan gelir; eksik/hatalı olabilir.
- Analiz yalnızca içindekiler listesine dayanır; alerji için ambalaj doğrulanmalıdır.
=======
# nutrilens
>>>>>>> 9a918c69cb6c2be742c80fbac827329ef15a425a
# Nutrilenss
