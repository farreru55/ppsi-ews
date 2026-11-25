import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { sendError } from '../utils/response.util';

export const checkStudentScope = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const targetNim = req.params.id || req.params.nim;
  const user = req.user;

  if (!user) {
    sendError(res, 'Autentikasi diperlukan', 401, 'UNAUTHORIZED');
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
      sendError(res, 'Akses ditolak. Mahasiswa hanya dapat melihat data pribadi (BRL-13)', 403, 'FORBIDDEN');
      return;
    }
    return next();
  }

  // 3. Kaprodi & Koordinator TA memiliki akses lingkup prodi
  if (user.roles.includes('KAPRODI') || user.roles.includes('KOORD_TA')) {
    const studentRes = await query(
      'SELECT prodi_id FROM mahasiswa WHERE nim = $1',
      [targetNim]
    );

    if (studentRes.rows.length === 0) {
      sendError(res, 'Mahasiswa tidak ditemukan', 404, 'NOT_FOUND');
      return;
    }

    if (user.prodiId && user.prodiId !== studentRes.rows[0].prodi_id) {
      sendError(res, 'Akses ditolak. Kaprodi/Koord TA hanya dapat mengakses mahasiswa prodinya (BRL-13)', 403, 'FORBIDDEN');
      return;
    }
    return next();
  }

  // 4. Dosen Wali / Dosbing TA hanya dapat mengakses mahasiswa bimbingannya
  if (user.roles.includes('DOSEN_WALI') || user.roles.includes('DOSBING_TA')) {
    if (!user.nidn) {
      sendError(res, 'Akun dosen tidak terhubung dengan NIDN yang valid', 403, 'FORBIDDEN');
      return;
    }

    const relasiRes = await query(
      `SELECT relasi_id FROM relasi_bimbingan 
       WHERE nim = $1 AND nidn = $2 AND (tgl_selesai IS NULL OR tgl_selesai >= CURRENT_DATE)`,
      [targetNim, user.nidn]
    );

    if (relasiRes.rows.length === 0) {
      sendError(
        res,
        'Akses ditolak. Dosen hanya dapat mengakses mahasiswa perwalian atau bimbingan TA aktif (BRL-13)',
        403,
        'FORBIDDEN'
      );
      return;
    }
    return next();
  }

  sendError(res, 'Peran tidak dikenali untuk cakupan data ini', 403, 'FORBIDDEN');
};
