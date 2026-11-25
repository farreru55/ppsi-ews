import { Router } from 'express';
import { ConfigController } from './config.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/role.middleware';

const router = Router();

router.get('/', authenticate, requireRoles('ADMIN', 'KAPRODI'), ConfigController.getAll);
router.put('/', authenticate, requireRoles('ADMIN'), ConfigController.update);

export default router;
