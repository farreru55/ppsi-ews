import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import { sendSuccess } from '../../utils/response.util';

export class AuditController {
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = (page - 1) * limit;

      const filters = {
        userId: req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined,
        aksi: req.query.aksi as string,
        namaTabel: req.query.nama_tabel as string,
        limit,
        offset,
      };

      const result = await AuditService.getAuditLogs(filters);
      sendSuccess(res, result.data, 'Audit log berhasil diambil (append-only, BRL-16)', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}
