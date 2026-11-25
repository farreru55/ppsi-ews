import { Router } from 'express';
import { EscalationController } from './escalation.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/role.middleware';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRoles('DOSEN_WALI', 'DOSBING_TA', 'KAPRODI', 'KOORD_TA', 'ADMIN'),
  EscalationController.getEscalations
);

router.patch(
  '/:id',
  authenticate,
  requireRoles('DOSEN_WALI', 'KAPRODI', 'ADMIN'),
  EscalationController.updateEscalation
);

export default router;
