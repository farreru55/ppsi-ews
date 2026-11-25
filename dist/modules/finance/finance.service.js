"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const database_1 = require("../../config/database");
class FinanceService {
    /**
     * Mengambil status pelunasan UKT/SPP mahasiswa (BRL-14: privasi keuangan tanpa nominal Rupiah).
     */
    static async getStudentFinanceStatus(nim) {
        const res = await (0, database_1.query)(`SELECT sk.keuangan_id, sk.status, sk.memblokir_pendaftaran, sk.tgl_ambil,
              s.tahun_ajaran, s.jenis as jenis_semester
       FROM snapshot_mahasiswa sk
       JOIN scan_run sr ON sk.scan_id = sr.scan_id
       JOIN semester s ON sr.semester_id = s.semester_id
       WHERE sk.nim = $1
       ORDER BY sk.tgl_ambil DESC LIMIT 1`, [nim]);
        if (res.rows.length === 0) {
            return {
                status: 'LUNAS',
                memblokirPendaftaran: false,
                keterangan: 'Tidak ada tagihan tertunggak',
            };
        }
        const row = res.rows[0];
        return {
            status: row.status,
            memblokirPendaftaran: Boolean(row.memblokir_pendaftaran),
            semester: `${row.tahun_ajaran} (${row.jenis_semester})`,
            tglPembaruan: row.tgl_ambil,
        };
    }
}
exports.FinanceService = FinanceService;
