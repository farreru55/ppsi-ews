import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { verifyHmacSignature } from '../../utils/hmac.util';
import { ActionPlanService } from '../action-plans/action-plan.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { z } from 'zod';

const aiWebhookSchema = z.object({
  riskId: z.coerce.number({ required_error: 'riskId wajib diisi' }),
  deskripsi: z.string().min(1, 'deskripsi action plan wajib diisi'),
  tglTarget: z.string().optional(),
});

export class IntegrationController {
  /**
   * Endpoint data agregat untuk University Dashboard (SD-5, SDD 4.4.4).
   */
  static async getAggregateAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const resKtw = await query(`SELECT * FROM v_ktw_analytics`);
      const resBottlenecks = await query(`SELECT * FROM v_ta_bottlenecks`);

      sendSuccess(
        res,
        {
          dashboard: 'University Executive Dashboard Aggregation',
          ktwPerProdi: resKtw.rows,
          taBottlenecks: resBottlenecks.rows,
          generatedAt: new Date().toISOString(),
        },
        'Data agregat Smart University berhasil diambil'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint daftar ID mahasiswa berisiko untuk Smart Scheduling (SD-5, SDD 4.4.4).
   * Memberikan daftar mahasiswa dengan nilai D/E atau presensi rendah untuk prioritas slot kelas ulang.
   */
  static async getStudentsAtRiskCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const sql = `
        SELECT DISTINCT m.nim, m.nama, m.prodi_id, p.nama_prodi,
               pm.kode_mk, pm.nama_mk,
               ROUND((pm.jml_hadir::numeric / NULLIF(pm.jml_pertemuan, 0) * 100), 2) as persentase_presensi,
               v.status as status_risiko
        FROM mahasiswa m
        JOIN program_studi p ON m.prodi_id = p.prodi_id
        JOIN presensi_matkul pm ON m.nim = pm.nim
        JOIN v_student_risk_latest v ON m.nim = v.nim
        WHERE (pm.jml_hadir::numeric / NULLIF(pm.jml_pertemuan, 0) * 100) < 75
           OR v.status IN ('KUNING', 'MERAH')
        ORDER BY m.nim ASC
      `;

      const resCourses = await query(sql);
      sendSuccess(
        res,
        {
          total: resCourses.rows.length,
          students: resCourses.rows,
        },
        'Daftar mahasiswa berisiko untuk Smart Scheduling berhasil diambil'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Webhook receiver dari AI Academic Advisor dengan verifikasi HMAC-SHA256 (SD-5, SDD 4.4.4).
   */
  static async receiveAiAdvisorWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-ews-signature'] as string;
      const rawPayload = (req as any).rawBody || JSON.stringify(req.body);

      // Verifikasi HMAC signature
      if (!signature || !verifyHmacSignature(rawPayload, signature)) {
        sendError(res, 'HMAC signature tidak valid atau tidak disertakan', 401, 'INVALID_HMAC_SIGNATURE');
        return;
      }

      const { riskId, deskripsi, tglTarget } = aiWebhookSchema.parse(req.body);

      const createdPlan = await ActionPlanService.createActionPlan(
        riskId,
        'AI_ADVISOR',
        deskripsi,
        tglTarget
      );

      sendSuccess(res, createdPlan, 'Action plan dari AI Advisor berhasil disimpan ke EWS');
    } catch (error) {
      next(error);
    }
  }
}
