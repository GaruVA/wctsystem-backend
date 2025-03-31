import express from 'express';
import * as residentController from '../controllers/residentController';

const router = express.Router();

// Public routes - No authentication required
router.get('/bins/nearby', residentController.getNearbyBins);
router.get('/bins/:binId', residentController.getBinDetails);

export default router;