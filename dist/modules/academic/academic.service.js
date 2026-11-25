"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicService = void 0;
const database_1 = require("../../config/database");
class AcademicService {
    static async getAcademicSummary(nim) {
        // 1. Snapshot akademik
        const akadRes = await (0, database_1.query)(`SELECT sks_lulus, ipk, jml_nilai_d, jml_nilai_e, skor_toefl, sisa_masa_studi, scan_id
       FROM snapshot_mahasiswa
       WHERE nim = $1
       ORDER BY snapshot_id DESC LIMIT 1`, [nim]);
        const snapshot = akadRes.rows[0] || null;
        // 2. Presensi perkuliahan semester berjalan
        const presensiRes = await (0, database_1.query)(`SELECT presensi_id, kode_mk, nama_mk, jml_pertemuan, jml_hadir,
              (jml_pertemuan - jml_hadir) as jml_alpha,
              ROUND((jml_hadir::numeric / NULLIF(jml_pertemuan, 0) * 100), 2) as persentase
       FROM presensi_matkul
       WHERE nim = $1
       ORDER BY kode_mk ASC`, [nim]);
        const courses = presensiRes.rows.map((row) => {
            const persentase = parseFloat(row.persentase || '0');
            const alpha = parseInt(row.jml_alpha || '0', 10);
            const isWarning = persentase < 75 || alpha > 2;
            return {
                presensiId: row.presensi_id,
                kodeMk: row.kode_mk,
                namaMk: row.nama_mk,
                jmlPertemuan: row.jml_pertemuan,
                jmlHadir: row.jml_hadir,
                jmlAlpha: alpha,
                persentase,
                isWarning,
                warningReason: isWarning
                    ? persentase < 75
                        ? 'Presensi di bawah batas 75%'
                        : 'Ketidakhadiran lebih dari 2 kali pertemuan'
                    : null,
            };
        });
        // 3. Status Bebas Pustaka dari TA
        const taRes = await (0, database_1.query)(`SELECT status_bebas_pustaka, tgl_bebas_pustaka FROM tugas_akhir WHERE nim = $1 ORDER BY ta_id DESC LIMIT 1`, [nim]);
        const bebasPustaka = Boolean(taRes.rows[0]?.status_bebas_pustaka);
        // 4. Status Modul Smart Laboratory
        const labRes = await (0, database_1.query)(`SELECT kode_praktikum, status_lulus, jml_penggunaan_lab FROM progres_praktikum WHERE nim = $1`, [nim]);
        const praktikumList = labRes.rows;
        const allLabPassed = praktikumList.length > 0 && praktikumList.every((p) => p.status_lulus);
        // 5. Checklist Yudisium (FR-YUD-01 s/d FR-YUD-05)
        const toeflScore = snapshot?.skor_toefl ? Number(snapshot.skor_toefl) : 0;
        const toeflPass = toeflScore >= 450;
        const bebasNilaiE = (snapshot?.jml_nilai_e ?? 0) === 0;
        const checklistYudisium = {
            bebasNilaiE: {
                terpenuhi: bebasNilaiE,
                keterangan: bebasNilaiE ? 'Tidak memiliki nilai E' : `Memiliki ${snapshot?.jml_nilai_e} matkul bernilai E`,
            },
            skorToefl: {
                terpenuhi: toeflPass,
                skor: toeflScore,
                standarMinimum: 450,
                keterangan: toeflPass ? 'Memenuhi syarat TOEFL' : `Skor ${toeflScore} di bawah standar 450`,
            },
            bebasPustaka: {
                terpenuhi: bebasPustaka,
                keterangan: bebasPustaka ? 'Telah bebas pustaka' : 'Belum mengunggah naskah final / belum bebas pustaka',
            },
            smartLaboratory: {
                terpenuhi: allLabPassed,
                keterangan: allLabPassed ? 'Semua modul praktikum tuntas' : 'Terdapat modul praktikum yang belum tuntas',
                modul: praktikumList,
            },
            statusKelayakan: bebasNilaiE && toeflPass && bebasPustaka && allLabPassed ? 'LENGKAP' : 'BELUM_LENGKAP',
        };
        return {
            snapshot,
            presensi: {
                courses,
                totalMatkul: courses.length,
                matkulBerisiko: courses.filter((c) => c.isWarning).length,
            },
            checklistYudisium,
        };
    }
}
exports.AcademicService = AcademicService;
