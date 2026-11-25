import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from './middlewares/error.middleware';
import { sendSuccess, sendError } from './utils/response.util';

// Route Imports
import authRoutes from './modules/auth/auth.routes';
import studentsRoutes from './modules/students/students.routes';
import actionPlanRoutes from './modules/action-plans/action-plan.routes';
import escalationRoutes from './modules/escalations/escalation.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import configRoutes from './modules/configuration/config.routes';
import scanRoutes from './modules/scans/scan.routes';
import auditRoutes from './modules/audit/audit.routes';
import integrationRoutes from './modules/integration/integration.routes';
import { AnalyticsController } from './modules/analytics/analytics.controller';
import { authenticate } from './middlewares/auth.middleware';
import { requireRoles } from './middlewares/role.middleware';

export const createApp = () => {
  const app = express();

  // 1. Global Middlewares
  app.use(cors());
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // 2. Request ID & Timing Middleware
  app.use((req: Request, res: Response, next) => {
    const requestId = (req.headers['x-request-id'] as string) || `req_${uuidv4().slice(0, 8)}`;
    req.requestId = requestId;
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // 3. Health Check
  app.get('/health', (req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'UP',
      service: 'EWS Backend REST API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }, 'Sistem EWS berjalan normal');
  });

  // 4. API v1 Routes
  const apiV1 = express.Router();

  apiV1.use('/auth', authRoutes);
  apiV1.use('/students', studentsRoutes);
  apiV1.use('/action-plans', actionPlanRoutes);
  apiV1.use('/escalations', escalationRoutes);
  apiV1.use('/analytics', analyticsRoutes);
  apiV1.use('/config', configRoutes);
  apiV1.use('/scans', scanRoutes);
  apiV1.use('/audit-logs', auditRoutes);
  apiV1.use('/integration', integrationRoutes);

  // Alias endpoint sesuai Tabel 3 SDD: /api/v1/advisees -> students/advisees
  apiV1.use('/advisees', (req, res, next) => {
    req.url = '/advisees' + (req.url === '/' ? '' : req.url);
    studentsRoutes(req, res, next);
  });

  // Alias endpoint laporan: /api/v1/reports/export
  apiV1.get('/reports/export', authenticate, requireRoles('KAPRODI', 'ADMIN'), AnalyticsController.exportReport);

  app.use('/api/v1', apiV1);

  // 5. 404 Handler
  app.use((req: Request, res: Response) => {
    sendError(res, `Rute ${req.method} ${req.originalUrl} tidak ditemukan`, 404, 'ROUTE_NOT_FOUND');
  });

  // 6. Global Error Handler
  app.use(errorHandler);

  return app;
};
