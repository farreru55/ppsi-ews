import { createApp } from './app';
import { env } from './config/environment';
import { pool } from './config/database';
import { initScanJob } from './jobs/scan.job';
import { initEscalationJob } from './jobs/escalation.job';
import { logger } from './utils/logger.util';

const startServer = async () => {
  try {
    // 1. Verifikasi koneksi PostgreSQL
    const client = await pool.connect();
    const versionRes = await client.query('SELECT version()');
    client.release();
    logger.info(`Terhubung ke PostgreSQL: ${versionRes.rows[0].version.slice(0, 30)}...`);

    // 2. Inisialisasi Scheduled Jobs
    initScanJob();
    initEscalationJob();
    logger.info('Scheduler pemindaian dan evaluasi eskalasi aktif');

    // 3. Start Express App
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`===================================================`);
      logger.info(`EWS Backend REST API berjalan pada port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Base API URL: http://localhost:${env.PORT}/api/v1`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
      logger.info(`===================================================`);
    });

    const shutdown = async () => {
      logger.info('Menerima sinyal shutdown, menutup server...');
      server.close(async () => {
        await pool.end();
        logger.info('Koneksi database ditutup. Selesai.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Gagal memulai server EWS:', error);
    process.exit(1);
  }
};

startServer();
