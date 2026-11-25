"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanController = void 0;
const risk_service_1 = require("../risk/risk.service");
const response_util_1 = require("../../utils/response.util");
const zod_1 = require("zod");
const triggerScanSchema = zod_1.z.object({
    jenis: zod_1.z.enum(['TENGAH', 'AKHIR', 'ULANG']).optional().default('ULANG'),
    semesterId: zod_1.z.number().optional(),
});
class ScanController {
    static async triggerScan(req, res, next) {
        try {
            const { jenis, semesterId } = triggerScanSchema.parse(req.body);
            // Jalankan scan batch
            const result = await risk_service_1.RiskService.runBatchScan(jenis, semesterId, req.user?.userId);
            (0, response_util_1.sendSuccess)(res, result, 'Pemindaian risiko multi-faktor berhasil dijalankan', 202);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ScanController = ScanController;
