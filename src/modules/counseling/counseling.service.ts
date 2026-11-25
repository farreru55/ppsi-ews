import { query } from '../../config/database';
import { recordAuditLog } from '../../utils/logger.util';

export interface CreateCounselingDto {
  riskId: number;
  nidn: string;
  tglKonseling: string;
  catatan: string;
  tindakLanjut: string;
  userId?: number;
}

export class CounselingService {
  /**
   * Mencatat hasil konseling dosen (append-only, BRL-16).
   */
  static async createCounseling(dto: CreateCounselingDto) {
    const res = await query(
      `INSERT INTO counseling_log (risk_id, nidn, tgl_konseling, catatan, tindak_lanjut)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING konseling_id, risk_id, nidn, tgl_konseling, catatan, tindak_lanjut`,
      [dto.riskId, dto.nidn, dto.tglKonseling, dto.catatan, dto.tindakLanjut]
    );

    const created = res.rows[0];

    // Otomatis tandai eskalasi yang belum direspons menjadi DIRESPONS
    await query(
      `UPDATE escalation_log 
       SET status_respons = 'DIRESPONS', waktu_respons = NOW()
       WHERE risk_id = $1 AND status_respons = 'BELUM'`,
      [dto.riskId]
    );

    await recordAuditLog({
      userId: dto.userId,
      aksi: 'CREATE_COUNSELING_LOG',
      namaTabel: 'counseling_log',
      recordId: String(created.konseling_id),
      dataBaru: created,
    });

    return created;
  }

  static async getCounselingByStudent(nim: string) {
    const res = await query(
      `SELECT c.konseling_id, c.risk_id, c.tgl_konseling, c.catatan, c.tindak_lanjut,
              d.nidn, d.nama as nama_dosen,
              rs.skor_total, rs.status as status_risiko
       FROM counseling_log c
       JOIN dosen d ON c.nidn = d.nidn
       JOIN risk_score rs ON c.risk_id = rs.risk_id
       WHERE rs.nim = $1
       ORDER BY c.konseling_id DESC`,
      [nim]
    );
    return res.rows;
  }
}
