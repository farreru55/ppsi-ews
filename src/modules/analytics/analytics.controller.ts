import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { sendSuccess } from '../../utils/response.util';

export class AnalyticsController {
  static async getKtwAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      let prodiId = user.prodiId;
      if (user.roles.includes('ADMIN') && req.query.prodi_id) {
        prodiId = parseInt(req.query.prodi_id as string, 10);
      }

      const data = await AnalyticsService.getKtwAnalytics(prodiId);
      sendSuccess(res, data, 'Data analitik KTW berhasil diambil');
    } catch (error) {
      next(error);
    }
  }

  static async exportReport(req: Request, res: Response, next: NextFunction) {
    try {
      const format = ((req.query.format as string) || 'pdf').toLowerCase() as 'pdf' | 'xlsx';
      const user = req.user!;
      let prodiId = user.prodiId;
      if (user.roles.includes('ADMIN') && req.query.prodi_id) {
        prodiId = parseInt(req.query.prodi_id as string, 10);
      }

      const report = await AnalyticsService.exportReport(format, prodiId);
      sendSuccess(res, report, `Ekspor laporan ${format.toUpperCase()} berhasil dibuat`);
    } catch (error) {
      next(error);
    }
  }
}
