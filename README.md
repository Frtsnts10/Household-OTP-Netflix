# Household OTP Center
# Household OTP (Firebase Edition)

Aplikasi pintar untuk menangkap OTP Netflix dari Email (IMAP) secara otomatis dan menampilkannya di Dashboard Web.
Versi ini telah di-upgrade ke Arsitektur **Full Serverless** menggunakan Next.js App Router dan Firebase.

## 🚀 Fitur Utama
1. **Cron Job Otomatis:** Menarik email dari Netflix setiap 1 menit via IMAP (Cloud Scheduler).
2. **Dashboard Real-time:** Menampilkan OTP langsung dari Firestore.
3. **Multi-User (Role-Based):** Dukungan admin dan user biasa (Household Only).
4. **Keamanan Ekstra:** Login menggunakan 2FA (Google Authenticator).
5. **Zero Maintenance Server:** Menggunakan Firebase dan Vercel (Gratis).

---

## 🛠️ Persiapan & Instalasi

### 1. Kloning & Install
```bash
git clone https://github.com/Frtsnts10/Household-OTP-Netflix.git
cd Household-OTP-Netflix
npm run install:all
```

### 2. Setup Firebase (Wajib)
Aplikasi ini membutuhkan proyek Firebase pada **Paket Blaze** (Pay as you go).
1. Buat proyek di [Firebase Console](https://console.firebase.google.com).
2. Aktifkan **Firestore Database**.
3. *Upgrade* ke paket Blaze (Gratis hingga batas wajar).

#### Konfigurasi Frontend (Web)
Buat file `app/.env` dan masukkan data rahasia berikut:
```env
NEXTAUTH_SECRET=RahasiaSuperAman123!
NEXTAUTH_URL=http://localhost:3001

# Firebase Client Configuration (Didapat dari Project Settings -> Web App)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
```

#### Setup Firebase CLI & Deploy Backend
Untuk menjalankan Cron Job penarik OTP, Anda harus men-*deploy* foldernya ke Cloud Functions:
```bash
firebase login
firebase init functions # (pilih proyek Anda)
npm run deploy --prefix functions
```

---

## 💻 Menjalankan Secara Lokal (Development)

Untuk mengembangkan aplikasi di komputer Anda:
```bash
npm run dev
```
Buka browser di `http://localhost:3001`. Anda bisa mendaftar (Register) langsung dari web.

---

## 🌍 Cara Deploy ke Vercel (Produksi)

Bagian antarmuka pengguna (Frontend) 100% kompatibel dengan Vercel.
1. Hubungkan repository GitHub ini ke Vercel.
2. Atur **Root Directory** ke `app`.
3. Salin semua Environment Variables dari `app/.env` ke dalam pengaturan Vercel.
4. Deploy! Aplikasi Anda sudah *online* 24 jam tanpa perlu memikirkan VPS.
