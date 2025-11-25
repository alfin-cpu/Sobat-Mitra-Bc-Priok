# 🚀 IZIN KELUAR KANTOR MITRA KPU BC TANJUNG PRIOK

Sistem absensi berbasis Single Page Application (SPA) yang dibangun menggunakan React dan terintegrasi penuh dengan Google Apps Script sebagai backend (Database Google Sheets).

## 💡 Fitur Utama

1.  Absensi Masuk & Keluar dengan validasi Waktu.
2.  Pengambilan Foto Selfie (Wajib).
3.  Validasi Lokasi GPS (Wajib).
4.  Dashboard Server (Admin & PKD) untuk melihat riwayat dan ekspor data.
5.  Otomatisasi penyimpanan data ke Google Sheets (Attendances Sheet).

## 🛠️ Stack Teknologi

* Frontend: React (Create React App), Tailwind CSS
* Backend: Google Apps Script (GAS)
* Database: Google Sheets
* Deployment: Netlify

## ⚙️ Cara Deploy (Untuk Pengembang)

1.  **Siapkan Database:** Deploy Google Apps Script dan dapatkan URL-nya.
2.  **Konfigurasi Frontend:** Ganti `GOOGLE_SCRIPT_URL` di `src/AttendanceSystem.js` dengan URL yang didapat dari GAS.
3.  **Deployment:** Deploy folder proyek ini ke Netlify.

## 🔑 Kredensial Default

* Admin User: `admin`
* Admin Pass: `admin123`
* PKD User: `pkd`
* PKD Pass: `pkd123`
