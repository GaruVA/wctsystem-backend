import express from 'express';
import { loginCollector, createCollector, getCollectorArea, getLocation } from '../controllers/collectorController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

router.post('/login', loginCollector);
router.post('/create', auth, requireRole('admin'), createCollector);
router.get('/area', auth, requireRole('collector'), getCollectorArea);

// New route to get collector location
router.get('/location', auth, requireRole('collector'), getLocation);

export default router;