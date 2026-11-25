import { query } from '../../config/database';
import { recordAuditLog } from '../../utils/logger.util';

export class EscalationService {
  /**
   * Menjalankan evaluasi berkala untuk membuat eskalasi otomatis N=3 hari dan M=14 hari (BRL-11).
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

    const createdEscalations = [];

    // 2. Evaluasi Level 1: Mahasiswa Kuning/Merah yang tgl_hitung >= N hari lalu dan belum ada eskalasi Level 1
    const level1Candidates = await query(
      `SELECT rs.risk_id, rs.nim, rs.status, rs.tgl_hitung, rb.nidn as nidn_doswal
       FROM risk_score rs
       JOIN relasi_bimbingan rb ON rs.nim = rb.nim AND rb.jenis = 'DOSEN_WALI' AND (rb.tgl_selesai IS NULL OR rb.tgl_selesai >= CURRENT_DATE)
       WHERE rs.status IN ('KUNING', 'MERAH')
         AND rs.tgl_hitung <= (NOW() - ($1 || ' days')::INTERVAL)
         AND NOT EXISTS (
           SELECT 1 FROM escalation_log el WHERE el.risk_id = rs.risk_id AND el.tingkat = 'DOSEN_WALI'
         )
         AND NOT EXISTS (
           SELECT 1 FROM counseling_log cl WHERE cl.risk_id = rs.risk_id
         )`,
      [nHari]
    );

    for (const row of level1Candidates.rows) {
      const ins = await query(
        `INSERT INTO escalation_log (risk_id, tingkat, nidn_tujuan, waktu_eskalasi, status_respons)
         VALUES ($1, 'DOSEN_WALI', $2, NOW(), 'BELUM')
         RETURNING esc_id, risk_id, tingkat, nidn_tujuan, waktu_eskalasi, status_respons`,
        [row.risk_id, row.nidn_doswal]
      );
      createdEscalations.push(ins.rows[0]);
    }

    // 3. Evaluasi Level 2: Eskalasi Level 1 yang sudah >= M hari belum direspons, teruskan ke Kaprodi
    const level2Candidates = await query(
      `SELECT el.esc_id, el.risk_id, rs.nim, d_kaprodi.nidn as nidn_kaprodi
       FROM escalation_log el
       JOIN risk_score rs ON el.risk_id = rs.risk_id
       JOIN mahasiswa m ON rs.nim = m.nim
       JOIN users u_kaprodi ON u_kaprodi.nidn IS NOT NULL
       JOIN user_roles ur ON u_kaprodi.user_id = ur.user_id
       JOIN roles r ON ur.role_id = r.role_id AND r.nama_role = 'KAPRODI'
       JOIN dosen d_kaprodi ON u_kaprodi.nidn = d_kaprodi.nidn AND d_kaprodi.prodi_id = m.prodi_id
       WHERE el.tingkat = 'DOSEN_WALI'
         AND el.status_respons = 'BELUM'
         AND el.waktu_eskalasi <= (NOW() - ($1 || ' days')::INTERVAL)
         AND NOT EXISTS (
           SELECT 1 FROM escalation_log el2 WHERE el2.risk_id = el.risk_id AND el2.tingkat = 'KAPRODI'
         )`,
      [mHari]
    );

    for (const row of level2Candidates.rows) {
      const ins = await query(
        `INSERT INTO escalation_log (risk_id, tingkat, nidn_tujuan, waktu_eskalasi, status_respons)
         VALUES ($1, 'KAPRODI', $2, NOW(), 'BELUM')
         RETURNING esc_id, risk_id, tingkat, nidn_tujuan, waktu_eskalasi, status_respons`,
        [row.risk_id, row.nidn_kaprodi]
      );
      createdEscalations.push(ins.rows[0]);
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

    if (filters.tingkat) {
      params.push(filters.tingkat);
      whereClauses.push(`el.tingkat = $${params.length}`);
    }

    if (filters.nidn) {
      params.push(filters.nidn);
      whereClauses.push(`el.nidn_tujuan = $${params.length}`);
    }

    if (filters.statusRespons) {
      params.push(filters.statusRespons);
      whereClauses.push(`el.status_respons = $${params.length}`);
    }

    if (filters.prodiId) {
      params.push(filters.prodiId);
      whereClauses.push(`m.prodi_id = $${params.length}`);
    }

    const whereStr = whereClauses.join(' AND ');

    params.push(limit, offset);
    const sql = `
      SELECT el.esc_id, el.risk_id, el.tingkat, el.nidn_tujuan, el.waktu_eskalasi, el.status_respons, el.waktu_respons,
             d.nama as nama_dosen_tujuan,
             rs.nim, m.nama as nama_mahasiswa, m.angkatan, p.nama_prodi,
             rs.skor_total, rs.status as status_risiko, rs.detail_pemicu
      FROM escalation_log el
      JOIN dosen d ON el.nidn_tujuan = d.nidn
      JOIN risk_score rs ON el.risk_id = rs.risk_id
      JOIN mahasiswa m ON rs.nim = m.nim
      JOIN program_studi p ON m.prodi_id = p.prodi_id
      WHERE ${whereStr}
      ORDER BY el.waktu_eskalasi DESC
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
      `UPDATE escalation_log
       SET status_respons = $1, waktu_respons = NOW()
       WHERE esc_id = $2
       RETURNING esc_id, risk_id, tingkat, nidn_tujuan, status_respons, waktu_respons`,
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
      namaTabel: 'escalation_log',
      recordId: String(escId),
      dataBaru: { ...updated, catatanTindakLanjut },
    });

    return updated;
  }
}
