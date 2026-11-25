import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { checkLoginLockout } from '../../middlewares/rate-limit.middleware';

const router = Router();

router.post('/login', checkLoginLockout, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.get('/me', authenticate, AuthController.me);

export default router;
