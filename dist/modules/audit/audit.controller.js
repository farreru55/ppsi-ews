"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const audit_service_1 = require("./audit.service");
const response_util_1 = require("../../utils/response.util");
class AuditController {
    static async getLogs(req, res, next) {
        try {
            const page = parseInt(req.query.page || '1', 10);
            const limit = parseInt(req.query.limit || '50', 10);
            const offset = (page - 1) * limit;
            const filters = {
                userId: req.query.user_id ? parseInt(req.query.user_id, 10) : undefined,
                aksi: req.query.aksi,
                namaTabel: req.query.nama_tabel,
                limit,
                offset,
            };
            const result = await audit_service_1.AuditService.getAuditLogs(filters);
            (0, response_util_1.sendSuccess)(res, result.data, 'Audit log berhasil diambil (append-only, BRL-16)', 200, result.pagination);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuditController = AuditController;
