"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationController = void 0;
const database_1 = require("../../config/database");
const hmac_util_1 = require("../../utils/hmac.util");
const action_plan_service_1 = require("../action-plans/action-plan.service");
const response_util_1 = require("../../utils/response.util");
const zod_1 = require("zod");
const aiWebhookSchema = zod_1.z.object({
    riskId: zod_1.z.coerce.number({ required_error: 'riskId wajib diisi' }),
    deskripsi: zod_1.z.string().min(1, 'deskripsi action plan wajib diisi'),
    tglTarget: zod_1.z.string().optional(),
});
class IntegrationController {
    /**
     * Endpoint data agregat untuk University Dashboard (SD-5, SDD 4.4.4).
     */
    static async getAggregateAnalytics(req, res, next) {
        try {
            const resKtw = await (0, database_1.query)(`SELECT * FROM v_ktw_analytics`);
            const resBottlenecks = await (0, database_1.query)(`SELECT * FROM v_ta_bottlenecks`);
            (0, response_util_1.sendSuccess)(res, {
                dashboard: 'University Executive Dashboard Aggregation',
                ktwPerProdi: resKtw.rows,
                taBottlenecks: resBottlenecks.rows,
                generatedAt: new Date().toISOString(),
            }, 'Data agregat Smart University berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Endpoint daftar ID mahasiswa berisiko untuk Smart Scheduling (SD-5, SDD 4.4.4).
     * Memberikan daftar mahasiswa dengan nilai D/E atau presensi rendah untuk prioritas slot kelas ulang.
     */
    static async getStudentsAtRiskCourses(req, res, next) {
        try {
            const sql = `
        SELECT DISTINCT m.nim, m.nama, m.prodi_id, p.nama_prodi,
               pm.kode_mk, pm.nama_mk,
               ROUND((pm.jml_hadir::numeric / NULLIF(pm.jml_pertemuan, 0) * 100), 2) as persentase_presensi,
               v.status as status_risiko
        FROM mahasiswa m
        JOIN program_studi p ON m.prodi_id = p.prodi_id
        JOIN presensi_matkul pm ON m.nim = pm.nim
        JOIN v_student_risk_latest v ON m.nim = v.nim
        WHERE (pm.jml_hadir::numeric / NULLIF(pm.jml_pertemuan, 0) * 100) < 75
           OR v.status IN ('KUNING', 'MERAH')
        ORDER BY m.nim ASC
      `;
            const resCourses = await (0, database_1.query)(sql);
            (0, response_util_1.sendSuccess)(res, {
                total: resCourses.rows.length,
                students: resCourses.rows,
            }, 'Daftar mahasiswa berisiko untuk Smart Scheduling berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Webhook receiver dari AI Academic Advisor dengan verifikasi HMAC-SHA256 (SD-5, SDD 4.4.4).
     */
    static async receiveAiAdvisorWebhook(req, res, next) {
        try {
            const signature = req.headers['x-ews-signature'];
            const rawPayload = req.rawBody || JSON.stringify(req.body);
            // Verifikasi HMAC signature
            if (!signature || !(0, hmac_util_1.verifyHmacSignature)(rawPayload, signature)) {
                (0, response_util_1.sendError)(res, 'HMAC signature tidak valid atau tidak disertakan', 401, 'INVALID_HMAC_SIGNATURE');
                return;
            }
            const { riskId, deskripsi, tglTarget } = aiWebhookSchema.parse(req.body);
            const createdPlan = await action_plan_service_1.ActionPlanService.createActionPlan(riskId, 'AI_ADVISOR', deskripsi, tglTarget);
            (0, response_util_1.sendSuccess)(res, createdPlan, 'Action plan dari AI Advisor berhasil disimpan ke EWS');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.IntegrationController = IntegrationController;
