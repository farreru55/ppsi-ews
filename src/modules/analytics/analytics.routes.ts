import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/role.middleware';

const router = Router();

router.get(
  '/ktw',
  authenticate,
  requireRoles('KAPRODI', 'KOORD_TA', 'ADMIN'),
  AnalyticsController.getKtwAnalytics
);

export default router;
