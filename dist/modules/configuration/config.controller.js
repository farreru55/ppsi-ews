"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigController = void 0;
const config_service_1 = require("./config.service");
const response_util_1 = require("../../utils/response.util");
const zod_1 = require("zod");
const updateConfigSchema = zod_1.z.object({
    parameter: zod_1.z.string().min(1, 'Parameter wajib diisi'),
    nilai: zod_1.z.number({ required_error: 'Nilai parameter harus berupa angka' }),
    prodiId: zod_1.z.number().nullable().optional(),
});
class ConfigController {
    static async getAll(req, res, next) {
        try {
            const user = req.user;
            const prodiId = req.query.prodi_id ? parseInt(req.query.prodi_id, 10) : user.prodiId;
            const configs = await config_service_1.ConfigService.getAllConfigs(prodiId);
            (0, response_util_1.sendSuccess)(res, configs, 'Daftar konfigurasi rule berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const { parameter, nilai, prodiId } = updateConfigSchema.parse(req.body);
            const updated = await config_service_1.ConfigService.updateConfig(parameter, nilai, prodiId, req.user?.userId);
            (0, response_util_1.sendSuccess)(res, updated, `Konfigurasi parameter ${parameter} berhasil diperbarui`);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ConfigController = ConfigController;
