import express from 'express';
import { getFillLevelTrends, getAnalytics, getAreaStatusOverview } from '../controllers/analyticsController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

router.get('/fill-level-trends', auth, requireRole('admin'), getFillLevelTrends);
router.get('/analytics', auth, requireRole('admin'), getAnalytics);
router.get('/area-status', auth, requireRole('admin'), getAreaStatusOverview);

export default router;