"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const analytics_service_1 = require("./analytics.service");
const response_util_1 = require("../../utils/response.util");
class AnalyticsController {
    static async getKtwAnalytics(req, res, next) {
        try {
            const user = req.user;
            let prodiId = user.prodiId;
            if (user.roles.includes('ADMIN') && req.query.prodi_id) {
                prodiId = parseInt(req.query.prodi_id, 10);
            }
            const data = await analytics_service_1.AnalyticsService.getKtwAnalytics(prodiId);
            (0, response_util_1.sendSuccess)(res, data, 'Data analitik KTW berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    }
    static async exportReport(req, res, next) {
        try {
            const format = (req.query.format || 'pdf').toLowerCase();
            const user = req.user;
            let prodiId = user.prodiId;
            if (user.roles.includes('ADMIN') && req.query.prodi_id) {
                prodiId = parseInt(req.query.prodi_id, 10);
            }
            const report = await analytics_service_1.AnalyticsService.exportReport(format, prodiId);
            (0, response_util_1.sendSuccess)(res, report, `Ekspor laporan ${format.toUpperCase()} berhasil dibuat`);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AnalyticsController = AnalyticsController;
