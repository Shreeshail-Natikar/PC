import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { registerRules, loginRules, handleValidation } from '../middleware/validators.js';

const router = Router();

router.post('/register', authLimiter, registerRules, handleValidation, authController.register);
router.post('/login', authLimiter, loginRules, handleValidation, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
