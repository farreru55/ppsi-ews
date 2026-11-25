import { Request, Response, NextFunction } from 'express';
import { RiskService } from '../risk/risk.service';
import { sendSuccess } from '../../utils/response.util';
import { z } from 'zod';

const triggerScanSchema = z.object({
  jenis: z.enum(['TENGAH', 'AKHIR', 'ULANG']).optional().default('ULANG'),
  semesterId: z.number().optional(),
});

export class ScanController {
  static async triggerScan(req: Request, res: Response, next: NextFunction) {
    try {
      const { jenis, semesterId } = triggerScanSchema.parse(req.body);
      
      // Jalankan scan batch
      const result = await RiskService.runBatchScan(jenis, semesterId, req.user?.userId);
      sendSuccess(res, result, 'Pemindaian risiko multi-faktor berhasil dijalankan', 202);
    } catch (error) {
      next(error);
    }
  }
}
