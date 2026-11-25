"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilestoneService = void 0;
const database_1 = require("../../config/database");
class MilestoneService {
    static async getStudentMilestones(nim) {
        // 1. Ambil TA aktif mahasiswa
        const taRes = await (0, database_1.query)(`SELECT ta.ta_id, ta.jenis, ta.judul, ta.jml_perpanjangan, ta.tgl_batas,
              ta.status_bebas_pustaka, ta.tgl_bebas_pustaka,
              s.tahun_ajaran, s.jenis as jenis_semester
       FROM tugas_akhir ta
       LEFT JOIN semester s ON ta.semester_mulai_id = s.semester_id
       WHERE ta.nim = $1
       ORDER BY ta.ta_id DESC LIMIT 1`, [nim]);
        if (taRes.rows.length === 0) {
            return {
                taAktif: false,
                message: 'Mahasiswa belum memiliki pengerjaan Tugas Akhir / KP aktif',
                milestones: [],
                bimbingan: {
                    total: 0,
                    terverifikasi: 0,
                    syaratMinimal: 8,
                    memenuhiSyarat: false,
                    hariSejakTerakhir: null,
                    isMacet: false,
                    logs: [],
                },
            };
        }
        const ta = taRes.rows[0];
        // 2. Ambil seluruh tahap milestone
        const milestoneRes = await (0, database_1.query)(`SELECT milestone_id, tahap, tgl_mulai, tgl_selesai, status
       FROM ta_milestone
       WHERE ta_id = $1
       ORDER BY milestone_id ASC`, [ta.ta_id]);
        // 3. Ambil log bimbingan
        const bimbinganRes = await (0, database_1.query)(`SELECT b.bimbingan_id, b.tgl_bimbingan, b.topik, b.terverifikasi,
              d.nidn, d.nama as nama_dosen
       FROM bimbingan_log b
       LEFT JOIN dosen d ON b.nidn = d.nidn
       WHERE b.ta_id = $1
       ORDER BY b.tgl_bimbingan DESC`, [ta.ta_id]);
        const logs = bimbinganRes.rows;
        const totalBimbingan = logs.length;
        const verifiedBimbingan = logs.filter((l) => l.terverifikasi).length;
        const lastBimbinganDate = logs[0]?.tgl_bimbingan;
        let hariSejakTerakhir = null;
        let isMacet = false;
        if (lastBimbinganDate) {
            const diffTime = Math.abs(Date.now() - new Date(lastBimbinganDate).getTime());
            hariSejakTerakhir = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (hariSejakTerakhir > 30) {
                isMacet = true;
            }
        }
        else {
            isMacet = true;
        }
        return {
            taAktif: true,
            tugasAkhir: {
                taId: ta.ta_id,
                jenis: ta.jenis,
                judul: ta.judul,
                jmlPerpanjangan: ta.jml_perpanjangan,
                tglBatas: ta.tgl_batas,
                statusBebasPustaka: ta.status_bebas_pustaka,
                tglBebasPustaka: ta.tgl_bebas_pustaka,
                semesterMulai: `${ta.tahun_ajaran} (${ta.jenis_semester})`,
            },
            milestones: milestoneRes.rows,
            bimbingan: {
                total: totalBimbingan,
                terverifikasi: verifiedBimbingan,
                syaratMinimal: 8,
                memenuhiSyarat: verifiedBimbingan >= 8,
                hariSejakTerakhir,
                isMacet,
                logs,
            },
        };
    }
}
exports.MilestoneService = MilestoneService;
