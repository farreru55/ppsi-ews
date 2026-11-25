import bcrypt from 'bcryptjs';
import { query, pool } from '../config/database';
import { RiskService } from '../modules/risk/risk.service';
import { logger } from '../utils/logger.util';

export const seedData = async () => {
  logger.info('Memulai seeding data realistis EWS Universitas Dinamika...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Program Studi
  await query(`
    INSERT INTO program_studi (prodi_id, kode_prodi, nama_prodi, fakultas) VALUES
      (1, 'SI', 'S1 Sistem Informasi', 'Fakultas Teknologi dan Informatika'),
      (2, 'TI', 'S1 Teknik Informatika', 'Fakultas Teknologi dan Informatika')
    ON CONFLICT (prodi_id) DO NOTHING;
  `);

  // 2. Semester
  await query(`
    INSERT INTO semester (semester_id, tahun_ajaran, jenis, tgl_mulai, tgl_selesai, is_aktif) VALUES
      (1, '2025/2026', 'GENAP', '2026-02-01', '2026-07-31', false),
      (2, '2026/2027', 'GANJIL', '2026-08-01', '2027-01-31', true)
    ON CONFLICT (semester_id) DO NOTHING;
  `);

  // 3. Roles
  await query(`
    INSERT INTO roles (role_id, nama_role) VALUES
      (1, 'MAHASISWA'),
      (2, 'DOSEN_WALI'),
      (3, 'DOSBING_TA'),
      (4, 'KAPRODI'),
      (5, 'KOORD_TA'),
      (6, 'ADMIN')
    ON CONFLICT (role_id) DO NOTHING;
  `);

  // 4. Dosen
  await query(`
    INSERT INTO dosen (nidn, nama, prodi_id, email, no_wa) VALUES
      ('0701018001', 'Dr. Teguh Sutanto, M.Kom', 1, 'teguh@dinamika.ac.id', '628113334441'),
      ('0715058501', 'Anik Vega Vitianingsih, M.T', 1, 'vega@dinamika.ac.id', '628113334442'),
      ('0720088801', 'Bagus Satrio Wicaksono, M.Kom', 1, 'bagus.satrio@dinamika.ac.id', '628113334443'),
      ('0712038702', 'Diana Rahmawati, M.Kom', 1, 'diana@dinamika.ac.id', '628113334444')
    ON CONFLICT (nidn) DO NOTHING;
  `);

  // 5. Mahasiswa
  await query(`
    INSERT INTO mahasiswa (nim, nama, prodi_id, tgl_masuk, status_aktif, no_wa, email) VALUES
      ('26410105001', 'Bagus Tilas Hidayatullah', 1, '2024-09-01', true, '6281234567801', '26410105001@dinamika.ac.id'),
      ('24410100016', 'Farrel Endra Asrory', 1, '2021-09-01', true, '6281234567802', '24410100016@dinamika.ac.id'),
      ('24410100007', 'Michael Christopher', 1, '2020-09-01', true, '6281234567803', '24410100007@dinamika.ac.id'),
      ('24410100013', 'Novian Ardi Zulfikar', 1, '2022-09-01', true, '6281234567804', '24410100013@dinamika.ac.id'),
      ('24410100015', 'Dimitri Yusuf Prabowo', 1, '2021-09-01', true, '6281234567805', '24410100015@dinamika.ac.id'),
      ('24410100017', 'Rafi Firdaus Fauzi', 1, '2021-09-01', true, '6281234567806', '24410100017@dinamika.ac.id')
    ON CONFLICT (nim) DO NOTHING;
  `);

  // 6. Users & User Roles
  const users = [
    { username: 'admin', nidn: null, nim: null, roles: [6] },
    { username: 'kaprodi.si', nidn: '0701018001', nim: null, roles: [4] },
    { username: 'koord.ta', nidn: '0715058501', nim: null, roles: [5] },
    { username: 'doswal.bagus', nidn: '0720088801', nim: null, roles: [2, 3] },
    { username: 'doswal.diana', nidn: '0712038702', nim: null, roles: [2] },
    { username: '26410105001', nidn: null, nim: '26410105001', roles: [1] },
    { username: '24410100016', nidn: null, nim: '24410100016', roles: [1] },
    { username: '24410100007', nidn: null, nim: '24410100007', roles: [1] },
    { username: '24410100013', nidn: null, nim: '24410100013', roles: [1] },
    { username: '24410100015', nidn: null, nim: '24410100015', roles: [1] },
    { username: '24410100017', nidn: null, nim: '24410100017', roles: [1] },
  ];

  for (const u of users) {
    const res = await query(
      `INSERT INTO users (username, password_hash, nim, nidn, is_aktif)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (username) DO UPDATE SET password_hash = $2
       RETURNING user_id`,
      [u.username, passwordHash, u.nim, u.nidn]
    );

    const userId = res.rows[0].user_id;
    for (const roleId of u.roles) {
      await query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, roleId]
      );
    }
  }

  // 7. Relasi Bimbingan
  await query(`
    INSERT INTO relasi_bimbingan (nim, nidn, jenis, tgl_mulai) VALUES
      ('26410105001', '0720088801', 'DOSEN_WALI', '2024-09-01'),
      ('24410100007', '0720088801', 'DOSEN_WALI', '2020-09-01'),
      ('24410100007', '0720088801', 'DOSBING_TA', '2024-02-01'),
      ('24410100013', '0720088801', 'DOSEN_WALI', '2022-09-01'),
      ('24410100015', '0720088801', 'DOSEN_WALI', '2021-09-01'),
      ('24410100015', '0720088801', 'DOSBING_TA', '2024-08-01'),
      ('24410100016', '0712038702', 'DOSEN_WALI', '2021-09-01'),
      ('24410100017', '0712038702', 'DOSEN_WALI', '2021-09-01')
    ON CONFLICT DO NOTHING;
  `);

  // 8. Tugas Akhir & Milestone & Bimbingan
  // Mahasiswa 24410100007: TA diperpanjang 2 semester (Memicu BRL-04 Override jika SSKM < ambang)
  const ta1 = await query(`
    INSERT INTO tugas_akhir (nim, jenis, judul, semester_mulai_id, jml_perpanjangan, tgl_bebas_pustaka)
    VALUES ('24410100007', 'TA', 'Rancang Bangun EWS Smart University', 1, 2, NULL)
    ON CONFLICT DO NOTHING RETURNING ta_id;
  `);

  if (ta1.rows.length > 0) {
    const taId = ta1.rows[0].ta_id;
    await query(`
      INSERT INTO ta_milestone (ta_id, tahap, tgl_mulai, status) VALUES
        (${taId}, 'PROPOSAL', '2024-02-15', 'SELESAI'),
        (${taId}, 'SEMPRO', '2024-04-10', 'SELESAI'),
        (${taId}, 'BIMBINGAN', '2024-05-01', 'BERJALAN')
      ON CONFLICT DO NOTHING;
    `);
    // 3x bimbingan (kurang dari 8)
    await query(`
      INSERT INTO bimbingan_log (ta_id, nidn, tgl_bimbingan, topik, terverifikasi) VALUES
        (${taId}, '0720088801', '2024-05-10', 'Revisi Bab 1', true),
        (${taId}, '0720088801', '2024-06-02', 'Metodologi Penelitian', true),
        (${taId}, '0720088801', '2024-07-01', 'Desain Arsitektur', true)
      ON CONFLICT DO NOTHING;
    `);
  }

  // Mahasiswa 24410100015: Bimbingan macet > 30 hari
  const ta2 = await query(`
    INSERT INTO tugas_akhir (nim, jenis, judul, semester_mulai_id, jml_perpanjangan, tgl_bebas_pustaka)
    VALUES ('24410100015', 'TA', 'Sistem Pakar Diagnosa Penyakit', 1, 1, NULL)
    ON CONFLICT DO NOTHING RETURNING ta_id;
  `);

  if (ta2.rows.length > 0) {
    const taId = ta2.rows[0].ta_id;
    await query(`
      INSERT INTO ta_milestone (ta_id, tahap, tgl_mulai, status) VALUES
        (${taId}, 'PROPOSAL', '2024-08-01', 'SELESAI'),
        (${taId}, 'BIMBINGAN', '2024-09-01', 'BERJALAN')
      ON CONFLICT DO NOTHING;
    `);
    // Log bimbingan terakhir 45 hari lalu
    await query(`
      INSERT INTO bimbingan_log (ta_id, nidn, tgl_bimbingan, topik, terverifikasi) VALUES
        (${taId}, '0720088801', CURRENT_DATE - INTERVAL '45 days', 'Konsultasi Bab 2', true)
      ON CONFLICT DO NOTHING;
    `);
  }

  // 9. Mata Kuliah (Master)
  await query(`
    INSERT INTO mata_kuliah (kode_mk, nama_mk, sks) VALUES
      ('SI101', 'Pengembangan Sistem Informasi', 3),
      ('SI102', 'Basis Data Lanjut', 3),
      ('SI301', 'Arsitektur Enterprise', 3),
      ('SI302', 'Tata Kelola TI', 3)
    ON CONFLICT (kode_mk) DO NOTHING;
  `);

  // 10. Scan Run awal untuk snapshot
  const scanRes = await query(`
    INSERT INTO scan_run (semester_id, jenis, status, jml_mahasiswa)
    VALUES (2, 'ULANG', 'SELESAI', 6)
    RETURNING scan_id;
  `);
  const scanId = scanRes.rows[0].scan_id;

  // 11. Snapshot Mahasiswa (Gabungan Akademik, SSKM, Event, Keuangan tanpa nominal BRL-14)
  await query(`
    INSERT INTO snapshot_mahasiswa (
      scan_id, nim, sks_lulus, ipk, jml_nilai_d, jml_nilai_e, skor_toefl, sisa_masa_studi,
      total_poin_sskm, jml_event_wajib_terlewat, status_ukt, memblokir_pendaftaran
    ) VALUES
      (${scanId}, '26410105001', 45, 3.85, 0, 0, 500, 6, 180, 0, 'LUNAS', false),
      (${scanId}, '24410100016', 130, 3.40, 1, 0, 480, 2, 120, 0, 'LUNAS', false),
      (${scanId}, '24410100007', 132, 2.75, 2, 1, 410, 1, 70, 1, 'LUNAS', false),
      (${scanId}, '24410100013', 85, 2.90, 1, 0, 430, 4, 90, 0, 'LUNAS', false),
      (${scanId}, '24410100015', 125, 3.10, 0, 0, 460, 2, 110, 0, 'LUNAS', false),
      (${scanId}, '24410100017', 128, 3.20, 0, 0, 470, 2, 105, 0, 'MENUNGGAK', true)
    ON CONFLICT (scan_id, nim) DO NOTHING;
  `);

  // 12. Presensi Matkul
  await query(`
    INSERT INTO presensi_matkul (scan_id, nim, kode_mk, jml_pertemuan, jml_hadir) VALUES
      (${scanId}, '26410105001', 'SI101', 14, 14),
      (${scanId}, '26410105001', 'SI102', 14, 13),
      (${scanId}, '24410100013', 'SI301', 14, 9),
      (${scanId}, '24410100013', 'SI302', 14, 8)
    ON CONFLICT (scan_id, nim, kode_mk) DO NOTHING;
  `);

  // 13. Progres Praktikum Smart Laboratory
  await query(`
    INSERT INTO progres_praktikum (scan_id, nim, kode_praktikum, status_lulus, jml_penggunaan_lab) VALUES
      (${scanId}, '26410105001', 'LAB-SI-01', true, 10),
      (${scanId}, '24410100016', 'LAB-SI-02', true, 12),
      (${scanId}, '24410100007', 'LAB-SI-02', false, 4),
      (${scanId}, '24410100015', 'LAB-SI-02', true, 14)
    ON CONFLICT (scan_id, nim, kode_praktikum) DO NOTHING;
  `);

  // 14. Jalankan kalkulasi batch scan awal agar tabel risk_score terisi!
  logger.info('Menjalankan pemindaian kalkulasi risiko awal untuk 6 mahasiswa seed...');
  const scanResult = await RiskService.runBatchScan('ULANG', 2);
  logger.info(`Pemindaian awal selesai. ${scanResult.jmlMahasiswa} mahasiswa terhitung.`);

  logger.info('Seeding database EWS berhasil diselesaikan!');
};

if (require.main === module) {
  seedData()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
