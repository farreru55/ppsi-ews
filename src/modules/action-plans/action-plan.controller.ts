import { Request, Response, NextFunction } from 'express';
import { ActionPlanService } from './action-plan.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['BELUM', 'PROSES', 'SELESAI']),
});

export class ActionPlanController {
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = parseInt(req.params.id, 10);
      if (isNaN(planId)) {
        // Jika parameter berupa NIM
        const plans = await ActionPlanService.getActionPlansByStudent(req.params.id);
        sendSuccess(res, plans, 'Daftar action plan mahasiswa berhasil diambil');
        return;
      }

      const plan = await ActionPlanService.getActionPlanById(planId);
      sendSuccess(res, plan, 'Detail action plan berhasil diambil');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = parseInt(req.params.id, 10);
      if (isNaN(planId)) {
        sendError(res, 'ID Action Plan harus berupa angka', 400, 'BAD_REQUEST');
        return;
      }

      const { status } = updateStatusSchema.parse(req.body);
      const updated = await ActionPlanService.updateActionPlanStatus(
        planId,
        status,
        req.user?.userId
      );

      sendSuccess(res, updated, 'Status action plan berhasil diperbarui');
    } catch (error) {
      next(error);
    }
  }
}
