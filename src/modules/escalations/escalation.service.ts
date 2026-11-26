import { query } from '../../config/database';
import { recordAuditLog } from '../../utils/logger.util';

export class EscalationService {
  /**
   * Menjalankan evaluasi berkala untuk membuat eskalasi otomatis N=3 hari dan M=14 hari (BRL-11).
   * Eskalasi disimpan di tabel `notifikasi` dengan jenis 'ESKALASI_DOSEN_WALI' atau 'ESKALASI_KAPRODI'.
   */
  static async evaluateEscalations() {
    // 1. Ambil config N dan M
    const configRes = await query(
      `SELECT parameter, nilai FROM config_rule WHERE parameter IN ('N_HARI', 'M_HARI') AND is_aktif = true`
    );
    let nHari = 3;
    let mHari = 14;
    for (const r of configRes.rows) {
      if (r.parameter === 'N_HARI') nHari = parseFloat(r.nilai);
      if (r.parameter === 'M_HARI') mHari = parseFloat(r.nilai);
    }

    const createdEscalations: any[] = [];

    // 2. Evaluasi Level 1: Mahasiswa Kuning/Merah yang tgl_hitung >= N hari lalu dan belum ada eskalasi Level 1
    const level1Candidates = await query(
      `SELECT rs.risk_id, rs.nim, rs.status, rs.tgl_hitung, rb.nidn as nidn_doswal,
              u.user_id as penerima_user_id
       FROM risk_score rs
       JOIN relasi_bimbingan rb ON rs.nim = rb.nim AND rb.jenis = 'DOSEN_WALI' AND (rb.tgl_selesai IS NULL OR rb.tgl_selesai >= CURRENT_DATE)
       JOIN users u ON u.nidn = rb.nidn
       WHERE rs.status IN ('KUNING', 'MERAH')
         AND rs.tgl_hitung <= (NOW() - ($1 || ' days')::INTERVAL)
         AND NOT EXISTS (
           SELECT 1 FROM notifikasi n WHERE n.risk_id = rs.risk_id AND n.jenis = 'ESKALASI_DOSEN_WALI'
         )
         AND NOT EXISTS (
           SELECT 1 FROM counseling_log cl WHERE cl.risk_id = rs.risk_id
         )`,
      [nHari]
    );

    for (const row of level1Candidates.rows) {
      const ins = await query(
        `INSERT INTO notifikasi (risk_id, penerima_user_id, jenis, kanal, isi_pesan, status_kirim)
         VALUES ($1, $2, 'ESKALASI_DOSEN_WALI', 'SISTEM', $3, 'TERKIRIM')
         RETURNING notif_id, risk_id, jenis, penerima_user_id, waktu_kirim, status_kirim`,
        [
          row.risk_id,
          row.penerima_user_id,
          `Eskalasi Level 1: Mahasiswa ${row.nim} berstatus ${row.status} selama >= ${nHari} hari tanpa counseling.`,
        ]
      );
      createdEscalations.push({ ...ins.rows[0], tingkat: 'DOSEN_WALI', nim: row.nim });
    }

    // 3. Evaluasi Level 2: Eskalasi Dosen Wali yang belum ada counseling >= M hari, teruskan ke Kaprodi
    const level2Candidates = await query(
      `SELECT n.notif_id, n.risk_id, rs.nim, u_kaprodi.user_id as penerima_user_id
       FROM notifikasi n
       JOIN risk_score rs ON n.risk_id = rs.risk_id
       JOIN mahasiswa m ON rs.nim = m.nim
       JOIN users u_kaprodi ON u_kaprodi.nidn IS NOT NULL
       JOIN user_roles ur ON u_kaprodi.user_id = ur.user_id
       JOIN roles r ON ur.role_id = r.role_id AND r.nama_role = 'KAPRODI'
       JOIN dosen d_kaprodi ON u_kaprodi.nidn = d_kaprodi.nidn AND d_kaprodi.prodi_id = m.prodi_id
       WHERE n.jenis = 'ESKALASI_DOSEN_WALI'
         AND n.waktu_kirim <= (NOW() - ($1 || ' days')::INTERVAL)
         AND NOT EXISTS (
           SELECT 1 FROM notifikasi n2 WHERE n2.risk_id = n.risk_id AND n2.jenis = 'ESKALASI_KAPRODI'
         )
         AND NOT EXISTS (
           SELECT 1 FROM counseling_log cl WHERE cl.risk_id = n.risk_id
         )`,
      [mHari]
    );

    for (const row of level2Candidates.rows) {
      const ins = await query(
        `INSERT INTO notifikasi (risk_id, penerima_user_id, jenis, kanal, isi_pesan, status_kirim)
         VALUES ($1, $2, 'ESKALASI_KAPRODI', 'SISTEM', $3, 'TERKIRIM')
         RETURNING notif_id, risk_id, jenis, penerima_user_id, waktu_kirim, status_kirim`,
        [
          row.risk_id,
          row.penerima_user_id,
          `Eskalasi Level 2 ke Kaprodi: Mahasiswa ${row.nim} belum ditangani dosen wali selama >= ${mHari} hari.`,
        ]
      );
      createdEscalations.push({ ...ins.rows[0], tingkat: 'KAPRODI', nim: row.nim });
    }

    return createdEscalations;
  }

  static async getEscalations(filters: {
    tingkat?: string;
    nidn?: string;
    statusRespons?: string;
    prodiId?: number;
    limit?: number;
    offset?: number;
  }) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let whereClauses = ['1=1'];
    const params: any[] = [];

    // Filter berdasarkan jenis eskalasi
    if (filters.tingkat) {
      const jenisMap: Record<string, string> = {
        DOSEN_WALI: 'ESKALASI_DOSEN_WALI',
        KAPRODI: 'ESKALASI_KAPRODI',
      };
      params.push(jenisMap[filters.tingkat] || filters.tingkat);
      whereClauses.push(`n.jenis = $${params.length}`);
    } else {
      // Default: tampilkan semua jenis eskalasi
      whereClauses.push(`n.jenis IN ('ESKALASI_DOSEN_WALI', 'ESKALASI_KAPRODI')`);
    }

    if (filters.prodiId) {
      params.push(filters.prodiId);
      whereClauses.push(`m.prodi_id = $${params.length}`);
    }

    const whereStr = whereClauses.join(' AND ');
    params.push(limit, offset);

    const sql = `
      SELECT
        n.notif_id as esc_id,
        n.risk_id,
        n.jenis,
        CASE n.jenis
          WHEN 'ESKALASI_DOSEN_WALI' THEN 'DOSEN_WALI'
          WHEN 'ESKALASI_KAPRODI' THEN 'KAPRODI'
          ELSE n.jenis
        END as tingkat,
        u.nidn as nidn_tujuan,
        d.nama as nama_dosen_tujuan,
        n.waktu_kirim as waktu_eskalasi,
        n.status_respons,
        n.waktu_respons,
        n.isi_pesan as keterangan,
        rs.nim,
        m.nama as nama,
        EXTRACT(YEAR FROM m.tgl_masuk)::int as angkatan,
        p.nama_prodi,
        rs.skor_total,
        rs.status as status_risiko,
        rs.detail_pemicu,
        EXTRACT(DAY FROM (NOW() - n.waktu_kirim))::int as hari_eskalasi
      FROM notifikasi n
      JOIN users u ON n.penerima_user_id = u.user_id
      LEFT JOIN dosen d ON u.nidn = d.nidn
      JOIN risk_score rs ON n.risk_id = rs.risk_id
      JOIN mahasiswa m ON rs.nim = m.nim
      JOIN program_studi p ON m.prodi_id = p.prodi_id
      WHERE ${whereStr}
      ORDER BY n.waktu_kirim DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const res = await query(sql, params);
    return res.rows;
  }

  static async updateEscalationStatus(
    escId: number,
    statusRespons: 'DIRESPONS' | 'BELUM',
    userId?: number,
    catatanTindakLanjut?: string
  ) {
    const res = await query(
      `UPDATE notifikasi
       SET status_respons = $1, waktu_respons = NOW()
       WHERE notif_id = $2 AND jenis IN ('ESKALASI_DOSEN_WALI', 'ESKALASI_KAPRODI')
       RETURNING notif_id as esc_id, risk_id, jenis as tingkat, penerima_user_id, status_respons, waktu_respons`,
      [statusRespons, escId]
    );

    if (res.rows.length === 0) {
      const error: any = new Error('Eskalasi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updated = res.rows[0];

    await recordAuditLog({
      userId,
      aksi: 'UPDATE_ESCALATION_STATUS',
      namaTabel: 'notifikasi',
      recordId: String(escId),
      dataBaru: { ...updated, catatanTindakLanjut },
    });

    return updated;
  }
}
