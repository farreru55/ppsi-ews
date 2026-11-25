import { query } from '../../config/database';

export class FinanceService {
  /**
   * Mengambil status pelunasan UKT/SPP mahasiswa (BRL-14: privasi keuangan tanpa nominal Rupiah).
   */
  static async getStudentFinanceStatus(nim: string) {
    const res = await query(
      `SELECT sk.keuangan_id, sk.status, sk.memblokir_pendaftaran, sk.tgl_ambil,
              s.tahun_ajaran, s.jenis as jenis_semester
       FROM status_keuangan sk
       JOIN semester s ON sk.semester_id = s.semester_id
       WHERE sk.nim = $1
       ORDER BY sk.tgl_ambil DESC LIMIT 1`,
      [nim]
    );

    if (res.rows.length === 0) {
      return {
        status: 'LUNAS',
        memblokirPendaftaran: false,
        keterangan: 'Tidak ada tagihan tertunggak',
      };
    }

    const row = res.rows[0];
    return {
      status: row.status as 'LUNAS' | 'MENUNGGAK',
      memblokirPendaftaran: Boolean(row.memblokir_pendaftaran),
      semester: `${row.tahun_ajaran} (${row.jenis_semester})`,
      tglPembaruan: row.tgl_ambil,
    };
  }
}
