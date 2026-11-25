-- Early Warning System (EWS) Keterlambatan Kelulusan Mahasiswa
-- Skema Database PostgreSQL 26 Tabel & Objek Pendukung

-- 1. Fungsi penolak ubah dan hapus untuk tabel append-only
CREATE OR REPLACE FUNCTION fn_tolak_ubah_hapus()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operasi % tidak diizinkan pada tabel append-only ini (BRL-16)', TG_OP;
END;
$$ LANGUAGE plpgsql;

-- 2. Master Data: Program Studi
CREATE TABLE IF NOT EXISTS program_studi (
    prodi_id SERIAL PRIMARY KEY,
    kode_prodi VARCHAR(10) UNIQUE NOT NULL,
    nama_prodi VARCHAR(100) NOT NULL,
    fakultas VARCHAR(100) NOT NULL
);

-- 3. Master Data: Mahasiswa
CREATE TABLE IF NOT EXISTS mahasiswa (
    nim VARCHAR(15) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    prodi_id INTEGER NOT NULL REFERENCES program_studi(prodi_id) ON DELETE RESTRICT,
    angkatan SMALLINT NOT NULL,
    tgl_masuk DATE NOT NULL,
    status_aktif BOOLEAN NOT NULL DEFAULT true,
    no_wa VARCHAR(20),
    email VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_mahasiswa_prodi ON mahasiswa(prodi_id, status_aktif);

-- 4. Master Data: Dosen
CREATE TABLE IF NOT EXISTS dosen (
    nidn VARCHAR(20) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    prodi_id INTEGER NOT NULL REFERENCES program_studi(prodi_id) ON DELETE RESTRICT,
    email VARCHAR(100),
    no_wa VARCHAR(20)
);

-- 5. Relasi Bimbingan (Dosen Wali / Dosbing TA)
CREATE TABLE IF NOT EXISTS relasi_bimbingan (
    relasi_id BIGSERIAL PRIMARY KEY,
    nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
    nidn VARCHAR(20) NOT NULL REFERENCES dosen(nidn) ON DELETE RESTRICT,
    jenis VARCHAR(12) NOT NULL CHECK (jenis IN ('DOSEN_WALI', 'DOSBING_TA')),
    tgl_mulai DATE NOT NULL,
    tgl_selesai DATE
);
CREATE INDEX IF NOT EXISTS idx_relasi_nim ON relasi_bimbingan(nim, jenis);
CREATE INDEX IF NOT EXISTS idx_relasi_nidn ON relasi_bimbingan(nidn, jenis);

-- 6. Referensi: Semester
CREATE TABLE IF NOT EXISTS semester (
    semester_id SERIAL PRIMARY KEY,
    tahun_ajaran VARCHAR(9) NOT NULL,
    jenis VARCHAR(6) NOT NULL CHECK (jenis IN ('GANJIL', 'GENAP')),
    tgl_mulai DATE NOT NULL,
    tgl_selesai DATE NOT NULL,
    is_aktif BOOLEAN NOT NULL DEFAULT false
);

-- 7. Progres TA: Tugas Akhir / KP
CREATE TABLE IF NOT EXISTS tugas_akhir (
    ta_id BIGSERIAL PRIMARY KEY,
    nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
    jenis VARCHAR(2) NOT NULL CHECK (jenis IN ('TA', 'KP')),
    judul VARCHAR(255) NOT NULL,
    semester_mulai_id INTEGER NOT NULL REFERENCES semester(semester_id) ON DELETE RESTRICT,
    jml_perpanjangan SMALLINT NOT NULL DEFAULT 0,
    tgl_batas DATE,
    status_bebas_pustaka BOOLEAN NOT NULL DEFAULT false,
    tgl_bebas_pustaka DATE
);
CREATE INDEX IF NOT EXISTS idx_ta_nim ON tugas_akhir(nim);

-- 8. Progres TA: Milestone
CREATE TABLE IF NOT EXISTS ta_milestone (
    milestone_id BIGSERIAL PRIMARY KEY,
    ta_id BIGINT NOT NULL REFERENCES tugas_akhir(ta_id) ON DELETE RESTRICT,
    tahap VARCHAR(15) NOT NULL CHECK (tahap IN ('PROPOSAL', 'SEMPRO', 'BIMBINGAN', 'SEMHAS', 'SIDANG', 'BEBAS_PUSTAKA', 'YUDISIUM')),
    tgl_mulai DATE NOT NULL,
    tgl_selesai DATE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('BERJALAN', 'SELESAI', 'TERTUNDA'))
);
CREATE INDEX IF NOT EXISTS idx_milestone_ta ON ta_milestone(ta_id, tahap);

-- 9. Progres TA: Bimbingan Log
CREATE TABLE IF NOT EXISTS bimbingan_log (
    bimbingan_id BIGSERIAL PRIMARY KEY,
    ta_id BIGINT NOT NULL REFERENCES tugas_akhir(ta_id) ON DELETE RESTRICT,
    nidn VARCHAR(20) NOT NULL REFERENCES dosen(nidn) ON DELETE RESTRICT,
    tgl_bimbingan DATE NOT NULL,
    topik TEXT NOT NULL,
    terverifikasi BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_bimbingan_ta ON bimbingan_log(ta_id, tgl_bimbingan DESC);

-- 10. Data Akademik: Snapshot SIAKAD
CREATE TABLE IF NOT EXISTS akademik_snapshot (
    snapshot_id BIGSERIAL PRIMARY KEY,
    nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
    semester_id INTEGER NOT NULL REFERENCES semester(semester_id) ON DELETE RESTRICT,
    tgl_ambil TIMESTAMP NOT NULL DEFAULT NOW(),
    sks_lulus SMALLINT NOT NULL,
    ipk NUMERIC(3,2) NOT NULL CHECK (ipk >= 0.00 AND ipk <= 4.00),
    jml_nilai_d SMALLINT NOT NULL DEFAULT 0,
    jml_nilai_e SMALLINT NOT NULL DEFAULT 0,
    skor_toefl SMALLINT,
    sisa_masa_studi SMALLINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_akademik_nim ON akademik_snapshot(nim, tgl_ambil DESC);

-- 11. Data Akademik: Presensi Mata Kuliah
CREATE TABLE IF NOT EXISTS presensi_matkul (
    presensi_id BIGSERIAL PRIMARY KEY,
    nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
    semester_id INTEGER NOT NULL REFERENCES semester(semester_id) ON DELETE RESTRICT,
    kode_mk VARCHAR(15) NOT NULL,
    nama_mk VARCHAR(100) NOT NULL,
    jml_pertemuan SMALLINT NOT NULL,
    jml_hadir SMALLINT NOT NULL,
    tgl_ambil TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_presensi_nim ON presensi_matkul(nim, semester_id);

-- 12. Non-Akademik: SSKM Snapshot
CREATE TABLE IF NOT EXISTS sskm_snapshot (
    sskm_id BIGSERIAL PRIMARY KEY,
    nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
    total_poin INTEGER NOT NULL,
    tgl_ambil TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sskm_nim ON sskm_snapshot(nim, tgl_ambil DESC);

-- 13. Non-Akademik: Kehadiran Event Wajib
CREATE TABLE IF NOT EXISTS kehadiran_event (
    kehadiran_id BIGSERIAL PRIMARY KEY,
    nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
    nama_event VARCHAR(150) NOT NULL,
    tgl_event DATE NOT NULL,
    wajib BOOLEAN NOT NULL DEFAULT true,
    hadir BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_event_nim ON kehadiran_event(nim);

-- 14. Keuangan: Status Pelunasan UKT/SPP (Tanpa Nominal Rupiah - BRL-14)
CREATE TABLE IF NOT EXISTS status_keuangan (
    keuangan_id BIGSERIAL PRIMARY KEY,
    nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
    semester_id INTEGER NOT NULL REFERENCES semester(semester_id) ON DELETE RESTRICT,
    status VARCHAR(10) NOT NULL CHECK (status IN ('LUNAS', 'MENUNGGAK')),
    memblokir_pendaftaran BOOLEAN NOT NULL DEFAULT false,
    tgl_ambil TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_keuangan_nim ON status_keuangan(nim, semester_id);

-- 15. Smart Laboratory: Progres Praktikum
CREATE TABLE IF NOT EXISTS progres_praktikum (
    praktikum_id BIGSERIAL PRIMARY KEY,
    nim VARCHAR(15) NOT NULL REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
    kode_praktikum VARCHAR(20) NOT NULL,
    status_lulus BOOLEAN NOT NULL DEFAULT false,
    jml_penggunaan_lab INTEGER NOT NULL DEFAULT 0,
    tgl_ambil TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_praktikum_nim ON progres_praktikum(nim);

-- 16. EWS: Scan Run
CREATE TABLE IF NOT EXISTS scan_run (
    scan_id BIGSERIAL PRIMARY KEY,
    semester_id INTEGER NOT NULL REFERENCES semester(semester_id) ON DELETE RESTRICT,
    jenis VARCHAR(10) NOT NULL CHECK (jenis IN ('TENGAH', 'AKHIR', 'ULANG')),
    waktu_mulai TIMESTAMP NOT NULL DEFAULT NOW(),
    waktu_selesai TIMESTAMP,
    status VARCHAR(10) NOT NULL CHECK (status IN ('BERJALAN', 'SELESAI', 'GAGAL')),
    jml_mahasiswa INTEGER NOT NULL DEFAULT 0
);

-- 17. EWS: Risk Score (Append-Only)
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
    override_red BOOLEAN NOT NULL DEFAULT false,
    data_tidak_lengkap BOOLEAN NOT NULL DEFAULT false,
    detail_pemicu JSONB,
    tgl_hitung TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(scan_id, nim)
);
CREATE INDEX IF NOT EXISTS idx_risk_nim_tgl ON risk_score(nim, tgl_hitung DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scan_status ON risk_score(scan_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_detail_gin ON risk_score USING GIN (detail_pemicu);

-- Trigger append-only pada risk_score
DROP TRIGGER IF EXISTS trg_risk_score_append_only ON risk_score;
CREATE TRIGGER trg_risk_score_append_only
BEFORE UPDATE OR DELETE ON risk_score
FOR EACH ROW EXECUTE FUNCTION fn_tolak_ubah_hapus();

-- 18. Intervensi: Action Plan
CREATE TABLE IF NOT EXISTS action_plan (
    plan_id BIGSERIAL PRIMARY KEY,
    risk_id BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
    sumber VARCHAR(12) NOT NULL CHECK (sumber IN ('AI_ADVISOR', 'DOSEN')),
    deskripsi TEXT NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('BELUM', 'PROSES', 'SELESAI')),
    tgl_target DATE,
    tgl_dibuat TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_risk ON action_plan(risk_id);

-- 21. Pengguna & Autentikasi: Roles
CREATE TABLE IF NOT EXISTS roles (
    role_id SMALLSERIAL PRIMARY KEY,
    nama_role VARCHAR(30) UNIQUE NOT NULL
);

-- 22. Pengguna & Autentikasi: Users
CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nim VARCHAR(15) REFERENCES mahasiswa(nim) ON DELETE RESTRICT,
    nidn VARCHAR(20) REFERENCES dosen(nidn) ON DELETE RESTRICT,
    is_aktif BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP
);

-- 23. Pengguna & Autentikasi: User Roles (M:N)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id SMALLINT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    PRIMARY KEY(user_id, role_id)
);

-- 19. Komunikasi: Notification Log (Append-Only)
CREATE TABLE IF NOT EXISTS notification_log (
    notif_id BIGSERIAL PRIMARY KEY,
    risk_id BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
    penerima_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    kanal VARCHAR(10) NOT NULL CHECK (kanal IN ('WHATSAPP', 'EMAIL', 'DASHBOARD')),
    isi_pesan TEXT NOT NULL,
    waktu_kirim TIMESTAMP NOT NULL DEFAULT NOW(),
    status_kirim VARCHAR(20) NOT NULL CHECK (status_kirim IN ('TERKIRIM', 'GAGAL', 'MENUNGGU', 'FALLBACK_EMAIL_SENT')),
    jml_percobaan SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_notif_risk ON notification_log(risk_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notification_log(penerima_user_id);

-- 20. Intervensi: Escalation Log
CREATE TABLE IF NOT EXISTS escalation_log (
    esc_id BIGSERIAL PRIMARY KEY,
    risk_id BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
    tingkat VARCHAR(12) NOT NULL CHECK (tingkat IN ('DOSEN_WALI', 'KAPRODI')),
    nidn_tujuan VARCHAR(20) NOT NULL REFERENCES dosen(nidn) ON DELETE RESTRICT,
    waktu_eskalasi TIMESTAMP NOT NULL DEFAULT NOW(),
    status_respons VARCHAR(10) NOT NULL DEFAULT 'BELUM' CHECK (status_respons IN ('BELUM', 'DIRESPONS')),
    waktu_respons TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_esc_risk ON escalation_log(risk_id);
CREATE INDEX IF NOT EXISTS idx_esc_nidn ON escalation_log(nidn_tujuan, status_respons);

-- 21. Intervensi: Counseling Log (Append-Only)
CREATE TABLE IF NOT EXISTS counseling_log (
    konseling_id BIGSERIAL PRIMARY KEY,
    risk_id BIGINT NOT NULL REFERENCES risk_score(risk_id) ON DELETE RESTRICT,
    nidn VARCHAR(20) NOT NULL REFERENCES dosen(nidn) ON DELETE RESTRICT,
    tgl_konseling DATE NOT NULL,
    catatan TEXT NOT NULL,
    tindak_lanjut TEXT NOT NULL,
    dibuat_pada TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_konseling_risk ON counseling_log(risk_id);
CREATE INDEX IF NOT EXISTS idx_konseling_nidn ON counseling_log(nidn);

-- Trigger append-only pada counseling_log
DROP TRIGGER IF EXISTS trg_counseling_log_append_only ON counseling_log;
CREATE TRIGGER trg_counseling_log_append_only
BEFORE UPDATE OR DELETE ON counseling_log
FOR EACH ROW EXECUTE FUNCTION fn_tolak_ubah_hapus();

-- 24. Konfigurasi: Config Rule
CREATE TABLE IF NOT EXISTS config_rule (
    config_id SERIAL PRIMARY KEY,
    prodi_id INTEGER REFERENCES program_studi(prodi_id) ON DELETE RESTRICT,
    parameter VARCHAR(50) NOT NULL,
    nilai NUMERIC(8,2) NOT NULL,
    versi INTEGER NOT NULL DEFAULT 1,
    is_aktif BOOLEAN NOT NULL DEFAULT true,
    diubah_oleh BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,
    tgl_ubah TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_config_rule ON config_rule(parameter, prodi_id, is_aktif);

-- 25. Integrasi: Sync Log
CREATE TABLE IF NOT EXISTS sync_log (
    sync_id BIGSERIAL PRIMARY KEY,
    scan_id BIGINT REFERENCES scan_run(scan_id) ON DELETE RESTRICT,
    sumber VARCHAR(20) NOT NULL CHECK (sumber IN ('SIAKAD', 'KEUANGAN', 'KEMAHASISWAAN', 'SIM_TA', 'PERPUSTAKAAN', 'SMART_LAB')),
    waktu_mulai TIMESTAMP NOT NULL DEFAULT NOW(),
    waktu_selesai TIMESTAMP,
    status VARCHAR(10) NOT NULL CHECK (status IN ('BERHASIL', 'SEBAGIAN', 'GAGAL')),
    jml_record INTEGER NOT NULL DEFAULT 0,
    pesan_error TEXT
);

-- 26. Audit: Audit Log (Append-Only)
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
CREATE INDEX IF NOT EXISTS idx_audit_waktu ON audit_log(waktu DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);

-- Trigger append-only pada audit_log
DROP TRIGGER IF EXISTS trg_audit_log_append_only ON audit_log;
CREATE TRIGGER trg_audit_log_append_only
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION fn_tolak_ubah_hapus();

-- View 1: Skor Risiko Terakhir Tiap Mahasiswa
CREATE OR REPLACE VIEW v_student_risk_latest AS
SELECT DISTINCT ON (rs.nim)
    rs.risk_id,
    rs.scan_id,
    rs.nim,
    m.nama AS nama_mahasiswa,
    m.prodi_id,
    p.nama_prodi,
    m.angkatan,
    m.no_wa,
    m.email,
    rs.skor_ta,
    rs.skor_akademik,
    rs.skor_nonakademik,
    rs.skor_keuangan,
    rs.skor_total,
    rs.status,
    rs.override_red,
    rs.data_tidak_lengkap,
    rs.detail_pemicu,
    rs.tgl_hitung
FROM risk_score rs
JOIN mahasiswa m ON rs.nim = m.nim
JOIN program_studi p ON m.prodi_id = p.prodi_id
ORDER BY rs.nim, rs.tgl_hitung DESC;

-- View 2: Analitik KTW & Distribusi Risiko per Prodi
CREATE OR REPLACE VIEW v_ktw_analytics AS
SELECT 
    m.prodi_id,
    p.nama_prodi,
    COUNT(DISTINCT m.nim) AS total_mahasiswa,
    COUNT(DISTINCT CASE WHEN v.status = 'HIJAU' THEN m.nim END) AS total_hijau,
    COUNT(DISTINCT CASE WHEN v.status = 'KUNING' THEN m.nim END) AS total_kuning,
    COUNT(DISTINCT CASE WHEN v.status = 'MERAH' THEN m.nim END) AS total_merah,
    ROUND(
        (COUNT(DISTINCT CASE WHEN v.status = 'HIJAU' THEN m.nim END)::NUMERIC / 
         NULLIF(COUNT(DISTINCT m.nim), 0) * 100), 2
    ) AS persentase_ktw_potensial
FROM mahasiswa m
JOIN program_studi p ON m.prodi_id = p.prodi_id
LEFT JOIN v_student_risk_latest v ON m.nim = v.nim
WHERE m.status_aktif = true
GROUP BY m.prodi_id, p.nama_prodi;

-- View 3: Analisis Bottleneck TA
CREATE OR REPLACE VIEW v_ta_bottlenecks AS
SELECT 
    m.prodi_id,
    p.nama_prodi,
    COUNT(DISTINCT CASE WHEN tm.tahap = 'PROPOSAL' AND tm.status = 'BERJALAN' THEN ta.ta_id END) AS proposal_stuck,
    COUNT(DISTINCT CASE WHEN tm.tahap = 'SEMPRO' AND tm.status = 'BERJALAN' THEN ta.ta_id END) AS sempro_stuck,
    COUNT(DISTINCT CASE WHEN tm.tahap = 'BIMBINGAN' AND tm.status = 'BERJALAN' THEN ta.ta_id END) AS bimbingan_active,
    COUNT(DISTINCT CASE WHEN tm.tahap = 'SEMHAS' AND tm.status = 'BERJALAN' THEN ta.ta_id END) AS semhas_stuck,
    COUNT(DISTINCT CASE WHEN tm.tahap = 'SIDANG' AND tm.status = 'BERJALAN' THEN ta.ta_id END) AS sidang_stuck,
    COUNT(DISTINCT CASE WHEN tm.tahap = 'BEBAS_PUSTAKA' AND tm.status = 'BERJALAN' THEN ta.ta_id END) AS perpus_stuck,
    COUNT(DISTINCT CASE WHEN ta.jml_perpanjangan >= 2 THEN ta.ta_id END) AS ta_perpanjangan_kritis
FROM tugas_akhir ta
JOIN mahasiswa m ON ta.nim = m.nim
JOIN program_studi p ON m.prodi_id = p.prodi_id
LEFT JOIN ta_milestone tm ON ta.ta_id = tm.ta_id AND tm.status = 'BERJALAN'
GROUP BY m.prodi_id, p.nama_prodi;
