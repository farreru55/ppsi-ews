import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/role.middleware';

const router = Router();

router.get('/', authenticate, requireRoles('ADMIN'), AuditController.getLogs);

export default router;
