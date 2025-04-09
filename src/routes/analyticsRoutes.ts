import express from 'express';
import { getFillLevelTrends, getAnalytics, getAreaStatusOverview, getCollectionEfficiencyAndBinUtilization, getAnalyticsByWasteType } from '../controllers/analyticsController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

router.get('/fill-level-trends', auth, requireRole('admin'), getFillLevelTrends);
router.get('/analytics', auth, requireRole('admin'), getAnalytics);
router.get('/area-status', auth, requireRole('admin'), getAreaStatusOverview);
router.get('/collection-efficiency-bin-utilization', auth, requireRole('admin'), getCollectionEfficiencyAndBinUtilization);
router.get('/waste-type', auth, requireRole('admin'), getAnalyticsByWasteType);

export default router;