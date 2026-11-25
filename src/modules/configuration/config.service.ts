import { query } from '../../config/database';
import { recordAuditLog } from '../../utils/logger.util';

export class ConfigService {
  static async getAllConfigs(prodiId?: number | null) {
    const res = await query(
      `SELECT config_id, prodi_id, parameter, nilai, versi, is_aktif, diubah_oleh, tgl_ubah
       FROM config_rule
       WHERE is_aktif = true AND (prodi_id = $1 OR prodi_id IS NULL)
       ORDER BY parameter ASC, prodi_id NULLS LAST`,
      [prodiId || null]
    );
    return res.rows;
  }

  static async updateConfig(
    parameter: string,
    nilai: number,
    prodiId?: number | null,
    userId?: number
  ) {
    // 1. Ambil config lama
    const oldRes = await query(
      `SELECT config_id, nilai, versi FROM config_rule
       WHERE parameter = $1 AND (prodi_id = $2 OR (prodi_id IS NULL AND $2 IS NULL)) AND is_aktif = true
       LIMIT 1`,
      [parameter, prodiId || null]
    );

    const oldRecord = oldRes.rows[0];
    const newVersion = oldRecord ? oldRecord.versi + 1 : 1;

    // 2. Non-aktifkan versi lama jika ada
    if (oldRecord) {
      await query(`UPDATE config_rule SET is_aktif = false WHERE config_id = $1`, [oldRecord.config_id]);
    }

    // 3. Masukkan versi baru
    const insertRes = await query(
      `INSERT INTO config_rule (prodi_id, parameter, nilai, versi, is_aktif, diubah_oleh, tgl_ubah)
       VALUES ($1, $2, $3, $4, true, $5, NOW())
       RETURNING config_id, prodi_id, parameter, nilai, versi, is_aktif, tgl_ubah`,
      [prodiId || null, parameter, nilai, newVersion, userId || null]
    );

    const updated = insertRes.rows[0];

    await recordAuditLog({
      userId,
      aksi: 'UPDATE_CONFIG_RULE',
      namaTabel: 'config_rule',
      recordId: String(updated.config_id),
      dataLama: oldRecord ? { nilai: oldRecord.nilai, versi: oldRecord.versi } : null,
      dataBaru: { nilai: updated.nilai, versi: updated.versi, parameter, prodiId },
    });

    return updated;
  }
}
