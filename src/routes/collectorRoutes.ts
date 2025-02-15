import express from 'express';
import { loginCollector, createCollector, getCollectorArea } from '../controllers/collectorController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

router.post('/login', loginCollector);
router.post('/create', auth, requireRole('admin'), createCollector);
router.get('/area', auth, requireRole('collector'), getCollectorArea);

export default router;