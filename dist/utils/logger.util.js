"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.recordAuditLog = void 0;
const database_1 = require("../config/database");
const recordAuditLog = async (entry) => {
    try {
        await (0, database_1.query)(`INSERT INTO audit_log (user_id, aksi, nama_tabel, record_id, data_lama, data_baru, ip_address, waktu)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [
            entry.userId || null,
            entry.aksi,
            entry.namaTabel || null,
            entry.recordId || null,
            entry.dataLama ? JSON.stringify(entry.dataLama) : null,
            entry.dataBaru ? JSON.stringify(entry.dataBaru) : null,
            entry.ipAddress || null,
        ]);
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
    }
};
exports.recordAuditLog = recordAuditLog;
exports.logger = {
    info: (msg, ...args) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, ...args),
};
