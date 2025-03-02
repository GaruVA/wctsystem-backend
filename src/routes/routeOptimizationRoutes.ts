import express from 'express';
import { optimizeCollectionRoute } from '../controllers/routeOptimizationController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

// POST /api/routes/optimize
router.post('/optimize', auth, requireRole('collector'), optimizeCollectionRoute);

export default router;