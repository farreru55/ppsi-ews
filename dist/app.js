"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const uuid_1 = require("uuid");
const error_middleware_1 = require("./middlewares/error.middleware");
const response_util_1 = require("./utils/response.util");
// Route Imports
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const students_routes_1 = __importDefault(require("./modules/students/students.routes"));
const action_plan_routes_1 = __importDefault(require("./modules/action-plans/action-plan.routes"));
const escalation_routes_1 = __importDefault(require("./modules/escalations/escalation.routes"));
const analytics_routes_1 = __importDefault(require("./modules/analytics/analytics.routes"));
const config_routes_1 = __importDefault(require("./modules/configuration/config.routes"));
const scan_routes_1 = __importDefault(require("./modules/scans/scan.routes"));
const audit_routes_1 = __importDefault(require("./modules/audit/audit.routes"));
const integration_routes_1 = __importDefault(require("./modules/integration/integration.routes"));
const analytics_controller_1 = require("./modules/analytics/analytics.controller");
const auth_middleware_1 = require("./middlewares/auth.middleware");
const role_middleware_1 = require("./middlewares/role.middleware");
const createApp = () => {
    const app = (0, express_1.default)();
    // 1. Global Middlewares
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf.toString();
        },
    }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // 2. Request ID & Timing Middleware
    app.use((req, res, next) => {
        const requestId = req.headers['x-request-id'] || `req_${(0, uuid_1.v4)().slice(0, 8)}`;
        req.requestId = requestId;
        res.locals.requestId = requestId;
        res.setHeader('X-Request-Id', requestId);
        next();
    });
    // 3. Health Check
    app.get('/health', (req, res) => {
        (0, response_util_1.sendSuccess)(res, {
            status: 'UP',
            service: 'EWS Backend REST API',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
        }, 'Sistem EWS berjalan normal');
    });
    // 4. API v1 Routes
    const apiV1 = express_1.default.Router();
    apiV1.use('/auth', auth_routes_1.default);
    apiV1.use('/students', students_routes_1.default);
    apiV1.use('/action-plans', action_plan_routes_1.default);
    apiV1.use('/escalations', escalation_routes_1.default);
    apiV1.use('/analytics', analytics_routes_1.default);
    apiV1.use('/config', config_routes_1.default);
    apiV1.use('/scans', scan_routes_1.default);
    apiV1.use('/audit-logs', audit_routes_1.default);
    apiV1.use('/integration', integration_routes_1.default);
    // Alias endpoint sesuai Tabel 3 SDD: /api/v1/advisees -> students/advisees
    apiV1.use('/advisees', (req, res, next) => {
        req.url = '/advisees' + (req.url === '/' ? '' : req.url);
        (0, students_routes_1.default)(req, res, next);
    });
    // Alias endpoint laporan: /api/v1/reports/export
    apiV1.get('/reports/export', auth_middleware_1.authenticate, (0, role_middleware_1.requireRoles)('KAPRODI', 'ADMIN'), analytics_controller_1.AnalyticsController.exportReport);
    app.use('/api/v1', apiV1);
    // 5. 404 Handler
    app.use((req, res) => {
        (0, response_util_1.sendError)(res, `Rute ${req.method} ${req.originalUrl} tidak ditemukan`, 404, 'ROUTE_NOT_FOUND');
    });
    // 6. Global Error Handler
    app.use(error_middleware_1.errorHandler);
    return app;
};
exports.createApp = createApp;
