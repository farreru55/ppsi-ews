"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskService = exports.DEFAULT_PROPOSED_POINTS = void 0;
const database_1 = require("../../config/database");
const logger_util_1 = require("../../utils/logger.util");
exports.DEFAULT_PROPOSED_POINTS = {
    ta: {
        bimbinganMacet: 35,
        bimbinganKurang: 25,
        perpanjangan: 25,
        milestoneTerlambat: 15,
    },
    akademik: {
        presensiRendah: 40,
        alphaTinggi: 25,
        adaNilaiE: 25,
        toeflRendah: 10,
    },
    sskm: {
        poinKurang: 60,
        eventWajibAbsen: 40,
    },
    keuangan: {
        menunggak: 100,
    },
};
class RiskService {
    /**
     * Mengambil konfigurasi aktif (bobot, ambang batas, dsb) untuk prodi tertentu atau global.
     */
    static async getConfig(prodiId) {
        const res = await (0, database_1.query)(`SELECT parameter, nilai FROM config_rule 
       WHERE is_aktif = true AND (prodi_id = $1 OR prodi_id IS NULL)
       ORDER BY prodi_id NULLS LAST`, [prodiId || null]);
        const configMap = new Map();
        for (const row of res.rows) {
            if (!configMap.has(row.parameter)) {
                configMap.set(row.parameter, parseFloat(row.nilai));
            }
        }
        return {
            bobotTa: configMap.get('BOBOT_TA') ?? 40,
            bobotAkademik: configMap.get('BOBOT_AKADEMIK') ?? 30,
            bobotSskm: configMap.get('BOBOT_SSKM') ?? 15,
            bobotKeuangan: configMap.get('BOBOT_KEUANGAN') ?? 15,
            batasKuning: configMap.get('BATAS_KUNING') ?? 40,
            batasMerah: configMap.get('BATAS_MERAH') ?? 70,
            presensiMin: configMap.get('PRESENSI_MIN') ?? 75,
            alphaMaks: configMap.get('ALPHA_MAKS') ?? 2,
            bimbinganMin: configMap.get('BIMBINGAN_MIN') ?? 8,
            bimbinganMacetHari: configMap.get('BIMBINGAN_MACET_HARI') ?? 30,
            perpanjanganTaOverride: configMap.get('PERPANJANGAN_TA_OVERRIDE') ?? 2,
            sisaMasaStudiMin: configMap.get('SISA_MASA_STUDI_MIN') ?? 2,
            ambangSskmProdi: 100, // threshold poin SSKM minimum
            ambangToeflProdi: 450, // threshold skor TOEFL
        };
    }
    /**
     * Menghitung skor risiko untuk satu orang mahasiswa berdasarkan snapshot terkini.
     */
    static async calculateStudentRisk(nim, proposedPoints = exports.DEFAULT_PROPOSED_POINTS) {
        // 1. Ambil info mahasiswa & prodi
        const mhsRes = await (0, database_1.query)(`SELECT m.nim, m.nama, m.prodi_id, EXTRACT(YEAR FROM m.tgl_masuk)::int AS angkatan, m.status_aktif 
       FROM mahasiswa m WHERE m.nim = $1`, [nim]);
        if (mhsRes.rows.length === 0) {
            throw new Error(`Mahasiswa dengan NIM ${nim} tidak ditemukan`);
        }
        const mhs = mhsRes.rows[0];
        const config = await this.getConfig(mhs.prodi_id);
        const detailPemicu = {
            ta: [],
            akademik: [],
            nonAkademik: [],
            keuangan: [],
        };
        let dataTidakLengkap = false;
        // 2. Evaluasi Pilar TA / Skripsi
        let skorTa = null;
        let taBerlaku = false;
        const taRes = await (0, database_1.query)(`SELECT ta.ta_id, ta.jenis, ta.jml_perpanjangan, (ta.tgl_bebas_pustaka IS NOT NULL) AS status_bebas_pustaka, ta.tgl_batas,
              (SELECT MAX(tgl_bimbingan) FROM bimbingan_log WHERE ta_id = ta.ta_id) as tgl_bimbingan_terakhir,
              (SELECT COUNT(*) FROM bimbingan_log WHERE ta_id = ta.ta_id AND terverifikasi = true) as jml_bimbingan_valid,
              tm.tahap as tahap_aktif, tm.status as status_milestone, tm.tgl_mulai as tgl_mulai_milestone
       FROM tugas_akhir ta
       LEFT JOIN ta_milestone tm ON ta.ta_id = tm.ta_id AND tm.status = 'BERJALAN'
       WHERE ta.nim = $1
       ORDER BY ta.ta_id DESC LIMIT 1`, [nim]);
        let jmlPerpanjanganTa = 0;
        if (taRes.rows.length > 0) {
            taBerlaku = true;
            const ta = taRes.rows[0];
            jmlPerpanjanganTa = Number(ta.jml_perpanjangan || 0);
            let rawPointsTa = 0;
            const jmlBimbingan = Number(ta.jml_bimbingan_valid || 0);
            // Cek bimbingan macet > 30 hari
            if (ta.tgl_bimbingan_terakhir) {
                const lastDate = new Date(ta.tgl_bimbingan_terakhir);
                const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > config.bimbinganMacetHari) {
                    rawPointsTa += proposedPoints.ta.bimbinganMacet;
                    detailPemicu.ta.push({
                        kode: 'BIMBINGAN_MACET',
                        pesan: `Log bimbingan terakhir ${diffDays} hari lalu (melebihi batas ${config.bimbinganMacetHari} hari)`,
                        hari: diffDays,
                    });
                }
            }
            else {
                // Belum pernah bimbingan sama sekali
                rawPointsTa += proposedPoints.ta.bimbinganMacet;
                detailPemicu.ta.push({
                    kode: 'BIMBINGAN_BELUM_PERNAH',
                    pesan: 'Belum memiliki catatan log bimbingan',
                });
            }
            // Cek syarat minimal bimbingan
            if (jmlBimbingan < config.bimbinganMin) {
                rawPointsTa += proposedPoints.ta.bimbinganKurang;
                detailPemicu.ta.push({
                    kode: 'BIMBINGAN_KURANG',
                    pesan: `Jumlah bimbingan terverifikasi (${jmlBimbingan}) belum memenuhi syarat minimal (${config.bimbinganMin})`,
                    terverifikasi: jmlBimbingan,
                    minimal: config.bimbinganMin,
                });
            }
            // Cek perpanjangan semester
            if (jmlPerpanjanganTa >= 1) {
                rawPointsTa += proposedPoints.ta.perpanjangan;
                detailPemicu.ta.push({
                    kode: 'TA_DIPERPANJANG',
                    pesan: `Tugas Akhir telah diperpanjang sebanyak ${jmlPerpanjanganTa} semester`,
                    jumlah: jmlPerpanjanganTa,
                });
            }
            // Cek status milestone
            if (ta.status_milestone === 'TERTUNDA') {
                rawPointsTa += proposedPoints.ta.milestoneTerlambat;
                detailPemicu.ta.push({
                    kode: 'MILESTONE_TERTUNDA',
                    pesan: `Tahap milestone ${ta.tahap_aktif || 'TA'} tertunda/melewati jadwal resmi prodi`,
                });
            }
            skorTa = Math.min(100, rawPointsTa);
        }
        // 3. Evaluasi Pilar Akademik
        let skorAkademik = null;
        const akadRes = await (0, database_1.query)(`SELECT sks_lulus, ipk, jml_nilai_d, jml_nilai_e, skor_toefl, sisa_masa_studi
       FROM snapshot_mahasiswa 
       WHERE nim = $1 
       ORDER BY snapshot_id DESC LIMIT 1`, [nim]);
        let sisaMasaStudi = 8;
        if (akadRes.rows.length === 0) {
            dataTidakLengkap = true;
        }
        else {
            const akad = akadRes.rows[0];
            sisaMasaStudi = Number(akad.sisa_masa_studi);
            let rawPointsAkad = 0;
            // Presensi per mata kuliah semester berjalan
            const presensiRes = await (0, database_1.query)(`SELECT pm.kode_mk, mk.nama_mk, pm.jml_pertemuan, pm.jml_hadir,
                ROUND((pm.jml_hadir::numeric / NULLIF(pm.jml_pertemuan, 0) * 100), 2) as persentase,
                (pm.jml_pertemuan - pm.jml_hadir) as jml_alpha
         FROM presensi_matkul pm
         JOIN mata_kuliah mk ON pm.kode_mk = mk.kode_mk
         WHERE pm.nim = $1`, [nim]);
            let adaPresensiRendah = false;
            let adaAlphaTinggi = false;
            for (const p of presensiRes.rows) {
                const persentase = parseFloat(p.persentase || '0');
                const alpha = parseInt(p.jml_alpha || '0', 10);
                if (persentase < config.presensiMin) {
                    adaPresensiRendah = true;
                    detailPemicu.akademik.push({
                        kode: 'PRESENSI_RENDAH',
                        matkul: `${p.kode_mk} - ${p.nama_mk}`,
                        persentase,
                        pesan: `Presensi ${persentase}% di bawah ambang minimum ${config.presensiMin}%`,
                    });
                }
                if (alpha > config.alphaMaks) {
                    adaAlphaTinggi = true;
                    detailPemicu.akademik.push({
                        kode: 'ALPHA_TINGGI',
                        matkul: `${p.kode_mk} - ${p.nama_mk}`,
                        alpha,
                        pesan: `Tidak hadir tanpa keterangan (${alpha}x) melebihi batas (${config.alphaMaks}x)`,
                    });
                }
            }
            if (adaPresensiRendah)
                rawPointsAkad += proposedPoints.akademik.presensiRendah;
            if (adaAlphaTinggi)
                rawPointsAkad += proposedPoints.akademik.alphaTinggi;
            // Nilai E
            const jmlNilaiE = Number(akad.jml_nilai_e || 0);
            if (jmlNilaiE > 0) {
                rawPointsAkad += proposedPoints.akademik.adaNilaiE;
                detailPemicu.akademik.push({
                    kode: 'MEMILIKI_NILAI_E',
                    pesan: `Memiliki ${jmlNilaiE} mata kuliah bernilai E (syarat yudisium wajib bebas nilai E)`,
                    jumlah: jmlNilaiE,
                });
            }
            // TOEFL di semester akhir (sisa masa studi <= 2)
            const skorToefl = akad.skor_toefl ? Number(akad.skor_toefl) : null;
            if (sisaMasaStudi <= 2 && (!skorToefl || skorToefl < config.ambangToeflProdi)) {
                rawPointsAkad += proposedPoints.akademik.toeflRendah;
                detailPemicu.akademik.push({
                    kode: 'TOEFL_BELUM_MEMENUHI',
                    pesan: `Skor TOEFL ${skorToefl ?? 0} di bawah ambang minimum (${config.ambangToeflProdi}) menjelang akhir studi`,
                    skor: skorToefl,
                });
            }
            skorAkademik = Math.min(100, rawPointsAkad);
        }
        // 4. Evaluasi Pilar Non-Akademik / SSKM
        let skorNonAkademik = null;
        let totalPoinSskm = 0;
        const sskmRes = await (0, database_1.query)(`SELECT total_poin_sskm AS total_poin, jml_event_wajib_terlewat FROM snapshot_mahasiswa WHERE nim = $1 ORDER BY snapshot_id DESC LIMIT 1`, [nim]);
        if (sskmRes.rows.length === 0) {
            dataTidakLengkap = true;
        }
        else {
            totalPoinSskm = Number(sskmRes.rows[0].total_poin || 0);
            let rawPointsSskm = 0;
            if (totalPoinSskm < config.ambangSskmProdi) {
                rawPointsSskm += proposedPoints.sskm.poinKurang;
                detailPemicu.nonAkademik.push({
                    kode: 'SSKM_BELUM_CUKUP',
                    pesan: `Poin SSKM (${totalPoinSskm}) belum memenuhi ambang batas minimum prodi (${config.ambangSskmProdi})`,
                    poin: totalPoinSskm,
                    ambang: config.ambangSskmProdi,
                });
            }
            const missedCount = Number(sskmRes.rows[0].jml_event_wajib_terlewat || 0);
            if (missedCount > 0) {
                rawPointsSskm += proposedPoints.sskm.eventWajibAbsen;
                detailPemicu.nonAkademik.push({
                    kode: 'EVENT_WAJIB_TERLEWAT',
                    pesan: `Terdapat ${missedCount} event/upacara wajib kampus yang belum dihadiri`,
                    jumlah: missedCount,
                });
            }
            skorNonAkademik = Math.min(100, rawPointsSskm);
        }
        // 5. Evaluasi Pilar Keuangan (Tanpa Nominal Rupiah - BRL-14)
        let skorKeuangan = null;
        let tunggakanMemblokir = false;
        const keuRes = await (0, database_1.query)(`SELECT status_ukt AS status, memblokir_pendaftaran FROM snapshot_mahasiswa 
       WHERE nim = $1 ORDER BY snapshot_id DESC LIMIT 1`, [nim]);
        if (keuRes.rows.length === 0) {
            dataTidakLengkap = true;
        }
        else {
            const keu = keuRes.rows[0];
            tunggakanMemblokir = Boolean(keu.memblokir_pendaftaran);
            if (keu.status === 'MENUNGGAK') {
                skorKeuangan = proposedPoints.keuangan.menunggak;
                detailPemicu.keuangan.push({
                    kode: 'UKT_MENUNGGAK',
                    pesan: 'Status administrasi UKT/SPP berstatus Menunggak',
                    memblokirPendaftaran: tunggakanMemblokir,
                });
            }
            else {
                skorKeuangan = 0;
            }
        }
        // 6. Normalisasi Bobot Dinamis
        // Kumpulkan pilar yang aktif & tersedia
        const activePillars = [];
        if (taBerlaku && skorTa !== null) {
            activePillars.push({ name: 'TA', weight: config.bobotTa, score: skorTa });
        }
        if (skorAkademik !== null) {
            activePillars.push({ name: 'Akademik', weight: config.bobotAkademik, score: skorAkademik });
        }
        if (skorNonAkademik !== null) {
            activePillars.push({ name: 'SSKM', weight: config.bobotSskm, score: skorNonAkademik });
        }
        if (skorKeuangan !== null) {
            activePillars.push({ name: 'Keuangan', weight: config.bobotKeuangan, score: skorKeuangan });
        }
        let calculatedScore = 0;
        if (activePillars.length > 0) {
            const totalActiveWeight = activePillars.reduce((acc, p) => acc + p.weight, 0);
            calculatedScore = activePillars.reduce((acc, p) => {
                const normalizedWeight = p.weight / totalActiveWeight;
                return acc + p.score * normalizedWeight;
            }, 0);
        }
        const skorTotal = Math.round(calculatedScore * 100) / 100;
        // 7. Klasifikasi Dasar (BRL-03)
        let status = 'HIJAU';
        if (skorTotal >= config.batasMerah) {
            status = 'MERAH';
        }
        else if (skorTotal >= config.batasKuning) {
            status = 'KUNING';
        }
        // 8. Evaluasi Aturan Override
        let overrideRed = false;
        // BRL-04: Override Red Alert bila TA diperpanjang >= 2 semester DAN SSKM < ambang prodi
        if (jmlPerpanjanganTa >= config.perpanjanganTaOverride && totalPoinSskm < config.ambangSskmProdi) {
            status = 'MERAH';
            overrideRed = true;
            detailPemicu.ta.push({
                kode: 'OVERRIDE_RED_ALERT',
                pesan: `Override Red Alert: TA diperpanjang >= ${config.perpanjanganTaOverride} semester dan poin SSKM di bawah ambang (BRL-04)`,
            });
        }
        // BRL-09: Sisa masa studi <= 2 semester dan belum lulus: minimal Kuning
        if (sisaMasaStudi <= config.sisaMasaStudiMin && status === 'HIJAU') {
            status = 'KUNING';
            detailPemicu.akademik.push({
                kode: 'SISA_STUDI_KRITIS',
                pesan: `Sisa masa studi <= ${config.sisaMasaStudiMin} semester: status disesuaikan minimal Kuning (BRL-09)`,
            });
        }
        // BRL-08: Tunggakan UKT memblokir ujian/sidang: minimal Kuning
        if (tunggakanMemblokir && status === 'HIJAU') {
            status = 'KUNING';
            detailPemicu.keuangan.push({
                kode: 'TUNGGAKAN_MEMBLOKIR_UJIAN',
                pesan: 'Tunggakan keuangan memblokir pendaftaran ujian/sidang: status disesuaikan minimal Kuning (BRL-08)',
            });
        }
        // 9. Cek apakah status "membaik" dibanding scan sebelumnya (BRL-12)
        let membaik = false;
        const prevRiskRes = await (0, database_1.query)(`SELECT status, skor_total, detail_pemicu 
       FROM risk_score 
       WHERE nim = $1 
       ORDER BY tgl_hitung DESC LIMIT 1`, [nim]);
        if (prevRiskRes.rows.length > 0) {
            const prev = prevRiskRes.rows[0];
            const riskLevelOrder = { HIJAU: 1, KUNING: 2, MERAH: 3 };
            const currentLevel = riskLevelOrder[status];
            const prevLevel = riskLevelOrder[prev.status] || 1;
            // 1) Level risiko turun
            if (currentLevel < prevLevel) {
                membaik = true;
            }
            else {
                // 2) Jumlah pemicu berkurang
                const currentTriggerCount = detailPemicu.ta.length +
                    detailPemicu.akademik.length +
                    detailPemicu.nonAkademik.length +
                    detailPemicu.keuangan.length;
                const prevTriggers = prev.detail_pemicu || {};
                const prevCount = (prevTriggers.ta?.length || 0) +
                    (prevTriggers.akademik?.length || 0) +
                    (prevTriggers.nonAkademik?.length || 0) +
                    (prevTriggers.keuangan?.length || 0);
                if (currentTriggerCount < prevCount) {
                    membaik = true;
                }
            }
        }
        return {
            nim,
            skorTa,
            skorAkademik,
            skorNonAkademik,
            skorKeuangan,
            skorTotal,
            status,
            overrideRed,
            dataTidakLengkap,
            detailPemicu,
            membaik,
        };
    }
    /**
     * Menjalankan pemindaian untuk seluruh mahasiswa aktif dalam satu scan_run.
     */
    static async runBatchScan(jenis = 'ULANG', semesterId, adminUserId) {
        // Cari semester aktif bila tidak disertakan
        let semId = semesterId;
        if (!semId) {
            const semRes = await (0, database_1.query)('SELECT semester_id FROM semester WHERE is_aktif = true LIMIT 1');
            if (semRes.rows.length === 0) {
                const anySem = await (0, database_1.query)('SELECT semester_id FROM semester ORDER BY semester_id DESC LIMIT 1');
                semId = anySem.rows[0]?.semester_id || 1;
            }
            else {
                semId = semRes.rows[0].semester_id;
            }
        }
        // Buat record scan_run
        const scanRes = await (0, database_1.query)(`INSERT INTO scan_run (semester_id, jenis, waktu_mulai, status, jml_mahasiswa)
       VALUES ($1, $2, NOW(), 'BERJALAN', 0) RETURNING scan_id`, [semId, jenis]);
        const scanId = Number(scanRes.rows[0].scan_id);
        try {
            // Ambil seluruh mahasiswa aktif
            const studentsRes = await (0, database_1.query)('SELECT nim FROM mahasiswa WHERE status_aktif = true ORDER BY nim ASC');
            let count = 0;
            for (const mhs of studentsRes.rows) {
                try {
                    const result = await this.calculateStudentRisk(mhs.nim);
                    await (0, database_1.query)(`INSERT INTO risk_score (
              scan_id, nim, skor_ta, skor_akademik, skor_nonakademik, skor_keuangan,
              skor_total, status, override_red, data_tidak_lengkap, detail_pemicu, tgl_hitung
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            ON CONFLICT (scan_id, nim) DO NOTHING`, [
                        scanId,
                        result.nim,
                        result.skorTa,
                        result.skorAkademik,
                        result.skorNonAkademik,
                        result.skorKeuangan,
                        result.skorTotal,
                        result.status,
                        result.overrideRed,
                        result.dataTidakLengkap,
                        JSON.stringify(result.detailPemicu),
                    ]);
                    count++;
                }
                catch (studentErr) {
                    console.error(`Error calculating risk for student ${mhs.nim}:`, studentErr);
                }
            }
            // Update scan_run status SELESAI
            await (0, database_1.query)(`UPDATE scan_run 
         SET status = 'SELESAI', waktu_selesai = NOW(), jml_mahasiswa = $1 
         WHERE scan_id = $2`, [count, scanId]);
            await (0, logger_util_1.recordAuditLog)({
                userId: adminUserId,
                aksi: 'SCAN_COMPLETED',
                namaTabel: 'scan_run',
                recordId: String(scanId),
                dataBaru: { scanId, jenis, totalMahasiswa: count, status: 'SELESAI' },
            });
            return {
                scanId,
                jenis,
                status: 'SELESAI',
                jmlMahasiswa: count,
            };
        }
        catch (err) {
            await (0, database_1.query)(`UPDATE scan_run SET status = 'GAGAL', waktu_selesai = NOW() WHERE scan_id = $1`, [scanId]);
            throw err;
        }
    }
}
exports.RiskService = RiskService;
