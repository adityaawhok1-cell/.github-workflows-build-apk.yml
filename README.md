# Menara Emblem

Game taktis pixel-art (HTML5 canvas, dibungkus Capacitor jadi APK Android).
Semua grafik, animasi, dan suara dibuat secara prosedural lewat kode — tidak ada aset berhak cipta.

## Fitur
- Pertempuran taktis berbasis giliran di grid (gerak, jangkauan, medan hutan/gunung/air, segitiga senjata)
- Adegan duel close-up bergaya GBA (serangan beruntun, kritikal, tembak panah/sihir, EXP & level up)
- Gacha pahlawan: 19 pahlawan 3★/4★/5★, rate-up harian, jaminan 5★ tiap 50 panggilan, limit break dari duplikat
- Mode Menara: 100 lantai, 4 tema, bos tiap 10 lantai, hadiah Orb
- Simpan otomatis (localStorage)

## Main di browser (tanpa APK)
Buka `www/index.html` di browser.

## Build APK lewat GitHub (cara termudah, bisa dari HP)
1. Buat repo baru di GitHub.
2. Unggah **isi** zip ini (atau cukup unggah `game.zip` utuh) ke branch `main`.
3. Pastikan file `.github/workflows/build-apk.yml` ada. Di HP: *Add file → Create new file*, ketik nama
   `.github/workflows/build-apk.yml`, lalu tempel isinya.
4. Tab **Actions** → tunggu "Build APK" selesai (±5-8 menit).
5. Unduh `MenaraEmblem.apk` dari tab **Releases** (atau Artifacts), lalu pasang di HP
   (izinkan "Install dari sumber tidak dikenal").

Build manual di komputer: `npm install && npx cap add android && npx cap sync android`,
lalu buka folder `android/` di Android Studio.
