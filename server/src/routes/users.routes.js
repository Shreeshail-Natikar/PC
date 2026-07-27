import { Router } from 'express';
import * as usersController from '../controllers/users.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/partner', requireAuth, usersController.getPartner);
router.put('/profile', requireAuth, usersController.updateProfile);

export default router;
