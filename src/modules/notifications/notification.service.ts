import { query } from '../../config/database';
import { WhatsAppAdapter } from '../../integrations/whatsapp/whatsapp.adapter';
import { EmailAdapter } from '../../integrations/email/email.adapter';

export class NotificationService {
  /**
   * Mengirim notifikasi dengan mekanisme failover (WhatsApp -> Email) dan mencatat ke notification_log.
   */
  static async sendNotificationWithFailover(
    riskId: number,
    userId: number,
    toPhone: string | null,
    toEmail: string | null,
    subject: string,
    messageText: string
  ) {
    let kanal: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP';
    let statusKirim: 'TERKIRIM' | 'GAGAL' | 'FALLBACK_EMAIL_SENT' = 'TERKIRIM';
    let attempts = 1;

    // 1. Coba kirim via WhatsApp jika nomor tersedia
    let waSuccess = false;
    if (toPhone) {
      const waRes = await WhatsAppAdapter.sendMessage(toPhone, messageText);
      if (waRes.success) {
        waSuccess = true;
      }
    }

    if (!waSuccess) {
      // 2. Failover ke Email (BRL-10, FR4)
      attempts++;
      if (toEmail) {
        const emailRes = await EmailAdapter.sendEmail(
          toEmail,
          subject,
          `<div style="font-family:sans-serif;padding:16px;">
            <h2>${subject}</h2>
            <p>${messageText.replace(/\n/g, '<br/>')}</p>
            <hr/>
            <p><small>Sistem Early Warning System (EWS) - Universitas Dinamika</small></p>
          </div>`
        );

        if (emailRes.success) {
          statusKirim = 'FALLBACK_EMAIL_SENT';
          kanal = 'EMAIL';
        } else {
          statusKirim = 'GAGAL';
        }
      } else {
        statusKirim = 'GAGAL';
      }
    }

    // 3. Catat ke notification_log
    const logRes = await query(
      `INSERT INTO notification_log (risk_id, penerima_user_id, kanal, isi_pesan, waktu_kirim, status_kirim, jml_percobaan)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)
       RETURNING notif_id, kanal, status_kirim, waktu_kirim`,
      [riskId, userId, kanal, messageText, statusKirim, attempts]
    );

    return logRes.rows[0];
  }

  static async getNotificationLogs(limit = 50, offset = 0) {
    const res = await query(
      `SELECT nl.notif_id, nl.risk_id, nl.kanal, nl.isi_pesan, nl.waktu_kirim, nl.status_kirim, nl.jml_percobaan,
              u.username, u.nim, m.nama as nama_mahasiswa
       FROM notification_log nl
       JOIN users u ON nl.penerima_user_id = u.user_id
       LEFT JOIN mahasiswa m ON u.nim = m.nim
       ORDER BY nl.waktu_kirim DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows;
  }
}
