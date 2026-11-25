"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsService = void 0;
const database_1 = require("../../config/database");
const milestone_service_1 = require("../milestones/milestone.service");
const academic_service_1 = require("../academic/academic.service");
const finance_service_1 = require("../finance/finance.service");
const action_plan_service_1 = require("../action-plans/action-plan.service");
class StudentsService {
    /**
     * Mengambil detail lengkap status risiko seorang mahasiswa.
     */
    static async getStudentRiskDetails(nim) {
        // 1. Ambil data mahasiswa
        const mhsRes = await (0, database_1.query)(`SELECT m.nim, m.nama, m.prodi_id, p.nama_prodi, m.angkatan, m.status_aktif, m.no_wa, m.email
       FROM mahasiswa m
       JOIN program_studi p ON m.prodi_id = p.prodi_id
       WHERE m.nim = $1`, [nim]);
        if (mhsRes.rows.length === 0) {
            const error = new Error('Mahasiswa tidak ditemukan');
            error.statusCode = 404;
            throw error;
        }
        const mahasiswa = mhsRes.rows[0];
        // 2. Ambil skor risiko terkini
        const riskRes = await (0, database_1.query)(`SELECT risk_id, scan_id, skor_ta, skor_akademik, skor_nonakademik, skor_keuangan,
              skor_total, status, override_red, data_tidak_lengkap, detail_pemicu, tgl_hitung
       FROM risk_score
       WHERE nim = $1
       ORDER BY tgl_hitung DESC LIMIT 1`, [nim]);
        const latestRisk = riskRes.rows[0] || null;
        // 3. Ambil riwayat skor untuk grafik tren historis
        const historyRes = await (0, database_1.query)(`SELECT rs.risk_id, rs.skor_total, rs.status, rs.tgl_hitung, sr.jenis as jenis_scan
       FROM risk_score rs
       JOIN scan_run sr ON rs.scan_id = sr.scan_id
       WHERE rs.nim = $1
       ORDER BY rs.tgl_hitung ASC LIMIT 10`, [nim]);
        // 4. Ambil ringkasan milestone TA
        const milestoneSummary = await milestone_service_1.MilestoneService.getStudentMilestones(nim);
        // 5. Ambil ringkasan akademik & presensi
        const academicSummary = await academic_service_1.AcademicService.getAcademicSummary(nim);
        // 6. Ambil status keuangan (privasi BRL-14 tanpa nominal)
        const financeSummary = await finance_service_1.FinanceService.getStudentFinanceStatus(nim);
        // 7. Ambil daftar action plan
        const actionPlans = await action_plan_service_1.ActionPlanService.getActionPlansByStudent(nim);
        return {
            mahasiswa,
            latestRisk,
            history: historyRes.rows,
            milestone: milestoneSummary,
            academic: academicSummary,
            finance: financeSummary,
            actionPlans,
        };
    }
    /**
     * Mengambil daftar mahasiswa at-risk untuk Dosen Wali / Pembimbing TA (SD-4, Gambar 4.6).
     */
    static async getAdviseesAtRisk(nidn, filters) {
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        let whereSql = `
      WHERE rb.nidn = $1 
        AND (rb.tgl_selesai IS NULL OR rb.tgl_selesai >= CURRENT_DATE)
        AND m.status_aktif = true
    `;
        const params = [nidn];
        if (filters.status) {
            params.push(filters.status);
            whereSql += ` AND v.status = $${params.length}`;
        }
        if (filters.angkatan) {
            params.push(filters.angkatan);
            whereSql += ` AND m.angkatan = $${params.length}`;
        }
        params.push(limit, offset);
        const sql = `
      SELECT m.nim, m.nama, m.angkatan, p.nama_prodi, rb.jenis as jenis_bimbingan,
             v.risk_id, v.skor_total, v.status as status_risiko, v.override_red,
             v.skor_ta, v.skor_akademik, v.skor_nonakademik, v.skor_keuangan,
             v.detail_pemicu, v.tgl_hitung,
             (SELECT COUNT(*) FROM counseling_log cl JOIN risk_score rs ON cl.risk_id = rs.risk_id WHERE rs.nim = m.nim) as jml_konseling
      FROM relasi_bimbingan rb
      JOIN mahasiswa m ON rb.nim = m.nim
      JOIN program_studi p ON m.prodi_id = p.prodi_id
      LEFT JOIN v_student_risk_latest v ON m.nim = v.nim
      ${whereSql}
      ORDER BY 
        CASE WHEN v.status = 'MERAH' THEN 1 WHEN v.status = 'KUNING' THEN 2 ELSE 3 END,
        v.skor_total DESC NULLS LAST
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
        const res = await (0, database_1.query)(sql, params);
        return res.rows;
    }
}
exports.StudentsService = StudentsService;
