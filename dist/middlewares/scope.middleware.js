"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStudentScope = void 0;
const database_1 = require("../config/database");
const response_util_1 = require("../utils/response.util");
const checkStudentScope = async (req, res, next) => {
    const targetNim = req.params.id || req.params.nim;
    const user = req.user;
    if (!user) {
        (0, response_util_1.sendError)(res, 'Autentikasi diperlukan', 401, 'UNAUTHORIZED');
        return;
    }
    // 1. Admin memiliki akses universal
    if (user.roles.includes('ADMIN')) {
        return next();
    }
    if (!targetNim) {
        return next();
    }
    // 2. Mahasiswa hanya dapat mengakses data pribadi (BRL-13)
    if (user.roles.includes('MAHASISWA')) {
        if (user.nim !== targetNim) {
            (0, response_util_1.sendError)(res, 'Akses ditolak. Mahasiswa hanya dapat melihat data pribadi (BRL-13)', 403, 'FORBIDDEN');
            return;
        }
        return next();
    }
    // 3. Kaprodi & Koordinator TA memiliki akses lingkup prodi
    if (user.roles.includes('KAPRODI') || user.roles.includes('KOORD_TA')) {
        const studentRes = await (0, database_1.query)('SELECT prodi_id FROM mahasiswa WHERE nim = $1', [targetNim]);
        if (studentRes.rows.length === 0) {
            (0, response_util_1.sendError)(res, 'Mahasiswa tidak ditemukan', 404, 'NOT_FOUND');
            return;
        }
        if (user.prodiId && user.prodiId !== studentRes.rows[0].prodi_id) {
            (0, response_util_1.sendError)(res, 'Akses ditolak. Kaprodi/Koord TA hanya dapat mengakses mahasiswa prodinya (BRL-13)', 403, 'FORBIDDEN');
            return;
        }
        return next();
    }
    // 4. Dosen Wali / Dosbing TA hanya dapat mengakses mahasiswa bimbingannya
    if (user.roles.includes('DOSEN_WALI') || user.roles.includes('DOSBING_TA')) {
        if (!user.nidn) {
            (0, response_util_1.sendError)(res, 'Akun dosen tidak terhubung dengan NIDN yang valid', 403, 'FORBIDDEN');
            return;
        }
        const relasiRes = await (0, database_1.query)(`SELECT relasi_id FROM relasi_bimbingan 
       WHERE nim = $1 AND nidn = $2 AND (tgl_selesai IS NULL OR tgl_selesai >= CURRENT_DATE)`, [targetNim, user.nidn]);
        if (relasiRes.rows.length === 0) {
            (0, response_util_1.sendError)(res, 'Akses ditolak. Dosen hanya dapat mengakses mahasiswa perwalian atau bimbingan TA aktif (BRL-13)', 403, 'FORBIDDEN');
            return;
        }
        return next();
    }
    (0, response_util_1.sendError)(res, 'Peran tidak dikenali untuk cakupan data ini', 403, 'FORBIDDEN');
};
exports.checkStudentScope = checkStudentScope;
