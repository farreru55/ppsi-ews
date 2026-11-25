-- ============================================================================
-- SKEMA BASIS DATA EWS KETERLAMBATAN KELULUSAN MAHASISWA (SDD REVISI - 22 TABEL)
-- ============================================================================

-- 1. program_studi (Master)
CREATE TABLE IF NOT EXISTS program_studi (
  prodi_id SERIAL PRIMARY KEY,
  kode_prodi VARCHAR(10) UNIQUE NOT NULL,
  nama_prodi VARCHAR(100) NOT NULL,
  fakultas VARCHAR(100)
);

-- 2. semester (Master)
CREATE TABLE IF NOT EXISTS semester (
  semester_id SERIAL PRIMARY KEY,
  tahun_ajaran VARCHAR(9) NOT NULL,
  jenis VARCHAR(6) NOT NULL CHECK (jenis IN ('GANJIL', 'GENAP')),
  tgl_mulai DATE,
  tgl_selesai DATE,
  is_aktif BOOLEAN,
  UNIQUE (tahun_ajaran, jenis)
);

-- 3. mahasiswa (Master)
CREATE TABLE IF NOT EXISTS mahasiswa (
  nim VARCHAR(15) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  prodi_id INTEGER NOT NULL REFERENCES program_studi(prodi_id) ON DELETE RESTRICT,
  tgl_masuk DATE,
  status_aktif BOOLEAN DEFAULT TRUE,
  no_wa VARCHAR(20),
  email VARCHAR(100)
);

-- 4. dosen (Master)
CREATE TABLE IF NOT EXISTS dosen (
  nidn VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  prodi_id INTEGER NOT NULL REFERENCES program_studi(prodi_id) ON DELETE RESTRICT,
  email VARCHAR(100),
  no_wa VARCHAR(20)
);

-- 5. relasi_bimbingan (Master)
CREATE TABLE IF NOT EXISTS relasi_bimbingan (
  relasi_id BIGSERIAL PRIMARY KEY,
  nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  nidn VARCHAR(20) NOT NULL REFERENCES dosen(nidn) ON DELETE RESTRICT,
  jenis VARCHAR(12) NOT NULL CHECK (jenis IN ('DOSEN_WALI', 'DOSBING_TA')),
  tgl_mulai DATE NOT NULL,
  tgl_selesai DATE
);

-- 6. mata_kuliah (Master)
CREATE TABLE IF NOT EXISTS mata_kuliah (
  kode_mk VARCHAR(15) PRIMARY KEY,
  nama_mk VARCHAR(100) NOT NULL,
  sks SMALLINT
);

-- 7. tugas_akhir (Progres TA)
CREATE TABLE IF NOT EXISTS tugas_akhir (
  ta_id BIGSERIAL PRIMARY KEY,
  nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  jenis VARCHAR(2) NOT NULL CHECK (jenis IN ('TA', 'KP')),
  judul VARCHAR(255),
  semester_mulai_id INTEGER NOT NULL REFERENCES semester(semester_id) ON DELETE RESTRICT,
  jml_perpanjangan SMALLINT NOT NULL DEFAULT 0,
  tgl_batas DATE,
  tgl_bebas_pustaka DATE
);

-- 8. ta_milestone (Progres TA)
CREATE TABLE IF NOT EXISTS ta_milestone (
  milestone_id BIGSERIAL PRIMARY KEY,
  ta_id BIGINT NOT NULL REFERENCES tugas_akhir(ta_id) ON DELETE RESTRICT,
  tahap VARCHAR(15) NOT NULL CHECK (tahap IN ('PROPOSAL', 'SEMPRO', 'BIMBINGAN', 'SEMHAS', 'SIDANG', 'BEBAS_PUSTAKA', 'YUDISIUM')),
  tgl_mulai DATE NOT NULL,
  tgl_selesai DATE,
  status VARCHAR(10) NOT NULL CHECK (status IN ('BERJALAN', 'SELESAI', 'TERTUNDA')),
  UNIQUE (ta_id, tahap)
);

-- 9. bimbingan_log (Progres TA)
CREATE TABLE IF NOT EXISTS bimbingan_log (
  bimbingan_id BIGSERIAL PRIMARY KEY,
  ta_id BIGINT NOT NULL REFERENCES tugas_akhir(ta_id) ON DELETE RESTRICT,
  nidn VARCHAR(20) NOT NULL REFERENCES dosen(nidn) ON DELETE RESTRICT,
  tgl_bimbingan DATE NOT NULL,
  topik TEXT,
  terverifikasi BOOLEAN NOT NULL DEFAULT FALSE
);

-- 10. scan_run (Hasil EWS)
CREATE TABLE IF NOT EXISTS scan_run (
  scan_id BIGSERIAL PRIMARY KEY,
  semester_id INTEGER NOT NULL REFERENCES semester(semester_id) ON DELETE RESTRICT,
  jenis VARCHAR(10) NOT NULL CHECK (jenis IN ('TENGAH', 'AKHIR', 'ULANG')),
  waktu_mulai TIMESTAMP NOT NULL DEFAULT NOW(),
  waktu_selesai TIMESTAMP,
  status VARCHAR(10) NOT NULL CHECK (status IN ('BERJALAN', 'SELESAI', 'SEBAGIAN', 'GAGAL')),
  jml_mahasiswa INTEGER
);

-- 11. snapshot_mahasiswa (Snapshot)
CREATE TABLE IF NOT EXISTS snapshot_mahasiswa (
  snapshot_id BIGSERIAL PRIMARY KEY,
  scan_id BIGINT NOT NULL REFERENCES scan_run(scan_id) ON DELETE RESTRICT,
  nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  sks_lulus SMALLINT,
  ipk NUMERIC(3,2) CHECK (ipk >= 0 AND ipk <= 4),
  jml_nilai_d SMALLINT,
  jml_nilai_e SMALLINT,
  skor_toefl SMALLINT,
  sisa_masa_studi SMALLINT,
  total_poin_sskm INTEGER,
  jml_event_wajib_terlewat SMALLINT,
  status_ukt VARCHAR(10) CHECK (status_ukt IN ('LUNAS', 'MENUNGGAK')),
  memblokir_pendaftaran BOOLEAN,
  UNIQUE (scan_id, nim)
);

-- 12. presensi_matkul (Snapshot)
CREATE TABLE IF NOT EXISTS presensi_matkul (
  presensi_id BIGSERIAL PRIMARY KEY,
  scan_id BIGINT NOT NULL REFERENCES scan_run(scan_id) ON DELETE RESTRICT,
  nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  kode_mk VARCHAR(15) NOT NULL REFERENCES mata_kuliah(kode_mk) ON DELETE RESTRICT,
  jml_pertemuan SMALLINT NOT NULL,
  jml_hadir SMALLINT NOT NULL CHECK (jml_hadir <= jml_pertemuan),
  UNIQUE (scan_id, nim, kode_mk)
);

-- 13. progres_praktikum (Snapshot)
CREATE TABLE IF NOT EXISTS progres_praktikum (
  praktikum_id BIGSERIAL PRIMARY KEY,
  scan_id BIGINT NOT NULL REFERENCES scan_run(scan_id) ON DELETE RESTRICT,
  nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  kode_praktikum VARCHAR(20) NOT NULL,
  status_lulus BOOLEAN,
  jml_penggunaan_lab INTEGER,
  UNIQUE (scan_id, nim, kode_praktikum)
);

-- 14. risk_score (Hasil EWS)
CREATE TABLE IF NOT EXISTS risk_score (
  risk_id BIGSERIAL PRIMARY KEY,
  scan_id BIGINT NOT NULL REFERENCES scan_run(scan_id) ON DELETE RESTRICT,
  nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  skor_ta NUMERIC(5,2),
  skor_akademik NUMERIC(5,2),
  skor_nonakademik NUMERIC(5,2),
  skor_keuangan NUMERIC(5,2),
  skor_total NUMERIC(5,2) NOT NULL CHECK (skor_total >= 0 AND skor_total <= 100),
  status VARCHAR(10) NOT NULL CHECK (status IN ('HIJAU', 'KUNING', 'MERAH')),
  override_red BOOLEAN NOT NULL DEFAULT FALSE,
  data_tidak_lengkap BOOLEAN NOT NULL DEFAULT FALSE,
  detail_pemicu JSONB,
  tgl_hitung TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (scan_id, nim)
);

-- 15. action_plan (Hasil EWS)
CREATE TABLE IF NOT EXISTS action_plan (
  plan_id BIGSERIAL PRIMARY KEY,
  risk_id BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
  sumber VARCHAR(12) NOT NULL CHECK (sumber IN ('AI_ADVISOR', 'DOSEN')),
  deskripsi TEXT NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('BELUM', 'PROSES', 'SELESAI')),
  tgl_target DATE,
  tgl_dibuat TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 16. roles (Konfigurasi)
CREATE TABLE IF NOT EXISTS roles (
  role_id SMALLSERIAL PRIMARY KEY,
  nama_role VARCHAR(30) UNIQUE NOT NULL CHECK (nama_role IN ('MAHASISWA', 'DOSEN_WALI', 'DOSBING_TA', 'KAPRODI', 'KOORD_TA', 'ADMIN'))
);

-- 17. users (Konfigurasi)
CREATE TABLE IF NOT EXISTS users (
  user_id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nim VARCHAR(15) UNIQUE REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  nidn VARCHAR(20) UNIQUE REFERENCES dosen(nidn) ON DELETE RESTRICT,
  is_aktif BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMP,
  CHECK (NOT (nim IS NOT NULL AND nidn IS NOT NULL))
);

-- 18. user_roles (Konfigurasi)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  role_id SMALLINT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, role_id)
);

-- 19. notifikasi (Hasil EWS)
CREATE TABLE IF NOT EXISTS notifikasi (
  notif_id BIGSERIAL PRIMARY KEY,
  risk_id BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
  penerima_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  jenis VARCHAR(25) NOT NULL CHECK (jenis IN ('PERIODIK', 'ESKALASI_DOSEN_WALI', 'ESKALASI_KAPRODI', 'PERINGATAN_PRESENSI')),
  kanal VARCHAR(10) NOT NULL CHECK (kanal IN ('WHATSAPP', 'EMAIL', 'DASHBOARD')),
  isi_pesan TEXT,
  status_kirim VARCHAR(15) NOT NULL CHECK (status_kirim IN ('TERKIRIM', 'GAGAL', 'MENUNGGU', 'FALLBACK_EMAIL')),
  jml_percobaan SMALLINT NOT NULL DEFAULT 0,
  error_reason TEXT,
  waktu_kirim TIMESTAMP,
  status_respons VARCHAR(10) CHECK (status_respons IN ('BELUM', 'DIRESPONS')),
  waktu_respons TIMESTAMP
);

-- 20. counseling_log (Hasil EWS)
CREATE TABLE IF NOT EXISTS counseling_log (
  konseling_id BIGSERIAL PRIMARY KEY,
  risk_id BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
  nidn VARCHAR(20) NOT NULL REFERENCES dosen(nidn) ON DELETE RESTRICT,
  tgl_konseling DATE NOT NULL,
  catatan TEXT,
  tindak_lanjut TEXT
);

-- 21. config_rule (Konfigurasi)
CREATE TABLE IF NOT EXISTS config_rule (
  config_id SERIAL PRIMARY KEY,
  prodi_id INTEGER REFERENCES program_studi(prodi_id) ON DELETE RESTRICT,
  parameter VARCHAR(50) NOT NULL,
  nilai NUMERIC(8,2) NOT NULL,
  versi INTEGER NOT NULL,
  is_aktif BOOLEAN NOT NULL,
  diubah_oleh BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,
  tgl_ubah TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (prodi_id, parameter, versi)
);

-- 22. audit_log (Konfigurasi - append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  audit_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,
  aksi VARCHAR(30) NOT NULL,
  nama_tabel VARCHAR(50),
  record_id VARCHAR(50),
  data_lama JSONB,
  data_baru JSONB,
  waktu TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45)
);

-- ============================================================================
-- INDEKS (SDD Bagian 9)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_risk_score_nim_tgl ON risk_score (nim, tgl_hitung DESC);
CREATE INDEX IF NOT EXISTS idx_risk_score_status ON risk_score (status);
CREATE INDEX IF NOT EXISTS idx_risk_score_detail_pemicu ON risk_score USING GIN (detail_pemicu);
CREATE INDEX IF NOT EXISTS idx_relasi_bimbingan_aktif ON relasi_bimbingan (nidn, jenis) WHERE tgl_selesai IS NULL;
CREATE INDEX IF NOT EXISTS idx_bimbingan_log_ta_tgl ON bimbingan_log (ta_id, tgl_bimbingan DESC);
CREATE INDEX IF NOT EXISTS idx_presensi_matkul_scan_nim ON presensi_matkul (scan_id, nim);
CREATE INDEX IF NOT EXISTS idx_notifikasi_eskalasi_belum ON notifikasi (waktu_kirim) WHERE status_respons = 'BELUM';
CREATE INDEX IF NOT EXISTS idx_notifikasi_risk_waktu ON notifikasi (risk_id, waktu_kirim);
CREATE INDEX IF NOT EXISTS idx_audit_log_waktu ON audit_log (waktu);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabel_record ON audit_log (nama_tabel, record_id);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_prodi_aktif ON mahasiswa (prodi_id, status_aktif);

-- ============================================================================
-- VIEWS & MATERIALIZED VIEWS (SDD Bagian 8)
-- ============================================================================

-- 1. vw_risk_terkini
CREATE OR REPLACE VIEW vw_risk_terkini AS
SELECT DISTINCT ON (nim) *
FROM risk_score
ORDER BY nim, tgl_hitung DESC, risk_id DESC;

-- 2. vw_riwayat_risiko
CREATE OR REPLACE VIEW vw_riwayat_risiko AS
SELECT
  nim,
  risk_id,
  tgl_hitung,
  skor_total,
  status,
  LAG(status) OVER (PARTITION BY nim ORDER BY tgl_hitung, risk_id) AS status_sebelumnya,
  LAG(skor_total) OVER (PARTITION BY nim ORDER BY tgl_hitung, risk_id) AS skor_sebelumnya
FROM risk_score;

-- 3. vw_presensi_persen
CREATE OR REPLACE VIEW vw_presensi_persen AS
SELECT
  presensi_id,
  scan_id,
  nim,
  kode_mk,
  jml_pertemuan,
  jml_hadir,
  (jml_pertemuan - jml_hadir) AS alpha,
  ROUND(100.0 * jml_hadir / NULLIF(jml_pertemuan, 0), 2) AS persen_hadir
FROM presensi_matkul;

-- 4. vw_progres_bimbingan
CREATE OR REPLACE VIEW vw_progres_bimbingan AS
SELECT
  ta.ta_id,
  ta.nim,
  COUNT(bl.bimbingan_id) FILTER (WHERE bl.terverifikasi = TRUE) AS jml_bimbingan_terverifikasi,
  MAX(bl.tgl_bimbingan) AS tgl_bimbingan_terakhir,
  COALESCE(CURRENT_DATE - MAX(bl.tgl_bimbingan), 999) AS hari_sejak_bimbingan_terakhir
FROM tugas_akhir ta
LEFT JOIN bimbingan_log bl ON bl.ta_id = ta.ta_id
GROUP BY ta.ta_id, ta.nim;

-- 5. vw_syarat_yudisium
CREATE OR REPLACE VIEW vw_syarat_yudisium AS
SELECT
  sm.scan_id,
  sm.nim,
  (COALESCE(sm.jml_nilai_e, 0) = 0) AS bebas_nilai_e,
  sm.skor_toefl,
  (ta.tgl_bebas_pustaka IS NOT NULL) AS bebas_pustaka
FROM snapshot_mahasiswa sm
LEFT JOIN tugas_akhir ta ON ta.nim = sm.nim;

-- 6. vw_dashboard_dosen
CREATE OR REPLACE VIEW vw_dashboard_dosen AS
SELECT
  rb.nidn,
  rb.jenis AS peran_bimbingan,
  m.nim,
  m.nama,
  m.prodi_id,
  vr.risk_id,
  vr.skor_total,
  vr.status,
  vr.override_red,
  vr.tgl_hitung
FROM relasi_bimbingan rb
JOIN mahasiswa m ON m.nim = rb.nim
JOIN vw_risk_terkini vr ON vr.nim = m.nim
WHERE rb.tgl_selesai IS NULL
  AND vr.status IN ('KUNING', 'MERAH');

-- 7. mv_tren_ktw_prodi (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tren_ktw_prodi AS
SELECT
  ps.prodi_id,
  ps.kode_prodi,
  ps.nama_prodi,
  sr.semester_id,
  rs.status,
  COUNT(rs.risk_id) AS jumlah_mahasiswa,
  ROUND(AVG(rs.skor_total), 2) AS rata_rata_skor
FROM risk_score rs
JOIN scan_run sr ON sr.scan_id = rs.scan_id
JOIN mahasiswa m ON m.nim = rs.nim
JOIN program_studi ps ON ps.prodi_id = m.prodi_id
GROUP BY ps.prodi_id, ps.kode_prodi, ps.nama_prodi, sr.semester_id, rs.status;

-- 8. mv_bottleneck_milestone (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_bottleneck_milestone AS
SELECT
  tm.tahap,
  COUNT(tm.milestone_id) AS jumlah_mahasiswa,
  ROUND(AVG(COALESCE(tm.tgl_selesai, CURRENT_DATE) - tm.tgl_mulai), 1) AS rata_rata_durasi_hari
FROM ta_milestone tm
JOIN tugas_akhir ta ON ta.ta_id = tm.ta_id
GROUP BY tm.tahap;
