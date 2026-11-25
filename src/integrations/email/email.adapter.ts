import nodemailer from 'nodemailer';
import { env } from '../../config/environment';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailAdapter {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        } : undefined,
      });
    }
    return this.transporter!;
  }

  static async sendEmail(to: string, subject: string, htmlContent: string): Promise<EmailSendResult> {
    // Mode simulasi/mock bila SMTP belum diisi kredensial
    if (!env.SMTP_USER || env.SMTP_USER === 'test') {
      console.log(`[EMAIL MOCK] Sent to ${to} | Subject: ${subject}`);
      return { success: true, messageId: `email_mock_${Date.now()}` };
    }

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html: htmlContent,
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      return { success: false, error: err.message || 'SMTP send failed' };
    }
  }
}
