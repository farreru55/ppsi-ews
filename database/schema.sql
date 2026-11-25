-- =====================================================================
-- EWS Keterlambatan Kelulusan Mahasiswa - Skema PostgreSQL
-- Kelompok Izin Tampil | Universitas Dinamika | SDD Bagian A (Desain Data)
-- Jalankan: psql -U postgres -d ews -f schema.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. ROLE DATABASE (Bagian A.10)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ews_app')      THEN CREATE ROLE ews_app NOLOGIN;      END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ews_etl')      THEN CREATE ROLE ews_etl NOLOGIN;      END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ews_readonly') THEN CREATE ROLE ews_readonly NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ews_admin')    THEN CREATE ROLE ews_admin NOLOGIN;    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1. DATA MASTER
-- ---------------------------------------------------------------------
CREATE TABLE program_studi (
  prodi_id    SERIAL PRIMARY KEY,
  kode_prodi  VARCHAR(10)  NOT NULL UNIQUE,
  nama_prodi  VARCHAR(100) NOT NULL,
  fakultas    VARCHAR(100)
);

CREATE TABLE semester (
  semester_id    SERIAL PRIMARY KEY,
  tahun_ajaran   VARCHAR(9) NOT NULL,                       -- contoh 2026/2027
  jenis_semester VARCHAR(6) NOT NULL CHECK (jenis_semester IN ('GANJIL','GENAP')),
  tgl_mulai      DATE,
  tgl_selesai    DATE,
  is_aktif       BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (tahun_ajaran, jenis_semester)
);

CREATE TABLE mahasiswa (
  nim          VARCHAR(15) PRIMARY KEY,
  nama         VARCHAR(100) NOT NULL,
  prodi_id     INTEGER NOT NULL REFERENCES program_studi(prodi_id) ON DELETE RESTRICT,
  tgl_masuk    DATE,
  status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
  no_wa        VARCHAR(20),
  email        VARCHAR(100)
);

CREATE TABLE dosen (
  nidn     VARCHAR(20) PRIMARY KEY,
  nama     VARCHAR(100) NOT NULL,
  prodi_id INTEGER NOT NULL REFERENCES program_studi(prodi_id) ON DELETE RESTRICT,
  email    VARCHAR(100),
  no_wa    VARCHAR(20)
);

CREATE TABLE relasi_bimbingan (
  relasi_id    BIGSERIAL PRIMARY KEY,
  nim          VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  nidn         VARCHAR(20) NOT NULL REFERENCES dosen(nidn)    ON DELETE RESTRICT,
  jenis_relasi VARCHAR(12) NOT NULL CHECK (jenis_relasi IN ('DOSEN_WALI','DOSBING_TA')),
  tgl_mulai    DATE NOT NULL,
  tgl_selesai  DATE                                         -- NULL = masih berlaku
);

CREATE TABLE mata_kuliah (
  kode_mk VARCHAR(15) PRIMARY KEY,
  nama_mk VARCHAR(100) NOT NULL,
  sks     SMALLINT
);

-- ---------------------------------------------------------------------
-- 2. KONFIGURASI, PENGGUNA
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  role_id   SMALLSERIAL PRIMARY KEY,
  nama_role VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE users (
  user_id       BIGSERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nim           VARCHAR(15)  UNIQUE REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  nidn          VARCHAR(20)  UNIQUE REFERENCES dosen(nidn)    ON DELETE RESTRICT,
  is_aktif      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMP,
  CONSTRAINT ck_users_nim_nidn CHECK (nim IS NULL OR nidn IS NULL)
);

CREATE TABLE user_roles (
  user_id BIGINT   NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  role_id SMALLINT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE config_rule (
  config_id   SERIAL PRIMARY KEY,
  prodi_id    INTEGER REFERENCES program_studi(prodi_id) ON DELETE RESTRICT, -- NULL = default universitas
  parameter   VARCHAR(50)   NOT NULL,   -- BOBOT_TA, BATAS_MERAH, N_HARI, M_HARI, BATAS_PRESENSI, BATAS_ALPHA, BATAS_TOEFL
  nilai       NUMERIC(8,2)  NOT NULL,
  versi       INTEGER       NOT NULL,
  is_aktif    BOOLEAN       NOT NULL DEFAULT TRUE,
  diubah_oleh BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,
  tgl_ubah    TIMESTAMP     NOT NULL DEFAULT now()
);
-- UNIQUE (prodi_id, parameter, versi) dengan NULL dianggap sama
CREATE UNIQUE INDEX uq_config_rule_versi
  ON config_rule (COALESCE(prodi_id, 0), parameter, versi);
CREATE UNIQUE INDEX uq_config_rule_aktif
  ON config_rule (COALESCE(prodi_id, 0), parameter) WHERE is_aktif;

-- ---------------------------------------------------------------------
-- 3. PROGRES TUGAS AKHIR
-- ---------------------------------------------------------------------
CREATE TABLE tugas_akhir (
  ta_id             BIGSERIAL PRIMARY KEY,
  nim               VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  jenis_ta          VARCHAR(2)  NOT NULL CHECK (jenis_ta IN ('TA','KP')),
  judul             VARCHAR(255),
  semester_mulai_id INTEGER NOT NULL REFERENCES semester(semester_id) ON DELETE RESTRICT,
  jml_perpanjangan  SMALLINT NOT NULL DEFAULT 0,
  tgl_batas         DATE,
  tgl_bebas_pustaka DATE                                    -- NULL = belum bebas pustaka
);

CREATE TABLE ta_milestone (
  milestone_id BIGSERIAL PRIMARY KEY,
  ta_id        BIGINT NOT NULL REFERENCES tugas_akhir(ta_id) ON DELETE RESTRICT,
  tahap        VARCHAR(15) NOT NULL CHECK (tahap IN
               ('PROPOSAL','SEMPRO','BIMBINGAN','SEMHAS','SIDANG','BEBAS_PUSTAKA','YUDISIUM')),
  tgl_mulai    DATE NOT NULL,
  tgl_selesai  DATE,                                        -- NULL bila berjalan
  status       VARCHAR(10) NOT NULL CHECK (status IN ('BERJALAN','SELESAI','TERTUNDA')),
  UNIQUE (ta_id, tahap)
);

CREATE TABLE bimbingan_log (
  bimbingan_id  BIGSERIAL PRIMARY KEY,
  ta_id         BIGINT NOT NULL REFERENCES tugas_akhir(ta_id) ON DELETE RESTRICT,
  nidn          VARCHAR(20) NOT NULL REFERENCES dosen(nidn)   ON DELETE RESTRICT,
  tgl_bimbingan DATE NOT NULL,
  topik         TEXT,
  terverifikasi BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------
-- 4. HASIL EWS: SCAN, SNAPSHOT, SKOR
-- ---------------------------------------------------------------------
CREATE TABLE scan_run (
  scan_id        BIGSERIAL PRIMARY KEY,
  semester_id    INTEGER NOT NULL REFERENCES semester(semester_id) ON DELETE RESTRICT,
  jenis_scan_run VARCHAR(10) NOT NULL CHECK (jenis_scan_run IN ('TENGAH','AKHIR','ULANG')),
  waktu_mulai    TIMESTAMP NOT NULL DEFAULT now(),
  waktu_selesai  TIMESTAMP,
  status         VARCHAR(10) NOT NULL CHECK (status IN ('BERJALAN','SELESAI','SEBAGIAN','GAGAL')),
  jml_mahasiswa  INTEGER
);

-- Snapshot read-only dari sistem sumber (SIAKAD, Kemahasiswaan, Keuangan)
CREATE TABLE snapshot_mahasiswa (
  snapshot_id          BIGSERIAL PRIMARY KEY,
  scan_id              BIGINT NOT NULL REFERENCES scan_run(scan_id) ON DELETE RESTRICT,
  nim                  VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  sks_lulus            SMALLINT,
  ipk                  NUMERIC(3,2) CHECK (ipk BETWEEN 0 AND 4),
  jml_nilai_d          SMALLINT,
  jml_nilai_e          SMALLINT,
  skor_toefl           SMALLINT,                            -- NULL bila belum ada
  sisa_masa_studi      SMALLINT,                            -- dalam semester
  total_poin_sskm      INTEGER,
  jml_event_wajib_terlewat SMALLINT,
  status_ukt           VARCHAR(10) CHECK (status_ukt IN ('LUNAS','MENUNGGAK')), -- tanpa nominal (BRL-14)
  memblokir_pendaftaran BOOLEAN,                            -- BRL-08
  UNIQUE (scan_id, nim)
);

CREATE TABLE presensi_matkul (
  presensi_id   BIGSERIAL PRIMARY KEY,
  scan_id       BIGINT NOT NULL REFERENCES scan_run(scan_id)    ON DELETE RESTRICT,
  nim           VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim)  ON DELETE RESTRICT,
  kode_mk       VARCHAR(15) NOT NULL REFERENCES mata_kuliah(kode_mk) ON DELETE RESTRICT,
  jml_pertemuan SMALLINT NOT NULL,
  jml_hadir     SMALLINT NOT NULL,
  CONSTRAINT ck_hadir_le_pertemuan CHECK (jml_hadir <= jml_pertemuan),
  UNIQUE (scan_id, nim, kode_mk)
);

CREATE TABLE progres_praktikum (
  praktikum_id       BIGSERIAL PRIMARY KEY,
  scan_id            BIGINT NOT NULL REFERENCES scan_run(scan_id)   ON DELETE RESTRICT,
  nim                VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  kode_praktikum     VARCHAR(20) NOT NULL,
  status_lulus       BOOLEAN,
  jml_penggunaan_lab INTEGER,
  UNIQUE (scan_id, nim, kode_praktikum)
);

CREATE TABLE risk_score (
  risk_id            BIGSERIAL PRIMARY KEY,
  scan_id            BIGINT NOT NULL REFERENCES scan_run(scan_id)   ON DELETE RESTRICT,
  nim                VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
  skor_ta            NUMERIC(5,2),                          -- NULL = pilar TA tidak berlaku
  skor_akademik      NUMERIC(5,2),
  skor_nonakademik   NUMERIC(5,2),
  skor_keuangan      NUMERIC(5,2),
  skor_total         NUMERIC(5,2) NOT NULL CHECK (skor_total BETWEEN 0 AND 100),
  status             VARCHAR(10)  NOT NULL CHECK (status IN ('HIJAU','KUNING','MERAH')),
  override_red       BOOLEAN NOT NULL DEFAULT FALSE,
  data_tidak_lengkap BOOLEAN NOT NULL DEFAULT FALSE,
  detail_pemicu      JSONB,
  tgl_hitung         TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (scan_id, nim)
);

CREATE TABLE action_plan (
  plan_id    BIGSERIAL PRIMARY KEY,
  risk_id    BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
  sumber     VARCHAR(12) NOT NULL CHECK (sumber IN ('AI_ADVISOR','DOSEN')),
  deskripsi  TEXT NOT NULL,
  status     VARCHAR(10) NOT NULL CHECK (status IN ('BELUM','PROSES','SELESAI')),
  tgl_target DATE,
  tgl_dibuat TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE notifikasi (
  notif_id         BIGSERIAL PRIMARY KEY,
  risk_id          BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
  penerima_user_id BIGINT NOT NULL REFERENCES users(user_id)      ON DELETE RESTRICT,
  jenis_notifikasi VARCHAR(25) NOT NULL CHECK (jenis_notifikasi IN
                   ('PERIODIK','ESKALASI_DOSEN_WALI','ESKALASI_KAPRODI','PERINGATAN_PRESENSI')),
  kanal            VARCHAR(10) NOT NULL CHECK (kanal IN ('WHATSAPP','EMAIL','DASHBOARD')),
  isi_pesan        TEXT,                                    -- tanpa nominal keuangan
  status_kirim     VARCHAR(15) NOT NULL CHECK (status_kirim IN
                   ('TERKIRIM','GAGAL','MENUNGGU','FALLBACK_EMAIL')),
  jml_percobaan    SMALLINT NOT NULL DEFAULT 0,
  error_reason     TEXT,
  waktu_kirim      TIMESTAMP,
  status_respons   VARCHAR(10) CHECK (status_respons IN ('BELUM','DIRESPONS')),
  waktu_respons    TIMESTAMP
);

CREATE TABLE counseling_log (
  konseling_id  BIGSERIAL PRIMARY KEY,
  risk_id       BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
  nidn          VARCHAR(20) NOT NULL REFERENCES dosen(nidn)    ON DELETE RESTRICT,
  tgl_konseling DATE NOT NULL,
  catatan       TEXT,
  tindak_lanjut TEXT
);

-- Tambahan dari Bagian A.2 & A.7 (BRL-11, ketahanan sumber data)
CREATE TABLE escalation_log (
  eskalasi_id      BIGSERIAL PRIMARY KEY,
  risk_id          BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
  tingkat          VARCHAR(15) NOT NULL CHECK (tingkat IN ('DOSEN_WALI','KAPRODI')),
  penerima_user_id BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,
  waktu_eskalasi   TIMESTAMP NOT NULL DEFAULT now(),
  status_respons   VARCHAR(10) NOT NULL DEFAULT 'BELUM' CHECK (status_respons IN ('BELUM','DIRESPONS')),
  waktu_respons    TIMESTAMP
);

CREATE TABLE sync_log (
  sync_id       BIGSERIAL PRIMARY KEY,
  scan_id       BIGINT NOT NULL REFERENCES scan_run(scan_id) ON DELETE RESTRICT,
  sumber        VARCHAR(20) NOT NULL CHECK (sumber IN
                ('SIAKAD','SIM_TA','KEUANGAN','KEMAHASISWAAN','SMART_LAB')),
  status        VARCHAR(10) NOT NULL CHECK (status IN ('BERHASIL','GAGAL')),
  jml_record    INTEGER,
  error_message TEXT,
  waktu         TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. AUDIT (append-only, BRL-16)
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
  audit_id   BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,  -- NULL = proses sistem
  aksi       VARCHAR(30) NOT NULL,
  nama_tabel VARCHAR(50),
  record_id  VARCHAR(50),
  data_lama  JSONB,
  data_baru  JSONB,
  waktu      TIMESTAMP NOT NULL DEFAULT now(),
  ip_address VARCHAR(45)
);

CREATE OR REPLACE FUNCTION fn_audit_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log bersifat append-only (BRL-16)';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION fn_audit_immutable();
CREATE TRIGGER trg_audit_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION fn_audit_immutable();

-- Trigger audit otomatis untuk perubahan config_rule
CREATE OR REPLACE FUNCTION fn_audit_generic() RETURNS trigger AS $$
DECLARE
  v_user BIGINT := NULLIF(current_setting('app.current_user_id', true), '')::BIGINT;
  v_rec  TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_rec := to_jsonb(OLD) ->> TG_ARGV[0];
    INSERT INTO audit_log(user_id, aksi, nama_tabel, record_id, data_lama)
    VALUES (v_user, TG_OP, TG_TABLE_NAME, v_rec, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_rec := to_jsonb(NEW) ->> TG_ARGV[0];
    INSERT INTO audit_log(user_id, aksi, nama_tabel, record_id, data_lama, data_baru)
    VALUES (v_user, TG_OP, TG_TABLE_NAME, v_rec, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    v_rec := to_jsonb(NEW) ->> TG_ARGV[0];
    INSERT INTO audit_log(user_id, aksi, nama_tabel, record_id, data_baru)
    VALUES (v_user, TG_OP, TG_TABLE_NAME, v_rec, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_config_rule
  AFTER INSERT OR UPDATE OR DELETE ON config_rule
  FOR EACH ROW EXECUTE FUNCTION fn_audit_generic('config_id');

-- Risk score append-only: riwayat tidak boleh ditimpa
CREATE OR REPLACE FUNCTION fn_risk_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'risk_score bersifat append-only; tambahkan baris baru melalui scan_run';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_risk_append_only
  BEFORE UPDATE OR DELETE ON risk_score
  FOR EACH ROW EXECUTE FUNCTION fn_risk_append_only();

-- ---------------------------------------------------------------------
-- 6. INDEKS (Bagian A.9)
-- ---------------------------------------------------------------------
CREATE INDEX idx_risk_nim_tgl        ON risk_score (nim, tgl_hitung DESC);
CREATE INDEX idx_risk_status         ON risk_score (status);
CREATE INDEX idx_risk_pemicu_gin     ON risk_score USING GIN (detail_pemicu);
CREATE INDEX idx_relasi_aktif        ON relasi_bimbingan (nidn, jenis_relasi) WHERE tgl_selesai IS NULL;
CREATE INDEX idx_relasi_nim          ON relasi_bimbingan (nim);
CREATE INDEX idx_bimbingan_ta_tgl    ON bimbingan_log (ta_id, tgl_bimbingan DESC);
CREATE INDEX idx_snapshot_nim        ON snapshot_mahasiswa (nim, scan_id DESC);
CREATE INDEX idx_presensi_nim_scan   ON presensi_matkul (nim, scan_id);
CREATE INDEX idx_eskalasi_belum      ON escalation_log (waktu_eskalasi) WHERE status_respons = 'BELUM';
CREATE INDEX idx_notif_risk_waktu    ON notifikasi (risk_id, waktu_kirim);
CREATE INDEX idx_audit_waktu         ON audit_log (waktu);
CREATE INDEX idx_audit_tabel_record  ON audit_log (nama_tabel, record_id);
CREATE INDEX idx_mhs_prodi_aktif     ON mahasiswa (prodi_id, status_aktif);
CREATE INDEX idx_ta_nim              ON tugas_akhir (nim);

-- ---------------------------------------------------------------------
-- 7. VIEW & MATERIALIZED VIEW (Bagian A.8)
-- ---------------------------------------------------------------------
CREATE VIEW vw_risk_terkini AS
SELECT DISTINCT ON (nim) *
FROM risk_score
ORDER BY nim, tgl_hitung DESC, risk_id DESC;

CREATE VIEW vw_riwayat_risiko AS
SELECT nim, risk_id, tgl_hitung, skor_total, status,
       LAG(status)     OVER (PARTITION BY nim ORDER BY tgl_hitung) AS status_sebelumnya,
       LAG(skor_total) OVER (PARTITION BY nim ORDER BY tgl_hitung) AS skor_sebelumnya
FROM risk_score;

CREATE VIEW vw_presensi_persen AS
SELECT p.presensi_id, p.scan_id, p.nim, s.semester_id, p.kode_mk,
       ROUND(100.0 * p.jml_hadir / NULLIF(p.jml_pertemuan, 0), 2) AS persen_hadir,
       (p.jml_pertemuan - p.jml_hadir) AS jml_alpha,
       COALESCE(
         ROUND(100.0 * p.jml_hadir / NULLIF(p.jml_pertemuan, 0), 2)
           < (SELECT nilai FROM config_rule
              WHERE parameter = 'BATAS_PRESENSI' AND prodi_id IS NULL AND is_aktif), FALSE
       ) AS di_bawah_batas
FROM presensi_matkul p
JOIN scan_run s ON s.scan_id = p.scan_id;

CREATE VIEW vw_progres_bimbingan AS
SELECT t.ta_id, t.nim,
       COUNT(b.bimbingan_id) FILTER (WHERE b.terverifikasi) AS jml_bimbingan_terverifikasi,
       MAX(b.tgl_bimbingan)                                 AS tgl_bimbingan_terakhir,
       (CURRENT_DATE - MAX(b.tgl_bimbingan))                AS hari_sejak_bimbingan_terakhir
FROM tugas_akhir t
LEFT JOIN bimbingan_log b ON b.ta_id = t.ta_id
GROUP BY t.ta_id, t.nim;

CREATE VIEW vw_syarat_yudisium AS
SELECT DISTINCT ON (sm.nim)
       sm.nim, sm.scan_id,
       (COALESCE(sm.jml_nilai_e, 0) = 0)                    AS bebas_nilai_e,
       sm.skor_toefl,
       (sm.skor_toefl >= (SELECT nilai FROM config_rule
                          WHERE parameter = 'BATAS_TOEFL' AND prodi_id IS NULL AND is_aktif)) AS toefl_terpenuhi,
       (t.tgl_bebas_pustaka IS NOT NULL)                    AS bebas_pustaka
FROM snapshot_mahasiswa sm
LEFT JOIN tugas_akhir t ON t.nim = sm.nim
ORDER BY sm.nim, sm.scan_id DESC;

CREATE VIEW vw_dashboard_dosen AS
SELECT rb.nidn, rb.jenis_relasi, r.*
FROM relasi_bimbingan rb
JOIN vw_risk_terkini r ON r.nim = rb.nim
WHERE rb.tgl_selesai IS NULL
  AND r.status IN ('KUNING','MERAH');

CREATE MATERIALIZED VIEW mv_tren_ktw_prodi AS
SELECT sc.semester_id, sc.scan_id, m.prodi_id, ps.nama_prodi,
       COUNT(*)                                       AS jml_mahasiswa,
       COUNT(*) FILTER (WHERE r.status = 'HIJAU')     AS jml_hijau,
       COUNT(*) FILTER (WHERE r.status = 'KUNING')    AS jml_kuning,
       COUNT(*) FILTER (WHERE r.status = 'MERAH')     AS jml_merah
FROM risk_score r
JOIN scan_run sc      ON sc.scan_id = r.scan_id
JOIN mahasiswa m      ON m.nim = r.nim
JOIN program_studi ps ON ps.prodi_id = m.prodi_id
GROUP BY sc.semester_id, sc.scan_id, m.prodi_id, ps.nama_prodi
WITH DATA;
CREATE UNIQUE INDEX uq_mv_tren ON mv_tren_ktw_prodi (scan_id, prodi_id);

CREATE MATERIALIZED VIEW mv_bottleneck_milestone AS
SELECT tahap, status,
       COUNT(*) AS jml_mahasiswa,
       AVG(COALESCE(tgl_selesai, CURRENT_DATE) - tgl_mulai)::NUMERIC(8,1) AS rata_durasi_hari
FROM ta_milestone
GROUP BY tahap, status
WITH DATA;
CREATE UNIQUE INDEX uq_mv_bottleneck ON mv_bottleneck_milestone (tahap, status);

-- Refresh setelah scan_run selesai:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tren_ktw_prodi;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_bottleneck_milestone;

-- ---------------------------------------------------------------------
-- 8. ROW-LEVEL SECURITY (BRL-13)
-- Aplikasi men-set per koneksi/transaksi:
--   SET LOCAL app.current_nim = '...'; app.current_nidn; app.current_prodi_id; app.current_role
-- ---------------------------------------------------------------------
ALTER TABLE risk_score ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_risk_admin ON risk_score FOR SELECT
  USING (current_setting('app.current_role', true) = 'ADMIN');

CREATE POLICY p_risk_mahasiswa ON risk_score FOR SELECT
  USING (nim = current_setting('app.current_nim', true));

CREATE POLICY p_risk_dosen ON risk_score FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM relasi_bimbingan rb
    WHERE rb.nim = risk_score.nim
      AND rb.nidn = current_setting('app.current_nidn', true)
      AND rb.tgl_selesai IS NULL));

CREATE POLICY p_risk_kaprodi ON risk_score FOR SELECT
  USING (current_setting('app.current_role', true) IN ('KAPRODI','KOORD_TA')
         AND EXISTS (SELECT 1 FROM mahasiswa m
                     WHERE m.nim = risk_score.nim
                       AND m.prodi_id = NULLIF(current_setting('app.current_prodi_id', true), '')::INT));

-- Policy untuk INSERT hasil scan oleh aplikasi/engine
CREATE POLICY p_risk_insert ON risk_score FOR INSERT
  TO ews_app, ews_admin WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 9. HAK AKSES
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO ews_app, ews_etl, ews_readonly, ews_admin;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ews_app, ews_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ews_app, ews_etl, ews_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ews_readonly;

-- ETL hanya menulis snapshot dan log sinkronisasi
GRANT SELECT ON mahasiswa, dosen, mata_kuliah, semester, scan_run, program_studi TO ews_etl;
GRANT INSERT, UPDATE ON scan_run TO ews_etl;
GRANT INSERT ON snapshot_mahasiswa, presensi_matkul, progres_praktikum, sync_log TO ews_etl;

-- audit_log: hanya INSERT (BRL-16)
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC, ews_app, ews_etl, ews_readonly, ews_admin;
GRANT  INSERT ON audit_log TO ews_app, ews_etl, ews_admin;
GRANT  SELECT ON audit_log TO ews_readonly;

-- risk_score: tanpa UPDATE/DELETE (append-only)
REVOKE UPDATE, DELETE, TRUNCATE ON risk_score FROM ews_app, ews_admin;

-- ---------------------------------------------------------------------
-- 10. SEED DATA AWAL
-- ---------------------------------------------------------------------
INSERT INTO roles (nama_role) VALUES
  ('MAHASISWA'),('DOSEN_WALI'),('DOSBING_TA'),('KAPRODI'),('KOORD_TA'),('ADMIN');

-- Default universitas (prodi_id NULL). Bobot sesuai SDD: TA 40, Akademik 30, SSKM 15, Keuangan 15
INSERT INTO config_rule (prodi_id, parameter, nilai, versi, is_aktif) VALUES
  (NULL, 'BOBOT_TA',        40, 1, TRUE),
  (NULL, 'BOBOT_AKADEMIK',  30, 1, TRUE),
  (NULL, 'BOBOT_SSKM',      15, 1, TRUE),
  (NULL, 'BOBOT_KEUANGAN',  15, 1, TRUE),
  (NULL, 'BATAS_KUNING',    40, 1, TRUE),  
  (NULL, 'BATAS_MERAH',     70, 1, TRUE),   
  (NULL, 'N_HARI',           3, 1, TRUE),   
  (NULL, 'M_HARI',          14, 1, TRUE),   
  (NULL, 'BATAS_PRESENSI',  75, 1, TRUE),  
  (NULL, 'BATAS_ALPHA',      2, 1, TRUE),
  (NULL, 'BATAS_TOEFL',    400, 1, TRUE);

COMMIT;
