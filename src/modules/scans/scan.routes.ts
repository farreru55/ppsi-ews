import { Router } from 'express';
import { ScanController } from './scan.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/role.middleware';

const router = Router();

router.post('/', authenticate, requireRoles('ADMIN'), ScanController.triggerScan);

export default router;
