import cron from 'node-cron';
import { EscalationService } from '../modules/escalations/escalation.service';
import { logger } from '../utils/logger.util';

export const initEscalationJob = () => {
  // Evaluasi eskalasi setiap hari kerja pukul 08:00 pagi (BRL-11)
  cron.schedule('0 8 * * 1-5', async () => {
    logger.info('[CRON] Mengevaluasi eskalasi berjenjang N=3 dan M=14 hari...');
    try {
      const escalations = await EscalationService.evaluateEscalations();
      logger.info(`[CRON] Evaluasi eskalasi selesai. ${escalations.length} eskalasi baru dibuat.`);
    } catch (err: any) {
      logger.error('[CRON] Gagal mengevaluasi eskalasi:', err.message);
    }
  });
};
