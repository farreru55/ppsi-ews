import { Request, Response, NextFunction } from 'express';
import { StudentsService } from './students.service';
import { MilestoneService } from '../milestones/milestone.service';
import { CounselingService } from '../counseling/counseling.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { z } from 'zod';

const counselingSchema = z.object({
  tglKonseling: z.string().min(1, 'Tanggal konseling wajib diisi'),
  catatan: z.string().min(1, 'Catatan kendala wajib diisi'),
  tindakLanjut: z.string().min(1, 'Rekomendasi tindak lanjut wajib diisi'),
});

export class StudentsController {
  static async getMeRisk(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user.nim) {
        sendError(res, 'Akun ini tidak terhubung dengan profil mahasiswa', 400, 'BAD_REQUEST');
        return;
      }
      const data = await StudentsService.getStudentRiskDetails(req.user.nim);
      sendSuccess(res, data, 'Data risiko pribadi berhasil diambil');
    } catch (error) {
      next(error);
    }
  }

  static async getAdvisees(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user.nidn) {
        sendError(res, 'Akun ini tidak terhubung dengan profil dosen', 400, 'BAD_REQUEST');
        return;
      }

      const status = req.query.status as string;
      const angkatan = req.query.angkatan ? parseInt(req.query.angkatan as string, 10) : undefined;
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = (page - 1) * limit;

      const data = await StudentsService.getAdviseesAtRisk(req.user.nidn, {
        status,
        angkatan,
        limit,
        offset,
      });

      sendSuccess(res, data, 'Daftar mahasiswa bimbingan berhasil diambil', 200, {
        page,
        limit,
        total: data.length,
        totalPages: 1,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStudentRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const nim = req.params.id;
      const data = await StudentsService.getStudentRiskDetails(nim);
      sendSuccess(res, data, 'Detail risiko mahasiswa berhasil diambil');
    } catch (error) {
      next(error);
    }
  }

  static async getStudentMilestones(req: Request, res: Response, next: NextFunction) {
    try {
      const nim = req.params.id;
      const data = await MilestoneService.getStudentMilestones(nim);
      sendSuccess(res, data, 'Milestone tugas akhir mahasiswa berhasil diambil');
    } catch (error) {
      next(error);
    }
  }

  static async createCounseling(req: Request, res: Response, next: NextFunction) {
    try {
      const nim = req.params.id;
      const { tglKonseling, catatan, tindakLanjut } = counselingSchema.parse(req.body);

      if (!req.user || !req.user.nidn) {
        sendError(res, 'Pencatatan konseling hanya dapat dilakukan oleh dosen dengan NIDN valid', 403, 'FORBIDDEN');
        return;
      }

      // Ambil risk_id terkini mahasiswa
      const studentData = await StudentsService.getStudentRiskDetails(nim);
      if (!studentData.latestRisk) {
        sendError(res, 'Mahasiswa belum memiliki catatan kalkulasi risiko terkini', 400, 'NO_RISK_RECORD');
        return;
      }

      const created = await CounselingService.createCounseling({
        riskId: Number(studentData.latestRisk.risk_id),
        nidn: req.user.nidn,
        tglKonseling,
        catatan,
        tindakLanjut,
        userId: req.user.userId,
      });

      sendSuccess(res, created, 'Hasil konseling berhasil dicatat (append-only)', 201);
    } catch (error) {
      next(error);
    }
  }
}
