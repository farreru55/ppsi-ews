import { Router } from 'express';
import { IntegrationController } from './integration.controller';
import { requireApiKey } from '../../middlewares/api-key.middleware';

const router = Router();

// Endpoint antarmodul dengan API Key
router.get('/analytics/aggregate', requireApiKey, IntegrationController.getAggregateAnalytics);
router.get('/students/at-risk-courses', requireApiKey, IntegrationController.getStudentsAtRiskCourses);

// Webhook inbound dari AI Academic Advisor dengan verifikasi HMAC
router.post('/webhooks/ai-advisor', IntegrationController.receiveAiAdvisorWebhook);

export default router;
