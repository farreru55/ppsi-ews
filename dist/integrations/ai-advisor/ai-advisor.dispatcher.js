"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAdvisorDispatcher = void 0;
const environment_1 = require("../../config/environment");
const hmac_util_1 = require("../../utils/hmac.util");
class AiAdvisorDispatcher {
    /**
     * Mengirim webhook outbound ke AI Academic Advisor saat skor risiko mahasiswa mencapai Kuning/Merah (SD-5, SDD 4.5).
     */
    static async notifyThresholdReached(studentRisk) {
        const payload = JSON.stringify({
            event: 'risk.threshold_reached',
            eventId: `evt_${studentRisk.riskId}_${Date.now()}`,
            studentId: studentRisk.studentId,
            status: studentRisk.status,
            score: studentRisk.score,
            triggers: studentRisk.triggers,
            occurredAt: new Date().toISOString(),
        });
        const signature = (0, hmac_util_1.generateHmacSignature)(payload);
        // Di environment mock / dev jika URL belum ada
        if (!environment_1.env.AI_ADVISOR_URL || environment_1.env.AI_ADVISOR_URL.includes('internal.campus')) {
            console.log(`[AI ADVISOR WEBHOOK MOCK] Dispatched event for ${studentRisk.studentId} (${studentRisk.status})`);
            return { success: true, mocked: true };
        }
        try {
            const res = await fetch(`${environment_1.env.AI_ADVISOR_URL}/webhooks/ews-trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-EWS-Signature': signature,
                    'X-EWS-Event-Id': `evt_${studentRisk.riskId}`,
                },
                body: payload,
            });
            return { success: res.ok, status: res.status };
        }
        catch (err) {
            console.error('Failed to dispatch webhook to AI Academic Advisor:', err.message);
            return { success: false, error: err.message };
        }
    }
}
exports.AiAdvisorDispatcher = AiAdvisorDispatcher;
