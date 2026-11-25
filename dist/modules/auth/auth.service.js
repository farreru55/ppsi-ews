"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../config/database");
const jwt_util_1 = require("../../utils/jwt.util");
const rate_limit_middleware_1 = require("../../middlewares/rate-limit.middleware");
const logger_util_1 = require("../../utils/logger.util");
class AuthService {
    static async login(username, passwordPlain, ipAddress) {
        // 1. Query user dan roles
        const userResult = await (0, database_1.query)(`SELECT u.user_id, u.username, u.password_hash, u.nim, u.nidn, u.is_aktif,
              COALESCE(m.prodi_id, d.prodi_id) as prodi_id,
              COALESCE(m.nama, d.nama, u.username) as full_name,
              ARRAY_AGG(r.nama_role) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       LEFT JOIN mahasiswa m ON u.nim = m.nim
       LEFT JOIN dosen d ON u.nidn = d.nidn
       WHERE u.username = $1
       GROUP BY u.user_id, u.username, u.password_hash, u.nim, u.nidn, u.is_aktif, m.prodi_id, d.prodi_id, m.nama, d.nama`, [username]);
        if (userResult.rows.length === 0) {
            (0, rate_limit_middleware_1.registerFailedLogin)(username);
            const error = new Error('Username atau kata sandi tidak valid');
            error.statusCode = 401;
            error.code = 'INVALID_CREDENTIALS';
            throw error;
        }
        const user = userResult.rows[0];
        if (!user.is_aktif) {
            const error = new Error('Akun Anda dinonaktifkan, hubungi administrator');
            error.statusCode = 403;
            error.code = 'ACCOUNT_DISABLED';
            throw error;
        }
        const isMatch = await bcryptjs_1.default.compare(passwordPlain, user.password_hash);
        if (!isMatch) {
            const lockStatus = (0, rate_limit_middleware_1.registerFailedLogin)(username);
            const error = new Error(lockStatus.locked
                ? 'Percobaan login salah 5 kali. Akun sementara dikunci 15 menit.'
                : `Kata sandi salah. Sisa kesempatan: ${lockStatus.remainingAttempts}`);
            error.statusCode = lockStatus.locked ? 429 : 401;
            error.code = lockStatus.locked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS';
            throw error;
        }
        // Reset percobaan gagal
        (0, rate_limit_middleware_1.resetLoginAttempts)(username);
        // Update last_login
        await (0, database_1.query)('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);
        const roles = user.roles.filter(Boolean);
        if (roles.length === 0) {
            const error = new Error('Akun tidak memiliki peran terdaftar di EWS');
            error.statusCode = 403;
            error.code = 'NO_ROLES_ASSIGNED';
            throw error;
        }
        const tokenPayload = {
            userId: Number(user.user_id),
            username: user.username,
            nim: user.nim,
            nidn: user.nidn,
            prodiId: user.prodi_id ? Number(user.prodi_id) : null,
            roles,
        };
        const accessToken = (0, jwt_util_1.generateAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_util_1.generateRefreshToken)(tokenPayload);
        // Audit log login
        await (0, logger_util_1.recordAuditLog)({
            userId: Number(user.user_id),
            aksi: 'LOGIN',
            namaTabel: 'users',
            recordId: String(user.user_id),
            dataBaru: { username: user.username, roles },
            ipAddress,
        });
        return {
            accessToken,
            refreshToken,
            user: {
                userId: Number(user.user_id),
                username: user.username,
                fullName: user.full_name,
                nim: user.nim,
                nidn: user.nidn,
                prodiId: user.prodi_id ? Number(user.prodi_id) : null,
                roles,
            },
        };
    }
    static async refreshToken(oldRefreshToken) {
        try {
            const decoded = (0, jwt_util_1.verifyRefreshToken)(oldRefreshToken);
            // Ambil data user terkini
            const userResult = await (0, database_1.query)(`SELECT u.user_id, u.username, u.nim, u.nidn, u.is_aktif,
                COALESCE(m.prodi_id, d.prodi_id) as prodi_id,
                ARRAY_AGG(r.nama_role) as roles
         FROM users u
         LEFT JOIN user_roles ur ON u.user_id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.role_id
         LEFT JOIN mahasiswa m ON u.nim = m.nim
         LEFT JOIN dosen d ON u.nidn = d.nidn
         WHERE u.user_id = $1
         GROUP BY u.user_id, u.username, u.nim, u.nidn, u.is_aktif, m.prodi_id, d.prodi_id`, [decoded.userId]);
            if (userResult.rows.length === 0 || !userResult.rows[0].is_aktif) {
                const error = new Error('Pengguna tidak valid atau akun dinonaktifkan');
                error.statusCode = 401;
                throw error;
            }
            const user = userResult.rows[0];
            const roles = user.roles.filter(Boolean);
            const tokenPayload = {
                userId: Number(user.user_id),
                username: user.username,
                nim: user.nim,
                nidn: user.nidn,
                prodiId: user.prodi_id ? Number(user.prodi_id) : null,
                roles,
            };
            const newAccessToken = (0, jwt_util_1.generateAccessToken)(tokenPayload);
            const newRefreshToken = (0, jwt_util_1.generateRefreshToken)(tokenPayload);
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (err) {
            const error = new Error('Refresh token tidak valid atau telah kedaluwarsa');
            error.statusCode = 401;
            error.code = 'INVALID_REFRESH_TOKEN';
            throw error;
        }
    }
    static async getMe(userId) {
        const userResult = await (0, database_1.query)(`SELECT u.user_id, u.username, u.nim, u.nidn, u.is_aktif, u.last_login,
              COALESCE(m.prodi_id, d.prodi_id) as prodi_id,
              p.nama_prodi,
              COALESCE(m.nama, d.nama, u.username) as full_name,
              COALESCE(m.email, d.email) as email,
              COALESCE(m.no_wa, d.no_wa) as no_wa,
              ARRAY_AGG(r.nama_role) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       LEFT JOIN mahasiswa m ON u.nim = m.nim
       LEFT JOIN dosen d ON u.nidn = d.nidn
       LEFT JOIN program_studi p ON p.prodi_id = COALESCE(m.prodi_id, d.prodi_id)
       WHERE u.user_id = $1
       GROUP BY u.user_id, u.username, u.nim, u.nidn, u.is_aktif, u.last_login, m.prodi_id, d.prodi_id, p.nama_prodi, m.nama, d.nama, m.email, d.email, m.no_wa, d.no_wa`, [userId]);
        if (userResult.rows.length === 0) {
            const error = new Error('Pengguna tidak ditemukan');
            error.statusCode = 404;
            throw error;
        }
        const row = userResult.rows[0];
        return {
            userId: Number(row.user_id),
            username: row.username,
            fullName: row.full_name,
            nim: row.nim,
            nidn: row.nidn,
            email: row.email,
            noWa: row.no_wa,
            prodiId: row.prodi_id ? Number(row.prodi_id) : null,
            namaProdi: row.nama_prodi,
            roles: row.roles.filter(Boolean),
            lastLogin: row.last_login,
        };
    }
}
exports.AuthService = AuthService;
