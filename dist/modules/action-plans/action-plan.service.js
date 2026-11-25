"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionPlanService = void 0;
const database_1 = require("../../config/database");
const logger_util_1 = require("../../utils/logger.util");
class ActionPlanService {
    static async getActionPlanById(planId) {
        const res = await (0, database_1.query)(`SELECT ap.plan_id, ap.risk_id, ap.sumber, ap.deskripsi, ap.status, ap.tgl_target, ap.tgl_dibuat,
              rs.nim, m.nama as nama_mahasiswa, rs.skor_total, rs.status as status_risiko
       FROM action_plan ap
       JOIN risk_score rs ON ap.risk_id = rs.risk_id
       JOIN mahasiswa m ON rs.nim = m.nim
       WHERE ap.plan_id = $1`, [planId]);
        if (res.rows.length === 0) {
            const error = new Error('Action plan tidak ditemukan');
            error.statusCode = 404;
            throw error;
        }
        return res.rows[0];
    }
    static async getActionPlansByStudent(nim) {
        const res = await (0, database_1.query)(`SELECT ap.plan_id, ap.risk_id, ap.sumber, ap.deskripsi, ap.status, ap.tgl_target, ap.tgl_dibuat,
              rs.status as status_risiko, rs.tgl_hitung
       FROM action_plan ap
       JOIN risk_score rs ON ap.risk_id = rs.risk_id
       WHERE rs.nim = $1
       ORDER BY ap.tgl_dibuat DESC`, [nim]);
        return res.rows;
    }
    static async updateActionPlanStatus(planId, newStatus, userId) {
        const existing = await this.getActionPlanById(planId);
        const res = await (0, database_1.query)(`UPDATE action_plan 
       SET status = $1 
       WHERE plan_id = $2
       RETURNING plan_id, risk_id, sumber, deskripsi, status, tgl_target, tgl_dibuat`, [newStatus, planId]);
        const updated = res.rows[0];
        await (0, logger_util_1.recordAuditLog)({
            userId,
            aksi: 'UPDATE_ACTION_PLAN_STATUS',
            namaTabel: 'action_plan',
            recordId: String(planId),
            dataLama: { status: existing.status },
            dataBaru: { status: newStatus },
        });
        return updated;
    }
    static async createActionPlan(riskId, sumber, deskripsi, tglTarget, userId) {
        const res = await (0, database_1.query)(`INSERT INTO action_plan (risk_id, sumber, deskripsi, status, tgl_target, tgl_dibuat)
       VALUES ($1, $2, $3, 'BELUM', $4, NOW())
       RETURNING plan_id, risk_id, sumber, deskripsi, status, tgl_target, tgl_dibuat`, [riskId, sumber, deskripsi, tglTarget || null]);
        const created = res.rows[0];
        await (0, logger_util_1.recordAuditLog)({
            userId,
            aksi: 'CREATE_ACTION_PLAN',
            namaTabel: 'action_plan',
            recordId: String(created.plan_id),
            dataBaru: created,
        });
        return created;
    }
}
exports.ActionPlanService = ActionPlanService;
