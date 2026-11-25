"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounselingService = void 0;
const database_1 = require("../../config/database");
const logger_util_1 = require("../../utils/logger.util");
class CounselingService {
    /**
     * Mencatat hasil konseling dosen (append-only, BRL-16).
     */
    static async createCounseling(dto) {
        const res = await (0, database_1.query)(`INSERT INTO counseling_log (risk_id, nidn, tgl_konseling, catatan, tindak_lanjut)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING konseling_id, risk_id, nidn, tgl_konseling, catatan, tindak_lanjut`, [dto.riskId, dto.nidn, dto.tglKonseling, dto.catatan, dto.tindakLanjut]);
        const created = res.rows[0];
        // Otomatis tandai eskalasi yang belum direspons menjadi DIRESPONS
        await (0, database_1.query)(`UPDATE escalation_log 
       SET status_respons = 'DIRESPONS', waktu_respons = NOW()
       WHERE risk_id = $1 AND status_respons = 'BELUM'`, [dto.riskId]);
        await (0, logger_util_1.recordAuditLog)({
            userId: dto.userId,
            aksi: 'CREATE_COUNSELING_LOG',
            namaTabel: 'counseling_log',
            recordId: String(created.konseling_id),
            dataBaru: created,
        });
        return created;
    }
    static async getCounselingByStudent(nim) {
        const res = await (0, database_1.query)(`SELECT c.konseling_id, c.risk_id, c.tgl_konseling, c.catatan, c.tindak_lanjut,
              d.nidn, d.nama as nama_dosen,
              rs.skor_total, rs.status as status_risiko
       FROM counseling_log c
       JOIN dosen d ON c.nidn = d.nidn
       JOIN risk_score rs ON c.risk_id = rs.risk_id
       WHERE rs.nim = $1
       ORDER BY c.konseling_id DESC`, [nim]);
        return res.rows;
    }
}
exports.CounselingService = CounselingService;
