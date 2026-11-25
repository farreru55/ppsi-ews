"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigration = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../config/database");
const logger_util_1 = require("../utils/logger.util");
const runMigration = async () => {
    logger_util_1.logger.info('Menjalankan migrasi basis data EWS PostgreSQL...');
    const schemaPath = path_1.default.join(__dirname, 'schema.sql');
    const sql = fs_1.default.readFileSync(schemaPath, 'utf-8');
    const client = await database_1.pool.connect();
    try {
        await client.query(sql);
        logger_util_1.logger.info('Migrasi 22 tabel, 6 view, dan 2 materialized view PostgreSQL berhasil diterapkan!');
    }
    catch (err) {
        logger_util_1.logger.error('Gagal menjalankan migrasi:', err.message);
        throw err;
    }
    finally {
        client.release();
    }
};
exports.runMigration = runMigration;
if (require.main === module) {
    (0, exports.runMigration)()
        .then(() => database_1.pool.end())
        .catch(() => process.exit(1));
}
