-- =====================================================================
-- EWS Keterlambatan Kelulusan Mahasiswa - SEEDER (data dummy untuk development)
-- Jalankan SETELAH schema.sql pada database kosong:
--   psql -U postgres -d ews -f schema.sql
--   psql -U postgres -d ews -f seed.sql
-- Untuk seed ulang: DROP SCHEMA public CASCADE; CREATE SCHEMA public; lalu jalankan keduanya lagi.
--
-- AKUN DEMO (semua password: password123)
--   admin               -> ADMIN
--   kaprodi_si / kaprodi_tk / kaprodi_dkv / kaprodi_mnj -> KAPRODI (+ DOSEN_WALI, DOSBING_TA)
--   koordta             -> KOORD_TA (+ DOSEN_WALI, DOSBING_TA)
--   dosen03, dosen05, ... dosen12 -> DOSEN_WALI, DOSBING_TA
--   <NIM mahasiswa aktif>, contoh 24410100001 -> MAHASISWA
-- =====================================================================

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT setseed(0.42);

-- ---------------------------------------------------------------------
-- 1. MASTER
-- ---------------------------------------------------------------------
INSERT INTO program_studi (kode_prodi, nama_prodi, fakultas) VALUES
  ('SI',  'S1 Sistem Informasi',            'Fakultas Teknologi dan Informatika'),
  ('TK',  'S1 Teknik Komputer',             'Fakultas Teknologi dan Informatika'),
  ('DKV', 'S1 Desain Komunikasi Visual',    'Fakultas Desain dan Industri Kreatif'),
  ('MNJ', 'S1 Manajemen',                   'Fakultas Ekonomi dan Bisnis');

INSERT INTO semester (tahun_ajaran, jenis_semester, tgl_mulai, tgl_selesai, is_aktif) VALUES
  ('2024/2025','GANJIL','2024-09-01','2025-01-31', FALSE),
  ('2024/2025','GENAP', '2025-02-17','2025-07-31', FALSE),
  ('2025/2026','GANJIL','2025-09-01','2026-01-31', FALSE),
  ('2025/2026','GENAP', '2026-02-16','2026-07-31', FALSE),
  ('2026/2027','GANJIL','2026-08-24','2027-01-15', TRUE);

INSERT INTO mata_kuliah (kode_mk, nama_mk, sks) VALUES
  ('MK01','Basis Data',3),('MK02','Pemrograman Web',3),('MK03','Analisis dan Perancangan Sistem',3),
  ('MK04','Manajemen Proyek TI',3),('MK05','Statistika',2),('MK06','Jaringan Komputer',3),
  ('MK07','Rekayasa Perangkat Lunak',3),('MK08','Kecerdasan Buatan',3),
  ('MK09','Etika Profesi',2),('MK10','Kewirausahaan',2);

INSERT INTO dosen (nidn, nama, prodi_id, email, no_wa)
SELECT '07120588' || lpad(i::text, 2, '0'),
       (ARRAY['Dr. Ahmad Fauzi, M.Kom.','Ir. Siti Rahayu, M.T.','Dr. Budi Hartono, M.Si.',
              'Dr. Rina Kartika, M.Kom.','Hendra Gunawan, M.T.','Dewi Anggraini, M.Sc.',
              'Dr. Yusuf Maulana, M.Des.','Lina Marlina, M.Ds.','Agus Prasetyo, M.Sn.',
              'Dr. Wahyu Nugraha, M.M.','Fitri Handayani, M.M.','Rudi Hermawan, M.Ak.'])[i],
       ((i - 1) / 3) + 1,
       'dosen' || lpad(i::text, 2, '0') || '@dinamika.ac.id',
       '0813' || lpad((5000000 + i * 137)::text, 8, '0')
FROM generate_series(1, 12) i;

-- 240 mahasiswa: 4 prodi x 4 angkatan (2021-2024) x 15. Angkatan 2021 nomor >13 = sudah lulus
WITH nm AS (
  SELECT ARRAY['Aditya','Bagas','Citra','Dewi','Eko','Fajar','Gita','Hana','Indra','Joko',
               'Kiki','Lestari','Mega','Nanda','Oki','Putri','Rizki','Sari','Tegar','Wulan'] AS f,
         ARRAY['Pratama','Saputra','Wijaya','Kusuma','Santoso','Hidayat','Nugroho','Lestari',
               'Permana','Setiawan','Ramadhan','Firmansyah'] AS l
)
INSERT INTO mahasiswa (nim, nama, prodi_id, tgl_masuk, status_aktif, no_wa, email)
SELECT x.nim, x.nama, p, make_date(a, 9, 1), NOT (a = 2021 AND n > 13),
       '0812' || lpad((20000000 + (a % 100) * 100000 + p * 1000 + n)::text, 8, '0'),
       x.nim || '@student.dinamika.ac.id'
FROM nm, generate_series(1,4) AS p, generate_series(2021,2024) AS a, generate_series(1,15) AS n,
     LATERAL (SELECT (a % 100)::text || '41' || lpad(p::text, 2, '0') || lpad(n::text, 5, '0') AS nim,
                     f[1 + ((p*7 + a*3 + n*5) % 20)] || ' ' || l[1 + ((p*5 + a + n*11) % 12)] AS nama) x;

-- profil laten per mahasiswa (hanya untuk generate data; makin tinggi lat = makin berisiko)
CREATE TEMP TABLE tmp_prof ON COMMIT DROP AS
SELECT nim, EXTRACT(YEAR FROM tgl_masuk)::int AS a, prodi_id,
       power(random(), 0.7) AS lat, (random() - 0.5) * 0.3 AS drift
FROM mahasiswa;

-- Dosen Wali untuk semua mahasiswa
INSERT INTO relasi_bimbingan (nim, nidn, jenis_relasi, tgl_mulai, tgl_selesai)
SELECT m.nim, d.nidn, 'DOSEN_WALI', m.tgl_masuk,
       CASE WHEN m.status_aktif THEN NULL ELSE date '2025-08-31' END
FROM mahasiswa m
JOIN dosen d ON d.nidn = '07120588' || lpad((((m.prodi_id - 1) * 3) + 1 + (substr(m.nim, 7)::int % 3))::text, 2, '0');

-- Dosen Pembimbing TA/KP untuk angkatan 2021-2023
INSERT INTO relasi_bimbingan (nim, nidn, jenis_relasi, tgl_mulai, tgl_selesai)
SELECT m.nim, d.nidn, 'DOSBING_TA',
       CASE p.a WHEN 2021 THEN date '2024-09-01' WHEN 2022 THEN date '2025-09-01' ELSE date '2026-02-16' END,
       CASE WHEN m.status_aktif THEN NULL ELSE date '2025-07-15' END
FROM mahasiswa m
JOIN tmp_prof p ON p.nim = m.nim
JOIN dosen d ON d.nidn = '07120588' || lpad((((m.prodi_id - 1) * 3) + 1 + ((substr(m.nim, 7)::int + 1) % 3))::text, 2, '0')
WHERE p.a <= 2023;

-- ---------------------------------------------------------------------
-- 2. USERS & ROLES
-- ---------------------------------------------------------------------
CREATE TEMP TABLE tmp_pw ON COMMIT DROP AS SELECT crypt('password123', gen_salt('bf', 8)) AS h;

INSERT INTO users (username, password_hash, nim, nidn)
SELECT 'admin', h, NULL, NULL FROM tmp_pw;

INSERT INTO users (username, password_hash, nim, nidn)
SELECT CASE WHEN i IN (1,4,7,10) THEN 'kaprodi_' || lower(ps.kode_prodi)
            WHEN i = 2 THEN 'koordta'
            ELSE 'dosen' || lpad(i::text, 2, '0') END,
       pw.h, NULL, d.nidn
FROM dosen d
JOIN program_studi ps ON ps.prodi_id = d.prodi_id
CROSS JOIN tmp_pw pw,
LATERAL (SELECT substr(d.nidn, 9)::int AS i) z
ORDER BY d.nidn;

INSERT INTO users (username, password_hash, nim, nidn)
SELECT m.nim, pw.h, m.nim, NULL
FROM mahasiswa m CROSS JOIN tmp_pw pw
WHERE m.status_aktif
ORDER BY m.nim;

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u
JOIN roles r ON (
     (u.username = 'admin'            AND r.nama_role = 'ADMIN')
  OR (u.nim  IS NOT NULL              AND r.nama_role = 'MAHASISWA')
  OR (u.nidn IS NOT NULL              AND r.nama_role IN ('DOSEN_WALI','DOSBING_TA'))
  OR (u.username LIKE 'kaprodi\_%'    AND r.nama_role = 'KAPRODI')
  OR (u.username = 'koordta'          AND r.nama_role = 'KOORD_TA'));

UPDATE users SET last_login = timestamp '2026-11-24 08:00' - random() * interval '10 days';

-- Override konfigurasi per prodi (contoh): TOEFL Teknik Komputer lebih tinggi
INSERT INTO config_rule (prodi_id, parameter, nilai, versi, is_aktif, diubah_oleh)
VALUES (2, 'BATAS_TOEFL', 450, 1, TRUE, (SELECT user_id FROM users WHERE username = 'admin'));

-- ---------------------------------------------------------------------
-- 3. TUGAS AKHIR / KP, MILESTONE, BIMBINGAN
-- ---------------------------------------------------------------------
INSERT INTO tugas_akhir (nim, jenis_ta, judul, semester_mulai_id, jml_perpanjangan, tgl_batas, tgl_bebas_pustaka)
SELECT p.nim, j.jenis,
       CASE WHEN j.jenis = 'KP' THEN 'Kerja Praktik - ' ELSE '' END || j.judul,
       j.sem, j.perp,
       (j.sd + ((CASE WHEN j.jenis = 'TA' THEN 12 ELSE 6 END) + 6 * j.perp) * interval '1 month')::date,
       CASE WHEN NOT m.status_aktif THEN date '2025-07-15' END
FROM tmp_prof p
JOIN mahasiswa m ON m.nim = p.nim,
LATERAL (SELECT CASE WHEN p.a <= 2022 THEN 'TA' ELSE 'KP' END AS jenis,
                CASE p.a WHEN 2021 THEN 1 WHEN 2022 THEN 3 ELSE 4 END AS sem,
                CASE p.a WHEN 2021 THEN date '2024-09-01' WHEN 2022 THEN date '2025-09-01' ELSE date '2026-02-16' END AS sd,
                CASE WHEN p.a = 2021 AND m.status_aktif THEN 1 + (p.lat > 0.7)::int ELSE 0 END AS perp,
                (ARRAY['Sistem Informasi Penjualan Berbasis Web','Aplikasi Monitoring Produksi Berbasis IoT',
                       'Analisis Sentimen Ulasan Pelanggan','Sistem Pendukung Keputusan Pemilihan Supplier',
                       'Dashboard Business Intelligence Penjualan','Aplikasi Mobile Pelayanan Akademik',
                       'Sistem Informasi Inventaris Gudang','Prediksi Kelulusan Mahasiswa dengan Machine Learning'])
                  [1 + (substr(p.nim, 7)::int % 8)] AS judul) j
WHERE p.a <= 2023;

CREATE TEMP TABLE tmp_ta ON COMMIT DROP AS
SELECT x.*, GREATEST(0, LEAST(12, CASE WHEN NOT x.active THEN 10
                                       ELSE floor(x.done * 1.6 + random() * 2 - x.lat * 2)::int END)) AS n
FROM (
  SELECT t.ta_id, t.nim, p.a, p.lat, m.status_aktif AS active, s.sd AS start_date,
         CASE WHEN m.status_aktif THEN date '2026-11-20' ELSE date '2025-07-01' END AS endref,
         CASE WHEN t.jenis_ta = 'KP' THEN 3 ELSE 7 END AS maxst,
         CASE WHEN NOT m.status_aktif THEN (CASE WHEN t.jenis_ta = 'KP' THEN 3 ELSE 7 END)
              ELSE LEAST(CASE WHEN t.jenis_ta = 'KP' THEN 3 ELSE 7 END,
                         GREATEST(1, floor(((date '2026-11-25' - s.sd) / 182.0) * 3 * (1.1 - p.lat))::int)) END AS done
  FROM tugas_akhir t
  JOIN tmp_prof p ON p.nim = t.nim
  JOIN mahasiswa m ON m.nim = t.nim,
  LATERAL (SELECT CASE p.a WHEN 2021 THEN date '2024-09-01' WHEN 2022 THEN date '2025-09-01' ELSE date '2026-02-16' END AS sd) s
) x;

INSERT INTO ta_milestone (ta_id, tahap, tgl_mulai, tgl_selesai, status)
SELECT ta.ta_id,
       (ARRAY['PROPOSAL','SEMPRO','BIMBINGAN','SEMHAS','SIDANG','BEBAS_PUSTAKA','YUDISIUM'])[i],
       LEAST(ta.start_date + (i - 1) * 45, date '2026-11-20'),
       CASE WHEN i <= ta.done THEN LEAST(ta.start_date + (i - 1) * 45 + 40, date '2026-11-20') END,
       CASE WHEN i <= ta.done THEN 'SELESAI' WHEN ta.lat > 0.7 THEN 'TERTUNDA' ELSE 'BERJALAN' END
FROM tmp_ta ta, generate_series(1, 7) i
WHERE i <= LEAST(ta.done + 1, ta.maxst);

INSERT INTO bimbingan_log (ta_id, nidn, tgl_bimbingan, topik, terverifikasi)
SELECT ta.ta_id, rb.nidn,
       ta.start_date + (floor(k * ((ta.endref - ta.start_date) * (1 - 0.6 * ta.lat) / NULLIF(ta.n, 0))))::int,
       (ARRAY['Konsultasi judul dan latar belakang','Revisi Bab 1-2','Review desain sistem',
              'Progres implementasi','Revisi Bab 3-4','Persiapan seminar','Pengujian sistem','Finalisasi laporan'])
         [1 + (k % 8)],
       random() > 0.15
FROM tmp_ta ta
JOIN relasi_bimbingan rb ON rb.nim = ta.nim AND rb.jenis_relasi = 'DOSBING_TA',
LATERAL generate_series(1, ta.n) k;

-- ---------------------------------------------------------------------
-- 4. SCAN RUN + SNAPSHOT
-- ---------------------------------------------------------------------
INSERT INTO scan_run (semester_id, jenis_scan_run, waktu_mulai, waktu_selesai, status) VALUES
  (4, 'TENGAH', '2026-04-06 01:00', '2026-04-06 01:42', 'SELESAI'),
  (4, 'AKHIR',  '2026-07-06 01:00', '2026-07-06 01:55', 'SEBAGIAN'),
  (5, 'TENGAH', '2026-11-02 01:00', '2026-11-02 01:48', 'SELESAI');

CREATE TEMP TABLE tmp_snap ON COMMIT DROP AS
WITH base AS (
  SELECT s.scan_id, s.waktu_selesai AS wk, p.nim, p.a, p.prodi_id,
         (2 * (EXTRACT(YEAR FROM s.waktu_selesai)::int - p.a)
            + CASE WHEN EXTRACT(MONTH FROM s.waktu_selesai) >= 8 THEN 1 ELSE 0 END) AS sem_ke,
         LEAST(1, GREATEST(0, p.lat + p.drift * (s.scan_id - 2) + (random() - 0.5) * 0.1)) AS lat
  FROM scan_run s
  CROSS JOIN tmp_prof p
  JOIN mahasiswa m ON m.nim = p.nim
  WHERE m.status_aktif
), b2 AS (
  SELECT base.*,
         round(GREATEST(1.5, LEAST(4.0, 3.7 - 1.7 * lat + (random() - 0.5) * 0.3))::numeric, 2) AS ipk,
         floor(lat * 5 * random())::int AS d,
         CASE WHEN lat > 0.6 THEN floor(random() * 3)::int ELSE 0 END AS e,
         floor(lat * 4 * random())::int AS ev,
         CASE WHEN random() < lat * 0.3 THEN 'MENUNGGAK' ELSE 'LUNAS' END AS ukt
  FROM base
)
SELECT scan_id, wk, nim, a, prodi_id, sem_ke, lat, ipk, d, e, ev, ukt,
       LEAST(144, round(sem_ke * 20 * (0.7 + 0.3 * (1 - lat))))::smallint AS sks,
       CASE WHEN sem_ke >= 6 AND random() > lat THEN (400 + floor(random() * 200))::int END AS toefl,
       GREATEST(0, 14 - sem_ke) AS sisa,
       (round(sem_ke * 15 * (1.2 - lat)) + floor(random() * 10))::int AS poin,
       (ukt = 'MENUNGGAK' AND sem_ke >= 7) AS blok
FROM b2;

INSERT INTO snapshot_mahasiswa
  (scan_id, nim, sks_lulus, ipk, jml_nilai_d, jml_nilai_e, skor_toefl, sisa_masa_studi,
   total_poin_sskm, jml_event_wajib_terlewat, status_ukt, memblokir_pendaftaran)
SELECT scan_id, nim, sks, ipk, d, e, toefl, sisa, poin, ev, ukt, blok
FROM tmp_snap;

INSERT INTO presensi_matkul (scan_id, nim, kode_mk, jml_pertemuan, jml_hadir)
SELECT s.scan_id, s.nim,
       'MK' || lpad((((substr(s.nim, 7)::int + s.prodi_id + i) % 10) + 1)::text, 2, '0'),
       q.pert,
       GREATEST(0, q.pert - floor(random() * s.lat * q.pert * 0.6)::int)
FROM tmp_snap s, generate_series(0, 3) i,
     LATERAL (SELECT CASE WHEN s.scan_id = 2 THEN 14 ELSE 7 END AS pert) q;

INSERT INTO progres_praktikum (scan_id, nim, kode_praktikum, status_lulus, jml_penggunaan_lab)
SELECT scan_id, nim, 'PRK-' || lpad(i::text, 2, '0'), random() > lat * 0.5, floor(random() * 40)::int
FROM tmp_snap, generate_series(1, 2) i
WHERE sem_ke BETWEEN 2 AND 8;

-- ---------------------------------------------------------------------
-- 5. RISK SCORE (dihitung dari snapshot + bobot config_rule aktif)
-- ---------------------------------------------------------------------
WITH w AS (
  SELECT (SELECT nilai FROM config_rule WHERE parameter='BOBOT_TA'       AND prodi_id IS NULL AND is_aktif) AS wta,
         (SELECT nilai FROM config_rule WHERE parameter='BOBOT_AKADEMIK' AND prodi_id IS NULL AND is_aktif) AS wak,
         (SELECT nilai FROM config_rule WHERE parameter='BOBOT_SSKM'     AND prodi_id IS NULL AND is_aktif) AS wsskm,
         (SELECT nilai FROM config_rule WHERE parameter='BOBOT_KEUANGAN' AND prodi_id IS NULL AND is_aktif) AS wkeu,
         (SELECT nilai FROM config_rule WHERE parameter='BATAS_KUNING'   AND prodi_id IS NULL AND is_aktif) AS kuning,
         (SELECT nilai FROM config_rule WHERE parameter='BATAS_MERAH'    AND prodi_id IS NULL AND is_aktif) AS merah
), pres AS (
  SELECT scan_id, nim, MIN(100.0 * jml_hadir / NULLIF(jml_pertemuan, 0)) AS minp
  FROM presensi_matkul GROUP BY scan_id, nim
), calc AS (
  SELECT s.*, pr.minp,
         CASE WHEN s.a <= 2023 THEN round(LEAST(100, s.lat * 90 + random() * 10)::numeric, 2) END AS ta,
         round(LEAST(100, (4 - s.ipk) * 20 + s.d * 5 + s.e * 15
                          + CASE WHEN COALESCE(pr.minp, 100) < 75 THEN 10 ELSE 0 END)::numeric, 2) AS ak,
         round(LEAST(100, s.ev * 20 + GREATEST(0, 100 - s.poin) * 0.5)::numeric, 2) AS nonak,
         (CASE WHEN s.ukt = 'MENUNGGAK' THEN 100 ELSE 0 END)::numeric AS keu
  FROM tmp_snap s
  LEFT JOIN pres pr ON pr.scan_id = s.scan_id AND pr.nim = s.nim
)
INSERT INTO risk_score
  (scan_id, nim, skor_ta, skor_akademik, skor_nonakademik, skor_keuangan, skor_total,
   status, override_red, data_tidak_lengkap, detail_pemicu, tgl_hitung)
SELECT c.scan_id, c.nim, c.ta, c.ak, c.nonak, c.keu, t.total,
       CASE WHEN c.blok OR c.sisa <= 1 THEN 'MERAH'
            WHEN t.total >= w.merah    THEN 'MERAH'
            WHEN t.total >= w.kuning   THEN 'KUNING'
            ELSE 'HIJAU' END,
       ((c.blok OR c.sisa <= 1) AND t.total < w.merah),
       (c.scan_id = 2 AND c.ta IS NOT NULL),
       jsonb_build_object('indikator', to_jsonb(array_remove(ARRAY[
           CASE WHEN c.ipk < 2.5          THEN 'IPK_RENDAH' END,
           CASE WHEN c.e > 0              THEN 'NILAI_E' END,
           CASE WHEN c.ukt = 'MENUNGGAK'  THEN 'TUNGGAKAN_UKT' END,
           CASE WHEN c.blok               THEN 'PEMBLOKIRAN_PENDAFTARAN' END,
           CASE WHEN c.ev >= 2            THEN 'EVENT_WAJIB_TERLEWAT' END,
           CASE WHEN COALESCE(c.minp,100) < 75 THEN 'PRESENSI_RENDAH' END,
           CASE WHEN c.ta >= 60           THEN 'TA_TERHAMBAT' END
         ], NULL))),
       c.wk
FROM calc c
CROSS JOIN w
CROSS JOIN LATERAL (
  SELECT round((COALESCE(c.ta * w.wta, 0) + c.ak * w.wak + c.nonak * w.wsskm + c.keu * w.wkeu)
               / (CASE WHEN c.ta IS NULL THEN 0 ELSE w.wta END + w.wak + w.wsskm + w.wkeu), 2) AS total
) t;

UPDATE scan_run SET jml_mahasiswa = (SELECT COUNT(*) FROM snapshot_mahasiswa x WHERE x.scan_id = scan_run.scan_id);

-- ---------------------------------------------------------------------
-- 6. TINDAK LANJUT: action plan, notifikasi, konseling (scan terbaru = 3)
-- ---------------------------------------------------------------------
INSERT INTO action_plan (risk_id, sumber, deskripsi, status, tgl_target, tgl_dibuat)
SELECT r.risk_id, 'AI_ADVISOR',
       CASE r.detail_pemicu -> 'indikator' ->> 0
         WHEN 'IPK_RENDAH'              THEN 'Ikuti pendampingan akademik dan perbaiki mata kuliah dengan nilai rendah semester ini.'
         WHEN 'NILAI_E'                 THEN 'Daftarkan perbaikan nilai E pada semester berjalan agar memenuhi syarat yudisium.'
         WHEN 'TUNGGAKAN_UKT'           THEN 'Selesaikan administrasi keuangan agar pendaftaran ujian/sidang tidak terblokir.'
         WHEN 'PEMBLOKIRAN_PENDAFTARAN' THEN 'Hubungi bagian keuangan untuk membuka blokir pendaftaran ujian/sidang.'
         WHEN 'EVENT_WAJIB_TERLEWAT'    THEN 'Ikuti event wajib kemahasiswaan berikutnya untuk memenuhi poin SSKM.'
         WHEN 'PRESENSI_RENDAH'         THEN 'Tingkatkan kehadiran perkuliahan hingga minimal 75% pada mata kuliah terkait.'
         WHEN 'TA_TERHAMBAT'            THEN 'Jadwalkan bimbingan TA rutin setiap 2 minggu dan susun target milestone bulanan.'
         ELSE 'Konsultasikan rencana studi dengan Dosen Wali.' END,
       'BELUM', date '2026-12-15', timestamp '2026-11-02 02:10'
FROM risk_score r
WHERE r.scan_id = 3 AND r.status IN ('KUNING','MERAH');

INSERT INTO action_plan (risk_id, sumber, deskripsi, status, tgl_target, tgl_dibuat)
SELECT r.risk_id, 'DOSEN', 'Konseling tatap muka dan penyusunan jadwal penyelesaian studi.',
       CASE WHEN random() > 0.5 THEN 'PROSES' ELSE 'BELUM' END,
       date '2026-12-01', timestamp '2026-11-04 09:00'
FROM risk_score r
WHERE r.scan_id = 3 AND r.status = 'MERAH';

-- Notifikasi periodik ke mahasiswa (Kuning/Merah), sebagian gagal WA -> fallback email
INSERT INTO notifikasi (risk_id, penerima_user_id, jenis_notifikasi, kanal, isi_pesan,
                        status_kirim, jml_percobaan, error_reason, waktu_kirim)
SELECT r.risk_id, u.user_id, 'PERIODIK',
       CASE WHEN g.gagal THEN 'EMAIL' ELSE 'WHATSAPP' END,
       'Status risiko kelulusan Anda saat ini: ' || r.status || '. Silakan cek dashboard EWS.',
       CASE WHEN g.gagal THEN 'FALLBACK_EMAIL' ELSE 'TERKIRIM' END,
       CASE WHEN g.gagal THEN 3 ELSE 1 END,
       CASE WHEN g.gagal THEN 'Kuota WhatsApp gateway habis' END,
       timestamp '2026-11-02 02:15'
FROM risk_score r
JOIN users u ON u.nim = r.nim,
LATERAL (SELECT random() < 0.15 AS gagal) g
WHERE r.scan_id = 3 AND r.status IN ('KUNING','MERAH');

-- Eskalasi via tabel notifikasi untuk status Merah
CREATE TEMP TABLE tmp_esk ON COMMIT DROP AS
SELECT r.risk_id, rb.nidn, uw.user_id AS wali_uid, uk.user_id AS kap_uid, (random() < 0.6) AS resp
FROM risk_score r
JOIN mahasiswa m ON m.nim = r.nim
JOIN relasi_bimbingan rb ON rb.nim = r.nim AND rb.jenis_relasi = 'DOSEN_WALI'
JOIN users uw ON uw.nidn = rb.nidn
JOIN users uk ON uk.nidn = '07120588' || lpad((((m.prodi_id - 1) * 3) + 1)::text, 2, '0')
WHERE r.scan_id = 3 AND r.status = 'MERAH';

INSERT INTO notifikasi (risk_id, penerima_user_id, jenis_notifikasi, kanal, isi_pesan,
                        status_kirim, jml_percobaan, waktu_kirim, status_respons, waktu_respons)
SELECT risk_id, wali_uid, 'ESKALASI_DOSEN_WALI', 'WHATSAPP',
       'Mahasiswa bimbingan Anda berstatus MERAH dan belum membaik. Mohon tindak lanjut.',
       'TERKIRIM', 1, timestamp '2026-11-05 08:01',
       CASE WHEN resp THEN 'DIRESPONS' ELSE 'BELUM' END,
       CASE WHEN resp THEN timestamp '2026-11-06 10:00' END
FROM tmp_esk
UNION ALL
SELECT risk_id, kap_uid, 'ESKALASI_KAPRODI', 'EMAIL',
       'Kasus mahasiswa berstatus MERAH belum direspons Dosen Wali. Mohon perhatian Kaprodi.',
       'TERKIRIM', 1, timestamp '2026-11-16 08:01', 'BELUM', NULL
FROM tmp_esk WHERE NOT resp;

-- Konseling: ~50% Kuning/Merah pada scan 2, plus Merah yang sudah direspons pada scan 3
INSERT INTO counseling_log (risk_id, nidn, tgl_konseling, catatan, tindak_lanjut)
SELECT r.risk_id, rb.nidn, date '2026-07-10' + floor(random() * 20)::int,
       'Mahasiswa dipanggil untuk konseling terkait risiko keterlambatan kelulusan.',
       'Menyusun jadwal bimbingan dan rencana perbaikan nilai.'
FROM risk_score r
JOIN relasi_bimbingan rb ON rb.nim = r.nim AND rb.jenis_relasi = 'DOSEN_WALI'
WHERE r.scan_id = 2 AND r.status <> 'HIJAU' AND random() < 0.5;

INSERT INTO counseling_log (risk_id, nidn, tgl_konseling, catatan, tindak_lanjut)
SELECT risk_id, nidn, date '2026-11-10',
       'Konseling pasca eskalasi; kendala utama didiskusikan bersama mahasiswa.',
       'Evaluasi ulang pada pemindaian berikutnya.'
FROM tmp_esk WHERE resp;

-- ---------------------------------------------------------------------
-- 7. AUDIT LOG CONTOH
-- ---------------------------------------------------------------------
INSERT INTO audit_log (user_id, aksi, nama_tabel, record_id, data_baru, waktu, ip_address)
SELECT NULL, 'SCAN_' || jenis_scan_run, 'scan_run', scan_id::text,
       jsonb_build_object('status', status, 'jumlah_mahasiswa', jml_mahasiswa),
       COALESCE(waktu_selesai, waktu_mulai), NULL
FROM scan_run;

INSERT INTO audit_log (user_id, aksi, nama_tabel, record_id, waktu, ip_address)
SELECT user_id, 'LOGIN', 'users', user_id::text, last_login,
       '10.10.1.' || (1 + floor(random() * 200))::int
FROM users WHERE username IN ('admin', 'kaprodi_si', 'dosen03');

-- ---------------------------------------------------------------------
-- 8. REFRESH MATERIALIZED VIEW
-- ---------------------------------------------------------------------
REFRESH MATERIALIZED VIEW mv_tren_ktw_prodi;
REFRESH MATERIALIZED VIEW mv_bottleneck_milestone;

COMMIT;

-- Ringkasan hasil seed (scan terbaru)
SELECT status, COUNT(*) AS jml FROM risk_score WHERE scan_id = 3 GROUP BY status ORDER BY status;
