"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const database_1 = require("../../config/database");
class AnalyticsService {
    /**
     * Mengambil agregat kesehatan KTW dan sebaran risiko per prodi (FR8, SDD 4.3).
     */
    static async getKtwAnalytics(prodiId) {
        let sql = `
      SELECT 
        p.prodi_id,
        p.kode_prodi,
        p.nama_prodi,
        COUNT(DISTINCT m.nim) AS total_mahasiswa_aktif,
        COUNT(DISTINCT CASE WHEN v.status = 'HIJAU' THEN m.nim END) AS total_hijau,
        COUNT(DISTINCT CASE WHEN v.status = 'KUNING' THEN m.nim END) AS total_kuning,
        COUNT(DISTINCT CASE WHEN v.status = 'MERAH' THEN m.nim END) AS total_merah,
        ROUND(
          (COUNT(DISTINCT CASE WHEN v.status = 'HIJAU' THEN m.nim END)::NUMERIC / 
           NULLIF(COUNT(DISTINCT m.nim), 0) * 100), 2
        ) AS rasio_ktw_potensial
      FROM program_studi p
      JOIN mahasiswa m ON p.prodi_id = m.prodi_id AND m.status_aktif = true
      LEFT JOIN vw_risk_terkini v ON m.nim = v.nim
    `;
        const params = [];
        if (prodiId) {
            params.push(prodiId);
            sql += ` WHERE p.prodi_id = $1 `;
        }
        sql += ` GROUP BY p.prodi_id, p.kode_prodi, p.nama_prodi ORDER BY p.prodi_id ASC `;
        const res = await (0, database_1.query)(sql, params);
        // Ambil bottleneck analytics
        const bottleneckSql = `
      SELECT * FROM mv_bottleneck_milestone
      ${prodiId ? ' WHERE prodi_id = $1 ' : ''}
    `;
        const bottleneckRes = await (0, database_1.query)(bottleneckSql, params);
        // Ambil tren kelulusan semester lampau (simulasi agregat tren historis)
        const trends = [
            { semester: '2023/2024 Genap', rasioKtw: 68.5 },
            { semester: '2024/2025 Ganjil', rasioKtw: 72.0 },
            { semester: '2024/2025 Genap', rasioKtw: 74.8 },
            { semester: '2025/2026 Ganjil', rasioKtw: 79.2 },
        ];
        return {
            prodiList: res.rows,
            bottlenecks: bottleneckRes.rows,
            trends,
            timestamp: new Date().toISOString(),
        };
    }
    static async exportReport(format, prodiId) {
        const data = await this.getKtwAnalytics(prodiId);
        return {
            format,
            generatedAt: new Date().toISOString(),
            reportTitle: 'Laporan Eksekutif Kesehatan KTW & Analisis Bottleneck EWS',
            summary: data,
        };
    }
}
exports.AnalyticsService = AnalyticsService;
