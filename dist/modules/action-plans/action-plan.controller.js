"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionPlanController = void 0;
const action_plan_service_1 = require("./action-plan.service");
const response_util_1 = require("../../utils/response.util");
const zod_1 = require("zod");
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['BELUM', 'PROSES', 'SELESAI']),
});
class ActionPlanController {
    static async getById(req, res, next) {
        try {
            const planId = parseInt(req.params.id, 10);
            if (isNaN(planId)) {
                // Jika parameter berupa NIM
                const plans = await action_plan_service_1.ActionPlanService.getActionPlansByStudent(req.params.id);
                (0, response_util_1.sendSuccess)(res, plans, 'Daftar action plan mahasiswa berhasil diambil');
                return;
            }
            const plan = await action_plan_service_1.ActionPlanService.getActionPlanById(planId);
            (0, response_util_1.sendSuccess)(res, plan, 'Detail action plan berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const planId = parseInt(req.params.id, 10);
            if (isNaN(planId)) {
                (0, response_util_1.sendError)(res, 'ID Action Plan harus berupa angka', 400, 'BAD_REQUEST');
                return;
            }
            const { status } = updateStatusSchema.parse(req.body);
            const updated = await action_plan_service_1.ActionPlanService.updateActionPlanStatus(planId, status, req.user?.userId);
            (0, response_util_1.sendSuccess)(res, updated, 'Status action plan berhasil diperbarui');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ActionPlanController = ActionPlanController;
