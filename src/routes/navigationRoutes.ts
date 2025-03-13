import express from 'express';
import { getDirections, getNextDirectionStep } from '../controllers/navigationController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

// Direction endpoints - accessible to collectors
router.post('/directions', auth, requireRole('collector'), getDirections);
router.post('/next-step', auth, requireRole('collector'), getNextDirectionStep);

export default router;