import { Router } from 'express';
import { ActionPlanController } from './action-plan.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/:id', authenticate, ActionPlanController.getById);
router.patch('/:id', authenticate, ActionPlanController.updateStatus);

export default router;
