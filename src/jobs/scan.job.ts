import cron from 'node-cron';
import { RiskService } from '../modules/risk/risk.service';
import { logger } from '../utils/logger.util';

export const initScanJob = () => {
  // Jadwal otomatis: setiap hari Minggu pukul 01:00 dini hari (BRL-01)
  cron.schedule('0 1 * * 0', async () => {
    logger.info('[CRON] Menjalankan pemindaian terjadwal EWS...');
    try {
      const res = await RiskService.runBatchScan('ULANG');
      logger.info(`[CRON] Pemindaian selesai. Terpindai: ${res.jmlMahasiswa} mahasiswa.`);
    } catch (err: any) {
      logger.error('[CRON] Gagal menjalankan pemindaian terjadwal:', err.message);
    }
  });
};
