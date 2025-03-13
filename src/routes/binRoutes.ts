import express from 'express';
import { updateBin, getBins, createBin, getBinDetails, reportIssue, assignBinToArea } from '../controllers/binController';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = express.Router();

// Existing routes
router.post('/create', createBin);
router.post('/update', updateBin);
router.get('/', getBins);

// New endpoints
router.get('/:binId', getBinDetails);
router.post('/:binId/report-issue', reportIssue);


router.post('/assign', auth, requireRole('admin'), assignBinToArea);

export default router;