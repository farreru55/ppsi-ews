# Early Warning System (EWS) Keterlambatan Kelulusan Mahasiswa - Backend REST API

Backend REST API untuk sistem pendukung keputusan (Decision Support System) **Early Warning System (EWS) Keterlambatan Kelulusan Mahasiswa** Universitas Dinamika berbasis **Node.js + Express.js + TypeScript + PostgreSQL**, 
---

## 1. Fitur Utama

- **Multi-Factor Risk Scoring Engine (BRL-01, BRL-02, BRL-03)**:
  - 4 Pilar: Tugas Akhir (40%), Akademik (30%), Non-Akademik/SSKM (15%), Keuangan (15%).
  - Klasifikasi: Hijau (0–39), Kuning (40–69), Merah (70–100).
  - Normalisasi bobot dinamis jika pilar data tidak lengkap atau mahasiswa belum mengambil TA aktif.
- **Aturan Override & Batas Bawah**:
  - **BRL-04**: TA diperpanjang $\ge 2$ semester DAN SSKM di bawah ambang batas prodi $\rightarrow$ **Merah/Red Alert** otomatis.
  - **BRL-09**: Sisa masa studi $\le 2$ semester $\rightarrow$ minimal **Kuning**.
  - **BRL-08**: Tunggakan UKT yang memblokir ujian/sidang $\rightarrow$ minimal **Kuning**.
- **Pelacakan Milestone TA & Deteksi Kemacetan (FR3, BRL-05)**:
  - Pelacakan alur: Proposal $\rightarrow$ Sempro $\rightarrow$ Bimbingan Rutin $\rightarrow$ Semhas $\rightarrow$ Sidang $\rightarrow$ Bebas Pustaka $\rightarrow$ Yudisium.
  - Validasi syarat minimal 8 bimbingan terverifikasi.
  - Deteksi bimbingan macet/pasif $> 30$ hari sejak log terakhir.
- **Monitoring Akademik & Presensi (FR11, FR12, BRL-06)**:
  - Peringatan dini presensi perkuliahan $< 75\%$ atau alpha $> 2\times$.
  - Checklist Yudisium otomatis: Bebas nilai E, skor TOEFL standar, Bebas Pustaka, kelulusan Smart Laboratory.
- **Privasi Keuangan (BRL-14)**:
  - Sistem hanya mengembalikan status `LUNAS` atau `MENUNGGAK` tanpa pernah menampilkan nominal rupiah.
- **Eskalasi Berjenjang (BRL-11)**:
  - Status tidak membaik dalam $N = 3$ hari kerja $\rightarrow$ eskalasi Level 1 ke Dosen Wali.
  - Tidak direspons dalam $M = 14$ hari $\rightarrow$ eskalasi Level 2 ke Kaprodi.
- **Notifikasi Multi-Kanal dengan Failover (BRL-10, FR4)**:
  - Pengiriman via WhatsApp Gateway (Fonnte/Wablas) dengan fallback otomatis ke Email SMTP (Nodemailer).
- **Akuntabilitas & Append-Only (BRL-16)**:
  - Tabel `risk_score`, `counseling_log`, dan `audit_log` diproteksi trigger PostgreSQL penolak `DELETE` dan `UPDATE`.
- **Integrasi Ekosistem Smart University (BRL-04, FR10)**:
  - Outbound Webhook ke AI Academic Advisor dengan tanda tangan HMAC-SHA256 (`risk.threshold_reached`).
  - Webhook Receiver dari AI Academic Advisor untuk memasukkan rekomendasi action plan.
  - Inbound REST API untuk Smart Scheduling (`/integration/students/at-risk-courses`) dan University Dashboard (`/integration/analytics/aggregate`).

---

## 2. Struktur Proyek

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts             # Pool koneksi pg & query helper
│   │   └── environment.ts          # Typed environment variables
│   ├── database/
│   │   ├── schema.sql              # DDL 26 tabel, view analitik, trigger PostgreSQL
│   │   ├── migrate.ts              # Script eksekusi DDL migrasi
│   │   └── seed.ts                 # Seeder data realistis 6 mahasiswa & 4 peran dosen
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # Verifikasi JWT bearer token
│   │   ├── role.middleware.ts      # Verifikasi peran RBAC
│   │   ├── scope.middleware.ts     # Enforce cakupan data BRL-13
│   │   ├── api-key.middleware.ts   # Autentikasi API Key ekosistem Smart University
│   │   ├── rate-limit.middleware.ts# Lockout 15 menit setelah 5 kali gagal login
│   │   └── error.middleware.ts     # Global error handler
│   ├── modules/
│   │   ├── auth/                   # Login, refresh token, profil akun
│   │   ├── students/               # Detail risiko mhs, advisees dosen wali
│   │   ├── risk/                   # Multi-Factor Risk Scoring Engine
│   │   ├── milestones/             # Tracking tahap TA & log bimbingan
│   │   ├── academic/               # Presensi, IPK, SKS, nilai E, TOEFL, yudisium
│   │   ├── finance/                # Status pelunasan UKT (BRL-14)
│   │   ├── counseling/             # Form & log konseling dosen (append-only)
│   │   ├── action-plans/           # Action plan AI/Dosen & update status mhs
│   │   ├── notifications/          # Notifikasi failover WA -> Email
│   │   ├── escalations/            # Antrean eskalasi N=3 dan M=14 hari
│   │   ├── analytics/              # Agregat KTW prodi & ekspor laporan PDF/Excel
│   │   ├── configuration/          # Konfigurasi bobot, threshold, aturan per prodi
│   │   └── audit/                  # Riwayat audit log sistem (append-only)
│   ├── jobs/
│   │   ├── scan.job.ts             # Scheduler pemindaian otomatis berkala
│   │   └── escalation.job.ts       # Scheduler evaluasi eskalasi harian
│   ├── integrations/
│   │   ├── whatsapp/               # Adapter gateway WhatsApp
│   │   ├── email/                  # Adapter SMTP Nodemailer
│   │   └── ai-advisor/             # Dispatcher webhook AI Advisor (HMAC-SHA256)
│   ├── utils/
│   │   ├── jwt.util.ts
│   │   ├── hmac.util.ts
│   │   ├── response.util.ts
│   │   └── logger.util.ts
│   ├── app.ts                      # Express app setup
│   ├── server.ts                   # Server bootstrap & cron initializer
│   └── test-api.ts                 # Automated test suite (33 skenario pengujian)
├── .env.example
├── .env
├── package.json
└── tsconfig.json
```

---

## 3. Akun Pengguna untuk Pengujian

Semua akun di bawah menggunakan kata sandi: `password123`

| Username | Peran | Deskripsi |
|---|---|---|
| `admin` | `ADMIN` | Administrator EWS & konfigurasi rule |
| `kaprodi.si` | `KAPRODI` | Dr. Teguh Sutanto, M.Kom (Kaprodi S1 SI) |
| `koord.ta` | `KOORD_TA` | Anik Vega Vitianingsih, M.T (Koordinator TA) |
| `doswal.bagus` | `DOSEN_WALI`, `DOSBING_TA` | Bagus Satrio Wicaksono, M.Kom (Dosen Wali & Pembimbing) |
| `26410105001` | `MAHASISWA` | Bagus Tilas H. (Status **HIJAU** / Aman, IPK 3.85, SSKM 180) |
| `24410100007` | `MAHASISWA` | Michael C. (Status **MERAH** / Red Alert Override BRL-04) |
| `24410100016` | `MAHASISWA` | Farrel Endra A. (Status **KUNING** / BRL-09 Sisa studi $\le 2$ sem) |
| `24410100013` | `MAHASISWA` | Novian Ardi Z. (Status **KUNING** / Presensi $< 75\%$ & alpha $> 2\times$) |
| `24410100015` | `MAHASISWA` | Dimitri Yusuf P. (Status **KUNING** / Bimbingan macet 45 hari) |
| `24410100017` | `MAHASISWA` | Rafi Firdaus F. (Status **KUNING** / Tunggakan UKT blokir sidang) |

---

## 4. Cara Menjalankan

### Persyaratan:
- Node.js v18+ (teruji pada Node.js v26)
- PostgreSQL 14+ (teruji pada PostgreSQL 18 di `localhost:5432`)

### Langkah Menjalankan:
1. Pastikan PostgreSQL berjalan dan database `ews_db` telah dibuat.
2. Atur kredensial pada `.env` (default: host localhost, user `postgres`, password `root`, database `ews_db`).
3. Jalankan migrasi basis data (membuat 26 tabel, view, dan trigger):
   ```bash
   npm run migrate
   ```
4. Jalankan seeder basis data:
   ```bash
   npm run seed
   ```
5. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
   Atau build dan jalankan versi produksi:
   ```bash
   npm run build
   npm start
   ```
6. Jalankan pengujian integrasi otomatis (33 skenario test):
   ```bash
   npm run test:api
   ```

---

## 5. Ringkasan Endpoint Inti

Base URL: `http://localhost:5000/api/v1`

| Method | Endpoint | Hak Akses | Keterangan |
|---|---|---|---|
| `GET` | `/health` | Publik | Status uptime server EWS |
| `POST` | `/api/v1/auth/login` | Publik | Autentikasi JWT & refresh token (lockout 15m jika 5x gagal) |
| `POST` | `/api/v1/auth/refresh` | Publik | Perpanjangan access token |
| `GET` | `/api/v1/auth/me` | Semua Peran | Profil akun pengguna yang sedang login |
| `GET` | `/api/v1/students/me/risk` | `MAHASISWA` | Skor total, gauge status, dan 4 pilar pribadi |
| `GET` | `/api/v1/advisees` | `DOSEN_WALI`, `DOSBING_TA` | Matriks mahasiswa bimbingan at-risk (Kuning & Merah) |
| `GET` | `/api/v1/students/:id/risk` | Sesuai Scoping RBAC | Detail pemicu, riwayat tren, presensi, UKT |
| `GET` | `/api/v1/students/:id/milestones` | Sesuai Scoping RBAC | Milestone TA, status macet $> 30$ hari, validasi $\ge 8$ bimbingan |
| `POST` | `/api/v1/students/:id/counseling` | Dosen Terkait | Mencatat hasil konseling (append-only) |
| `GET` | `/api/v1/action-plans/:id` | Mhs / Dosen / Admin | Detail action plan perbaikan |
| `PATCH` | `/api/v1/action-plans/:id` | Mhs / Dosen / Admin | Memperbarui status pelaksanaan action plan |
| `GET` | `/api/v1/escalations` | Dosen / Kaprodi / Admin | Antrean kasus Red Alert / evaluasi N & M hari |
| `PATCH` | `/api/v1/escalations/:id` | Kaprodi / Dosen / Admin | Mencatat tindak lanjut kasus eskalasi |
| `GET` | `/api/v1/analytics/ktw` | `KAPRODI`, `KOORD_TA`, `ADMIN` | Kesehatan KTW prodi & bottleneck analytics |
| `GET` | `/api/v1/reports/export` | `KAPRODI`, `ADMIN` | Ekspor laporan eksekutif PDF / Excel |
| `GET` | `/api/v1/config` | `ADMIN`, `KAPRODI` | Membaca konfigurasi bobot, ambang batas, N, M |
| `PUT` | `/api/v1/config` | `ADMIN` | Mengubah bobot & ambang batas tanpa re-deploy |
| `POST` | `/api/v1/scans` | `ADMIN` | Menjalankan pemindaian manual (202 Accepted) |
| `GET` | `/api/v1/audit-logs` | `ADMIN` | Jejak audit aktivitas pengguna (append-only) |
| `GET` | `/api/v1/integration/analytics/aggregate` | API Key | Data agregat untuk University Dashboard |
| `GET` | `/api/v1/integration/students/at-risk-courses` | API Key | Daftar mahasiswa berisiko untuk Smart Scheduling |
| `POST` | `/api/v1/integration/webhooks/ai-advisor` | HMAC Signature | Menerima rekomendasi action plan dari AI Advisor |
