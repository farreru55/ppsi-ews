"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsController = void 0;
const students_service_1 = require("./students.service");
const milestone_service_1 = require("../milestones/milestone.service");
const counseling_service_1 = require("../counseling/counseling.service");
const response_util_1 = require("../../utils/response.util");
const zod_1 = require("zod");
const counselingSchema = zod_1.z.object({
    tglKonseling: zod_1.z.string().min(1, 'Tanggal konseling wajib diisi'),
    catatan: zod_1.z.string().min(1, 'Catatan kendala wajib diisi'),
    tindakLanjut: zod_1.z.string().min(1, 'Rekomendasi tindak lanjut wajib diisi'),
});
class StudentsController {
    static async getMeRisk(req, res, next) {
        try {
            if (!req.user || !req.user.nim) {
                (0, response_util_1.sendError)(res, 'Akun ini tidak terhubung dengan profil mahasiswa', 400, 'BAD_REQUEST');
                return;
            }
            const data = await students_service_1.StudentsService.getStudentRiskDetails(req.user.nim);
            (0, response_util_1.sendSuccess)(res, data, 'Data risiko pribadi berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    }
    static async getAdvisees(req, res, next) {
        try {
            if (!req.user || !req.user.nidn) {
                (0, response_util_1.sendError)(res, 'Akun ini tidak terhubung dengan profil dosen', 400, 'BAD_REQUEST');
                return;
            }
            const status = req.query.status;
            const angkatan = req.query.angkatan ? parseInt(req.query.angkatan, 10) : undefined;
            const page = parseInt(req.query.page || '1', 10);
            const limit = parseInt(req.query.limit || '50', 10);
            const offset = (page - 1) * limit;
            const data = await students_service_1.StudentsService.getAdviseesAtRisk(req.user.nidn, {
                status,
                angkatan,
                limit,
                offset,
            });
            (0, response_util_1.sendSuccess)(res, data, 'Daftar mahasiswa bimbingan berhasil diambil', 200, {
                page,
                limit,
                total: data.length,
                totalPages: 1,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getStudentRisk(req, res, next) {
        try {
            const nim = req.params.id;
            const data = await students_service_1.StudentsService.getStudentRiskDetails(nim);
            (0, response_util_1.sendSuccess)(res, data, 'Detail risiko mahasiswa berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    }
    static async getStudentMilestones(req, res, next) {
        try {
            const nim = req.params.id;
            const data = await milestone_service_1.MilestoneService.getStudentMilestones(nim);
            (0, response_util_1.sendSuccess)(res, data, 'Milestone tugas akhir mahasiswa berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    }
    static async createCounseling(req, res, next) {
        try {
            const nim = req.params.id;
            const { tglKonseling, catatan, tindakLanjut } = counselingSchema.parse(req.body);
            if (!req.user || !req.user.nidn) {
                (0, response_util_1.sendError)(res, 'Pencatatan konseling hanya dapat dilakukan oleh dosen dengan NIDN valid', 403, 'FORBIDDEN');
                return;
            }
            // Ambil risk_id terkini mahasiswa
            const studentData = await students_service_1.StudentsService.getStudentRiskDetails(nim);
            if (!studentData.latestRisk) {
                (0, response_util_1.sendError)(res, 'Mahasiswa belum memiliki catatan kalkulasi risiko terkini', 400, 'NO_RISK_RECORD');
                return;
            }
            const created = await counseling_service_1.CounselingService.createCounseling({
                riskId: Number(studentData.latestRisk.risk_id),
                nidn: req.user.nidn,
                tglKonseling,
                catatan,
                tindakLanjut,
                userId: req.user.userId,
            });
            (0, response_util_1.sendSuccess)(res, created, 'Hasil konseling berhasil dicatat (append-only)', 201);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.StudentsController = StudentsController;
