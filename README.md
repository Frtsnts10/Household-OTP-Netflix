# Household OTP Center

Pusat manajemen kode akses dan link verifikasi Netflix yang tersinkronisasi secara real-time. Proyek ini dibangun dengan Node.js (Express + SQLite) untuk *backend services* dan Next.js (HeroUI + Tailwind CSS) untuk *frontend app*.

## Fitur Utama
- **Multi-Email Support**: Bisa membaca OTP dari banyak akun email sekaligus.
- **Custom IMAP Domain**: Mendukung berbagai provider email dengan port custom (misal: `mail.alflix.id`).
- **Responsive & Modern UI**: Tampilan dioptimalkan secara rapi untuk Desktop, Tablet, dan Mobile.
- **Auto-Parsing**: Membaca format text biasa maupun link verifikasi kompleks dengan sangat baik.

## Struktur Proyek

- **/app**: Aplikasi antarmuka Next.js dengan desain yang modern dan responsif.
- **/services**: *Backend service* Express.js yang secara otomatis melakukan *polling* email via IMAP untuk membaca OTP terbaru.

## Persyaratan
- Node.js (v18+)
- NPM

## Instalasi

Instal semua dependensi (untuk `app` dan `services`) sekaligus dari direktori utama:
```bash
npm run install:all
```

## Konfigurasi Variabel Lingkungan (.env)

1. Buka folder `services`.
2. Salin file `.env.example` menjadi `.env`.
3. Isi kredensial IMAP email Anda. Pastikan Anda menggunakan *App Password* jika menggunakan Gmail.

## Menjalankan Aplikasi

Jalankan kedua perintah berikut di dua terminal/tab yang terpisah di root proyek:

**Terminal 1 (Backend Services):**
```bash
npm run dev:services
```

**Terminal 2 (Frontend App):**
```bash
npm run dev:app
```

Buka `http://localhost:3000` di browser Anda untuk melihat aplikasi yang sedang berjalan.
