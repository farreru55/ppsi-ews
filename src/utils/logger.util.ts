import { query } from '../config/database';

export interface AuditLogEntry {
  userId?: number | null;
  aksi: string;
  namaTabel?: string;
  recordId?: string;
  dataLama?: any;
  dataBaru?: any;
  ipAddress?: string;
}

export const recordAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    await query(
      `INSERT INTO audit_log (user_id, aksi, nama_tabel, record_id, data_lama, data_baru, ip_address, waktu)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        entry.userId || null,
        entry.aksi,
        entry.namaTabel || null,
        entry.recordId || null,
        entry.dataLama ? JSON.stringify(entry.dataLama) : null,
        entry.dataBaru ? JSON.stringify(entry.dataBaru) : null,
        entry.ipAddress || null,
      ]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

export const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, ...args),
};
