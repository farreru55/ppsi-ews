import { query } from '../../config/database';
import { MilestoneService } from '../milestones/milestone.service';
import { AcademicService } from '../academic/academic.service';
import { FinanceService } from '../finance/finance.service';
import { ActionPlanService } from '../action-plans/action-plan.service';

export class StudentsService {
  /**
   * Mengambil detail lengkap status risiko seorang mahasiswa.
   */
  static async getStudentRiskDetails(nim: string) {
    // 1. Ambil data mahasiswa
    const mhsRes = await query(
      `SELECT m.nim, m.nama, m.prodi_id, p.nama_prodi, m.angkatan, m.status_aktif, m.no_wa, m.email
       FROM mahasiswa m
       JOIN program_studi p ON m.prodi_id = p.prodi_id
       WHERE m.nim = $1`,
      [nim]
    );

    if (mhsRes.rows.length === 0) {
      const error: any = new Error('Mahasiswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const mahasiswa = mhsRes.rows[0];

    // 2. Ambil skor risiko terkini
    const riskRes = await query(
      `SELECT risk_id, scan_id, skor_ta, skor_akademik, skor_nonakademik, skor_keuangan,
              skor_total, status, override_red, data_tidak_lengkap, detail_pemicu, tgl_hitung
       FROM risk_score
       WHERE nim = $1
       ORDER BY tgl_hitung DESC LIMIT 1`,
      [nim]
    );

    const latestRisk = riskRes.rows[0] || null;

    // 3. Ambil riwayat skor untuk grafik tren historis
    const historyRes = await query(
      `SELECT rs.risk_id, rs.skor_total, rs.status, rs.tgl_hitung, sr.jenis as jenis_scan
       FROM risk_score rs
       JOIN scan_run sr ON rs.scan_id = sr.scan_id
       WHERE rs.nim = $1
       ORDER BY rs.tgl_hitung ASC LIMIT 10`,
      [nim]
    );

    // 4. Ambil ringkasan milestone TA
    const milestoneSummary = await MilestoneService.getStudentMilestones(nim);

    // 5. Ambil ringkasan akademik & presensi
    const academicSummary = await AcademicService.getAcademicSummary(nim);

    // 6. Ambil status keuangan (privasi BRL-14 tanpa nominal)
    const financeSummary = await FinanceService.getStudentFinanceStatus(nim);

    // 7. Ambil daftar action plan
    const actionPlans = await ActionPlanService.getActionPlansByStudent(nim);

    return {
      mahasiswa,
      latestRisk,
      history: historyRes.rows,
      milestone: milestoneSummary,
      academic: academicSummary,
      finance: financeSummary,
      actionPlans,
    };
  }

  /**
   * Mengambil daftar mahasiswa at-risk untuk Dosen Wali / Pembimbing TA (SD-4, Gambar 4.6).
   */
  static async getAdviseesAtRisk(nidn: string, filters: { status?: string; angkatan?: number; limit?: number; offset?: number }) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let whereSql = `
      WHERE rb.nidn = $1 
        AND (rb.tgl_selesai IS NULL OR rb.tgl_selesai >= CURRENT_DATE)
        AND m.status_aktif = true
    `;
    const params: any[] = [nidn];

    if (filters.status) {
      params.push(filters.status);
      whereSql += ` AND v.status = $${params.length}`;
    }

    if (filters.angkatan) {
      params.push(filters.angkatan);
      whereSql += ` AND m.angkatan = $${params.length}`;
    }

    params.push(limit, offset);

    const sql = `
      SELECT m.nim, m.nama, m.angkatan, p.nama_prodi, rb.jenis as jenis_bimbingan,
             v.risk_id, v.skor_total, v.status as status_risiko, v.override_red,
             v.skor_ta, v.skor_akademik, v.skor_nonakademik, v.skor_keuangan,
             v.detail_pemicu, v.tgl_hitung,
             (SELECT COUNT(*) FROM counseling_log cl JOIN risk_score rs ON cl.risk_id = rs.risk_id WHERE rs.nim = m.nim) as jml_konseling
      FROM relasi_bimbingan rb
      JOIN mahasiswa m ON rb.nim = m.nim
      JOIN program_studi p ON m.prodi_id = p.prodi_id
      LEFT JOIN v_student_risk_latest v ON m.nim = v.nim
      ${whereSql}
      ORDER BY 
        CASE WHEN v.status = 'MERAH' THEN 1 WHEN v.status = 'KUNING' THEN 2 ELSE 3 END,
        v.skor_total DESC NULLS LAST
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const res = await query(sql, params);
    return res.rows;
  }
}
