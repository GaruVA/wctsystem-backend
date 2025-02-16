import express from 'express';
import { updateBin, getBins, createBin, getBinDetails, reportIssue } from '../controllers/binController';

const router = express.Router();

// Existing routes
router.post('/create', createBin);
router.post('/update', updateBin);
router.get('/', getBins);

// New endpoints
router.get('/:binId', getBinDetails);
router.post('/:binId/report-issue', reportIssue);

export default router;