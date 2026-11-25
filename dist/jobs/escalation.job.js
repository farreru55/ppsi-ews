"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initEscalationJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const escalation_service_1 = require("../modules/escalations/escalation.service");
const logger_util_1 = require("../utils/logger.util");
const initEscalationJob = () => {
    // Evaluasi eskalasi setiap hari kerja pukul 08:00 pagi (BRL-11)
    node_cron_1.default.schedule('0 8 * * 1-5', async () => {
        logger_util_1.logger.info('[CRON] Mengevaluasi eskalasi berjenjang N=3 dan M=14 hari...');
        try {
            const escalations = await escalation_service_1.EscalationService.evaluateEscalations();
            logger_util_1.logger.info(`[CRON] Evaluasi eskalasi selesai. ${escalations.length} eskalasi baru dibuat.`);
        }
        catch (err) {
            logger_util_1.logger.error('[CRON] Gagal mengevaluasi eskalasi:', err.message);
        }
    });
};
exports.initEscalationJob = initEscalationJob;
