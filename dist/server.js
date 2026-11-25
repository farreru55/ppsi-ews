"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const environment_1 = require("./config/environment");
const database_1 = require("./config/database");
const scan_job_1 = require("./jobs/scan.job");
const escalation_job_1 = require("./jobs/escalation.job");
const logger_util_1 = require("./utils/logger.util");
const startServer = async () => {
    try {
        // 1. Verifikasi koneksi PostgreSQL
        const client = await database_1.pool.connect();
        const versionRes = await client.query('SELECT version()');
        client.release();
        logger_util_1.logger.info(`Terhubung ke PostgreSQL: ${versionRes.rows[0].version.slice(0, 30)}...`);
        // 2. Inisialisasi Scheduled Jobs
        (0, scan_job_1.initScanJob)();
        (0, escalation_job_1.initEscalationJob)();
        logger_util_1.logger.info('Scheduler pemindaian dan evaluasi eskalasi aktif');
        // 3. Start Express App
        const app = (0, app_1.createApp)();
        const server = app.listen(environment_1.env.PORT, () => {
            logger_util_1.logger.info(`===================================================`);
            logger_util_1.logger.info(`EWS Backend REST API berjalan pada port ${environment_1.env.PORT}`);
            logger_util_1.logger.info(`Environment: ${environment_1.env.NODE_ENV}`);
            logger_util_1.logger.info(`Base API URL: http://localhost:${environment_1.env.PORT}/api/v1`);
            logger_util_1.logger.info(`Health check: http://localhost:${environment_1.env.PORT}/health`);
            logger_util_1.logger.info(`===================================================`);
        });
        const shutdown = async () => {
            logger_util_1.logger.info('Menerima sinyal shutdown, menutup server...');
            server.close(async () => {
                await database_1.pool.end();
                logger_util_1.logger.info('Koneksi database ditutup. Selesai.');
                process.exit(0);
            });
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
    catch (error) {
        logger_util_1.logger.error('Gagal memulai server EWS:', error);
        process.exit(1);
    }
};
startServer();
