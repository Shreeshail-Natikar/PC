import { Router } from 'express';
import { uploadMiddleware, handleUpload } from '../controllers/upload.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, uploadMiddleware, handleUpload);

export default router;
