"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const integration_controller_1 = require("./integration.controller");
const api_key_middleware_1 = require("../../middlewares/api-key.middleware");
const router = (0, express_1.Router)();
// Endpoint antarmodul dengan API Key
router.get('/analytics/aggregate', api_key_middleware_1.requireApiKey, integration_controller_1.IntegrationController.getAggregateAnalytics);
router.get('/students/at-risk-courses', api_key_middleware_1.requireApiKey, integration_controller_1.IntegrationController.getStudentsAtRiskCourses);
// Webhook inbound dari AI Academic Advisor dengan verifikasi HMAC
router.post('/webhooks/ai-advisor', integration_controller_1.IntegrationController.receiveAiAdvisorWebhook);
exports.default = router;
