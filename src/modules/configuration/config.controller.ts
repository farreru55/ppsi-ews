import { Request, Response, NextFunction } from 'express';
import { ConfigService } from './config.service';
import { sendSuccess } from '../../utils/response.util';
import { z } from 'zod';

const updateConfigSchema = z.object({
  parameter: z.string().min(1, 'Parameter wajib diisi'),
  nilai: z.number({ required_error: 'Nilai parameter harus berupa angka' }),
  prodiId: z.number().nullable().optional(),
});

export class ConfigController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const prodiId = req.query.prodi_id ? parseInt(req.query.prodi_id as string, 10) : user.prodiId;
      const configs = await ConfigService.getAllConfigs(prodiId);
      sendSuccess(res, configs, 'Daftar konfigurasi rule berhasil diambil');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { parameter, nilai, prodiId } = updateConfigSchema.parse(req.body);
      const updated = await ConfigService.updateConfig(
        parameter,
        nilai,
        prodiId,
        req.user?.userId
      );
      sendSuccess(res, updated, `Konfigurasi parameter ${parameter} berhasil diperbarui`);
    } catch (error) {
      next(error);
    }
  }
}
