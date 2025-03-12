import express from 'express';
import { getFillLevelTrends, getAnalytics } from '../controllers/analyticsController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

router.get('/fill-level-trends', auth, requireRole('admin'), getFillLevelTrends);
router.get('/analytics', auth, requireRole('admin'), getAnalytics);

export default router;