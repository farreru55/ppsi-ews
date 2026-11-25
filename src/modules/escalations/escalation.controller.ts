import { Request, Response, NextFunction } from 'express';
import { EscalationService } from './escalation.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { z } from 'zod';

const patchEscalationSchema = z.object({
  statusRespons: z.enum(['BELUM', 'DIRESPONS']),
  catatanTindakLanjut: z.string().optional(),
});

export class EscalationController {
  static async getEscalations(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = (page - 1) * limit;

      const filters: any = {
        tingkat: req.query.tingkat as string,
        statusRespons: req.query.statusRespons as string,
        limit,
        offset,
      };

      // Terapkan cakupan data RBAC
      if (user.roles.includes('DOSEN_WALI') && !user.roles.includes('KAPRODI') && !user.roles.includes('ADMIN')) {
        filters.nidn = user.nidn;
      } else if (user.roles.includes('KAPRODI') && !user.roles.includes('ADMIN')) {
        filters.prodiId = user.prodiId;
      }

      const data = await EscalationService.getEscalations(filters);
      sendSuccess(res, data, 'Daftar eskalasi berhasil diambil', 200, {
        page,
        limit,
        total: data.length,
        totalPages: 1,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateEscalation(req: Request, res: Response, next: NextFunction) {
    try {
      const escId = parseInt(req.params.id, 10);
      if (isNaN(escId)) {
        sendError(res, 'ID Eskalasi harus berupa angka', 400, 'BAD_REQUEST');
        return;
      }

      const { statusRespons, catatanTindakLanjut } = patchEscalationSchema.parse(req.body);
      const updated = await EscalationService.updateEscalationStatus(
        escId,
        statusRespons,
        req.user?.userId,
        catatanTindakLanjut
      );

      sendSuccess(res, updated, 'Tindak lanjut eskalasi berhasil dicatat');
    } catch (error) {
      next(error);
    }
  }
}
