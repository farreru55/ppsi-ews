"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const response_util_1 = require("../../utils/response.util");
const zod_1 = require("zod");
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username wajib diisi'),
    password: zod_1.z.string().min(1, 'Password wajib diisi'),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token wajib diisi'),
});
class AuthController {
    static async login(req, res, next) {
        try {
            const { username, password } = loginSchema.parse(req.body);
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const result = await auth_service_1.AuthService.login(username, password, ip);
            (0, response_util_1.sendSuccess)(res, result, 'Login berhasil');
        }
        catch (error) {
            next(error);
        }
    }
    static async refresh(req, res, next) {
        try {
            const { refreshToken } = refreshSchema.parse(req.body);
            const result = await auth_service_1.AuthService.refreshToken(refreshToken);
            (0, response_util_1.sendSuccess)(res, result, 'Refresh token berhasil diperbarui');
        }
        catch (error) {
            next(error);
        }
    }
    static async me(req, res, next) {
        try {
            if (!req.user) {
                (0, response_util_1.sendError)(res, 'Autentikasi diperlukan', 401, 'UNAUTHORIZED');
                return;
            }
            const user = await auth_service_1.AuthService.getMe(req.user.userId);
            (0, response_util_1.sendSuccess)(res, user, 'Data profil berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
