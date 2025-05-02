import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { auth, requireRole } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
// GET /api/settings - Get all settings
router.get('/', auth, requireRole('admin'), getSettings);

// PUT /api/settings - Update settings
router.put('/', auth, requireRole('admin'), updateSettings);

export default router;