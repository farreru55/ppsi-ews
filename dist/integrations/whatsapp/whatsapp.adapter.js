"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppAdapter = void 0;
const environment_1 = require("../../config/environment");
class WhatsAppAdapter {
    static normalizePhoneNumber(phone) {
        let cleaned = phone.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.slice(1);
        }
        return cleaned;
    }
    static async sendMessage(toPhone, message) {
        const normalizedPhone = this.normalizePhoneNumber(toPhone);
        // Jika di environment mock / development tanpa token asli, log dan kembalikan simulasi
        if (!environment_1.env.WHATSAPP_API_TOKEN || environment_1.env.WHATSAPP_API_TOKEN === 'mock_fonnte_token') {
            console.log(`[WHATSAPP MOCK] Sent to ${normalizedPhone}: ${message.slice(0, 60)}...`);
            return {
                success: true,
                messageId: `wa_mock_${Date.now()}`,
            };
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            const response = await fetch(environment_1.env.WHATSAPP_API_URL, {
                method: 'POST',
                headers: {
                    Authorization: environment_1.env.WHATSAPP_API_TOKEN,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    target: normalizedPhone,
                    message: message,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                return { success: false, error: `HTTP ${response.status}: ${errorText}` };
            }
            const json = await response.json();
            return { success: true, messageId: json.id || `wa_${Date.now()}` };
        }
        catch (err) {
            return { success: false, error: err.message || 'WhatsApp gateway timeout/connection failed' };
        }
    }
}
exports.WhatsAppAdapter = WhatsAppAdapter;
