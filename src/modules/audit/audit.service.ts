import { query } from '../../config/database';

export class AuditService {
  static async getAuditLogs(filters: {
    userId?: number;
    aksi?: string;
    namaTabel?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let whereClauses = ['1=1'];
    const params: any[] = [];

    if (filters.userId) {
      params.push(filters.userId);
      whereClauses.push(`a.user_id = $${params.length}`);
    }

    if (filters.aksi) {
      params.push(filters.aksi);
      whereClauses.push(`a.aksi = $${params.length}`);
    }

    if (filters.namaTabel) {
      params.push(filters.namaTabel);
      whereClauses.push(`a.nama_tabel = $${params.length}`);
    }

    const whereStr = whereClauses.join(' AND ');

    params.push(limit, offset);
    const sql = `
      SELECT a.audit_id, a.user_id, a.aksi, a.nama_tabel, a.record_id, a.data_lama, a.data_baru, a.waktu, a.ip_address,
             u.username
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.user_id
      WHERE ${whereStr}
      ORDER BY a.waktu DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const res = await query(sql, params);

    // Hitung total
    const countSql = `SELECT count(*) FROM audit_log a WHERE ${whereStr}`;
    const countRes = await query(countSql, params.slice(0, params.length - 2));
    const total = parseInt(countRes.rows[0].count, 10);

    return {
      data: res.rows,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
