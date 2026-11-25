"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScanJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const risk_service_1 = require("../modules/risk/risk.service");
const logger_util_1 = require("../utils/logger.util");
const initScanJob = () => {
    // Jadwal otomatis: setiap hari Minggu pukul 01:00 dini hari (BRL-01)
    node_cron_1.default.schedule('0 1 * * 0', async () => {
        logger_util_1.logger.info('[CRON] Menjalankan pemindaian terjadwal EWS...');
        try {
            const res = await risk_service_1.RiskService.runBatchScan('ULANG');
            logger_util_1.logger.info(`[CRON] Pemindaian selesai. Terpindai: ${res.jmlMahasiswa} mahasiswa.`);
        }
        catch (err) {
            logger_util_1.logger.error('[CRON] Gagal menjalankan pemindaian terjadwal:', err.message);
        }
    });
};
exports.initScanJob = initScanJob;
