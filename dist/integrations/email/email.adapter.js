"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAdapter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const environment_1 = require("../../config/environment");
class EmailAdapter {
    static transporter = null;
    static getTransporter() {
        if (!this.transporter) {
            this.transporter = nodemailer_1.default.createTransport({
                host: environment_1.env.SMTP_HOST,
                port: environment_1.env.SMTP_PORT,
                secure: environment_1.env.SMTP_PORT === 465,
                auth: environment_1.env.SMTP_USER ? {
                    user: environment_1.env.SMTP_USER,
                    pass: environment_1.env.SMTP_PASS,
                } : undefined,
            });
        }
        return this.transporter;
    }
    static async sendEmail(to, subject, htmlContent) {
        // Mode simulasi/mock bila SMTP belum diisi kredensial
        if (!environment_1.env.SMTP_USER || environment_1.env.SMTP_USER === 'test') {
            console.log(`[EMAIL MOCK] Sent to ${to} | Subject: ${subject}`);
            return { success: true, messageId: `email_mock_${Date.now()}` };
        }
        try {
            const transporter = this.getTransporter();
            const info = await transporter.sendMail({
                from: environment_1.env.SMTP_FROM,
                to,
                subject,
                html: htmlContent,
            });
            return { success: true, messageId: info.messageId };
        }
        catch (err) {
            return { success: false, error: err.message || 'SMTP send failed' };
        }
    }
}
exports.EmailAdapter = EmailAdapter;
