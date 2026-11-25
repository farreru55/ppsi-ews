"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationController = void 0;
const escalation_service_1 = require("./escalation.service");
const response_util_1 = require("../../utils/response.util");
const zod_1 = require("zod");
const patchEscalationSchema = zod_1.z.object({
    statusRespons: zod_1.z.enum(['BELUM', 'DIRESPONS']),
    catatanTindakLanjut: zod_1.z.string().optional(),
});
class EscalationController {
    static async getEscalations(req, res, next) {
        try {
            const user = req.user;
            const page = parseInt(req.query.page || '1', 10);
            const limit = parseInt(req.query.limit || '50', 10);
            const offset = (page - 1) * limit;
            const filters = {
                tingkat: req.query.tingkat,
                statusRespons: req.query.statusRespons,
                limit,
                offset,
            };
            // Terapkan cakupan data RBAC
            if (user.roles.includes('DOSEN_WALI') && !user.roles.includes('KAPRODI') && !user.roles.includes('ADMIN')) {
                filters.nidn = user.nidn;
            }
            else if (user.roles.includes('KAPRODI') && !user.roles.includes('ADMIN')) {
                filters.prodiId = user.prodiId;
            }
            const data = await escalation_service_1.EscalationService.getEscalations(filters);
            (0, response_util_1.sendSuccess)(res, data, 'Daftar eskalasi berhasil diambil', 200, {
                page,
                limit,
                total: data.length,
                totalPages: 1,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateEscalation(req, res, next) {
        try {
            const escId = parseInt(req.params.id, 10);
            if (isNaN(escId)) {
                (0, response_util_1.sendError)(res, 'ID Eskalasi harus berupa angka', 400, 'BAD_REQUEST');
                return;
            }
            const { statusRespons, catatanTindakLanjut } = patchEscalationSchema.parse(req.body);
            const updated = await escalation_service_1.EscalationService.updateEscalationStatus(escId, statusRespons, req.user?.userId, catatanTindakLanjut);
            (0, response_util_1.sendSuccess)(res, updated, 'Tindak lanjut eskalasi berhasil dicatat');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.EscalationController = EscalationController;
