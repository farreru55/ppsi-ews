import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { logger } from '../utils/logger.util';

export const runMigration = async () => {
  logger.info('Menjalankan migrasi basis data EWS PostgreSQL...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query(sql);
    logger.info('Migrasi 22 tabel, 6 view, dan 2 materialized view PostgreSQL berhasil diterapkan!');
  } catch (err: any) {
    logger.error('Gagal menjalankan migrasi:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  runMigration()
    .then(() => pool.end())
    .catch(() => process.exit(1));
}
